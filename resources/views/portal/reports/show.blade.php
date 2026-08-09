@extends('portal.layout')

@section('title', 'Report #' . $report->id . ' — Clario Portal')

@section('content')
    <p class="small"><a href="{{ url()->previous() }}">&larr; Back</a></p>

    <h2>Report #{{ $report->id }}</h2>

    <div class="card">
        <h3>What they said</h3>
        <p style="white-space:pre-wrap; margin:0; font-size:16px">{{ $report->comment }}</p>
    </div>

    <div class="two-col">
        <div class="card">
            <h3>Who and when</h3>
            <dl class="detail">
                <dt>Name</dt>
                <dd>{{ $report->displayName() }}</dd>

                <dt>Received</dt>
                <dd>
                    {{ $report->created_at?->format('D j M Y, H:i') }}
                    <span class="muted">({{ $report->created_at?->diffForHumans() }})</span>
                </dd>

                <dt>Browser</dt>
                <dd>
                    <a class="mono"
                       href="{{ route('portal.reports.index', ['browser_id' => $report->browser_id]) }}">
                        {{ $report->browser_id }}
                    </a>
                    <div class="small muted">Anonymous — identifies a browser, not a person.</div>
                </dd>

                <dt>Version</dt>
                <dd>{{ $report->extension_version ?? '—' }}</dd>

                <dt>Browser info</dt>
                <dd class="small muted">{{ $report->user_agent ?? '—' }}</dd>
            </dl>
        </div>

        <div class="card">
            <h3>Where they were</h3>
            <dl class="detail">
                <dt>Pane</dt>
                <dd><span class="pill">{{ $report->paneLabel() }}</span></dd>

                <dt>Reading level</dt>
                <dd>
                    {{ $report->readingLevelLabel() ?? '—' }}
                    @if ($report->level_mode)
                        <span class="muted">
                            ({{ $report->level_mode === 'auto' ? 'Clario picks' : 'chosen by user' }})
                        </span>
                    @endif
                </dd>

                <dt>Slide</dt>
                <dd>
                    @if ($report->slide_index)
                        {{ $report->slide_index }} of {{ $report->slide_count ?? '?' }}
                    @else
                        <span class="muted">—</span>
                    @endif
                </dd>

                <dt>Page</dt>
                <dd>
                    {{ $report->page_title ?? '—' }}
                    <div class="small">
                        <a href="{{ $report->page_url }}" target="_blank" rel="noopener noreferrer">
                            {{ \Illuminate\Support\Str::limit($report->page_url, 70) }}
                        </a>
                    </div>
                </dd>
            </dl>
        </div>
    </div>

    <h2>The article, before and after</h2>
    <p class="small muted" style="margin-top:-6px">
        Left is the text Clario pulled off the page and sent to be simplified. Right is what it produced.
        Both are captured at report time, so this pair stays readable even if the article is later
        rewritten or moved.
    </p>

    <div class="two-col">
        <div class="card">
            <h3>
                Original page text
                @if ($report->original_truncated)
                    <span class="pill" style="background:#fde8c8; color:#7a4a06">truncated</span>
                @endif
            </h3>

            @if ($report->original_text)
                @php $plainOriginal = $report->originalTextAsPlainText(); @endphp
                <p class="small muted">
                    {{ number_format(str_word_count($plainOriginal)) }} words of text,
                    from {{ number_format(strlen($report->original_text) / 1024, 1) }} KB of HTML.
                </p>
                <div class="snapshot">{{ $plainOriginal }}</div>
                <details class="small" style="margin-top:10px">
                    <summary style="cursor:pointer; color:var(--purple); font-weight:600">
                        Show the raw HTML that was sent to the API
                    </summary>
                    <div class="snapshot mono" style="margin-top:8px">{{ $report->original_text }}</div>
                </details>
            @else
                <p class="muted small" style="margin:0">
                    Not captured — either no article was open, or this report predates the field.
                </p>
            @endif
        </div>

        <div class="card">
            <h3>
                What Clario was showing
                @if ($report->truncated)
                    <span class="pill" style="background:#fde8c8; color:#7a4a06">truncated</span>
                @endif
            </h3>

            @if ($report->simplified_text)
                <p class="small muted">
                    {{ number_format(str_word_count($report->simplified_text)) }} words at the
                    {{ $report->readingLevelLabel() ?? 'unknown' }} level.
                    @if ($report->slide_index)
                        The user was on slide {{ $report->slide_index }} of {{ $report->slide_count ?? '?' }};
                        slides are laid out at read time, so the breaks aren't reproducible here.
                    @endif
                </p>
                <div class="snapshot">{{ $report->simplified_text }}</div>
            @else
                <p class="muted small" style="margin:0">
                    No simplified text — the user was on a pane that doesn't show any.
                </p>
            @endif
        </div>
    </div>
@endsection
