@extends('portal.layout')

@section('title', 'Reports — Clario Portal')

@section('content')
    <h2>Reports</h2>

    <div class="card">
        <form method="GET" action="{{ route('portal.reports.index') }}" class="filters">
            <div class="field">
                <label for="from">From</label>
                <input id="from" name="from" type="date" value="{{ $filters['from'] }}">
            </div>

            <div class="field">
                <label for="to">To</label>
                <input id="to" name="to" type="date" value="{{ $filters['to'] }}">
            </div>

            <div class="field">
                <label for="pane">Pane</label>
                <select id="pane" name="pane">
                    <option value="">All panes</option>
                    @foreach ($panes as $pane)
                        <option value="{{ $pane }}" @selected($filters['pane'] === $pane)>
                            {{ \App\Models\FeedbackReport::PANE_LABELS[$pane] ?? $pane }}
                        </option>
                    @endforeach
                </select>
            </div>

            <div class="field" style="min-width:280px">
                <label for="browser_id">Browser</label>
                <input id="browser_id" name="browser_id" type="text"
                       placeholder="Anonymous browser ID"
                       value="{{ $filters['browser_id'] }}">
            </div>

            <div class="field">
                <button type="submit" class="btn">Filter</button>
            </div>

            @if (array_filter($filters))
                <div class="field">
                    <a class="btn secondary" href="{{ route('portal.reports.index') }}">Clear</a>
                </div>
            @endif

            <div class="field">
                <a class="btn secondary"
                   href="{{ route('portal.reports.export', request()->query()) }}">Download CSV</a>
            </div>
        </form>
    </div>

    @if ($reports->isEmpty())
        <div class="card empty">
            No reports match these filters.
        </div>
    @else
        <p class="small muted">
            {{ number_format($reports->total()) }}
            {{ \Illuminate\Support\Str::plural('report', $reports->total()) }}
            @if (array_filter($filters)) matching these filters @endif
        </p>

        <div class="card" style="padding:0; overflow:hidden">
            <div class="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Who</th>
                            <th>Pane</th>
                            <th>Level</th>
                            <th>Page</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($reports as $report)
                            <tr>
                                <td class="small" style="white-space:nowrap">
                                    {{ $report->created_at?->format('M j, H:i') }}
                                </td>
                                <td>{{ $report->displayName() }}</td>
                                <td><span class="pill">{{ $report->paneLabel() }}</span></td>
                                <td class="small">{{ $report->readingLevelLabel() ?? '—' }}</td>
                                <td class="small">
                                    {{ \Illuminate\Support\Str::limit($report->page_title ?: $report->page_url, 40) }}
                                </td>
                                <td>
                                    <a href="{{ route('portal.reports.show', $report) }}">
                                        {{ \Illuminate\Support\Str::limit($report->comment, 100) }}
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

        {{ $reports->links() }}
    @endif
@endsection
