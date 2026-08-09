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
                'trigger' => $this->trigger($request),
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

    /**
     * Why the client says it made this request. Only some routes send one.
     *
     * Read defensively: this arrives from the extension, it's stored raw, and
     * a metrics field must never be able to break the request it describes.
     */
    private function trigger(Request $request): ?string
    {
        $trigger = $request->input('trigger');

        if (! is_string($trigger) || $trigger === '') {
            return null;
        }

        return in_array($trigger, ApiMetric::TRIGGERS, true) ? $trigger : null;
    }
}
