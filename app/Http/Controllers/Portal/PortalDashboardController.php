<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ApiCallCount;
use App\Models\ApiMetric;
use App\Models\FeedbackReport;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

/**
 * Portal dashboard. Usage first, feedback second — cost visibility is the
 * thing most likely to need action while the tester cohort ramps up.
 */
class PortalDashboardController extends Controller
{
    private const WINDOW_DAYS = 30;

    /**
     * Human-level actions, derived from the inbound request log.
     *
     * Each entry maps a route (optionally narrowed by trigger) to something a
     * person actually did. Deliberately NOT the same as the provider-call
     * counts further down the dashboard: one "listen" request fans out into
     * several billable TTS calls, so the two numbers should differ, and both
     * are worth seeing.
     *
     * Routes absent here are absent on purpose: `headline` duplicates
     * `translate` on every article open, and `avatar.script` fires on entering
     * the Watch pane rather than on a decision to generate.
     */
    private const USAGE_ACTIONS = [
        ['key' => 'articles', 'label' => 'Articles opened', 'route' => 'translate', 'trigger' => 'prefetch',
         'note' => 'Clario prepares the simple version automatically when the sidebar opens.'],
        ['key' => 'level_changes', 'label' => 'Reading level changed', 'route' => 'translate', 'trigger' => 'regenerate',
         'note' => 'Someone was reading and asked for a different version.'],
        ['key' => 'audio', 'label' => 'Audio requested', 'route' => 'narrate-sync', 'trigger' => null,
         'note' => 'Pressed "Generate audio". Replays from cache are not counted.'],
        ['key' => 'video', 'label' => 'Video requested', 'route' => 'avatar.cartesia.tts', 'trigger' => null,
         'note' => 'Pressed "Generate video".'],
        ['key' => 'questions', 'label' => 'Questions asked', 'route' => 'chat', 'trigger' => null,
         'note' => 'One per message sent in Ask.'],
        ['key' => 'feedback', 'label' => 'Feedback sent', 'route' => 'reports.store', 'trigger' => null,
         'note' => 'Reports submitted from the sidebar.'],
    ];

    public function __invoke(): View
    {
        return view('portal.dashboard', [
            'usageActions' => $this->usageActions(),
            'usageActionSeries' => $this->usageActionSeries(),
            'usageSeries' => $this->usageSeries(),
            'usageThisWeek' => $this->usageThisWeek(),
            'reportStats' => $this->reportStats(),
            'reportsSeries' => $this->reportsPerDay(),
            'byPane' => $this->breakdown('pane'),
            'byReadingLevel' => $this->breakdown('reading_level'),
            'topBrowsers' => $this->topBrowsers(),
            'latestReports' => FeedbackReport::orderByDesc('created_at')->limit(5)->get(),
            'windowDays' => self::WINDOW_DAYS,
        ]);
    }

    /**
     * Totals per human action: all time, this week, and the week before.
     *
     * @return list<array{key: string, label: string, note: string, total: int, current: int, previous: int, delta: int|null}>
     */
    private function usageActions(): array
    {
        $thisWeek = now()->subDays(6)->startOfDay();
        $lastWeekStart = now()->subDays(13)->startOfDay();
        $lastWeekEnd = now()->subDays(7)->endOfDay();

        $out = [];

        foreach (self::USAGE_ACTIONS as $action) {
            $base = fn() => ApiMetric::where('route_name', $action['route'])
                ->when($action['trigger'], fn($q, $t) => $q->where('trigger', $t));

            $current = (clone $base())->where('created_at', '>=', $thisWeek)->count();
            $previous = (clone $base())->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])->count();

            $out[] = [
                'key' => $action['key'],
                'label' => $action['label'],
                'note' => $action['note'],
                'total' => $base()->count(),
                'current' => $current,
                'previous' => $previous,
                'delta' => $previous > 0 ? (int) round((($current - $previous) / $previous) * 100) : null,
            ];
        }

        return $out;
    }

    /**
     * Daily counts per human action, zero-filled across the window.
     *
     * @return array{days: list<string>, byAction: array<string, list<int>>}
     */
    private function usageActionSeries(): array
    {
        $start = now()->subDays(self::WINDOW_DAYS - 1)->startOfDay();

        $days = [];
        for ($date = $start->copy(); $date <= now(); $date->addDay()) {
            $days[] = $date->toDateString();
        }
        $dayIndex = array_flip($days);

        $byAction = [];

        foreach (self::USAGE_ACTIONS as $action) {
            $byAction[$action['key']] = array_fill(0, count($days), 0);

            $rows = ApiMetric::where('route_name', $action['route'])
                ->when($action['trigger'], fn($q, $t) => $q->where('trigger', $t))
                ->where('created_at', '>=', $start)
                ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as total'))
                ->groupBy('day')
                ->pluck('total', 'day');

            foreach ($rows as $day => $total) {
                if (isset($dayIndex[$day])) {
                    $byAction[$action['key']][$dayIndex[$day]] = (int) $total;
                }
            }
        }

        return ['days' => $days, 'byAction' => $byAction];
    }

    /**
     * Daily outbound provider calls per service, zero-filled across the whole
     * window so the chart has an even x-axis even on quiet days.
     *
     * @return array{days: list<string>, byService: array<string, list<int>>}
     */
    private function usageSeries(): array
    {
        $start = now()->subDays(self::WINDOW_DAYS - 1)->startOfDay();

        $rows = ApiCallCount::where('day', '>=', $start->toDateString())->get();

        $days = [];
        for ($date = $start->copy(); $date <= now(); $date->addDay()) {
            $days[] = $date->toDateString();
        }

        $byService = [];
        foreach (ApiCallCount::SERVICES as $service) {
            $byService[$service] = array_fill(0, count($days), 0);
        }

        $dayIndex = array_flip($days);

        foreach ($rows as $row) {
            $key = $row->day instanceof Carbon ? $row->day->toDateString() : (string) $row->day;

            // A service that was retired (or added by a newer deploy) can
            // still have rows; show it rather than dropping the count.
            if (! isset($byService[$row->service])) {
                $byService[$row->service] = array_fill(0, count($days), 0);
            }

            if (isset($dayIndex[$key])) {
                $byService[$row->service][$dayIndex[$key]] = $row->count;
            }
        }

        return ['days' => $days, 'byService' => $byService];
    }

    /**
     * This week's calls per service, with the change on the week before.
     *
     * @return list<array{service: string, label: string, current: int, previous: int, delta: int|null}>
     */
    private function usageThisWeek(): array
    {
        $thisWeekStart = now()->subDays(6)->toDateString();
        $lastWeekStart = now()->subDays(13)->toDateString();
        $lastWeekEnd = now()->subDays(7)->toDateString();

        $current = $this->sumByService($thisWeekStart, now()->toDateString());
        $previous = $this->sumByService($lastWeekStart, $lastWeekEnd);

        $services = array_unique([...ApiCallCount::SERVICES, ...array_keys($current), ...array_keys($previous)]);

        $out = [];
        foreach ($services as $service) {
            $now = $current[$service] ?? 0;
            $before = $previous[$service] ?? 0;

            $out[] = [
                'service' => $service,
                'label' => ApiCallCount::SERVICE_LABELS[$service] ?? $service,
                'current' => $now,
                'previous' => $before,
                // No baseline means no meaningful percentage — show a dash
                // rather than an infinite increase.
                'delta' => $before > 0 ? (int) round((($now - $before) / $before) * 100) : null,
            ];
        }

        return $out;
    }

    /** @return array<string, int> */
    private function sumByService(string $from, string $to): array
    {
        return ApiCallCount::whereBetween('day', [$from, $to])
            ->select('service', DB::raw('SUM(count) as total'))
            ->groupBy('service')
            ->pluck('total', 'service')
            ->map(fn($v) => (int) $v)
            ->all();
    }

    /** @return array<string, int> */
    private function reportStats(): array
    {
        return [
            'total' => FeedbackReport::count(),
            'last7' => FeedbackReport::where('created_at', '>=', now()->subDays(7))->count(),
            'last24h' => FeedbackReport::where('created_at', '>=', now()->subDay())->count(),
            'browsers' => FeedbackReport::distinct('browser_id')->count('browser_id'),
        ];
    }

    /**
     * Reports per day across the window, zero-filled.
     *
     * @return array{days: list<string>, counts: list<int>}
     */
    private function reportsPerDay(): array
    {
        $start = now()->subDays(self::WINDOW_DAYS - 1)->startOfDay();

        $rows = FeedbackReport::where('created_at', '>=', $start)
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as total'))
            ->groupBy('day')
            ->pluck('total', 'day');

        $days = [];
        $counts = [];
        for ($date = $start->copy(); $date <= now(); $date->addDay()) {
            $key = $date->toDateString();
            $days[] = $key;
            $counts[] = (int) ($rows[$key] ?? 0);
        }

        return ['days' => $days, 'counts' => $counts];
    }

    /** @return array<string, int> */
    private function breakdown(string $column): array
    {
        return FeedbackReport::select($column, DB::raw('COUNT(*) as total'))
            ->groupBy($column)
            ->orderByDesc('total')
            ->pluck('total', $column)
            ->map(fn($v) => (int) $v)
            ->all();
    }

    /**
     * Browsers reporting most often — useful for spotting both an engaged
     * tester and one who is repeatedly stuck.
     */
    private function topBrowsers()
    {
        return FeedbackReport::select('browser_id', DB::raw('COUNT(*) as total'), DB::raw('MAX(created_at) as last_seen'))
            ->groupBy('browser_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get();
    }
}
