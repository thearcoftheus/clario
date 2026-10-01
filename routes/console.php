<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cached TTS audio is derived from page content, so it must not live on the
// server indefinitely. Requires `php artisan schedule:run` in cron (see CLAUDE.md).
Schedule::command('clario:prune-audio-cache --days=7')->dailyAt('03:30');
