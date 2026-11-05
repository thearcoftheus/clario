<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which browsers used Clario on which days — the source for the portal's
     * "unique installs" numbers (total, per day/week/month, new vs returning).
     *
     * Deliberately presence-only: one row per (browser_id, UTC day), written
     * by RecordInstallActivity from the `X-Clario-Browser-Id` header. No
     * timestamp, no endpoint, no content, no IP. A row says "this browser
     * made at least one request on this date" and nothing else, so the table
     * cannot be turned into a per-person timeline of what was read or when.
     *
     * This is the ONE sanctioned home for browser_id on the server besides
     * feedback_reports. `api_metrics` and `api_call_counts` stay identity-free.
     *
     * No pruning: rows are ~100 bytes and "total unique installs" needs them
     * all. If pruning is ever added it must keep each browser's earliest day,
     * or the new/returning split and the all-time total break.
     */
    public function up(): void
    {
        Schema::create('install_activity', function (Blueprint $table) {
            $table->string('browser_id', 36); // Anonymous per-browser-profile UUID
            $table->date('day');

            // PK leads on browser_id: serves "first day per browser".
            $table->primary(['browser_id', 'day']);
            // The dashboard scans by day range; the PK can't serve that.
            $table->index('day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('install_activity');
    }
};
