@extends('portal.layout')

@section('title', 'Dashboard — Clario Portal')

@section('content')
    @php
        // Distinguishable in both hue and lightness, so the stack stays
        // readable for colour-blind viewers and in greyscale print.
        $serviceColors = [
            'simplify' => '#5c2b85',
            'headline' => '#8b5fbf',
            'chat' => '#2f6f8f',
            'audio' => '#1a7f37',
            'video_tts' => '#c2670a',
            'video_stream' => '#b3261e',
        ];

        $usageSeriesForChart = [];
        foreach ($usageSeries['byService'] as $service => $values) {
            if (array_sum($values) === 0) {
                continue; // don't clutter the legend with unused services
            }
            $usageSeriesForChart[] = [
                'label' => \App\Models\ApiCallCount::SERVICE_LABELS[$service] ?? $service,
                'values' => $values,
                'color' => $serviceColors[$service] ?? '#5f5f6b',
            ];
        }
    @endphp

    {{-- ---------------- 1. Usage (what people did) ---------------- --}}
    <h2>Usage</h2>
    <p class="small muted" style="margin-top:-6px">
        What people actually did in Clario. One request here can cost several provider calls —
        see API metrics at the bottom for what that costs.
    </p>

    @php
        $actionColors = [
            'articles' => '#8b5fbf',
            'level_changes' => '#5c2b85',
            'audio' => '#1a7f37',
            'video' => '#c2670a',
            'questions' => '#2f6f8f',
            'feedback' => '#b3261e',
        ];

        $usageChartSeries = [];
        foreach ($usageActions as $action) {
            $values = $usageActionSeries['byAction'][$action['key']] ?? [];
            if (array_sum($values) === 0) {
                continue;
            }
            $usageChartSeries[] = [
                'label' => $action['label'],
                'values' => $values,
                'color' => $actionColors[$action['key']] ?? '#5f5f6b',
            ];
        }
    @endphp

    <div class="stats">
        @foreach ($usageActions as $action)
            <div class="stat">
                <div class="value">{{ number_format($action['total']) }}</div>
                <div class="label">{{ $action['label'] }}</div>
                <div class="label small">
                    {{ number_format($action['current']) }} this week
                    @if ($action['delta'] !== null)
                        <span class="delta {{ $action['delta'] >= 0 ? 'up' : 'down' }}">
                            ({{ $action['delta'] > 0 ? '+' : '' }}{{ $action['delta'] }}%)
                        </span>
                    @endif
                </div>
            </div>
        @endforeach
    </div>

    <div class="card">
        <h3>Actions per day, last {{ $windowDays }} days</h3>
        @include('portal.partials.bar-chart', [
            'days' => $usageActionSeries['days'],
            'series' => $usageChartSeries,
            'caption' => 'User actions per day for the last ' . $windowDays . ' days, stacked by action.',
        ])
    </div>

    <div class="card">
        <h3>What these count</h3>
        <dl class="detail">
            @foreach ($usageActions as $action)
                <dt>{{ $action['label'] }}</dt>
                <dd class="muted">{{ $action['note'] }}</dd>
            @endforeach
        </dl>
        <p class="small muted" style="margin-bottom:0">
            Counts requests, not people — Clario keeps per-person behaviour on the user's own device.
        </p>
    </div>

    {{-- ---------------- 2. Installs (how many browsers) ---------------- --}}
    <h2 id="installs">Installs</h2>
    <p class="small muted" style="margin-top:-6px">
        Browsers with Clario installed, counted by an anonymous per-browser ID. A browser, not a person:
        one person on two computers counts twice, and a reinstall counts as new.
    </p>

    <div class="stats">
        <div class="stat">
            <div class="value">{{ number_format($installTotal) }}</div>
            <div class="label">Unique installs, all time</div>
        </div>
        <div class="stat">
            <div class="value">{{ number_format($installThisWeek['active']) }}</div>
            <div class="label">Active this week</div>
            <div class="label small">since Monday</div>
        </div>
        <div class="stat">
            <div class="value">{{ number_format($installThisWeek['new']) }}</div>
            <div class="label">New this week</div>
            <div class="label small">first seen since Monday</div>
        </div>
    </div>

    <div class="card">
        <div class="card-head">
            <h3>Active installs per {{ $installPeriod }}</h3>
            <nav class="segmented" aria-label="Period">
                @foreach (\App\Portal\InstallStats::PERIODS as $p)
                    <a href="{{ route('portal.dashboard', ['period' => $p]) }}#installs"
                       @if ($p === $installPeriod) aria-current="true" @endif>{{ ucfirst($p) }}</a>
                @endforeach
            </nav>
        </div>
        @include('portal.partials.bar-chart', [
            'days' => array_column($installSeries['buckets'], 'start'),
            'series' => [
                ['label' => 'New', 'values' => array_column($installSeries['buckets'], 'new'), 'color' => '#5c2b85'],
                ['label' => 'Returning', 'values' => array_column($installSeries['buckets'], 'returning'), 'color' => '#8b5fbf'],
            ],
            'labels' => array_map(fn($b) => $b['label'] . ($b['current'] ? ' (so far)' : ''), $installSeries['buckets']),
            'caption' => 'Active installs per ' . $installPeriod . ', split into new and returning browsers.',
        ])

        <p class="small muted" style="margin-bottom:0">
            Requests from extension versions before 0.8.0 carried no browser ID and are not counted here,
            so the first weeks after that release show everyone as new.
        </p>
    </div>

    {{-- ---------------- 3. Feedback ---------------- --}}
    <h2>Feedback</h2>

    <div class="stats">
        <div class="stat">
            <div class="value">{{ number_format($reportStats['total']) }}</div>
            <div class="label">Reports, all time</div>
        </div>
        <div class="stat">
            <div class="value">{{ number_format($reportStats['last7']) }}</div>
            <div class="label">Last 7 days</div>
        </div>
        <div class="stat">
            <div class="value">{{ number_format($reportStats['last24h']) }}</div>
            <div class="label">Last 24 hours</div>
        </div>
        <div class="stat">
            <div class="value">{{ number_format($reportStats['browsers']) }}</div>
            <div class="label">Browsers reporting</div>
        </div>
    </div>

    <div class="card">
        <h3>Reports per day, last {{ $windowDays }} days</h3>
        @include('portal.partials.bar-chart', [
            'days' => $reportsSeries['days'],
            'series' => [['label' => 'Reports', 'values' => $reportsSeries['counts'], 'color' => '#5c2b85']],
            'caption' => 'Feedback reports received per day for the last ' . $windowDays . ' days.',
        ])
    </div>

    <div class="two-col">
        <div class="card">
            <h3>By pane</h3>
            @if (empty($byPane))
                <p class="muted small">No reports yet.</p>
            @else
                <table>
                    <tbody>
                        @foreach ($byPane as $pane => $total)
                            <tr>
                                <td>
                                    <a href="{{ route('portal.reports.index', ['pane' => $pane]) }}">
                                        {{ \App\Models\FeedbackReport::PANE_LABELS[$pane] ?? $pane }}
                                    </a>
                                </td>
                                <td class="num">{{ number_format($total) }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>

        <div class="card">
            <h3>By reading level</h3>
            @if (empty($byReadingLevel))
                <p class="muted small">No reports yet.</p>
            @else
                <table>
                    <tbody>
                        @foreach ($byReadingLevel as $level => $total)
                            <tr>
                                <td>
                                    {{ $level === '' || $level === null
                                        ? 'Unknown'
                                        : (\App\Models\FeedbackReport::READING_LEVEL_LABELS[$level] ?? $level) }}
                                </td>
                                <td class="num">{{ number_format($total) }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        </div>
    </div>

    <div class="card">
        <h3>Most active reporters</h3>
        @if ($topBrowsers->isEmpty())
            <p class="muted small">No reports yet.</p>
        @else
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Browser</th>
                            <th class="num">Reports</th>
                            <th>Last report</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($topBrowsers as $browser)
                            <tr>
                                <td>
                                    <a class="mono"
                                       href="{{ route('portal.reports.index', ['browser_id' => $browser->browser_id]) }}">
                                        {{ $browser->browser_id }}
                                    </a>
                                </td>
                                <td class="num">{{ number_format($browser->total) }}</td>
                                <td class="small muted">
                                    {{ \Illuminate\Support\Carbon::parse($browser->last_seen)->diffForHumans() }}
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <p class="small muted" style="margin-bottom:0">
                A browser, not a person — anonymous by design.
            </p>
        @endif
    </div>

    <div class="card">
        <h3>Latest reports</h3>
        @if ($latestReports->isEmpty())
            <p class="muted small">No reports yet.</p>
        @else
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Who</th>
                            <th>Pane</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($latestReports as $report)
                            <tr>
                                <td class="small">{{ $report->created_at?->diffForHumans() }}</td>
                                <td>{{ $report->displayName() }}</td>
                                <td><span class="pill">{{ $report->paneLabel() }}</span></td>
                                <td>
                                    <a href="{{ route('portal.reports.show', $report) }}">
                                        {{ \Illuminate\Support\Str::limit($report->comment, 80) }}
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <p class="small" style="margin-bottom:0">
                <a href="{{ route('portal.reports.index') }}">See all reports</a>
            </p>
        @endif
    </div>

    {{-- ---------------- 4. API metrics (what it costs) ---------------- --}}
    <h2>API metrics</h2>
    <p class="small muted" style="margin-top:-6px">
        Calls Clario made out to paid providers. Counted only on a cache miss, so this tracks spend —
        and it deliberately won't match the Usage numbers above. One "Audio requested" becomes several
        TTS calls, because Google caps each request at 5,000 bytes of marked-up text.
    </p>

    <div class="card">
        <h3>Provider calls per day, last {{ $windowDays }} days</h3>
        @include('portal.partials.bar-chart', [
            'days' => $usageSeries['days'],
            'series' => $usageSeriesForChart,
            'caption' => 'Outbound provider calls per day for the last ' . $windowDays . ' days, stacked by service.',
        ])
    </div>

    <div class="card">
        <h3>This week vs last week</h3>
        <div class="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th>Service</th>
                        <th class="num">Last 7 days</th>
                        <th class="num">7 days before</th>
                        <th class="num">Change</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($usageThisWeek as $row)
                        <tr>
                            <td>{{ $row['label'] }}</td>
                            <td class="num">{{ number_format($row['current']) }}</td>
                            <td class="num">{{ number_format($row['previous']) }}</td>
                            <td class="num">
                                @if ($row['delta'] === null)
                                    <span class="muted">—</span>
                                @else
                                    <span class="delta {{ $row['delta'] >= 0 ? 'up' : 'down' }}">
                                        {{ $row['delta'] > 0 ? '+' : '' }}{{ $row['delta'] }}%
                                    </span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
@endsection
