<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class NarrationService {

    protected string $apiKey;
    protected string $baseUrl = 'https://texttospeech.googleapis.com/v1';

    public function __construct() {
        $this->apiKey = config('services.google_cloud_tts.api_key');
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
        $payload = [
            'input' => [
                'text' => $text,
            ],
            'voice' => [
                'languageCode' => $options['language'] ?? 'en-US',
                'name' => $options['voice'] ?? 'en-US-Neural2-C',
            ],
            'audioConfig' => [
                'audioEncoding' => 'MP3',
                'speakingRate' => $options['speed'] ?? 1.0,
            ],
        ];

        // Add optional parameters
        if (isset($options['pitch'])) {
            $payload['audioConfig']['pitch'] = $options['pitch'];
        }

        if (isset($options['gender'])) {
            $payload['voice']['ssmlGender'] = strtoupper($options['gender']);
        }

        // Make request to Google Cloud TTS API
        try {
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
