<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiMetric extends Model
{
    public $timestamps = false;

    /**
     * Why the client made the request, where it can say.
     *
     * PREFETCH   — Clario generated this on its own when the sidebar opened.
     *              Not evidence that anyone wanted it.
     * REGENERATE — the user changed a content-affecting setting (reading
     *              level, summary length, emoji) on an article they had open.
     *              Real engagement: they were reading and wanted it different.
     */
    public const TRIGGER_PREFETCH = 'prefetch';
    public const TRIGGER_REGENERATE = 'regenerate';

    public const TRIGGERS = [
        self::TRIGGER_PREFETCH,
        self::TRIGGER_REGENERATE,
    ];

    protected $fillable = [
        'endpoint',
        'method',
        'route_name',
        'trigger',
        'duration_ms',
        'status_code',
        'content_length',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
