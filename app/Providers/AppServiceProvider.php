<?php

namespace App\Providers;

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
