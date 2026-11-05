<?php

namespace App\Portal;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Unique-install numbers for the portal dashboard, read from the
 * day-granularity `install_activity` table (see that migration for what the
 * table does and does not hold).
 *
 * Everything here is a count of distinct browser IDs per calendar bucket.
 * "New" in a bucket means the browser's first-ever recorded day falls in it;
 * "returning" is everything else that was active. Bucket boundaries are UTC,
 * like every other date on the dashboard.
 *
 * The bucket expressions are SQLite-specific on purpose: the app runs on
 * SQLite and stays there (CLAUDE.md, Deployment).
 */
final class InstallStats
{
    public const PERIOD_DAY = 'day';
    public const PERIOD_WEEK = 'week';
    public const PERIOD_MONTH = 'month';

    public const PERIODS = [self::PERIOD_DAY, self::PERIOD_WEEK, self::PERIOD_MONTH];

    /** Weekly is the view the team asked for by default. */
    public const DEFAULT_PERIOD = self::PERIOD_WEEK;

    /** Buckets shown per period. Daily matches the dashboard's 30-day window. */
    public const BUCKETS = [
        self::PERIOD_DAY => 30,
        self::PERIOD_WEEK => 12,
        self::PERIOD_MONTH => 12,
    ];

    /**
     * Validate a period from the query string, falling back to the default
     * rather than erroring — same philosophy as the reports page filters.
     */
    public static function period(mixed $raw): string
    {
        return is_string($raw) && in_array($raw, self::PERIODS, true) ? $raw : self::DEFAULT_PERIOD;
    }

    /** Distinct browsers ever seen. */
    public function totalInstalls(): int
    {
        return (int) DB::table('install_activity')->distinct()->count('browser_id');
    }

    /**
     * ISO week to date (since Monday), so these two numbers equal the last
     * bar of the weekly chart. Note the Usage panel's "this week" is a rolling
     * seven days — the card label says "since Monday" so nobody compares them.
     *
     * @return array{active: int, new: int}
     */
    public function thisWeek(): array
    {
        $monday = now()->startOfWeek(Carbon::MONDAY)->toDateString();

        $active = (int) DB::table('install_activity')
            ->where('day', '>=', $monday)
            ->distinct()
            ->count('browser_id');

        $new = (int) DB::query()->fromSub($this->firstDays(), 'f')
            ->where('first_day', '>=', $monday)
            ->count();

        return ['active' => $active, 'new' => $new];
    }

    /**
     * Active / new / returning browsers per bucket, zero-filled, oldest first.
     *
     * Two queries: distinct browsers per bucket, and browsers whose first-ever
     * day falls in each bucket. The first-day subquery is deliberately NOT
     * limited to the window — a browser seen long before the window must not
     * come out as "new" at the window's edge.
     *
     * @return array{period: string, buckets: list<array{start: string, label: string, active: int, new: int, returning: int, current: bool}>}
     */
    public function series(string $period): array
    {
        $starts = $this->bucketStarts($period);
        $windowStart = $starts[0];

        $active = DB::table('install_activity')
            ->selectRaw(self::bucketExpr($period, 'day') . ' AS bucket, COUNT(DISTINCT browser_id) AS n')
            ->where('day', '>=', $windowStart)
            ->groupBy('bucket')
            ->pluck('n', 'bucket');

        $new = DB::query()->fromSub($this->firstDays(), 'f')
            ->selectRaw(self::bucketExpr($period, 'first_day') . ' AS bucket, COUNT(*) AS n')
            ->where('first_day', '>=', $windowStart)
            ->groupBy('bucket')
            ->pluck('n', 'bucket');

        $last = array_key_last($starts);
        $buckets = [];

        foreach ($starts as $i => $start) {
            $activeCount = (int) ($active[$start] ?? 0);
            $newCount = (int) ($new[$start] ?? 0);

            $buckets[] = [
                'start' => $start,
                'label' => self::label($period, $start),
                'active' => $activeCount,
                'new' => $newCount,
                'returning' => $activeCount - $newCount,
                'current' => $i === $last,
            ];
        }

        return ['period' => $period, 'buckets' => $buckets];
    }

    /**
     * SQLite expression giving the bucket start (Y-m-d) for a date column.
     *
     * Weeks start on Monday. The expression is `-6 days` THEN `weekday 1`, not
     * the other way round: SQLite's `weekday N` moves forward to the next N
     * and stays put if the date is already an N, so `weekday 1, -7 days`
     * would send every Monday to the previous week. Subtracting six days
     * first puts each day of an ISO week in [previous Tue … this Mon], from
     * which "forward to Monday" always lands on the right one.
     *
     * $column is only ever one of our own column names, never user input.
     */
    public static function bucketExpr(string $period, string $column): string
    {
        return match ($period) {
            self::PERIOD_DAY => $column,
            self::PERIOD_WEEK => "date($column, '-6 days', 'weekday 1')",
            self::PERIOD_MONTH => "date($column, 'start of month')",
        };
    }

    /** Human label for a bucket: "Nov 3", "Nov 3–9", "Oct 27–Nov 2", "Nov 2026". */
    public static function label(string $period, string $start): string
    {
        $from = Carbon::parse($start);

        if ($period === self::PERIOD_DAY) {
            return $from->format('M j');
        }

        if ($period === self::PERIOD_MONTH) {
            return $from->format('M Y');
        }

        $to = $from->copy()->addDays(6);
        $end = $to->month === $from->month ? $to->format('j') : $to->format('M j');

        return $from->format('M j') . '–' . $end;
    }

    /** Each browser's earliest recorded day. */
    private function firstDays(): Builder
    {
        return DB::table('install_activity')
            ->select('browser_id', DB::raw('MIN(day) AS first_day'))
            ->groupBy('browser_id');
    }

    /** @return list<string> bucket start dates, oldest first, ending with the current bucket */
    private function bucketStarts(string $period): array
    {
        $count = self::BUCKETS[$period];

        $cursor = match ($period) {
            self::PERIOD_DAY => now()->startOfDay()->subDays($count - 1),
            self::PERIOD_WEEK => now()->startOfWeek(Carbon::MONDAY)->subWeeks($count - 1),
            self::PERIOD_MONTH => now()->startOfMonth()->subMonths($count - 1),
        };

        $step = match ($period) {
            self::PERIOD_DAY => 'addDay',
            self::PERIOD_WEEK => 'addWeek',
            self::PERIOD_MONTH => 'addMonth',
        };

        $starts = [];
        for ($i = 0; $i < $count; $i++) {
            $starts[] = $cursor->toDateString();
            $cursor->{$step}();
        }

        return $starts;
    }
}
