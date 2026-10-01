<?php

namespace App\Console\Commands;

use App\Http\Controllers\AvatarController;
use App\Services\NarrationService;
use Illuminate\Console\Command;

/**
 * Prune the on-disk TTS caches under storage/app/narrations and storage/app/avatar.
 *
 * These caches exist to avoid paying a provider twice for the same text, but
 * they are also a spoken rendering of the simplified article — and the avatar
 * timepoint JSON holds the words themselves. So this is a privacy control as
 * much as a disk-space one: nothing derived from page content should sit on
 * the server indefinitely. Scheduled daily in routes/console.php; needs the
 * standard `schedule:run` cron on the server.
 */
class PruneAudioCache extends Command
{
    protected $signature = 'clario:prune-audio-cache
        {--days=7 : Delete cached audio older than this many days}';

    protected $description = 'Delete cached Listen (narrations/) and Watch (avatar/) audio older than N days';

    public function handle(NarrationService $narration, AvatarController $avatar): int
    {
        $days = (int) $this->option('days');

        if ($days < 1) {
            $this->error('--days must be at least 1.');
            return self::FAILURE;
        }

        $narrations = $narration->cleanupCache($days);
        $avatars = $avatar->cleanupCache($days);

        $this->info("Pruned {$narrations} narration file(s) and {$avatars} avatar file(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
