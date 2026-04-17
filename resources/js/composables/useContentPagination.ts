import { nextTick, onBeforeUnmount, onMounted, ref, type Ref, watch } from 'vue';

export function useContentPagination(
    containerRef: Ref<HTMLElement | null>,
    contentChangeTrigger?: Ref<string>,
) {
    const currentPage = ref(1);
    const totalPages = ref(1);
    const columnWidth = ref(0);
    const columnGap = ref(0);

    let resizeObserver: ResizeObserver | null = null;
    let recalcTimer: ReturnType<typeof setTimeout> | null = null;

    function recalculate() {
        const el = containerRef.value;
        if (!el) return;

        const width = el.clientWidth;
        if (width === 0) return;

        columnWidth.value = width;
        el.style.columnWidth = `${width}px`;

        // Read the computed column-gap
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
        columnGap.value = gap;

        // Wait for browser to reflow columns
        nextTick(() => {
            requestAnimationFrame(() => {
                const sw = el.scrollWidth;
                // Each column takes up (width + gap), except the last which has no trailing gap
                const pages = Math.max(1, Math.round((sw + gap) / (width + gap)));
                totalPages.value = pages;

                // Clamp current page
                if (currentPage.value > pages) {
                    currentPage.value = pages;
                }
            });
        });
    }

    function debouncedRecalculate() {
        if (recalcTimer) clearTimeout(recalcTimer);
        recalcTimer = setTimeout(recalculate, 200);
    }

    function nextPage() {
        if (currentPage.value < totalPages.value) {
            currentPage.value++;
        }
    }

    function prevPage() {
        if (currentPage.value > 1) {
            currentPage.value--;
        }
    }

    const translateX = ref('0px');

    watch(currentPage, page => {
        translateX.value = `${-(page - 1) * (columnWidth.value + columnGap.value)}px`;
    });

    onMounted(() => {
        const el = containerRef.value;
        if (!el) return;

        // Initial calculation
        recalculate();

        // Watch for container resize
        resizeObserver = new ResizeObserver(debouncedRecalculate);
        resizeObserver.observe(el);
    });

    // Recompute when content changes (streaming)
    if (contentChangeTrigger) {
        watch(contentChangeTrigger, debouncedRecalculate);
    }

    onBeforeUnmount(() => {
        resizeObserver?.disconnect();
        if (recalcTimer) clearTimeout(recalcTimer);
    });

    return {
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        translateX,
        recalculate,
    };
}
