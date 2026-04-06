<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiKey
{
    /**
     * Handle an incoming request.
     *
     * Validates that the request includes a valid API key in the X-API-Key header.
     * If CLARIO_API_KEY is not set in .env, authentication is skipped (for local development).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('services.clario.api_key');

        // If no API key is configured, skip validation (local development)
        if (empty($expectedKey)) {
            return $next($request);
        }

        $providedKey = $request->header('X-API-Key');

        if (empty($providedKey) || $providedKey !== $expectedKey) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or missing API key',
            ], 401);
        }

        return $next($request);
    }
}
