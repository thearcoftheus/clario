<template>
    <Dialog v-model:open="isOpen">
        <!-- The built-in close button is a 16px icon; bump its hit area to
             meet the 44px touch-target bar without forking DialogContent. -->
        <DialogContent
            class="bg-sidebar-bg border-card-border flex max-h-[85vh] flex-col !gap-0 !rounded-xl !p-0 [&>button:last-child]:flex [&>button:last-child]:size-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:!top-2 [&>button:last-child]:!right-2 [&>button:last-child]:rounded-xl"
        >
            <!-- Header -->
            <div class="border-card-border flex items-center gap-2 rounded-t-xl border-b bg-white px-5 py-4">
                <MessageSquare class="text-purple size-5 shrink-0" />
                <DialogTitle class="text-purple text-lg font-bold">{{ copy.heading }}</DialogTitle>
            </div>

            <!-- Body -->
            <div class="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <!-- Always rendered, so the dialog's aria-describedby never
                     points at a removed element, and so the text changes
                     inside a live region that already exists — a region
                     inserted at the same moment as its text often isn't
                     announced. -->
                <DialogDescription
                    role="status"
                    aria-live="polite"
                    :class="isConfirmed ? 'sr-only' : 'text-sm text-black'"
                >
                    {{ describedByText }}
                </DialogDescription>

                <!-- Confirmation. Replaces the form entirely so there is no
                     ambiguity about whether the message went. -->
                <div v-if="isConfirmed" class="border-card-border rounded-xl border bg-white p-4">
                    <p class="text-purple text-base font-bold">
                        {{ state === 'sent' ? copy.successHeading : copy.queuedHeading }}
                    </p>
                    <p class="mt-1 text-sm text-black">
                        {{ state === 'sent' ? copy.successBody : copy.queuedBody }}
                    </p>
                </div>

                <template v-else>
                    <!-- Could neither send nor queue. The form below keeps
                         everything the user typed so retrying is free. -->
                    <div
                        v-if="state === 'failed'"
                        role="alert"
                        class="rounded-xl border border-red-700 bg-white p-4"
                    >
                        <p class="text-base font-bold text-red-700">{{ copy.errorHeading }}</p>
                        <p class="mt-1 text-sm text-black">{{ copy.errorBody }}</p>
                    </div>

                    <!-- Comment (required) -->
                    <div>
                        <label :for="commentId" class="mb-1.5 block text-sm font-bold text-black">
                            {{ copy.commentLabel }}
                        </label>
                        <textarea
                            :id="commentId"
                            ref="commentInput"
                            v-model="comment"
                            rows="5"
                            :maxlength="MAX_COMMENT_LENGTH"
                            :placeholder="copy.commentPlaceholder"
                            :aria-invalid="showCommentError || undefined"
                            :aria-describedby="showCommentError ? commentErrorId : undefined"
                            class="border-card-border w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm text-black outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-purple"
                        />
                        <!-- Always in the DOM so screen readers announce the
                             message when it appears, rather than announcing a
                             newly inserted region. -->
                        <p :id="commentErrorId" role="alert" class="mt-1 text-sm font-bold text-red-700">
                            {{ showCommentError ? copy.commentRequiredError : '' }}
                        </p>
                    </div>

                    <!-- Name (optional) -->
                    <div>
                        <label :for="nameId" class="mb-1.5 block text-sm font-bold text-black">
                            {{ copy.nameLabel }}
                        </label>
                        <input
                            :id="nameId"
                            v-model="name"
                            type="text"
                            :maxlength="MAX_NAME_LENGTH"
                            class="border-card-border w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-purple"
                        />
                    </div>

                    <!-- What else gets sent -->
                    <p class="text-sm leading-snug text-black">{{ copy.disclosure }}</p>
                </template>
            </div>

            <!-- Footer -->
            <div class="border-card-border rounded-b-xl border-t bg-white px-5 py-4">
                <div v-if="isConfirmed">
                    <button
                        type="button"
                        class="bg-purple min-h-11 w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-white"
                        @click="isOpen = false"
                    >
                        {{ copy.doneLabel }}
                    </button>
                </div>

                <div v-else class="flex items-center gap-3">
                    <button
                        type="button"
                        class="border-card-border min-h-11 flex-1 cursor-pointer rounded-xl border bg-white py-2.5 text-sm font-bold text-black"
                        @click="isOpen = false"
                    >
                        {{ copy.cancelLabel }}
                    </button>
                    <button
                        type="button"
                        :disabled="isSubmitting"
                        class="bg-purple min-h-11 flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        @click="onSubmit"
                    >
                        {{ submitLabel }}
                    </button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { MAX_COMMENT_LENGTH, MAX_NAME_LENGTH, reportCopy as copy } from '@/lib/reportCopy';
import { useReportStore } from '@/stores/reportStore';
import { MessageSquare } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, nextTick, ref, useId, watch } from 'vue';

const reportStore = useReportStore();
const { isSubmitting } = storeToRefs(reportStore);

const isOpen = ref(false);
const comment = ref('');
const name = ref('');
const showCommentError = ref(false);

// 'failed' should be very rare — the client checks for an empty comment
// first, and network failures queue rather than fail. It exists so that the
// one case where a report really is lost is stated honestly instead of being
// dressed up as a thank-you.
type DialogState = 'form' | 'sent' | 'queued' | 'failed';
const state = ref<DialogState>('form');

const commentInput = ref<HTMLTextAreaElement | null>(null);

const commentId = useId();
const commentErrorId = useId();
const nameId = useId();

// Clear the error as soon as the user starts typing — nagging is not helpful.
watch(comment, () => {
    if (showCommentError.value && comment.value.trim()) {
        showCommentError.value = false;
    }
});

watch(isOpen, open => {
    if (open) {
        // Fresh form each time. reka-ui moves focus into the dialog and
        // restores it to the trigger on close, so we only nudge focus to the
        // field the user came here to fill in.
        comment.value = '';
        name.value = '';
        showCommentError.value = false;
        state.value = 'form';
        void nextTick(() => commentInput.value?.focus());
    }
});

const isConfirmed = computed(() => state.value === 'sent' || state.value === 'queued');

// Doubles as the dialog's accessible description and as the polite
// announcement when the outcome changes.
const describedByText = computed(() => {
    if (state.value === 'sent') return `${copy.successHeading} ${copy.successBody}`;
    if (state.value === 'queued') return `${copy.queuedHeading} ${copy.queuedBody}`;
    return copy.description;
});

const submitLabel = computed(() => {
    if (isSubmitting.value) return copy.submittingLabel;
    return state.value === 'failed' ? copy.tryAgainLabel : copy.submitLabel;
});

async function onSubmit() {
    if (!comment.value.trim()) {
        showCommentError.value = true;
        void nextTick(() => commentInput.value?.focus());
        return;
    }

    const outcome = await reportStore.submit(comment.value, name.value);

    // 'queued' still reads as a success to the user — the report is saved and
    // will go out later. Only 'invalid' means it is genuinely gone, and that
    // gets the honest error state.
    if (outcome === 'sent') {
        state.value = 'sent';
    } else if (outcome === 'queued') {
        state.value = 'queued';
    } else {
        state.value = 'failed';
    }
}

defineExpose({
    open: () => {
        isOpen.value = true;
    },
});
</script>
