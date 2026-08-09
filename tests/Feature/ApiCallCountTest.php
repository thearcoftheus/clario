<?php

/**
 * Tests for the daily outbound-provider call tally.
 *
 * This table exists for cost visibility and is deliberately aggregation-only:
 * one row per service per day, no timestamps, no browser_id, no content.
 */

use App\Models\ApiCallCount;
use Illuminate\Support\Facades\DB;

test('the first call of the day creates a row at one', function() {
    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);

    $row = DB::table('api_call_counts')->sole();

    expect($row->service)->toBe('simplify')
        ->and($row->count)->toBe(1)
        ->and($row->day)->toBe(now()->toDateString());
});

test('repeat calls increment the same row rather than adding new ones', function() {
    foreach (range(1, 5) as $i) {
        ApiCallCount::bump(ApiCallCount::SERVICE_CHAT);
    }

    expect(DB::table('api_call_counts')->count())->toBe(1)
        ->and(DB::table('api_call_counts')->sole()->count)->toBe(5);
});

test('each service is tallied separately', function() {
    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);
    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);
    ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO);

    $counts = DB::table('api_call_counts')->pluck('count', 'service');

    expect($counts['simplify'])->toBe(2)
        ->and($counts['audio'])->toBe(1);
});

test('each day is tallied separately', function() {
    ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO, '2026-08-01');
    ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO, '2026-08-01');
    ApiCallCount::bump(ApiCallCount::SERVICE_AUDIO, '2026-08-02');

    expect(DB::table('api_call_counts')->count())->toBe(2)
        ->and(DB::table('api_call_counts')->where('day', '2026-08-01')->sole()->count)->toBe(2)
        ->and(DB::table('api_call_counts')->where('day', '2026-08-02')->sole()->count)->toBe(1);
});

test('the tally stores nothing that could identify a user', function() {
    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);

    $columns = array_keys((array) DB::table('api_call_counts')->sole());

    expect($columns)->toEqualCanonicalizing(['day', 'service', 'count']);
});

test('a counter failure never breaks the caller', function() {
    // Simulate the table being unavailable — a metrics problem must not take
    // down a real user request.
    DB::statement('DROP TABLE api_call_counts');

    expect(fn() => ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY))->not->toThrow(Exception::class);
});
