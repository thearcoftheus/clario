<?php

namespace App\Http\Middleware;

use App\Models\ApiMetric;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackApiMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $durationMs = (int) round((microtime(true) - $start) * 1000);

        try {
            ApiMetric::create([
                'endpoint' => '/' . $request->path(),
                'method' => $request->method(),
                'route_name' => $request->route()?->getName(),
                'duration_ms' => $durationMs,
                'status_code' => $response->getStatusCode(),
                'content_length' => strlen($request->getContent()),
            ]);
        } catch (\Throwable $e) {
            // Don't let metrics tracking break the actual response
            report($e);
        }

        return $response;
    }
}
