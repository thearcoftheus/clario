<?php

/**
 * Tests for POST /api/avatar/simli/session: the server mints the Simli
 * session with the key from .env so the key never ships in the extension.
 */

use App\Http\Middleware\RecordInstallActivity;
use App\Models\ApiCallCount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

const SIMLI_TEST_KEY = 'simli-secret-key-for-tests';

function fakeSimli(array $overrides = []): void {
    Http::fake(array_merge([
        'api.simli.ai/compose/token' => Http::response(['session_token' => 'tok_123'], 200),
        'api.simli.ai/compose/ice' => Http::response([
            ['urls' => ['stun:stun.simli.ai:3478']],
            ['urls' => ['turn:turn.simli.ai:3478'], 'username' => 'u', 'credential' => 'c'],
        ], 200),
    ], $overrides));
}

function requestSession(?string $browserId = null) {
    $headers = $browserId === null ? [] : [RecordInstallActivity::HEADER => $browserId];

    return test()->withHeaders($headers)->postJson('/api/avatar/simli/session');
}

beforeEach(function() {
    config()->set('services.simli.api_key', SIMLI_TEST_KEY);
    config()->set('services.simli.face_id', 'face-abc');
});

test('it returns a session token and the ICE servers Simli gave', function() {
    fakeSimli();

    requestSession()
        ->assertOk()
        ->assertExactJson([
            'session_token' => 'tok_123',
            'ice_servers' => [
                ['urls' => ['stun:stun.simli.ai:3478']],
                ['urls' => ['turn:turn.simli.ai:3478'], 'username' => 'u', 'credential' => 'c'],
            ],
        ]);
});

test('it sends the server-side key and the configured face to Simli', function() {
    fakeSimli();

    requestSession()->assertOk();

    Http::assertSent(fn($request) => $request->url() === 'https://api.simli.ai/compose/token'
        && $request->hasHeader('x-simli-api-key', SIMLI_TEST_KEY)
        && $request['faceId'] === 'face-abc'
        && $request['handleSilence'] === true);

    Http::assertSent(fn($request) => $request->url() === 'https://api.simli.ai/compose/ice'
        && $request->hasHeader('x-simli-api-key', SIMLI_TEST_KEY));
});

test('the key never appears in the response', function() {
    fakeSimli();

    $response = requestSession()->assertOk();

    expect($response->getContent())->not->toContain(SIMLI_TEST_KEY);
});

test('a successful session counts as one video stream call', function() {
    fakeSimli();

    requestSession()->assertOk();
    requestSession()->assertOk();

    $row = DB::table('api_call_counts')->sole();

    expect($row->service)->toBe(ApiCallCount::SERVICE_VIDEO_STREAM)
        ->and($row->count)->toBe(2);
});

test('a rejected key gives a 502 without leaking the reason, and counts nothing', function() {
    fakeSimli(['api.simli.ai/compose/token' => Http::response(['detail' => 'Invalid API key'], 401)]);

    $response = requestSession()->assertStatus(502);

    expect($response->json('error'))->toBe('Could not start the video service')
        ->and($response->getContent())->not->toContain('Invalid API key')
        ->and(DB::table('api_call_counts')->count())->toBe(0);
});

test('a token response without a token is treated as a failure', function() {
    fakeSimli(['api.simli.ai/compose/token' => Http::response(['unexpected' => true], 200)]);

    requestSession()->assertStatus(502);
});

test('an unreachable Simli gives a 502', function() {
    fakeSimli(['api.simli.ai/compose/token' => fn() => throw new \Illuminate\Http\Client\ConnectionException('timeout')]);

    requestSession()->assertStatus(502)->assertJson(['error' => 'Could not reach the video service']);
});

test('an ICE failure falls back to the public STUN server rather than failing', function() {
    fakeSimli(['api.simli.ai/compose/ice' => Http::response('nope', 500)]);

    requestSession()
        ->assertOk()
        ->assertJson([
            'session_token' => 'tok_123',
            'ice_servers' => [['urls' => ['stun:stun.l.google.com:19302']]],
        ]);
});

test('it refuses when no Simli key is configured', function() {
    config()->set('services.simli.api_key', null);
    fakeSimli();

    requestSession()->assertStatus(500);

    Http::assertNothingSent();
});

test('it requires the Clario API key like every other route', function() {
    config()->set('services.clario.api_key', 'clario-key');
    fakeSimli();

    requestSession()->assertStatus(401);

    Http::assertNothingSent();
});

test('a browser is limited to 30 sessions an hour', function() {
    fakeSimli();
    $browser = Str::uuid()->toString();

    foreach (range(1, 30) as $i) {
        requestSession($browser)->assertOk();
    }

    requestSession($browser)->assertStatus(429);

    // A different browser is unaffected.
    requestSession(Str::uuid()->toString())->assertOk();
});
