<?php

namespace App\Services;

use App\Models\ApiCallCount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class NarrationService {

    protected string $apiKey;
    protected string $baseUrl = 'https://texttospeech.googleapis.com/v1';
    protected string $betaBaseUrl = 'https://texttospeech.googleapis.com/v1beta1';

    public function __construct() {
        $this->apiKey = config('services.google_cloud_tts.api_key');
    }

    /**
     * Check if a voice is a Chirp3-HD voice
     *
     * @param string $voiceName
     * @return bool
     */
    protected function isChirp3Voice(string $voiceName): bool {
        return str_contains($voiceName, 'Chirp3-HD');
    }

    /**
     * Generate audio narration from text
     *
     * @param string $text The text to narrate
     * @param array $options Optional settings (voice, speed, language)
     * @return string Binary audio data (MP3)
     */
    public function generateAudio(string $text, array $options = []): string {
        // Create cache hash
        $hash = $this->generateCacheHash($text, $options);

        // Check if cached
        if ($cachedAudio = $this->getCachedAudio($hash)) {
            Log::info('Returning cached audio', ['hash' => $hash]);
            return $cachedAudio;
        }

        Log::info('Generating new audio', [
            'text_length' => strlen($text),
            'options' => $options,
        ]);

        // Build request payload for Google Cloud TTS REST API
        $voiceName = $options['voice'] ?? 'en-US-Neural2-C';
        $payload = [
            'input' => [
                'text' => $text,
            ],
            'voice' => [
                'languageCode' => $options['language'] ?? 'en-US',
                'name' => $voiceName,
            ],
            'audioConfig' => [
                'audioEncoding' => 'MP3',
            ],
        ];

        // Add speakingRate only for non-Chirp3 voices (Chirp3-HD doesn't support it)
        if (!$this->isChirp3Voice($voiceName)) {
            $payload['audioConfig']['speakingRate'] = $options['speed'] ?? 1.0;
        }

        // Add optional parameters
        if (isset($options['pitch'])) {
            $payload['audioConfig']['pitch'] = $options['pitch'];
        }

        if (isset($options['gender'])) {
            $payload['voice']['ssmlGender'] = strtoupper($options['gender']);
        }

        // Make request to Google Cloud TTS API
        try {
            // Past the cache check, so this is a real billable call.
            ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO);

            $response = Http::post("{$this->baseUrl}/text:synthesize?key={$this->apiKey}", $payload);

            if (!$response->successful()) {
                throw new \Exception('Google Cloud TTS API error: ' . $response->body());
            }

            $responseData = $response->json();

            // Audio content is base64 encoded in the response
            $audioContent = base64_decode($responseData['audioContent']);

            // Cache the audio
            $this->cacheAudio($hash, $audioContent);

            Log::info('Audio generated successfully', [
                'hash' => $hash,
                'size' => strlen($audioContent),
            ]);

            return $audioContent;

        } catch (\Exception $e) {
            Log::error('Failed to generate audio', [
                'error' => $e->getMessage(),
                'text_length' => strlen($text),
            ]);
            throw $e;
        }
    }

    /**
     * Generate a unique hash for caching
     *
     * @param string $text
     * @param array $options
     * @return string
     */
    protected function generateCacheHash(string $text, array $options): string {
        $cacheKey = $text . json_encode($options);
        return md5($cacheKey);
    }

    /**
     * Get cached audio if it exists
     *
     * @param string $hash
     * @return string|null
     */
    protected function getCachedAudio(string $hash): ?string {
        $path = "narrations/{$hash}.mp3";

        if (Storage::exists($path)) {
            return Storage::get($path);
        }

        return null;
    }

    /**
     * Cache audio data
     *
     * @param string $hash
     * @param string $audioData
     * @return void
     */
    protected function cacheAudio(string $hash, string $audioData): void {
        $path = "narrations/{$hash}.mp3";
        Storage::put($path, $audioData);

        Log::debug('Audio cached', ['path' => $path, 'size' => strlen($audioData)]);
    }

    /**
     * Split text into word arrays, grouped into chunks that fit within SSML byte limits.
     * Each chunk is an array of ['word' => string, 'globalIndex' => int] items.
     */
    protected function buildSsmlChunks(string $text, int $maxBytes = 4500): array {
        $paragraphs = preg_split('/\n\s*\n/', trim($text));
        $allWords = [];
        $paragraphBreaks = [];

        foreach ($paragraphs as $pIdx => $paragraph) {
            if ($pIdx > 0) {
                $paragraphBreaks[] = count($allWords);
            }
            $words = preg_split('/\s+/', trim($paragraph), -1, PREG_SPLIT_NO_EMPTY);
            foreach ($words as $word) {
                $allWords[] = $word;
            }
        }

        // Build chunks that stay under the byte limit
        $chunks = [];
        $currentChunk = [];
        $currentStartIndex = 0;

        foreach ($allWords as $i => $word) {
            $currentChunk[] = $word;

            // Estimate SSML size for current chunk
            $ssml = $this->buildSsmlFromWords($currentChunk, $currentStartIndex, $paragraphBreaks);
            if (strlen($ssml) > $maxBytes && count($currentChunk) > 1) {
                // Remove the last word and finalize this chunk
                array_pop($currentChunk);
                $chunks[] = ['words' => $currentChunk, 'startIndex' => $currentStartIndex];
                $currentStartIndex = $i;
                $currentChunk = [$word];
            }
        }

        if (!empty($currentChunk)) {
            $chunks[] = ['words' => $currentChunk, 'startIndex' => $currentStartIndex];
        }

        return ['chunks' => $chunks, 'totalWords' => count($allWords), 'paragraphBreaks' => $paragraphBreaks];
    }

    /**
     * Build SSML string from a word array with mark tags.
     */
    protected function buildSsmlFromWords(array $words, int $startIndex, array $paragraphBreaks): string {
        $ssml = '<speak>';
        foreach ($words as $i => $word) {
            $globalIndex = $startIndex + $i;
            if (in_array($globalIndex, $paragraphBreaks)) {
                $ssml .= ' <break time="600ms"/> ';
            }
            $ssml .= '<mark name="w' . $globalIndex . '"/>' . htmlspecialchars($word, ENT_XML1) . ' ';
        }
        $ssml .= '</speak>';
        return $ssml;
    }

    /**
     * Generate audio with word-level timepoints, chunking to stay within API limits.
     */
    public function generateAudioWithTimepoints(string $text, array $options = []): array {
        $hash = $this->generateCacheHash($text . ':sync:v2', $options);

        $audioPath = "narrations/{$hash}.mp3";
        $timepointsPath = "narrations/{$hash}_timepoints.json";

        if (Storage::exists($audioPath) && Storage::exists($timepointsPath)) {
            Log::info('Returning cached sync audio', ['hash' => $hash]);
            return [
                'audioContent' => base64_encode(Storage::get($audioPath)),
                'timepoints' => json_decode(Storage::get($timepointsPath), true),
                'text' => $text,
            ];
        }

        $chunkData = $this->buildSsmlChunks($text);
        $chunks = $chunkData['chunks'];

        Log::info('Generating sync audio with timepoints', [
            'text_length' => strlen($text),
            'total_words' => $chunkData['totalWords'],
            'chunk_count' => count($chunks),
            'options' => $options,
        ]);

        $voiceName = $options['voice'] ?? 'en-US-Neural2-C';
        $allAudioData = '';
        $allTimepoints = [];
        $cumulativeDuration = 0.0;

        foreach ($chunks as $chunkIndex => $chunk) {
            $ssml = $this->buildSsmlFromWords($chunk['words'], $chunk['startIndex'], $chunkData['paragraphBreaks']);

            $payload = [
                'input' => ['ssml' => $ssml],
                'voice' => [
                    'languageCode' => $options['language'] ?? 'en-US',
                    'name' => $voiceName,
                ],
                'audioConfig' => ['audioEncoding' => 'MP3'],
                'enableTimePointing' => ['SSML_MARK'],
            ];

            if (!$this->isChirp3Voice($voiceName)) {
                $payload['audioConfig']['speakingRate'] = $options['speed'] ?? 1.0;
            }

            if (isset($options['pitch'])) {
                $payload['audioConfig']['pitch'] = $options['pitch'];
            }

            if (isset($options['gender'])) {
                $payload['voice']['ssmlGender'] = strtoupper($options['gender']);
            }

            try {
                // Counted per chunk: long articles are split into several
                // synthesize calls and each one is billed separately.
                ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO);

                $response = Http::timeout(60)->post("{$this->betaBaseUrl}/text:synthesize?key={$this->apiKey}", $payload);

                if (!$response->successful()) {
                    throw new \Exception('Google Cloud TTS API error (chunk ' . ($chunkIndex + 1) . '): ' . $response->body());
                }

                $responseData = $response->json();
                $chunkAudio = base64_decode($responseData['audioContent']);
                $chunkTimepoints = $responseData['timepoints'] ?? [];

                // Offset timepoints by cumulative duration of prior chunks
                foreach ($chunkTimepoints as &$tp) {
                    $tp['timeSeconds'] = ($tp['timeSeconds'] ?? 0) + $cumulativeDuration;
                }
                unset($tp);

                // Calculate this chunk's duration by getting a temporary audio element duration
                // Approximate: MP3 at ~32kbps means ~4000 bytes per second
                // More accurate: use the last timepoint + estimated word duration
                if (!empty($chunkTimepoints)) {
                    $lastTp = end($chunkTimepoints);
                    // Estimate ~0.5s after the last word starts
                    $chunkDuration = $lastTp['timeSeconds'] - $cumulativeDuration + 0.5;
                } else {
                    // Rough estimate from audio size (MP3 ~16kbps for speech = 2000 bytes/sec)
                    $chunkDuration = strlen($chunkAudio) / 2000;
                }

                $allAudioData .= $chunkAudio;
                $allTimepoints = array_merge($allTimepoints, $chunkTimepoints);
                $cumulativeDuration += $chunkDuration;

                Log::debug('Chunk processed', [
                    'chunk' => $chunkIndex + 1,
                    'words' => count($chunk['words']),
                    'audio_size' => strlen($chunkAudio),
                    'timepoints' => count($chunkTimepoints),
                    'cumulative_duration' => $cumulativeDuration,
                ]);

            } catch (\Exception $e) {
                Log::error('Failed to generate sync audio', [
                    'error' => $e->getMessage(),
                    'chunk' => $chunkIndex + 1,
                    'text_length' => strlen($text),
                ]);
                throw $e;
            }
        }

        // Cache the concatenated result
        Storage::put($audioPath, $allAudioData);
        Storage::put($timepointsPath, json_encode($allTimepoints));

        Log::info('Sync audio generated successfully', [
            'hash' => $hash,
            'audio_size' => strlen($allAudioData),
            'timepoint_count' => count($allTimepoints),
            'chunks_used' => count($chunks),
        ]);

        return [
            'audioContent' => base64_encode($allAudioData),
            'timepoints' => $allTimepoints,
            'text' => $text,
        ];
    }

    /**
     * List available voices
     *
     * @param string|null $languageCode Optional language code to filter voices
     * @return array
     */
    public function listAvailableVoices(?string $languageCode = null): array {
        try {
            $url = "{$this->baseUrl}/voices?key={$this->apiKey}";
            if ($languageCode) {
                $url .= "&languageCode={$languageCode}";
            }

            $response = Http::get($url);

            if (!$response->successful()) {
                throw new \Exception('Failed to fetch voices: ' . $response->body());
            }

            return $response->json()['voices'] ?? [];

        } catch (\Exception $e) {
            Log::error('Failed to list voices', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Clean up old cached audio files
     *
     * @param int $daysOld Files older than this many days will be deleted
     * @return int Number of files deleted
     */
    public function cleanupCache(int $daysOld = 7): int {
        $files = Storage::files('narrations');
        $deleted = 0;
        $cutoffTime = now()->subDays($daysOld)->timestamp;

        foreach ($files as $file) {
            if (Storage::lastModified($file) < $cutoffTime) {
                Storage::delete($file);
                $deleted++;
            }
        }

        Log::info('Cache cleanup completed', ['deleted' => $deleted]);

        return $deleted;
    }
}
