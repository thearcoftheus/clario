<template>
    <!--
        Rendered in the Easy Read pane's footer strip, OUTSIDE the paginated
        content card, so it never changes the slide count and is visible at
        the same time as the difficulty check on the last slide. Two variants
        from one component — both are "one sentence, two buttons":

          nudge     Want simpler words?          [Yes, please] [No thanks]
          adaptive  Clario switched to simpler.  [Undo]        [OK]

        No auto-dismiss: the notice stays until the user acts or the article
        changes. A vulnerable user should never have to race a toast to reach
        Undo.
    -->
    <section
        v-if="active"
        role="status"
        aria-live="polite"
        :aria-label="suggestionCopy.ariaLabel"
        class="border-purple bg-purple-light rounded-xl border-2 p-3"
    >
        <p class="text-purple text-sm leading-snug font-bold">{{ message }}</p>
        <div class="mt-3 flex gap-2">
            <button
                type="button"
                class="bg-purple min-h-11 flex-1 cursor-pointer rounded-xl px-3 py-2.5 text-sm font-bold text-white"
                @click="onPrimary"
            >
                {{ primaryLabel }}
            </button>
            <button
                type="button"
                class="border-purple min-h-11 flex-1 cursor-pointer rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-black"
                @click="onSecondary"
            >
                {{ secondaryLabel }}
            </button>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { suggestionCopy } from '@/lib/suggestionCopy';
import { useSuggestionStore } from '@/stores/suggestionStore';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const suggestionStore = useSuggestionStore();
const { active } = storeToRefs(suggestionStore);

const message = computed(() => (active.value ? suggestionCopy[active.value.mode][active.value.direction].message : ''));

const primaryLabel = computed(() => {
    if (!active.value) return '';
    return active.value.mode === 'nudge' ? suggestionCopy.nudge[active.value.direction].accept : suggestionCopy.adaptive[active.value.direction].undo;
});

const secondaryLabel = computed(() => {
    if (!active.value) return '';
    return active.value.mode === 'nudge'
        ? suggestionCopy.nudge[active.value.direction].dismiss
        : suggestionCopy.adaptive[active.value.direction].keep;
});

function onPrimary() {
    if (active.value?.mode === 'nudge') void suggestionStore.accept();
    else void suggestionStore.undo();
}

function onSecondary() {
    if (active.value?.mode === 'nudge') suggestionStore.dismiss();
    else suggestionStore.acknowledge();
}
</script>
