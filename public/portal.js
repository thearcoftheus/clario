/*
 * Hover tooltip for the portal's inline SVG bar charts.
 *
 * Plain script, no build step, no dependencies — same reasoning as
 * portal.css. Each <rect> in a chart carries data-bar / data-label /
 * data-series / data-value / data-color (see
 * resources/views/portal/partials/bar-chart.blade.php). Hovering any segment
 * shows the bar's label, every segment in that bar with the hovered one
 * emphasised, and the total when the bar is stacked.
 */
(function () {
    'use strict';

    var SEGMENT = 'svg.chart rect[data-bar]';

    // The <title> children give browsers without JS a native tooltip. With JS
    // they would show a second, delayed tooltip on top of ours, so drop them.
    document.querySelectorAll(SEGMENT + ' > title').forEach(function (title) {
        title.remove();
    });

    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);

    function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function segmentUnder(target) {
        return target && target.closest ? target.closest(SEGMENT) : null;
    }

    function render(rect) {
        var svg = rect.closest('svg');
        var segments = svg.querySelectorAll('rect[data-bar="' + rect.getAttribute('data-bar') + '"]');
        var total = 0;
        var html = '<div class="chart-tip-title">' + escapeHtml(rect.getAttribute('data-label')) + '</div>';

        segments.forEach(function (segment) {
            var value = Number(segment.getAttribute('data-value')) || 0;
            total += value;
            html += '<div class="chart-tip-row' + (segment === rect ? ' is-current' : '') + '">'
                + '<span class="swatch" style="background:' + escapeHtml(segment.getAttribute('data-color')) + '"></span>'
                + '<span class="chart-tip-name">' + escapeHtml(segment.getAttribute('data-series')) + '</span>'
                + '<span class="num">' + value.toLocaleString() + '</span>'
                + '</div>';
        });

        if (segments.length > 1) {
            html += '<div class="chart-tip-row chart-tip-total">'
                + '<span></span><span class="chart-tip-name">Total</span>'
                + '<span class="num">' + total.toLocaleString() + '</span>'
                + '</div>';
        }

        tip.innerHTML = html;
    }

    function position(event) {
        var gap = 14;
        var x = event.clientX + gap;
        var y = event.clientY + gap;

        if (x + tip.offsetWidth > window.innerWidth - 8) {
            x = event.clientX - tip.offsetWidth - gap;
        }
        if (y + tip.offsetHeight > window.innerHeight - 8) {
            y = event.clientY - tip.offsetHeight - gap;
        }

        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
    }

    document.addEventListener('mouseover', function (event) {
        var rect = segmentUnder(event.target);
        if (!rect) return;
        render(rect);
        tip.hidden = false;
        position(event);
    });

    document.addEventListener('mousemove', function (event) {
        if (tip.hidden) return;
        if (!segmentUnder(event.target)) {
            tip.hidden = true;
            return;
        }
        position(event);
    });

    document.addEventListener('mouseout', function (event) {
        if (!segmentUnder(event.target)) return;
        if (segmentUnder(event.relatedTarget)) return;
        tip.hidden = true;
    });
})();
