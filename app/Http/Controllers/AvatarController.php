<?php

namespace App\Http\Controllers;

use App\Models\ApiCallCount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AvatarController extends Controller
{
    // Cartesia voice + speed used for Watch audio. Centralised so the cache key
    // can include them and so any future voice change invalidates cached files.
    private const CARTESIA_VOICE_ID = '876c39e1-9ecd-42cd-b0c1-8b3906f0be19';
    private const CARTESIA_SPEED = 0.75;

    /**
     * Common headers for an SSE response. X-Accel-Buffering: no defeats nginx
     * proxy buffering; Content-Encoding: identity defeats gzip middleware that
     * would otherwise hold the response until it has enough bytes to compress.
     */
    private const SSE_HEADERS = [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache, no-transform',
        'X-Accel-Buffering' => 'no',
        'Content-Encoding' => 'identity',
    ];

    private function stripMarkdown(string $text): string
    {
        // Remove headings
        $text = preg_replace('/^#{1,6}\s*/m', '', $text);
        // Remove bold
        $text = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text);
        $text = preg_replace('/__(.+?)__/s', '$1', $text);
        // Remove italic
        $text = preg_replace('/\*(.+?)\*/s', '$1', $text);
        $text = preg_replace('/_(.+?)_/s', '$1', $text);
        // Remove inline code
        $text = preg_replace('/`(.+?)`/', '$1', $text);
        // Remove links
        $text = preg_replace('/\[(.+?)\]\(.+?\)/', '$1', $text);
        // Remove bullet points
        $text = preg_replace('/^[\*\-\+]\s+/m', '', $text);
        // Remove numbered lists
        $text = preg_replace('/^\d+\.\s+/m', '', $text);
        // Clean up extra whitespace
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        return trim($text);
    }

    public function prepareScript(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'summary' => 'required|string',
            'simplificationLevel' => 'sometimes|string',
        ]);

        $rawSummary = $validated['summary'];

        // Use the easy-read summary verbatim (markdown stripped, since TTS can't
        // speak syntax). No preamble, no condensing — audio and video are both
        // expected to match the easy-read text exactly. Longer scripts mean more
        // Cartesia TTS time and more Simli streaming minutes — monitored, not capped.
        $script = $this->stripMarkdown($rawSummary);

        return response()->json([
            'script' => $script,
        ]);
    }

    /**
     * Generate PCM16 audio + word-level timestamps using Cartesia's SSE TTS endpoint.
     *
     * Returns a streaming SSE response in all cases so the frontend has a single
     * consumption path. On a cache miss the response forwards Cartesia's stream
     * verbatim (and tees audio + timepoints to the on-disk cache once `done` fires).
     * On a cache hit we replay the cached audio + timepoints as a synthesized SSE
     * stream that completes in milliseconds.
     */
    public function cartesiaTTS(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string',
        ]);

        $cartesiaApiKey = config('services.cartesia.api_key');

        if (!$cartesiaApiKey) {
            return response()->json(['error' => 'Cartesia API key not configured'], 500);
        }

        $text = $validated['text'];
        $hash = $this->cacheKey($text);

        $cached = $this->readCache($hash);
        if ($cached !== null) {
            Log::info('Cartesia cache hit', [
                'hash' => $hash,
                'audioSize' => strlen($cached['audio']),
                'timepointCount' => count($cached['timepoints']),
            ]);
            return $this->replayCachedAsSse($cached);
        }

        return $this->streamFromCartesia($text, $cartesiaApiKey, $hash);
    }

    /**
     * Stream from Cartesia AND tee audio + timepoints to the on-disk cache.
     * The forward path is byte-verbatim; teeing parses a parallel copy of the
     * stream to extract structured data for storage.
     */
    private function streamFromCartesia(string $text, string $apiKey, string $hash): StreamedResponse
    {
        return new StreamedResponse(function () use ($text, $apiKey, $hash) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            ob_implicit_flush(true);

            Log::info('Cartesia SSE streaming (cache miss)', [
                'hash' => $hash,
                'textLength' => strlen($text),
                'wordCount' => str_word_count($text),
            ]);

            $accumAudio = '';
            $accumTimepoints = [];
            $cacheable = true;

            // Cache miss (see the log line above), so this is a billable call.
            ApiCallCount::bump(ApiCallCount::SERVICE_VIDEO_TTS);

            try {
                $upstream = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Cartesia-Version' => '2024-11-13',
                    'Content-Type' => 'application/json',
                    'Accept' => 'text/event-stream',
                ])->withOptions([
                    'stream' => true,
                ])->timeout(180)->post('https://api.cartesia.ai/tts/sse', [
                    'model_id' => 'sonic-3',
                    'transcript' => $text,
                    'voice' => [
                        'mode' => 'id',
                        'id' => self::CARTESIA_VOICE_ID,
                    ],
                    'language' => 'en',
                    'generation_config' => [
                        'speed' => self::CARTESIA_SPEED,
                    ],
                    'output_format' => [
                        'container' => 'raw',
                        'encoding' => 'pcm_s16le',
                        'sample_rate' => 16000,
                    ],
                    'add_timestamps' => true,
                ]);

                if (!$upstream->successful()) {
                    Log::error('Cartesia SSE upstream error', [
                        'status' => $upstream->status(),
                        'body' => $upstream->body(),
                    ]);
                    $this->emitErrorEvent('Cartesia returned status ' . $upstream->status());
                    return;
                }

                $body = $upstream->toPsrResponse()->getBody();
                $teeBuffer = '';

                while (!$body->eof()) {
                    $bytes = $body->read(8192);
                    if ($bytes === '') {
                        continue;
                    }

                    // Forward verbatim to the frontend.
                    echo $bytes;
                    flush();

                    // Parse a parallel copy for the cache. Forwarding always
                    // sees the same bytes; the tee parser just extracts the
                    // structured payloads.
                    $teeBuffer .= $bytes;
                    while (($pos = strpos($teeBuffer, "\n\n")) !== false) {
                        $eventBlock = substr($teeBuffer, 0, $pos);
                        $teeBuffer = substr($teeBuffer, $pos + 2);

                        [$eventType, $eventData] = $this->parseSseEvent($eventBlock);
                        if ($eventType === null) {
                            continue;
                        }

                        if ($eventType === 'chunk') {
                            $decoded = json_decode($eventData, true);
                            $b64 = is_array($decoded) ? ($decoded['data'] ?? null) : $eventData;
                            if (is_string($b64) && $b64 !== '') {
                                $accumAudio .= base64_decode($b64);
                            }
                        } elseif ($eventType === 'timestamps') {
                            $decoded = json_decode($eventData, true);
                            if (is_array($decoded) && isset($decoded['word_timestamps'])) {
                                $wt = $decoded['word_timestamps'];
                                $words = $wt['words'] ?? [];
                                $starts = $wt['start'] ?? [];
                                foreach ($words as $i => $word) {
                                    if (isset($starts[$i])) {
                                        $accumTimepoints[] = [
                                            'markName' => $word,
                                            'timeSeconds' => (float) $starts[$i],
                                        ];
                                    }
                                }
                            }
                        } elseif ($eventType === 'error') {
                            $cacheable = false;
                        }
                    }
                }

                if ($cacheable && strlen($accumAudio) > 0 && count($accumTimepoints) > 0) {
                    $this->writeCache($hash, $accumAudio, $accumTimepoints);
                    Log::info('Cartesia cache written', [
                        'hash' => $hash,
                        'audioSize' => strlen($accumAudio),
                        'timepointCount' => count($accumTimepoints),
                    ]);
                } else {
                    Log::info('Cartesia stream finished without writing cache', [
                        'hash' => $hash,
                        'cacheable' => $cacheable,
                        'audioSize' => strlen($accumAudio),
                        'timepointCount' => count($accumTimepoints),
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error('Cartesia SSE streaming exception', [
                    'message' => $e->getMessage(),
                ]);
                $this->emitErrorEvent($e->getMessage());
            }
        }, 200, self::SSE_HEADERS);
    }

    /**
     * Replay a cache hit as a synthesized SSE stream. The frontend can't tell
     * the difference from a fresh Cartesia stream; it just receives all the
     * events in rapid succession instead of paced over real-time generation.
     */
    private function replayCachedAsSse(array $cached): StreamedResponse
    {
        return new StreamedResponse(function () use ($cached) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            ob_implicit_flush(true);

            // Emit the audio as a single chunk event (frontend chunks it again
            // when pumping into Simli, so granularity here doesn't matter).
            echo "event: chunk\n";
            echo 'data: ' . base64_encode($cached['audio']) . "\n\n";
            flush();

            // Emit timepoints in Cartesia's native shape so the frontend SSE
            // parser handles them identically to a live stream.
            $words = array_map(fn($tp) => $tp['markName'] ?? '', $cached['timepoints']);
            $starts = array_map(fn($tp) => $tp['timeSeconds'] ?? 0, $cached['timepoints']);
            echo "event: timestamps\n";
            echo 'data: ' . json_encode([
                'type' => 'timestamps',
                'word_timestamps' => [
                    'words' => $words,
                    'start' => $starts,
                ],
            ]) . "\n\n";
            flush();

            echo "event: done\ndata: {}\n\n";
            flush();
        }, 200, self::SSE_HEADERS);
    }

    /**
     * Parse a single SSE event block into [eventType, dataString]. Multiple
     * `data:` lines in one event are concatenated per the SSE spec.
     */
    private function parseSseEvent(string $eventBlock): array
    {
        $eventType = null;
        $eventData = '';
        foreach (explode("\n", $eventBlock) as $line) {
            if (str_starts_with($line, 'event:')) {
                $eventType = trim(substr($line, 6));
            } elseif (str_starts_with($line, 'data:')) {
                $eventData .= ltrim(substr($line, 5));
            }
        }
        return [$eventType, $eventData];
    }

    /**
     * Emit a synthesized SSE error event so the frontend can surface a clean
     * failure state without the connection closing silently mid-stream.
     */
    private function emitErrorEvent(string $message): void
    {
        echo "event: error\n";
        echo 'data: ' . json_encode(['error' => $message]) . "\n\n";
        flush();
    }

    /**
     * Cache key for Cartesia output: hashes the inputs that produce different
     * audio (text + voice + speed). The version suffix lets us invalidate
     * everything by bumping it if the encoding/format ever changes.
     */
    private function cacheKey(string $text): string
    {
        return md5($text . ':' . self::CARTESIA_VOICE_ID . ':' . self::CARTESIA_SPEED . ':v1');
    }

    /**
     * Returns ['audio' => bytes, 'timepoints' => array] or null on cache miss.
     */
    private function readCache(string $hash): ?array
    {
        $audioPath = "avatar/{$hash}.pcm";
        $timepointsPath = "avatar/{$hash}.json";

        if (!Storage::exists($audioPath) || !Storage::exists($timepointsPath)) {
            return null;
        }

        $timepoints = json_decode(Storage::get($timepointsPath), true);
        if (!is_array($timepoints)) {
            return null;
        }

        return [
            'audio' => Storage::get($audioPath),
            'timepoints' => $timepoints,
        ];
    }

    /**
     * Atomic-ish cache write: stage to temp files then rename. Storage::move()
     * is rename(2) on the local disk driver, which is atomic on the same
     * filesystem.
     */
    private function writeCache(string $hash, string $audioBytes, array $timepoints): void
    {
        $audioPath = "avatar/{$hash}.pcm";
        $timepointsPath = "avatar/{$hash}.json";
        $tempAudio = "avatar/.{$hash}.pcm.tmp";
        $tempTimepoints = "avatar/.{$hash}.json.tmp";

        Storage::put($tempAudio, $audioBytes);
        Storage::put($tempTimepoints, json_encode($timepoints));

        if (Storage::exists($audioPath)) {
            Storage::delete($audioPath);
        }
        if (Storage::exists($timepointsPath)) {
            Storage::delete($timepointsPath);
        }

        Storage::move($tempAudio, $audioPath);
        Storage::move($tempTimepoints, $timepointsPath);
    }

    /**
     * Delete cached avatar files older than $daysOld days. Not wired to a
     * scheduler in code; intended to be invoked manually or from a future
     * scheduled command. PCM16 files grow ~5x faster than the MP3s under
     * `storage/narrations/`, so this directory needs more aggressive pruning
     * than its Listen-pane counterpart.
     */
    public function cleanupCache(int $daysOld = 7): int
    {
        $files = Storage::files('avatar');
        $deleted = 0;
        $cutoff = now()->subDays($daysOld)->timestamp;

        foreach ($files as $file) {
            if (Storage::lastModified($file) < $cutoff) {
                Storage::delete($file);
                $deleted++;
            }
        }

        Log::info('Avatar cache cleanup completed', ['deleted' => $deleted]);
        return $deleted;
    }

    /**
     * Generate video using Simli + Cartesia
     * 1. Generate audio from text using Cartesia TTS
     * 2. Send audio to Simli to generate lip-synced video
     */
    public function simliGenerate(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string',
            'faceId' => 'required|string',
        ]);

        $simliApiKey = config('services.simli.api_key');
        $cartesiaApiKey = config('services.cartesia.api_key');

        if (!$simliApiKey) {
            return response()->json(['error' => 'Simli API key not configured'], 500);
        }

        if (!$cartesiaApiKey) {
            return response()->json(['error' => 'Cartesia API key not configured'], 500);
        }

        try {
            // Step 1: Generate audio using Cartesia TTS
            Log::info('Cartesia TTS request', [
                'textLength' => strlen($validated['text']),
            ]);

            ApiCallCount::bump(ApiCallCount::SERVICE_VIDEO_TTS);

            $cartesiaResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $cartesiaApiKey,
                'Cartesia-Version' => '2024-11-13',
                'Content-Type' => 'application/json',
            ])->timeout(180)->post('https://api.cartesia.ai/tts/bytes', [
                'model_id' => 'sonic-3',
                'transcript' => $validated['text'],
                'voice' => [
                    'mode' => 'id',
                    'id' => '876c39e1-9ecd-42cd-b0c1-8b3906f0be19',
                ],
                'language' => 'en',
                'generation_config' => [
                    'speed' => 0.85,
                ],
                'output_format' => [
                    'container' => 'wav',
                    'encoding' => 'pcm_s16le',
                    'sample_rate' => 16000,
                ],
            ]);

            if (!$cartesiaResponse->successful()) {
                Log::error('Cartesia TTS error', [
                    'status' => $cartesiaResponse->status(),
                    'body' => $cartesiaResponse->body(),
                ]);
                return response()->json([
                    'error' => 'Failed to generate audio: ' . $cartesiaResponse->body(),
                ], 500);
            }

            // Get the audio bytes and base64 encode them
            $audioBytes = $cartesiaResponse->body();
            $audioBase64 = base64_encode($audioBytes);

            Log::info('Cartesia TTS success', [
                'audioSize' => strlen($audioBytes),
            ]);

            // Step 2: Send audio to Simli to generate video
            Log::info('Simli static/audio request', [
                'faceId' => $validated['faceId'],
                'audioSize' => strlen($audioBytes),
            ]);

            ApiCallCount::bump(ApiCallCount::SERVICE_VIDEO_STREAM);

            $simliResponse = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-API-Key' => $simliApiKey,
            ])->timeout(120)->post('https://api.simli.ai/static/audio', [
                'faceId' => $validated['faceId'],
                'audioBase64' => $audioBase64,
                'audioFormat' => 'wav',
                'audioSampleRate' => 16000,
                'audioChannelCount' => 1,
            ]);

            Log::info('Simli static/audio response', [
                'status' => $simliResponse->status(),
                'body' => substr($simliResponse->body(), 0, 500),
            ]);

            if (!$simliResponse->successful()) {
                Log::error('Simli API error', [
                    'status' => $simliResponse->status(),
                    'body' => $simliResponse->body(),
                ]);
                return response()->json([
                    'error' => 'Failed to generate video: ' . $simliResponse->body(),
                ], 500);
            }

            $data = $simliResponse->json();

            return response()->json([
                'hlsUrl' => $data['hls_url'] ?? null,
                'mp4Url' => $data['mp4_url'] ?? null,
                'data' => $data,
            ]);

        } catch (\Exception $e) {
            Log::error('Simli/Cartesia API exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to generate video: ' . $e->getMessage()], 500);
        }
    }
}
