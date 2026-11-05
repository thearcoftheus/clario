<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * One row per (browser, UTC day) on which that browser made an API request.
 * See the migration for why this is presence-only.
 */
class InstallActivity extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $table = 'install_activity';

    protected $fillable = ['browser_id', 'day'];

    protected $casts = [
        'day' => 'date',
    ];

    /**
     * Mark a browser as active on a day. Idempotent: a second call for the
     * same browser and day is a no-op.
     *
     * Never allowed to break the request it is counting.
     */
    public static function record(string $browserId, ?string $day = null): void
    {
        // UTC, like ApiCallCount::bump and the dashboard's DATE(created_at).
        $day ??= now()->toDateString();

        try {
            DB::table('install_activity')->insertOrIgnore([
                'browser_id' => $browserId,
                'day' => $day,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
