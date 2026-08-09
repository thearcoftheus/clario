{{--
    Inline SVG bar chart. No JS, no chart library — the portal has no build
    step, and a CDN dependency would be one more thing to break.

    @param array  $days    list of Y-m-d strings (x-axis)
    @param array  $series  list of ['label' => string, 'values' => int[], 'color' => string]
                           Stacked when more than one series is given.
    @param string $caption accessible description of what the chart shows
--}}
@php
    $count = count($days);
    $width = 720;
    $height = 160;
    $padLeft = 34;
    $padBottom = 18;
    $plotW = $width - $padLeft;
    $plotH = $height - $padBottom;

    // Stacked totals drive the y-scale.
    $totals = [];
    for ($i = 0; $i < $count; $i++) {
        $totals[$i] = array_sum(array_map(fn($s) => $s['values'][$i] ?? 0, $series));
    }
    $max = max([1, ...$totals]);

    $slot = $count > 0 ? $plotW / $count : $plotW;
    $barW = max(1, $slot * 0.72);
@endphp

@if ($count === 0 || array_sum($totals) === 0)
    <p class="muted small">No data yet.</p>
@else
    <svg class="chart" viewBox="0 0 {{ $width }} {{ $height }}" role="img"
         aria-label="{{ $caption }}" preserveAspectRatio="none">
        {{-- y-axis: zero and max only, to keep it uncluttered --}}
        <line x1="{{ $padLeft }}" y1="{{ $plotH }}" x2="{{ $width }}" y2="{{ $plotH }}"
              stroke="#d9d6e8" stroke-width="1" />
        <text x="0" y="10" font-size="10" fill="#5f5f6b">{{ number_format($max) }}</text>
        <text x="0" y="{{ $plotH }}" font-size="10" fill="#5f5f6b">0</text>

        @for ($i = 0; $i < $count; $i++)
            @php $stackTop = $plotH; @endphp
            @foreach ($series as $s)
                @php
                    $value = $s['values'][$i] ?? 0;
                    $barH = $max > 0 ? ($value / $max) * $plotH : 0;
                    $x = $padLeft + $i * $slot + ($slot - $barW) / 2;
                    $y = $stackTop - $barH;
                    $stackTop = $y;
                @endphp
                @if ($value > 0)
                    <rect x="{{ round($x, 2) }}" y="{{ round($y, 2) }}"
                          width="{{ round($barW, 2) }}" height="{{ round($barH, 2) }}"
                          fill="{{ $s['color'] }}">
                        <title>{{ $days[$i] }} — {{ $s['label'] }}: {{ number_format($value) }}</title>
                    </rect>
                @endif
            @endforeach
        @endfor

        {{-- Only label the ends; 30 dates won't fit --}}
        <text x="{{ $padLeft }}" y="{{ $height - 4 }}" font-size="10" fill="#5f5f6b">
            {{ \Illuminate\Support\Carbon::parse($days[0])->format('M j') }}
        </text>
        <text x="{{ $width }}" y="{{ $height - 4 }}" font-size="10" fill="#5f5f6b" text-anchor="end">
            {{ \Illuminate\Support\Carbon::parse($days[$count - 1])->format('M j') }}
        </text>
    </svg>

    @if (count($series) > 1)
        <div class="legend">
            @foreach ($series as $s)
                <span>
                    <span class="swatch" style="background: {{ $s['color'] }}"></span>
                    {{ $s['label'] }}
                </span>
            @endforeach
        </div>
    @endif
@endif
