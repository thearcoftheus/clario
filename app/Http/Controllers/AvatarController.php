<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;

class AvatarController extends Controller
{
    private const PRESENTER_ID = 'v2_public_Alyssa_NoHands_BlackShirt_Home@Mvn6Nalx90';
    private const MAX_SUMMARY_LENGTH = 1000;

    // Map simplification level to reading-level description (no audience-as-children framing).
    private const READING_LEVELS = [
        'Easy' => 'a Grade 2-3 reading level',
        'Moderate' => 'a Grade 5-6 reading level',
        'Challenging' => 'a Grade 9-10 reading level',
    ];

    private function getAuthHeader(): string
    {
        $apiKey = env('DID_API_KEY');
        return 'Basic ' . base64_encode($apiKey);
    }

    private function getReadingLevelGrade(string $level): string
    {
        return self::READING_LEVELS[$level] ?? self::READING_LEVELS['Easy'];
    }

    private function condenseSummary(string $summary, int $maxLength, string $readingLevel): string
    {
        $grade = $this->getReadingLevelGrade($readingLevel);

        $prompt = <<<PROMPT
You are a helpful assistant that rewrites complex topics in plain language for adult readers whose comfortable reading level is around {$grade}.
Your audience is adults — including adults with intellectual or developmental disabilities. Address the reader as an adult; do not use childlike phrasing such as "grown-ups," "boys and girls," "kiddos," or similar terms geared toward children. When referring to adult people, use "adults."

Condense the following summary into a shorter version that is no longer than {$maxLength} characters.
Use everyday words and short sentences while keeping the original meaning.
Keep the most important information and maintain a natural, conversational tone suitable for being read aloud.
Do not use any markdown formatting, bullet points, or special characters.
Write in plain text only, as this will be spoken by a voice avatar.
Output ONLY the condensed summary text, nothing else.

Summary to condense:
{$summary}
PROMPT;

        try {
            $response = Prism::text()
                ->using(Provider::Gemini, 'gemini-2.5-flash')
                ->withMaxTokens(1500)
                ->withProviderOptions(['thinkingBudget' => 0])
                ->withPrompt($prompt)
                ->asText();

            return trim($response->text);
        } catch (\Exception $e) {
            Log::error('Failed to condense summary', ['error' => $e->getMessage()]);
            // Fallback: just truncate cleanly at a sentence boundary if possible
            $truncated = substr($summary, 0, $maxLength);
            $lastPeriod = strrpos($truncated, '.');
            if ($lastPeriod !== false && $lastPeriod > $maxLength * 0.5) {
                return substr($truncated, 0, $lastPeriod + 1);
            }
            return $truncated;
        }
    }

    private function extractTitleFromSummary(string $summary): ?string
    {
        // Look for the first markdown heading (# or ##)
        if (preg_match('/^#{1,2}\s+(.+?)$/m', $summary, $matches)) {
            $title = trim($matches[1]);
            // Remove any trailing markdown formatting
            $title = preg_replace('/\*\*(.+?)\*\*/', '$1', $title);
            $title = preg_replace('/__(.+?)__/', '$1', $title);
            return $title;
        }
        return null;
    }

    private function cleanPageTitle(string $title): string
    {
        // Common patterns to remove from page titles
        // These typically appear at the end: " - Site Name", " | Site Name", " — Site Name"
        $patterns = [
            // Match " - Site Name" or " | Site Name" or " — Site Name" at the end
            '/\s*[\-\|—–]\s*(?:The\s+)?(?:New York Times|NYT|Washington Post|CNN|BBC|NPR|Guardian|Forbes|Reuters|AP News|USA Today|Wall Street Journal|WSJ|Bloomberg|CNBC|Fox News|NBC News|CBS News|ABC News|Politico|The Atlantic|Vox|Vice|Wired|TechCrunch|The Verge|Ars Technica|Mashable|Engadget|Gizmodo|Slate|Salon|HuffPost|BuzzFeed|Medium|Substack|Wikipedia).*$/i',
            // Generic pattern: remove " - Anything" or " | Anything" at end if it looks like a site name (starts with capital)
            '/\s*[\-\|—–]\s+[A-Z][A-Za-z\s]{2,30}$/',
        ];

        foreach ($patterns as $pattern) {
            $cleaned = preg_replace($pattern, '', $title);
            if ($cleaned && $cleaned !== $title) {
                return trim($cleaned);
            }
        }

        return trim($title);
    }

    private function determineTitle(string $pageTitle, string $summary): string
    {
        // First, try to extract title from the summary's first heading
        $extractedTitle = $this->extractTitleFromSummary($summary);
        if ($extractedTitle) {
            return $extractedTitle;
        }

        // Otherwise, clean up the page title
        return $this->cleanPageTitle($pageTitle);
    }

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
        $readingLevel = $validated['simplificationLevel'] ?? 'Easy';

        // Determine the best title (from summary heading or cleaned page title)
        $title = $this->determineTitle($validated['title'], $rawSummary);

        $summary = $this->stripMarkdown($rawSummary);

        // If summary is too long, use AI to condense it
        if (strlen($summary) > self::MAX_SUMMARY_LENGTH) {
            $summary = $this->condenseSummary($summary, self::MAX_SUMMARY_LENGTH, $readingLevel);
        }

        // Build the script
        $script = "This article is called {$title}. Here's what it's about. {$summary}";

        return response()->json([
            'script' => $script,
        ]);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'summary' => 'required|string',
            'simplificationLevel' => 'sometimes|string',
        ]);

        $rawSummary = $validated['summary'];
        $readingLevel = $validated['simplificationLevel'] ?? 'Easy';

        // Determine the best title (from summary heading or cleaned page title)
        $title = $this->determineTitle($validated['title'], $rawSummary);

        $summary = $this->stripMarkdown($rawSummary);

        // If summary is too long, use AI to condense it
        if (strlen($summary) > self::MAX_SUMMARY_LENGTH) {
            $summary = $this->condenseSummary($summary, self::MAX_SUMMARY_LENGTH, $readingLevel);
        }

        // Build the script
        $script = "This article is called {$title}. Here's what it's about. {$summary}";

        try {
            $response = Http::withHeaders([
                'Authorization' => $this->getAuthHeader(),
                'Content-Type' => 'application/json',
            ])->post('https://api.d-id.com/clips', [
                'presenter_id' => self::PRESENTER_ID,
                'script' => [
                    'type' => 'text',
                    'input' => $script,
                    'provider' => [
                        'type' => 'microsoft',
                        'voice_id' => 'en-US-JennyNeural',
                    ],
                ],
            ]);

            if (!$response->successful()) {
                Log::error('D-ID API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json(['error' => 'Failed to generate avatar video'], 500);
            }

            $data = $response->json();

            return response()->json([
                'jobId' => $data['id'] ?? null,
                'script' => $script,
            ]);

        } catch (\Exception $e) {
            Log::error('D-ID API exception', [
                'message' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Failed to generate avatar video'], 500);
        }
    }

    public function status(string $jobId)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => $this->getAuthHeader(),
                'Content-Type' => 'application/json',
            ])->get("https://api.d-id.com/clips/{$jobId}");

            if (!$response->successful()) {
                Log::error('D-ID status API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json(['error' => 'Failed to get status'], 500);
            }

            $data = $response->json();
            $status = $data['status'] ?? 'unknown';

            $result = ['status' => $status];

            // When done, include the video URL
            if ($status === 'done' && isset($data['result_url'])) {
                $result['videoUrl'] = $data['result_url'];
            }

            // Pass through error information if present
            if ($status === 'error' && isset($data['error'])) {
                $result['error'] = $data['error'];
            }

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('D-ID status API exception', [
                'message' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Failed to get status'], 500);
        }
    }

    /**
     * Generate PCM16 audio using Cartesia TTS
     * Returns raw PCM16 audio at 16kHz for streaming to Simli
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
            Log::info('Cartesia TTS request', [
                'textLength' => strlen($validated['text']),
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $cartesiaApiKey,
                'Cartesia-Version' => '2024-11-13',
                'Content-Type' => 'application/json',
            ])->timeout(60)->post('https://api.cartesia.ai/tts/bytes', [
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
            ]);

            if (!$response->successful()) {
                Log::error('Cartesia TTS error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return response()->json([
                    'error' => 'Failed to generate audio',
                    'details' => $response->body(),
                ], 500);
            }

            $audioBytes = $response->body();

            Log::info('Cartesia TTS success', [
                'audioSize' => strlen($audioBytes),
            ]);

            // Return raw PCM16 audio
            return response($audioBytes, 200, [
                'Content-Type' => 'audio/pcm',
                'Content-Length' => strlen($audioBytes),
            ]);

        } catch (\Exception $e) {
            Log::error('Cartesia TTS exception', [
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
            ])->timeout(60)->post('https://api.cartesia.ai/tts/bytes', [
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
