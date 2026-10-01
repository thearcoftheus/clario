<?php

use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

function putAged(string $path, int $daysOld): void
{
    Storage::put($path, 'x');
    $mtime = now()->subDays($daysOld)->timestamp;
    touch(Storage::path($path), $mtime, $mtime);
}

test('prunes narration and avatar files older than the cutoff and keeps newer ones', function () {
    putAged('narrations/old.mp3', 10);
    putAged('narrations/old_timepoints.json', 10);
    putAged('narrations/fresh.mp3', 1);
    putAged('avatar/old.pcm', 10);
    putAged('avatar/old.json', 10);
    putAged('avatar/fresh.pcm', 1);

    $this->artisan('clario:prune-audio-cache', ['--days' => 7])
        ->expectsOutputToContain('Pruned 2 narration file(s) and 2 avatar file(s)')
        ->assertSuccessful();

    Storage::assertMissing(['narrations/old.mp3', 'narrations/old_timepoints.json', 'avatar/old.pcm', 'avatar/old.json']);
    Storage::assertExists(['narrations/fresh.mp3', 'avatar/fresh.pcm']);
});

test('succeeds when the cache directories are empty', function () {
    $this->artisan('clario:prune-audio-cache')
        ->expectsOutputToContain('Pruned 0 narration file(s) and 0 avatar file(s)')
        ->assertSuccessful();
});

test('rejects a non-positive day count', function () {
    $this->artisan('clario:prune-audio-cache', ['--days' => 0])->assertFailed();
});

test('the prune command is scheduled daily', function () {
    $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
        ->filter(fn ($e) => str_contains($e->command, 'clario:prune-audio-cache'));

    expect($events)->toHaveCount(1);
    expect($events->first()->expression)->toBe('30 3 * * *');
});
