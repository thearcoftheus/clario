<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AvatarController extends Controller
{
    // Ella presenter - closest match to Emma (Emma not available in D-ID)
    private const PRESENTER_ID = 'v2_public_ella@p9l_fpg2_k';
    private const MAX_SUMMARY_LENGTH = 800;

    private function getAuthHeader(): string
    {
        $apiKey = env('DID_API_KEY');
        return 'Basic ' . base64_encode($apiKey);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'summary' => 'required|string',
        ]);

        $title = $validated['title'];
        $summary = $validated['summary'];

        // Truncate summary if needed
        if (strlen($summary) > self::MAX_SUMMARY_LENGTH) {
            $summary = substr($summary, 0, self::MAX_SUMMARY_LENGTH - 3) . '...';
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
}
