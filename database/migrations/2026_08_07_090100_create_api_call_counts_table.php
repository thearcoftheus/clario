<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Daily tally of OUTBOUND calls to paid providers (Gemini, Google TTS,
     * Cartesia, Simli), for cost visibility as the tester cohort ramps.
     *
     * Deliberately aggregation-only: one row per service per day, with no
     * timestamps, no browser_id, and no request content. A daily count can't
     * say anything about any individual, which keeps the "behavioral data
     * stays on your machine" story intact.
     *
     * Distinct from `api_metrics`, which the TrackApiMetrics middleware fills
     * with INBOUND requests to this app. The two differ wherever a cached
     * response means no provider call was made.
     */
    public function up(): void
    {
        Schema::create('api_call_counts', function (Blueprint $table) {
            $table->date('day');
            $table->string('service', 30);
            $table->unsignedInteger('count')->default(0);

            $table->primary(['day', 'service']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_call_counts');
    }
};
