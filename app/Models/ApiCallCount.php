<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Daily per-service tally of outbound provider calls. See the migration for
 * why this is aggregation-only and how it differs from ApiMetric.
 */
class ApiCallCount extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $table = 'api_call_counts';

    protected $fillable = ['day', 'service', 'count'];

    protected $casts = [
        'day' => 'date',
        'count' => 'integer',
    ];

    // The services we pay for, one per provider-facing code path.
    public const SERVICE_SIMPLIFY = 'simplify';       // Gemini — SummaryAgent
    public const SERVICE_HEADLINE = 'headline';       // Gemini — HeadlineAgent
    public const SERVICE_CHAT = 'chat';               // Gemini — ChatAgent
    public const SERVICE_AUDIO = 'audio';             // Google Cloud TTS
    public const SERVICE_VIDEO_TTS = 'video_tts';     // Cartesia
    public const SERVICE_VIDEO_STREAM = 'video_stream'; // Simli

    public const SERVICES = [
        self::SERVICE_SIMPLIFY,
        self::SERVICE_HEADLINE,
        self::SERVICE_CHAT,
        self::SERVICE_AUDIO,
        self::SERVICE_VIDEO_TTS,
        self::SERVICE_VIDEO_STREAM,
    ];

    public const SERVICE_LABELS = [
        self::SERVICE_SIMPLIFY => 'Simplify',
        self::SERVICE_HEADLINE => 'Headline',
        self::SERVICE_CHAT => 'Chat',
        self::SERVICE_AUDIO => 'Audio (TTS)',
        self::SERVICE_VIDEO_TTS => 'Video audio',
        self::SERVICE_VIDEO_STREAM => 'Video stream',
    ];

    /**
     * Record one outbound call. Call this only on a genuine provider hit —
     * never on a cache hit, or the numbers stop tracking spend.
     *
     * Never allowed to break the request it is counting.
     */
    public static function bump(string $service, ?string $day = null): void
    {
        $day ??= now()->toDateString();

        try {
            // Atomic upsert: insert the row at 1, or add 1 if today's row for
            // this service already exists.
            DB::table('api_call_counts')->upsert(
                [['day' => $day, 'service' => $service, 'count' => 1]],
                ['day', 'service'],
                ['count' => DB::raw('api_call_counts.count + 1')],
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
