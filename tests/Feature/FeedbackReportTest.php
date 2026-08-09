<?php

/**
 * Tests for the POST /api/reports endpoint — user-initiated feedback reports
 * submitted from the extension's "Give feedback" modal.
 *
 * These verify that:
 * 1. A well-formed report is stored and acknowledged with 201
 * 2. Validation rejects missing/oversized fields
 * 3. The endpoint is behind the same API key check as the rest of the API
 * 4. Oversized bodies are rejected and oversized snapshots degrade gracefully
 * 5. Reports are rate limited per browser, not per IP
 */

use App\Models\FeedbackReport;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * A complete, valid payload. Individual tests override single keys so each
 * one states only what it is actually exercising.
 */
function reportPayload(array $overrides = []): array {
    return array_merge([
        'browser_id' => Str::uuid()->toString(),
        'comment' => 'The words were too hard on this page.',
        'name' => 'Sam',
        'page_url' => 'https://example.com/article',
        'page_title' => 'An Example Article',
        'pane' => 'summary',
        'reading_level' => 'Easy',
        'level_mode' => 'manual',
        'slide_index' => 2,
        'slide_count' => 5,
        'simplified_text' => 'This is what Clario showed.',
        'truncated' => false,
        'extension_version' => '0.4.4',
        'user_agent' => 'Mozilla/5.0 (Macintosh)',
    ], $overrides);
}

test('a valid report is stored and returns 201', function() {
    $payload = reportPayload();

    $response = $this->postJson('/api/reports', $payload);

    $response->assertStatus(201)
        ->assertJson(['ok' => true])
        ->assertJsonStructure(['id', 'ok']);

    $report = FeedbackReport::sole();

    expect($report->comment)->toBe($payload['comment'])
        ->and($report->name)->toBe('Sam')
        ->and($report->browser_id)->toBe($payload['browser_id'])
        ->and($report->pane)->toBe('summary')
        ->and($report->reading_level)->toBe('Easy')
        ->and($report->level_mode)->toBe('manual')
        ->and($report->slide_index)->toBe(2)
        ->and($report->slide_count)->toBe(5)
        ->and($report->simplified_text)->toBe('This is what Clario showed.')
        ->and($report->truncated)->toBeFalse()
        ->and($report->extension_version)->toBe('0.4.4')
        ->and($report->created_at)->not->toBeNull();
});

test('a report with no name is stored as anonymous', function() {
    $this->postJson('/api/reports', reportPayload(['name' => null]))
        ->assertStatus(201);

    $report = FeedbackReport::sole();

    expect($report->name)->toBeNull()
        ->and($report->displayName())->toBe('anonymous');
});

test('a report from a pane with no simplified text is accepted', function() {
    $this->postJson('/api/reports', reportPayload([
        'pane' => 'settings',
        'simplified_text' => null,
        'slide_index' => null,
        'slide_count' => null,
    ]))->assertStatus(201);

    expect(FeedbackReport::sole()->simplified_text)->toBeNull();
});

test('a report without a comment is rejected', function() {
    $this->postJson('/api/reports', reportPayload(['comment' => '']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['comment']);

    expect(FeedbackReport::count())->toBe(0);
});

test('an over-long comment is rejected', function() {
    $this->postJson('/api/reports', reportPayload(['comment' => str_repeat('a', 5001)]))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['comment']);
});

test('a report without a valid browser id is rejected', function() {
    $this->postJson('/api/reports', reportPayload(['browser_id' => 'not-a-uuid']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['browser_id']);
});

test('a report from an unknown pane is rejected', function() {
    $this->postJson('/api/reports', reportPayload(['pane' => 'nonsense']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['pane']);
});

test('an unknown reading level is rejected', function() {
    $this->postJson('/api/reports', reportPayload(['reading_level' => 'Impossible']))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reading_level']);
});

test('the endpoint requires the API key when one is configured', function() {
    config()->set('services.clario.api_key', 'test-secret-key');

    $this->postJson('/api/reports', reportPayload())
        ->assertStatus(401);

    expect(FeedbackReport::count())->toBe(0);

    $this->withHeader('X-API-Key', 'test-secret-key')
        ->postJson('/api/reports', reportPayload())
        ->assertStatus(201);
});

test('an oversized request body is rejected before validation', function() {
    // 300 KB is the route's ceiling — enough for both snapshots at their
    // 100 KB caps plus JSON escaping overhead. Push comfortably past it.
    $this->postJson('/api/reports', reportPayload([
        'original_text' => str_repeat('a', 200 * 1024),
        'simplified_text' => str_repeat('b', 200 * 1024),
    ]))->assertStatus(413);

    expect(FeedbackReport::count())->toBe(0);
});

test('an oversized simplified text snapshot is truncated rather than rejected', function() {
    // Over the 100 KB snapshot cap but under the 150 KB body limit, with a
    // multi-byte character sitting exactly astride the cut point so we can
    // prove the cut doesn't split it. Padding is ASCII on purpose: json_encode
    // escapes non-ASCII to \uXXXX, so a snapshot of all multi-byte characters
    // would trip the body limit long before the snapshot cap.
    $cap = 100 * 1024;
    $snapshot = str_repeat('a', $cap - 1) . 'é' . str_repeat('b', 1024);

    $this->postJson('/api/reports', reportPayload([
        'simplified_text' => $snapshot,
        'truncated' => false,
    ]))->assertStatus(201);

    $report = FeedbackReport::sole();

    expect($report->truncated)->toBeTrue()
        ->and(strlen($report->simplified_text))->toBeLessThanOrEqual($cap)
        // The 'é' straddles the cut, so it must be dropped whole rather than
        // leaving a half-written UTF-8 character behind.
        ->and(strlen($report->simplified_text))->toBe($cap - 1)
        ->and(mb_check_encoding($report->simplified_text, 'UTF-8'))->toBeTrue();
});

test('reports are rate limited per browser', function() {
    RateLimiter::clear('feedback-reports');

    $browserId = Str::uuid()->toString();

    foreach (range(1, 20) as $i) {
        $this->postJson('/api/reports', reportPayload(['browser_id' => $browserId]))
            ->assertStatus(201);
    }

    $this->postJson('/api/reports', reportPayload(['browser_id' => $browserId]))
        ->assertStatus(429);

    // A different browser behind the same IP is unaffected — chapter offices
    // may have many testers on one connection.
    $this->postJson('/api/reports', reportPayload(['browser_id' => Str::uuid()->toString()]))
        ->assertStatus(201);

    expect(FeedbackReport::count())->toBe(21);
});

// ------------------------------------------------- original article text

test('the extracted article text is stored alongside the simplified version', function() {
    $this->postJson('/api/reports', reportPayload([
        'original_text' => 'The concierge who makes the impossible happen for her ultrarich clients.',
        'original_truncated' => false,
        'simplified_text' => 'She helps rich people plan trips.',
    ]))->assertStatus(201);

    $report = FeedbackReport::sole();

    expect($report->original_text)->toBe('The concierge who makes the impossible happen for her ultrarich clients.')
        ->and($report->original_truncated)->toBeFalse()
        ->and($report->simplified_text)->toBe('She helps rich people plan trips.');
});

test('a report with no article open stores no original text', function() {
    $this->postJson('/api/reports', reportPayload([
        'pane' => 'settings',
        'original_text' => null,
        'simplified_text' => null,
    ]))->assertStatus(201);

    expect(FeedbackReport::sole()->original_text)->toBeNull();
});

test('an oversized original text is truncated rather than rejected', function() {
    $cap = 100 * 1024;
    $original = str_repeat('a', $cap - 1) . 'é' . str_repeat('b', 1024);

    $this->postJson('/api/reports', reportPayload([
        'original_text' => $original,
        'original_truncated' => false,
    ]))->assertStatus(201);

    $report = FeedbackReport::sole();

    expect($report->original_truncated)->toBeTrue()
        // The multi-byte character straddling the cut is dropped whole.
        ->and(strlen($report->original_text))->toBe($cap - 1)
        ->and(mb_check_encoding($report->original_text, 'UTF-8'))->toBeTrue();
});

test('the two snapshots are truncated independently', function() {
    $cap = 100 * 1024;

    $this->postJson('/api/reports', reportPayload([
        'original_text' => str_repeat('a', $cap + 500),
        'simplified_text' => 'Short and fine.',
    ]))->assertStatus(201);

    $report = FeedbackReport::sole();

    expect($report->original_truncated)->toBeTrue()
        ->and($report->truncated)->toBeFalse()
        ->and($report->simplified_text)->toBe('Short and fine.');
});

test('a report carrying both full-size snapshots is accepted', function() {
    // The regression this guards: two 100 KB fields used to exceed the
    // route's old 150 KB body limit and 413 before validation ran.
    $this->postJson('/api/reports', reportPayload([
        'original_text' => str_repeat('a', 100 * 1024),
        'simplified_text' => str_repeat('b', 100 * 1024),
    ]))->assertStatus(201);

    expect(FeedbackReport::count())->toBe(1);
});
