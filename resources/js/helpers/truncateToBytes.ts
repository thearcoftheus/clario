/**
 * Cut `text` down to at most `maxBytes` UTF-8 bytes without splitting a
 * character in half.
 *
 * The unit is bytes, not characters, because the server enforces its cap in
 * bytes too (see FeedbackReportRequest::MAX_SIMPLIFIED_TEXT_BYTES). Cutting by
 * character count would let a page of accented or non-Latin text sail past a
 * byte limit the server then has to enforce again.
 */
export function truncateToBytes(text: string, maxBytes: number): { text: string; truncated: boolean } {
    const bytes = new TextEncoder().encode(text);

    if (bytes.length <= maxBytes) {
        return { text, truncated: false };
    }

    // Decoding a slice that ends mid-character produces a trailing U+FFFD
    // replacement character; strip it so we never store a mangled tail.
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, maxBytes));

    return { text: decoded.replace(/�+$/, ''), truncated: true };
}
