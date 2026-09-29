/** True for the DOMException a fetch / stream read rejects with after its AbortController fires. */
export function isAbortError(e: unknown): boolean {
    return typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError';
}
