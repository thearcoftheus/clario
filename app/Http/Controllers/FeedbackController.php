<?php

namespace App\Http\Controllers;

use App\Http\Requests\FeedbackReportRequest;
use App\Models\FeedbackReport;
use Illuminate\Http\JsonResponse;

/**
 * Receives user-initiated feedback reports from the extension's
 * "Give feedback" modal.
 *
 * Write-only from the user's perspective — there is no read/status API. Note
 * this is a different pipeline from the local-only behavioral telemetry
 * (CLAUDE.md, "Behavioral telemetry"): everything stored here was typed or
 * explicitly submitted by the user, with disclosure shown in the modal.
 */
class FeedbackController extends Controller {

    public function store(FeedbackReportRequest $request): JsonResponse {
        $validated = $request->validated();

        // The extension truncates before sending, but a report is never worth
        // rejecting over size — trim here too and mark it, so an oversized
        // payload degrades instead of failing.
        [$simplifiedText, $truncated] = $this->capped(
            $validated['simplified_text'] ?? null,
            (bool) ($validated['truncated'] ?? false),
            FeedbackReportRequest::MAX_SIMPLIFIED_TEXT_BYTES,
        );

        [$originalText, $originalTruncated] = $this->capped(
            $validated['original_text'] ?? null,
            (bool) ($validated['original_truncated'] ?? false),
            FeedbackReportRequest::MAX_ORIGINAL_TEXT_BYTES,
        );

        $report = FeedbackReport::create([
            'browser_id' => $validated['browser_id'],
            'name' => $validated['name'] ?? null,
            'comment' => $validated['comment'],
            'page_url' => $validated['page_url'],
            'page_title' => $validated['page_title'] ?? null,
            'original_text' => $originalText,
            'original_truncated' => $originalTruncated,
            'pane' => $validated['pane'],
            'reading_level' => $validated['reading_level'] ?? null,
            'level_mode' => $validated['level_mode'] ?? null,
            'slide_index' => $validated['slide_index'] ?? null,
            'slide_count' => $validated['slide_count'] ?? null,
            'simplified_text' => $simplifiedText,
            'truncated' => $truncated,
            'extension_version' => $validated['extension_version'] ?? null,
            'user_agent' => $validated['user_agent'] ?? null,
        ]);

        return response()->json([
            'id' => $report->id,
            'ok' => true,
        ], 201);
    }

    /**
     * Trim a text snapshot to a byte budget, reporting whether anything was
     * cut. Returns [$text, $wasTruncated] and preserves a truncation flag the
     * client already set.
     *
     * mb_strcut cuts on a byte budget without splitting a UTF-8 character in
     * half — substr would, and the result wouldn't survive a round trip
     * through JSON.
     *
     * @return array{0: ?string, 1: bool}
     */
    private function capped(?string $text, bool $alreadyTruncated, int $maxBytes): array {
        if ($text === null || strlen($text) <= $maxBytes) {
            return [$text, $alreadyTruncated];
        }

        return [mb_strcut($text, 0, $maxBytes), true];
    }
}
