<?php

/**
 * Tests for the Clario management portal — auth boundary, feedback review
 * pages, filtering, and CSV export.
 */

use App\Models\ApiCallCount;
use App\Models\FeedbackReport;
use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

function makeReport(array $attributes = []): FeedbackReport {
    // created_at is deliberately NOT mass-assignable — the server owns the
    // timestamp, so a client can't backdate a report. Tests still need to,
    // hence the explicit write after create.
    $createdAt = $attributes['created_at'] ?? now();
    unset($attributes['created_at']);

    $report = FeedbackReport::create(array_merge([
        'browser_id' => Str::uuid()->toString(),
        'comment' => 'Something went wrong.',
        'page_url' => 'https://example.com/article',
        'page_title' => 'An Example Article',
        'pane' => 'summary',
        'reading_level' => 'Easy',
        'level_mode' => 'manual',
        'simplified_text' => 'The simple version.',
    ], $attributes));

    $report->forceFill(['created_at' => $createdAt])->save();

    return $report->refresh();
}

function portalUser(): User {
    return User::factory()->create();
}

// ---------------------------------------------------------------- auth

test('the dashboard redirects guests to the login page', function() {
    $this->get('/portal')->assertRedirect('/portal/login');
});

test('the reports list redirects guests to the login page', function() {
    $this->get('/portal/reports')->assertRedirect('/portal/login');
});

test('a report detail page redirects guests to the login page', function() {
    $report = makeReport();

    $this->get("/portal/reports/{$report->id}")->assertRedirect('/portal/login');
});

test('the CSV export redirects guests to the login page', function() {
    $this->get('/portal/reports/export')->assertRedirect('/portal/login');
});

test('a user with the right password can log in', function() {
    $user = User::factory()->create(['password' => bcrypt('correct-horse')]);

    $this->post('/portal/login', [
        'email' => $user->email,
        'password' => 'correct-horse',
    ])->assertRedirect(route('portal.dashboard'));

    $this->assertAuthenticatedAs($user);
});

test('a wrong password does not log anyone in', function() {
    $user = User::factory()->create(['password' => bcrypt('correct-horse')]);

    $this->from('/portal/login')->post('/portal/login', [
        'email' => $user->email,
        'password' => 'wrong',
    ])->assertRedirect('/portal/login')->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('login attempts are rate limited', function() {
    RateLimiter::clear('portal-login');

    $user = User::factory()->create(['password' => bcrypt('correct-horse')]);

    foreach (range(1, 5) as $i) {
        $this->post('/portal/login', ['email' => $user->email, 'password' => 'wrong']);
    }

    $this->post('/portal/login', ['email' => $user->email, 'password' => 'wrong'])
        ->assertStatus(429);
});

test('a logged-in user can log out', function() {
    $this->actingAs(portalUser())
        ->post('/portal/logout')
        ->assertRedirect(route('portal.login'));

    $this->assertGuest();
});

// ---------------------------------------------------------------- dashboard

test('the dashboard renders with no data at all', function() {
    $this->actingAs(portalUser())
        ->get('/portal')
        ->assertOk()
        ->assertSee('Usage')
        ->assertSee('API metrics')
        ->assertSee('No reports yet.');
});

test('the dashboard shows report counts and usage', function() {
    makeReport(['comment' => 'The first report']);
    makeReport(['created_at' => now()->subDays(30)]);

    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);
    ApiCallCount::bump(ApiCallCount::SERVICE_SIMPLIFY);

    $response = $this->actingAs(portalUser())->get('/portal');

    $response->assertOk()
        ->assertSee('The first report')
        ->assertSee('Simplify')
        // 2 reports all-time, 1 in the last 7 days.
        ->assertSee('Reports, all time');

    expect($response->viewData('reportStats'))
        ->toMatchArray(['total' => 2, 'last7' => 1, 'browsers' => 2]);
});

test('the dashboard week-over-week change handles a zero baseline', function() {
    ApiCallCount::bump(ApiCallCount::SERVICE_CHAT, now()->toDateString());

    $response = $this->actingAs(portalUser())->get('/portal');

    $chat = collect($response->viewData('usageThisWeek'))->firstWhere('service', 'chat');

    expect($chat['current'])->toBe(1)
        ->and($chat['previous'])->toBe(0)
        // Null rather than a nonsense percentage increase from nothing.
        ->and($chat['delta'])->toBeNull();
});

// ---------------------------------------------------------------- list

test('the reports list shows reports newest first', function() {
    makeReport(['comment' => 'Older one', 'created_at' => now()->subDay()]);
    makeReport(['comment' => 'Newer one', 'created_at' => now()]);

    $response = $this->actingAs(portalUser())->get('/portal/reports');

    $response->assertOk();

    expect($response->viewData('reports')->pluck('comment')->all())
        ->toBe(['Newer one', 'Older one']);
});

test('the reports list can be filtered by pane', function() {
    makeReport(['comment' => 'On simple read', 'pane' => 'summary']);
    makeReport(['comment' => 'On listen', 'pane' => 'narrate']);

    $this->actingAs(portalUser())
        ->get('/portal/reports?pane=narrate')
        ->assertOk()
        ->assertSee('On listen')
        ->assertDontSee('On simple read');
});

test('the reports list can be filtered by browser', function() {
    $browserId = Str::uuid()->toString();
    makeReport(['comment' => 'From this browser', 'browser_id' => $browserId]);
    makeReport(['comment' => 'From another browser']);

    $this->actingAs(portalUser())
        ->get('/portal/reports?browser_id=' . $browserId)
        ->assertOk()
        ->assertSee('From this browser')
        ->assertDontSee('From another browser');
});

test('the reports list can be filtered by date range', function() {
    makeReport(['comment' => 'In range', 'created_at' => now()->subDays(2)]);
    makeReport(['comment' => 'Too old', 'created_at' => now()->subDays(20)]);

    $from = now()->subDays(5)->toDateString();

    $this->actingAs(portalUser())
        ->get("/portal/reports?from={$from}")
        ->assertOk()
        ->assertSee('In range')
        ->assertDontSee('Too old');
});

test('an unrecognised pane filter is ignored rather than returning nothing', function() {
    makeReport(['comment' => 'Still visible']);

    $this->actingAs(portalUser())
        ->get('/portal/reports?pane=not-a-pane')
        ->assertOk()
        ->assertSee('Still visible');
});

test('a malformed date filter is ignored rather than erroring', function() {
    makeReport(['comment' => 'Still visible']);

    $this->actingAs(portalUser())
        ->get('/portal/reports?from=garbage')
        ->assertOk()
        ->assertSee('Still visible');
});

// ---------------------------------------------------------------- detail

test('the detail view shows the full report and its snapshot', function() {
    $report = makeReport([
        'comment' => 'The words on slide three were too hard for me.',
        'simplified_text' => 'This is exactly what Clario displayed.',
        'slide_index' => 3,
        'slide_count' => 7,
    ]);

    $this->actingAs(portalUser())
        ->get("/portal/reports/{$report->id}")
        ->assertOk()
        ->assertSee('The words on slide three were too hard for me.')
        ->assertSee('This is exactly what Clario displayed.')
        ->assertSee('3 of 7')
        ->assertSee($report->browser_id);
});

test('the detail view handles a report with no simplified text', function() {
    $report = makeReport(['pane' => 'settings', 'simplified_text' => null, 'reading_level' => null]);

    $this->actingAs(portalUser())
        ->get("/portal/reports/{$report->id}")
        ->assertOk()
        ->assertSee("doesn't show any", false);
});

// ---------------------------------------------------------------- export

test('the CSV export contains the reports', function() {
    makeReport(['comment' => 'Exported comment', 'name' => 'Sam']);

    $response = $this->actingAs(portalUser())->get('/portal/reports/export');

    $response->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    $csv = $response->streamedContent();

    expect($csv)->toContain('Exported comment')
        ->toContain('Sam')
        // The snapshot is deliberately left out — it would wreck the file.
        ->not->toContain('simplified_text');
});

test('the CSV export respects the active filters', function() {
    makeReport(['comment' => 'Listen report', 'pane' => 'narrate']);
    makeReport(['comment' => 'Simple read report', 'pane' => 'summary']);

    $csv = $this->actingAs(portalUser())
        ->get('/portal/reports/export?pane=narrate')
        ->streamedContent();

    expect($csv)->toContain('Listen report')
        ->not->toContain('Simple read report');
});

test('export is not mistaken for a report id', function() {
    // The literal route must win over the {report} wildcard.
    $this->actingAs(portalUser())
        ->get('/portal/reports/export')
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');
});

// ---------------------------------------------------------------- usage panel

function logRequest(string $routeName, ?string $trigger = null, ?string $at = null): void {
    $metric = App\Models\ApiMetric::create([
        'endpoint' => '/api/' . $routeName,
        'method' => 'POST',
        'route_name' => $routeName,
        'trigger' => $trigger,
        'duration_ms' => 10,
        'status_code' => 200,
        'content_length' => 100,
    ]);

    if ($at) {
        $metric->forceFill(['created_at' => $at])->save();
    }
}

test('the usage panel counts human actions from the request log', function() {
    logRequest('translate', 'prefetch');
    logRequest('translate', 'prefetch');
    logRequest('translate', 'regenerate');
    logRequest('narrate-sync');
    logRequest('chat');
    logRequest('chat');
    logRequest('chat');

    $actions = collect($this->actingAs(portalUser())->get('/portal')->viewData('usageActions'))
        ->keyBy('key');

    expect($actions['articles']['total'])->toBe(2)
        ->and($actions['level_changes']['total'])->toBe(1)
        ->and($actions['audio']['total'])->toBe(1)
        ->and($actions['questions']['total'])->toBe(3)
        ->and($actions['video']['total'])->toBe(0);
});

test('prefetched and regenerated translations are counted separately', function() {
    // The whole point of the trigger field: without it these are one number
    // that reads like enthusiasm for Simple Read.
    logRequest('translate', 'prefetch');
    logRequest('translate', 'regenerate');

    $actions = collect($this->actingAs(portalUser())->get('/portal')->viewData('usageActions'))
        ->keyBy('key');

    expect($actions['articles']['total'])->toBe(1)
        ->and($actions['level_changes']['total'])->toBe(1);
});

test('translate rows logged before the trigger column existed are not counted as either', function() {
    // Four months of historical rows have a null trigger. Counting them as
    // prefetch would invent data; they simply predate the distinction.
    logRequest('translate', null);

    $actions = collect($this->actingAs(portalUser())->get('/portal')->viewData('usageActions'))
        ->keyBy('key');

    expect($actions['articles']['total'])->toBe(0)
        ->and($actions['level_changes']['total'])->toBe(0);
});

test('the usage daily series is zero-filled across the window', function() {
    logRequest('narrate-sync');

    $series = $this->actingAs(portalUser())->get('/portal')->viewData('usageActionSeries');

    expect($series['days'])->toHaveCount(30)
        ->and($series['byAction']['audio'])->toHaveCount(30)
        // Today is the last slot.
        ->and(end($series['byAction']['audio']))->toBe(1)
        ->and(array_sum($series['byAction']['video']))->toBe(0);
});

test('usage week-over-week compares the right windows', function() {
    logRequest('chat', null, now()->subDays(2)->toDateTimeString());
    logRequest('chat', null, now()->subDays(9)->toDateTimeString());
    logRequest('chat', null, now()->subDays(10)->toDateTimeString());

    $actions = collect($this->actingAs(portalUser())->get('/portal')->viewData('usageActions'))
        ->keyBy('key');

    expect($actions['questions']['current'])->toBe(1)
        ->and($actions['questions']['previous'])->toBe(2)
        ->and($actions['questions']['delta'])->toBe(-50);
});

test('the dashboard renders usage before feedback before API metrics', function() {
    $html = $this->actingAs(portalUser())->get('/portal')->getContent();

    $usage = strpos($html, '<h2>Usage</h2>');
    $feedback = strpos($html, '<h2>Feedback</h2>');
    $metrics = strpos($html, '<h2>API metrics</h2>');

    expect($usage)->toBeLessThan($feedback)
        ->and($feedback)->toBeLessThan($metrics);
});

// ---------------------------------------------------------------- before/after

test('the detail view shows the original and simplified text side by side', function() {
    $report = makeReport([
        'original_text' => 'The concierge who makes the impossible happen for ultrarich clients.',
        'simplified_text' => 'She helps rich people plan trips.',
    ]);

    $this->actingAs(portalUser())
        ->get("/portal/reports/{$report->id}")
        ->assertOk()
        ->assertSee('Original page text')
        ->assertSee('The concierge who makes the impossible happen for ultrarich clients.')
        ->assertSee('What Clario was showing')
        ->assertSee('She helps rich people plan trips.');
});

test('the detail view handles a report saved before original text was captured', function() {
    // Every report from before the column existed has a null original_text;
    // the page must say so rather than rendering an empty panel.
    $report = makeReport(['original_text' => null]);

    $this->actingAs(portalUser())
        ->get("/portal/reports/{$report->id}")
        ->assertOk()
        ->assertSee('predates the field');
});

test('the detail view flags each snapshot as truncated independently', function() {
    $report = makeReport([
        'original_text' => 'Long original.',
        'original_truncated' => true,
        'simplified_text' => 'Short simple.',
        'truncated' => false,
    ]);

    $html = $this->actingAs(portalUser())->get("/portal/reports/{$report->id}")->getContent();

    // Exactly one "truncated" pill, on the original side.
    expect(substr_count($html, '>truncated<'))->toBe(1);
});

// ---------------------------------------------------------------- html stripping

test('the original page text is shown as readable prose, not markup', function() {
    $report = makeReport([
        'original_text' => '<div class="css-1fanzo5"><h1>The Concierge</h1>'
            . '<p>She arranges <em>private islands</em>.</p>'
            . '<p>Her clients pay well.</p></div>',
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->not->toContain('<')
        ->not->toContain('css-1fanzo5')
        ->toContain('The Concierge')
        ->toContain('She arranges private islands.')
        // Block boundaries must not run words together.
        ->not->toContain('islands.Her');
});

test('stripping decodes entities and normalises whitespace', function() {
    $report = makeReport([
        'original_text' => "<p>Tom&nbsp;&amp; Jerry   said&nbsp;&ldquo;hello&rdquo;</p>\n\n\n<p>Bye</p>",
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->toContain('Tom & Jerry said')
        ->toContain('hello')
        ->not->toContain('&nbsp;')
        ->not->toContain('&amp;')
        // No runs of three or more newlines.
        ->not->toMatch('/\n{3,}/');
});

test('list items are kept readable', function() {
    $report = makeReport([
        'original_text' => '<ul><li>First point</li><li>Second point</li></ul>',
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->toContain('First point')
        ->toContain('Second point')
        ->not->toContain('First pointSecond point');
});

test('stripping leaves the stored value untouched', function() {
    // The record of what was actually sent to the API must stay faithful —
    // stripping is a display concern only.
    $raw = '<div><p>Original markup</p></div>';
    $report = makeReport(['original_text' => $raw]);

    $report->originalTextAsPlainText();

    expect($report->fresh()->original_text)->toBe($raw);
});

test('stripping handles a null original text', function() {
    expect(makeReport(['original_text' => null])->originalTextAsPlainText())->toBeNull();
});

test('the detail view shows readable text and offers the raw HTML', function() {
    $report = makeReport([
        'original_text' => '<div class="css-xyz"><p>She arranges private islands.</p></div>',
    ]);

    $this->actingAs(portalUser())
        ->get("/portal/reports/{$report->id}")
        ->assertOk()
        ->assertSee('She arranges private islands.')
        ->assertSee('Show the raw HTML that was sent to the API')
        // The raw markup is present, but escaped inside the details block
        // rather than rendered as page structure.
        ->assertSee('css-xyz');
});

test('style and script contents are removed, not just their tags', function() {
    // strip_tags() drops the wrapper but keeps the CSS text inside, which
    // then reads as article content. This is the single worst offender in
    // real captures.
    $report = makeReport([
        'original_text' => '<div><style>.gps-module{display:none;color:#fff}</style>'
            . '<p>Real article text.</p>'
            . '<script>window.dataLayer=[];</script></div>',
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->toBe('Real article text.')
        ->not->toContain('gps-module')
        ->not->toContain('dataLayer');
});

test('an unclosed style block at the truncation boundary does not leak', function() {
    // A 100 KB cut can land mid-<style>; without the fallback the whole tail
    // would come through as text.
    $report = makeReport([
        'original_text' => '<p>Article.</p><style>.a{color:red}.b{color:blue',
    ]);

    expect($report->originalTextAsPlainText())->toBe('Article.');
});

test('html comments are removed', function() {
    $report = makeReport(['original_text' => '<p>Visible.</p><!-- tracking pixel note -->']);

    expect($report->originalTextAsPlainText())->toBe('Visible.');
});

test('bullets left behind by icon-only list rows are dropped', function() {
    $report = makeReport([
        'original_text' => '<ul><li><svg></svg></li><li></li><li>Real item</li></ul>',
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->toContain('Real item')
        // No line that is nothing but a bullet.
        ->not->toMatch('/^\s*•\s*$/m');
});

test('standalone ad markers are removed', function() {
    $report = makeReport([
        'original_text' => '<p>Advertisement</p><p>The real story.</p><p>SKIP ADVERTISEMENT</p>',
    ]);

    expect($report->originalTextAsPlainText())->toBe('The real story.');
});

test('an article that discusses advertising keeps its own words', function() {
    // The ad-marker filter matches whole lines only, so prose survives.
    $report = makeReport([
        'original_text' => '<p>Advertisement revenue fell this year.</p>'
            . '<p>The advertisement was controversial.</p>',
    ]);

    $plain = $report->originalTextAsPlainText();

    expect($plain)->toContain('Advertisement revenue fell this year.')
        ->toContain('The advertisement was controversial.');
});
