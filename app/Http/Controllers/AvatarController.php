<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AvatarController extends Controller
{
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
     * Streams the SSE response from Cartesia, accumulating `chunk` events (base64 audio)
     * and `timestamps` events (word-level timing). Returns a single JSON payload with
     * base64 audio + a timepoints array shaped like /narrate-sync's response, so the
     * frontend can drive captions with the same pattern used by the Listen pane.
     */
    public function cartesiaTTS(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string',
        ]);

        $cartesiaApiKey = env('CARTESIA_API_KEY');

        if (!$cartesiaApiKey) {
            return response()->json(['error' => 'Cartesia API key not configured'], 500);
        }

        try {
            Log::info('Cartesia SSE TTS request', [
                'textLength' => strlen($validated['text']),
                'wordCount' => str_word_count($validated['text']),
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $cartesiaApiKey,
                'Cartesia-Version' => '2024-11-13',
                'Content-Type' => 'application/json',
                'Accept' => 'text/event-stream',
            ])->withOptions([
                'stream' => true,
            ])->timeout(180)->post('https://api.cartesia.ai/tts/sse', [
                'model_id' => 'sonic-3',
                'transcript' => $validated['text'],
                'voice' => [
                    'mode' => 'id',
                    'id' => '876c39e1-9ecd-42cd-b0c1-8b3906f0be19',
                ],
                'language' => 'en',
                'generation_config' => [
                    'speed' => 0.75,
                ],
                'output_format' => [
                    'container' => 'raw',
                    'encoding' => 'pcm_s16le',
                    'sample_rate' => 16000,
                ],
                'add_timestamps' => true,
            ]);

            if (!$response->successful()) {
                Log::error('Cartesia SSE TTS error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json([
                    'error' => 'Failed to generate audio',
                ], 500);
            }

            // Parse SSE stream: events are separated by blank lines, each event has
            // `event:` and `data:` lines. We collect chunk + timestamps events and
            // stop on `done` (or `error`).
            $audioBytes = '';
            $timepoints = [];

            $body = $response->toPsrResponse()->getBody();
            $buffer = '';
            $streamErrored = false;

            while (!$body->eof()) {
                $buffer .= $body->read(8192);

                while (($pos = strpos($buffer, "\n\n")) !== false) {
                    $eventBlock = substr($buffer, 0, $pos);
                    $buffer = substr($buffer, $pos + 2);

                    $eventType = null;
                    $eventData = '';
                    foreach (explode("\n", $eventBlock) as $line) {
                        if (str_starts_with($line, 'event:')) {
                            $eventType = trim(substr($line, 6));
                        } elseif (str_starts_with($line, 'data:')) {
                            // SSE allows multiple data: lines per event; concatenate.
                            $eventData .= ltrim(substr($line, 5));
                        }
                    }

                    if ($eventType === null) {
                        continue;
                    }

                    // Cartesia chunk events: data is either raw base64 or a JSON object
                    // with a {data: base64} field. Handle both defensively.
                    if ($eventType === 'chunk') {
                        $decoded = json_decode($eventData, true);
                        $b64 = is_array($decoded) ? ($decoded['data'] ?? null) : $eventData;
                        if (is_string($b64)) {
                            $audioBytes .= base64_decode($b64);
                        }
                    } elseif ($eventType === 'timestamps') {
                        $decoded = json_decode($eventData, true);
                        if (is_array($decoded) && isset($decoded['word_timestamps'])) {
                            $wt = $decoded['word_timestamps'];
                            $words = $wt['words'] ?? [];
                            $starts = $wt['start'] ?? [];
                            foreach ($words as $i => $word) {
                                if (isset($starts[$i])) {
                                    $timepoints[] = [
                                        'markName' => $word,
                                        'timeSeconds' => (float) $starts[$i],
                                    ];
                                }
                            }
                        }
                    } elseif ($eventType === 'error') {
                        Log::error('Cartesia SSE error event', ['data' => $eventData]);
                        $streamErrored = true;
                        break 2;
                    } elseif ($eventType === 'done') {
                        break 2;
                    }
                }
            }

            if ($streamErrored) {
                return response()->json(['error' => 'TTS stream returned an error'], 500);
            }

            Log::info('Cartesia SSE TTS success', [
                'audioSize' => strlen($audioBytes),
                'timepointCount' => count($timepoints),
            ]);

            return response()->json([
                'audio' => base64_encode($audioBytes),
                'timepoints' => $timepoints,
            ]);

        } catch (\Exception $e) {
            Log::error('Cartesia SSE TTS exception', [
                'message' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Failed to generate audio: ' . $e->getMessage()], 500);
        }
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

        $simliApiKey = env('SIMLI_API_KEY');
        $cartesiaApiKey = env('CARTESIA_API_KEY');

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
