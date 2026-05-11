<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-h-[85vh] flex flex-col bg-sidebar-bg border-card-border !rounded-xl !p-0 !gap-0">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-card-border bg-white px-5 py-4 rounded-t-xl">
                <div class="flex items-center gap-2">
                    <CircleHelp class="size-5 text-purple" />
                    <span class="text-lg font-bold text-purple">Help</span>
                </div>
            </div>

            <!-- Body -->
            <div class="space-y-4 overflow-y-auto flex-1 px-5 py-5">
                <div class="rounded-xl border border-card-border bg-white p-4">
                    <p class="text-sm text-black">
                        Need help? Please reach out to The Arc:
                        <a href="mailto:Tech@TheArc.org" class="font-bold text-purple underline">Tech@TheArc.org</a>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-card-border bg-white px-5 py-4 rounded-b-xl">
                <button
                    type="button"
                    class="w-full cursor-pointer rounded-xl bg-purple py-2.5 text-sm font-bold text-white"
                    @click="isOpen = false"
                >
                    Close
                </button>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CircleHelp } from 'lucide-vue-next';
import { ref } from 'vue';

const isOpen = ref(false);

defineExpose({ open: () => { isOpen.value = true; } });
</script>
