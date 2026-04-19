<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiMetric extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'endpoint',
        'method',
        'route_name',
        'duration_ms',
        'status_code',
        'content_length',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
