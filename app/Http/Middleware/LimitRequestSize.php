<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects oversized request bodies before they reach validation.
 *
 * Used on the feedback endpoint, where a report carries a snapshot of the
 * simplified article text and a runaway page could otherwise push a very
 * large body through JSON decoding.
 *
 * Usage: ->middleware(LimitRequestSize::class . ':153600')
 */
class LimitRequestSize
{
    public function handle(Request $request, Closure $next, int $maxBytes): Response
    {
        if (strlen($request->getContent()) > $maxBytes) {
            return response()->json([
                'error' => 'Payload too large',
                'message' => 'That report is too big to send.',
            ], 413);
        }

        return $next($request);
    }
}
