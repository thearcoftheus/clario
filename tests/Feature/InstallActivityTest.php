<?php

/**
 * Tests for anonymous install counting: the `X-Clario-Browser-Id` header is
 * turned into one (browser_id, day) row per browser per day, and nothing else.
 *
 * Driven through POST /api/readability because it is the one API route that
 * calls no paid provider.
 */

use App\Http\Middleware\RecordInstallActivity;
use App\Models\InstallActivity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function activityRows(): \Illuminate\Support\Collection {
    return DB::table('install_activity')->get();
}

function readabilityWith(?string $browserId, array $body = ['content' => 'Hello world. This is a test.']) {
    $headers = $browserId === null ? [] : [RecordInstallActivity::HEADER => $browserId];

    return test()->withHeaders($headers)->postJson('/api/readability', $body);
}

test('a request with a valid browser id header records one row for today', function() {
    $id = Str::uuid()->toString();

    readabilityWith($id)->assertOk();

    $row = DB::table('install_activity')->sole();

    expect($row->browser_id)->toBe($id)
        ->and($row->day)->toBe(now()->toDateString());
});

test('two requests from the same browser on the same day record one row', function() {
    $id = Str::uuid()->toString();

    readabilityWith($id)->assertOk();
    readabilityWith($id)->assertOk();

    expect(activityRows())->toHaveCount(1);
});

test('two different browsers record two rows', function() {
    readabilityWith(Str::uuid()->toString())->assertOk();
    readabilityWith(Str::uuid()->toString())->assertOk();

    expect(activityRows())->toHaveCount(2);
});

test('a malformed header records nothing and the request still succeeds', function() {
    readabilityWith('not-a-uuid')->assertOk();

    expect(activityRows())->toHaveCount(0);
});

test('a missing header records nothing', function() {
    readabilityWith(null)->assertOk();

    expect(activityRows())->toHaveCount(0);
});

test('an uppercase browser id is normalised to lowercase', function() {
    $id = Str::uuid()->toString();

    readabilityWith(strtoupper($id))->assertOk();
    readabilityWith($id)->assertOk();

    expect(activityRows())->toHaveCount(1)
        ->and(DB::table('install_activity')->sole()->browser_id)->toBe($id);
});

test('a request that fails validation still counts as activity', function() {
    $id = Str::uuid()->toString();

    readabilityWith($id, [])->assertStatus(422);

    expect(activityRows())->toHaveCount(1);
});

test('a request rejected by the api key check records nothing', function() {
    config()->set('services.clario.api_key', 'secret-key');

    readabilityWith(Str::uuid()->toString())->assertStatus(401);

    expect(activityRows())->toHaveCount(0);
});

test('the table stores nothing but a browser id and a day', function() {
    InstallActivity::record(Str::uuid()->toString());

    $columns = array_keys((array) DB::table('install_activity')->sole());

    expect($columns)->toEqualCanonicalizing(['browser_id', 'day']);
});

test('a recording failure never breaks the caller', function() {
    DB::statement('DROP TABLE install_activity');

    expect(fn() => InstallActivity::record(Str::uuid()->toString()))->not->toThrow(Exception::class);
});
