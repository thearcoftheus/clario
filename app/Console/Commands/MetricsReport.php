<?php

namespace App\Console\Commands;

use App\Models\ApiMetric;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class MetricsReport extends Command
{
    protected $signature = 'clario:metrics
        {--days=7 : How many days back to include}
        {--output=storage/reports/metrics.html : Output path for HTML report}';

    protected $description = 'Generate an API metrics report (terminal + HTML)';

    // Streaming endpoints return a StreamedResponse instantly — the reported
    // duration only reflects setup time, NOT actual AI generation time.
    private const STREAMING_ROUTES = ['translate', 'overview', 'chat'];

    private function isStreaming(string $routeName): bool
    {
        return in_array($routeName, self::STREAMING_ROUTES);
    }

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $outputPath = $this->option('output');
        $since = now()->subDays($days);

        $metrics = ApiMetric::where('created_at', '>=', $since)
            ->orderBy('created_at')
            ->get();

        if ($metrics->isEmpty()) {
            $this->warn("No metrics found in the last {$days} days.");
            return 0;
        }

        $this->info("Found {$metrics->count()} API calls in the last {$days} days.\n");

        // Aggregate by endpoint
        $byEndpoint = $metrics->groupBy('route_name')->map(function ($group, $routeName) {
            $durations = $group->pluck('duration_ms')->sort()->values();
            $count = $durations->count();

            return [
                'route_name' => $routeName ?: '(unnamed)',
                'endpoint' => $group->first()->endpoint,
                'count' => $count,
                'avg' => (int) round($durations->avg()),
                'p50' => (int) $durations->get((int) floor($count * 0.5)),
                'p95' => (int) $durations->get((int) floor($count * 0.95)),
                'max' => (int) $durations->max(),
                'min' => (int) $durations->min(),
                'errors' => $group->where('status_code', '>=', 400)->count(),
                'error_rate' => $count > 0 ? round($group->where('status_code', '>=', 400)->count() / $count * 100, 1) : 0,
            ];
        })->sortByDesc('avg')->values();

        // Terminal output
        $this->table(
            ['Route', 'Calls', 'Avg (ms)', 'P50', 'P95', 'Max', 'Errors', 'Error %'],
            $byEndpoint->map(fn($e) => [
                $e['route_name'] . ($this->isStreaming($e['route_name']) ? ' *' : ''),
                $e['count'],
                number_format($e['avg']),
                number_format($e['p50']),
                number_format($e['p95']),
                number_format($e['max']),
                $e['errors'],
                $e['error_rate'] . '%',
            ])->toArray()
        );

        if ($byEndpoint->contains(fn($e) => $this->isStreaming($e['route_name']))) {
            $this->line("\n  * Streaming endpoint — duration reflects setup time only, not total generation time.");
        }

        // Daily breakdown
        $byDay = $metrics->groupBy(fn($m) => $m->created_at->format('Y-m-d'))
            ->map(fn($group, $date) => [
                'date' => $date,
                'count' => $group->count(),
                'avg_ms' => (int) round($group->avg('duration_ms')),
                'errors' => $group->where('status_code', '>=', 400)->count(),
            ])->sortKeys()->values();

        // Generate HTML report
        $html = $this->buildHtmlReport($byEndpoint, $byDay, $days, $metrics->count());

        $dir = dirname(base_path($outputPath));
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        File::put(base_path($outputPath), $html);
        $this->info("\nHTML report saved to: {$outputPath}");

        return 0;
    }

    private function buildStreamingFootnote(bool $hasStreaming): string
    {
        if (!$hasStreaming) return '';

        return '
        <div style="background:#D8CCE2;border-radius:12px;padding:14px 20px;margin-bottom:24px;font-size:13px;color:#5C2B85;">
            <strong>Note:</strong> Endpoints marked <span style="background:white;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">STREAM</span>
            return a streaming response — the reported duration reflects server setup time only, not the total time to generate and deliver all content.
            Actual end-to-end time for streaming endpoints is significantly longer.
        </div>';
    }

    private function buildHtmlReport($byEndpoint, $byDay, $days, $totalCalls): string
    {
        $maxAvg = max($byEndpoint->max('avg'), 1);
        $generatedAt = now()->format('M j, Y g:i A');

        $hasStreaming = $byEndpoint->contains(fn($e) => $this->isStreaming($e['route_name']));

        $endpointRows = $byEndpoint->map(function ($e) use ($maxAvg) {
            $streaming = $this->isStreaming($e['route_name']);
            $streamingBadge = $streaming
                ? ' <span style="background:#D8CCE2;color:#5C2B85;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;vertical-align:middle;">STREAM</span>'
                : '';
            $barWidth = round(($e['avg'] / $maxAvg) * 100);
            $barColor = $streaming ? '#9ca3af' : ($e['avg'] > 30000 ? '#dc2626' : ($e['avg'] > 10000 ? '#f59e0b' : '#5C2B85'));
            $errorBadge = $e['errors'] > 0
                ? "<span style=\"background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:12px;\">{$e['errors']} ({$e['error_rate']}%)</span>"
                : "<span style=\"color:#9ca3af;\">0</span>";

            return "
            <tr>
                <td style=\"padding:12px 16px;font-weight:600;color:#5C2B85;\">{$e['route_name']}{$streamingBadge}</td>
                <td style=\"padding:12px 16px;text-align:center;\">{$e['count']}</td>
                <td style=\"padding:12px 16px;\">
                    <div style=\"display:flex;align-items:center;gap:8px;\">
                        <div style=\"background:{$barColor};height:8px;border-radius:4px;width:{$barWidth}%;min-width:4px;\"></div>
                        <span style=\"font-weight:600;white-space:nowrap;\">" . number_format($e['avg']) . "ms</span>
                    </div>
                </td>
                <td style=\"padding:12px 16px;text-align:center;\">" . number_format($e['p50']) . "</td>
                <td style=\"padding:12px 16px;text-align:center;\">" . number_format($e['p95']) . "</td>
                <td style=\"padding:12px 16px;text-align:center;\">" . number_format($e['max']) . "</td>
                <td style=\"padding:12px 16px;text-align:center;\">{$errorBadge}</td>
            </tr>";
        })->implode('');

        $dailyRows = $byDay->map(function ($d) {
            $errorBadge = $d['errors'] > 0
                ? "<span style=\"background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:12px;\">{$d['errors']}</span>"
                : "<span style=\"color:#9ca3af;\">0</span>";

            return "
            <tr>
                <td style=\"padding:10px 16px;font-weight:500;\">{$d['date']}</td>
                <td style=\"padding:10px 16px;text-align:center;\">{$d['count']}</td>
                <td style=\"padding:10px 16px;text-align:center;\">" . number_format($d['avg_ms']) . "ms</td>
                <td style=\"padding:10px 16px;text-align:center;\">{$errorBadge}</td>
            </tr>";
        })->implode('');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clario API Metrics Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F4F1; color: #1a1a1a; padding: 32px; }
        .container { max-width: 960px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
        .header h1 { font-size: 28px; color: #5C2B85; }
        .header .subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #9B90F0; }
        .stat-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-card .value { font-size: 32px; font-weight: 700; color: #5C2B85; margin-top: 4px; }
        .section { background: white; border-radius: 12px; border: 1px solid #9B90F0; margin-bottom: 24px; overflow: hidden; }
        .section-title { padding: 16px 20px; font-size: 18px; font-weight: 700; color: #5C2B85; border-bottom: 1px solid #e5e7eb; }
        table { width: 100%; border-collapse: collapse; }
        thead th { padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #f9fafb; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Clario API Metrics</h1>
                <div class="subtitle">Last {$days} days &middot; Generated {$generatedAt}</div>
            </div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="label">Total API Calls</div>
                <div class="value">{$totalCalls}</div>
            </div>
            <div class="stat-card">
                <div class="label">Unique Endpoints</div>
                <div class="value">{$byEndpoint->count()}</div>
            </div>
            <div class="stat-card">
                <div class="label">Days Covered</div>
                <div class="value">{$byDay->count()}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Performance by Endpoint</div>
            <table>
                <thead>
                    <tr>
                        <th>Route</th>
                        <th style="text-align:center;">Calls</th>
                        <th>Avg Duration</th>
                        <th style="text-align:center;">P50 (ms)</th>
                        <th style="text-align:center;">P95 (ms)</th>
                        <th style="text-align:center;">Max (ms)</th>
                        <th style="text-align:center;">Errors</th>
                    </tr>
                </thead>
                <tbody>
                    {$endpointRows}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Daily Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th style="text-align:center;">Calls</th>
                        <th style="text-align:center;">Avg Duration</th>
                        <th style="text-align:center;">Errors</th>
                    </tr>
                </thead>
                <tbody>
                    {$dailyRows}
                </tbody>
            </table>
        </div>

        {$this->buildStreamingFootnote($hasStreaming)}

        <div class="footer">
            Clario API Metrics Report &middot; Generated by <code>php artisan clario:metrics</code>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
