<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\FeedbackReportRequest;
use App\Models\FeedbackReport;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PortalReportsController extends Controller
{
    private const PER_PAGE = 50;

    public function index(Request $request): View
    {
        $reports = $this->filtered($request)
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return view('portal.reports.index', [
            'reports' => $reports,
            'filters' => $this->filterValues($request),
            'panes' => FeedbackReportRequest::PANES,
        ]);
    }

    public function show(FeedbackReport $report): View
    {
        return view('portal.reports.show', ['report' => $report]);
    }

    /**
     * CSV of the current filter selection. This is what feeds prep for the
     * standing meetings, and the fallback if the portal is ever unavailable.
     *
     * Streamed so a large export doesn't have to be held in memory. The
     * simplified-text snapshot is deliberately excluded — it can be 100 KB per
     * row and makes the file unusable in a spreadsheet; use the detail view
     * for that.
     */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->filtered($request)->orderByDesc('created_at');

        $filename = 'clario-reports-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');

            fputcsv($out, [
                'id', 'created_at', 'name', 'browser_id', 'pane',
                'reading_level', 'level_mode', 'slide_index', 'slide_count',
                'page_title', 'page_url', 'comment',
                'extension_version', 'truncated',
            ]);

            $query->chunk(200, function ($reports) use ($out) {
                foreach ($reports as $report) {
                    fputcsv($out, [
                        $report->id,
                        $report->created_at?->toDateTimeString(),
                        $report->name,
                        $report->browser_id,
                        $report->paneLabel(),
                        $report->readingLevelLabel(),
                        $report->level_mode,
                        $report->slide_index,
                        $report->slide_count,
                        $report->page_title,
                        $report->page_url,
                        $report->comment,
                        $report->extension_version,
                        $report->truncated ? 'yes' : 'no',
                    ]);
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Shared by the list and the export so a CSV always matches what the
     * screen was showing.
     */
    private function filtered(Request $request): Builder
    {
        $filters = $this->filterValues($request);

        return FeedbackReport::query()
            ->when($filters['browser_id'], fn($q, $id) => $q->where('browser_id', $id))
            ->when($filters['pane'], fn($q, $pane) => $q->where('pane', $pane))
            ->when($filters['from'], fn($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['to'], fn($q, $to) => $q->whereDate('created_at', '<=', $to));
    }

    /** @return array{browser_id: ?string, pane: ?string, from: ?string, to: ?string} */
    private function filterValues(Request $request): array
    {
        $pane = $request->query('pane');

        return [
            'browser_id' => $request->query('browser_id') ?: null,
            // Ignore an unknown pane rather than returning an empty list with
            // no explanation.
            'pane' => in_array($pane, FeedbackReportRequest::PANES, true) ? $pane : null,
            'from' => $this->validDate($request->query('from')),
            'to' => $this->validDate($request->query('to')),
        ];
    }

    private function validDate(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }
}
