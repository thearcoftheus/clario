<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('local')) {
            $this->silenceVendorDeprecations();
        }

        $this->configureRateLimiting();
    }

    /**
     * Guard the feedback endpoint against an accidental client-side loop.
     * Keyed on browser_id rather than IP: a chapter office may have many
     * testers behind one NAT, and rate-limiting them as a group would drop
     * real reports. Falls back to IP when browser_id is missing or malformed,
     * which only happens on requests that will fail validation anyway.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('feedback-reports', function (Request $request) {
            $browserId = $request->input('browser_id');
            $key = is_string($browserId) && $browserId !== ''
                ? 'browser:' . sha1($browserId)
                : 'ip:' . $request->ip();

            return Limit::perHour(20)->by($key);
        });

        // Portal login. Keyed on email + IP so one person fat-fingering their
        // password can't lock out a colleague on the same connection.
        RateLimiter::for('portal-login', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinute(5)->by(mb_strtolower($email) . '|' . $request->ip());
        });
    }

    // Laravel 12 always routes E_USER_DEPRECATED through the logger, so pail
    // floods with vendor deprecation noise. Swallow vendor-emitted ones here.
    private function silenceVendorDeprecations(): void
    {
        $previous = null;
        $previous = set_error_handler(function ($level, $message, $file = '', $line = 0) use (&$previous) {
            if ($level === E_USER_DEPRECATED && str_contains($file, '/vendor/')) {
                return true;
            }
            return $previous ? $previous($level, $message, $file, $line) : false;
        });
    }
}
