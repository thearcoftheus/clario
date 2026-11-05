<?php

namespace App\Http\Middleware;

use App\Models\InstallActivity;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records that the requesting browser used Clario today, from the anonymous
 * ID the extension sends in `X-Clario-Browser-Id`.
 *
 * Kept separate from TrackApiMetrics on purpose: that middleware's contract is
 * that api_metrics never carries an identifier, and this one's is that
 * install_activity never carries anything but an identifier and a date.
 *
 * The header is optional. Older extension builds don't send it, and a
 * missing or malformed value must never affect the response — the request
 * is simply not counted.
 */
class RecordInstallActivity
{
    public const HEADER = 'X-Clario-Browser-Id';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Recorded whatever the status code: a 422 or 500 is still a browser
        // with Clario installed and in use, and leaving those out would make
        // the install count dip exactly when the server misbehaves. 401s never
        // get here because ValidateApiKey runs first.
        $id = $request->header(self::HEADER);

        if (is_string($id) && Str::isUuid($id)) {
            InstallActivity::record(strtolower($id));
        }

        return $response;
    }
}
