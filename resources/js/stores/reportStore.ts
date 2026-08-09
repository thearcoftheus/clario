import { getApiHeaders } from '@/helpers/apiConfig';
import { getBrowserId } from '@/helpers/browserId';
import route from '@/helpers/route';
import { truncateToBytes } from '@/helpers/truncateToBytes';
import { MAX_ORIGINAL_TEXT_BYTES, MAX_SIMPLIFIED_TEXT_BYTES } from '@/lib/reportCopy';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// User-initiated feedback reports ("Give feedback" in the sidebar footer).
//
// This is NOT the local-only behavioral telemetry in feedbackStore.ts. These
// reports are typed by the user and DO leave the browser — the modal says so
// in plain language before they send. Keep the two systems separate; the
// privacy posture is different.

// The extension's View union plus the two surfaces that aren't views.
export const ReportPanes = ['home', 'summary', 'narrate', 'avatar', 'chat', 'settings', 'other'] as const;
export type ReportPane = (typeof ReportPanes)[number];

export type ReportPayload = {
    browser_id: string;
    comment: string;
    name: string | null;
    page_url: string;
    page_title: string | null;
    // The article as extracted from the page — the exact text that was sent
    // to /api/translate. Kept so it can be read against the simplified
    // version later; re-fetching page_url is not a substitute, because news
    // sites rewrite and re-slug articles.
    original_text: string | null;
    original_truncated: boolean;
    pane: ReportPane;
    reading_level: string | null;
    level_mode: 'manual' | 'auto' | null;
    slide_index: number | null;
    slide_count: number | null;
    simplified_text: string | null;
    truncated: boolean;
    extension_version: string | null;
    user_agent: string | null;
};

export type SubmitOutcome = 'sent' | 'queued' | 'invalid';

const PENDING_KEY = 'pendingReports';
// Enough to cover a long offline stretch without letting the queue grow
// without bound. Oldest entries are dropped first.
const MAX_PENDING_REPORTS = 25;

/**
 * Should this failure be retried later, or is the payload permanently bad?
 * A 422 means the report is structurally invalid and will never succeed, so
 * retrying it forever would just block the queue.
 */
function isPermanentFailure(status: number | undefined): boolean {
    return status === 422 || status === 413;
}

export const useReportStore = defineStore('report', () => {
    const isSubmitting = ref(false);

    // --- Context published by the UI -------------------------------------
    // Assembled from live app state rather than re-read from the DOM, so the
    // report reflects exactly what the sidebar believed it was showing.

    const currentPane = ref<ReportPane>('home');

    // Simple Read paginates via useContentPagination, whose state lives in
    // EasyReadPane rather than a store — the pane publishes it here so a
    // report can say which slide the user was looking at.
    const readPosition = ref<{ slide: number; total: number } | null>(null);

    function setPane(pane: ReportPane) {
        currentPane.value = pane;
    }

    function setReadPosition(position: { slide: number; total: number } | null) {
        readPosition.value = position;
    }

    // --- Payload assembly -------------------------------------------------

    async function buildPayload(comment: string, name: string): Promise<ReportPayload> {
        const historyStore = useHistoryStore();
        const appState = useAppStateStore();

        const article = historyStore.historyItems[0] ?? null;
        const settings = appState.settings;

        const rawSimplified = article?.simplifiedContent || '';
        const { text: simplifiedText, truncated } = rawSimplified
            ? truncateToBytes(rawSimplified, MAX_SIMPLIFIED_TEXT_BYTES)
            : { text: '', truncated: false };

        // `content` is what extractContent pulled off the page and what got
        // POSTed to /api/translate — so the pair stored here is genuinely the
        // input and output of the same simplification.
        const rawOriginal = article?.content || '';
        const { text: originalText, truncated: originalTruncated } = rawOriginal
            ? truncateToBytes(rawOriginal, MAX_ORIGINAL_TEXT_BYTES)
            : { text: '', truncated: false };

        // Slide numbers only mean something on the paginated Simple Read pane.
        const position = currentPane.value === 'summary' ? readPosition.value : null;

        return {
            browser_id: await getBrowserId(),
            comment: comment.trim(),
            name: name.trim() || null,
            page_url: article?.url ?? window.location.href,
            page_title: article ? article.aiTitle || article.name : null,
            original_text: originalText || null,
            original_truncated: originalTruncated,
            pane: currentPane.value,
            reading_level: settings.simplificationLevel,
            level_mode: settings.adaptiveDifficulty ? 'auto' : 'manual',
            slide_index: position?.slide ?? null,
            slide_count: position?.total ?? null,
            simplified_text: simplifiedText || null,
            truncated,
            extension_version: chrome.runtime?.getManifest?.()?.version ?? null,
            user_agent: navigator.userAgent,
        };
    }

    // --- Local queue ------------------------------------------------------

    async function readQueue(): Promise<ReportPayload[]> {
        const stored = await chrome.storage.local.get(PENDING_KEY);
        const pending = stored?.[PENDING_KEY];
        return Array.isArray(pending) ? (pending as ReportPayload[]) : [];
    }

    async function writeQueue(reports: ReportPayload[]): Promise<void> {
        await chrome.storage.local.set({ [PENDING_KEY]: reports });
    }

    async function enqueue(payload: ReportPayload): Promise<void> {
        const queue = await readQueue();
        queue.push(payload);
        // Drop the oldest if we're at the cap — a very old report is the least
        // useful thing to keep.
        await writeQueue(queue.slice(-MAX_PENDING_REPORTS));
    }

    async function post(payload: ReportPayload): Promise<void> {
        await axios.post(route('reports.store'), payload, { headers: getApiHeaders() });
    }

    // --- Submit / flush ---------------------------------------------------

    /**
     * Send a report. Falls back to the local queue on any failure that a
     * later retry could plausibly fix — a report is never silently dropped.
     */
    async function submit(comment: string, name: string): Promise<SubmitOutcome> {
        isSubmitting.value = true;

        try {
            const payload = await buildPayload(comment, name);

            try {
                await post(payload);
                // A successful connection is a good moment to drain anything
                // that piled up while the user was offline.
                void flushPending();
                return 'sent';
            } catch (error) {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined;

                if (isPermanentFailure(status)) {
                    return 'invalid';
                }

                await enqueue(payload);
                return 'queued';
            }
        } catch {
            // Assembling the payload failed (storage unavailable, say). There
            // is nothing to queue, so be honest and let the caller show the
            // invalid state rather than claiming we saved it.
            return 'invalid';
        } finally {
            isSubmitting.value = false;
        }
    }

    /**
     * Try to send anything sitting in the queue. Safe to call on every
     * sidebar load; does nothing when the queue is empty.
     */
    async function flushPending(): Promise<void> {
        const queue = await readQueue();
        if (queue.length === 0) return;

        let index = 0;

        for (; index < queue.length; index++) {
            try {
                await post(queue[index]);
            } catch (error) {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined;

                // Drop permanently-bad reports and keep going. On anything
                // retryable, stop immediately — the server is likely still
                // down, and hammering it won't help.
                if (!isPermanentFailure(status)) break;
            }
        }

        // Everything from the first retryable failure onward stays queued.
        await writeQueue(queue.slice(index));
    }

    async function pendingCount(): Promise<number> {
        return (await readQueue()).length;
    }

    return {
        isSubmitting,
        currentPane,
        readPosition,
        setPane,
        setReadPosition,
        submit,
        flushPending,
        pendingCount,
    };
});
