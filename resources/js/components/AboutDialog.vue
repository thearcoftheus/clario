<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-h-[85vh] flex flex-col bg-sidebar-bg border-card-border !rounded-xl !p-0 !gap-0">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-card-border bg-white px-5 py-4 rounded-t-xl">
                <div class="flex items-center gap-2">
                    <Info class="size-5 text-purple" />
                    <span class="text-lg font-bold text-purple">About</span>
                </div>
            </div>

            <!-- Body -->
            <div class="space-y-4 overflow-y-auto flex-1 px-5 py-5">
                <div class="rounded-xl border border-card-border bg-white p-4">
                    <div class="mb-3 flex items-center gap-2">
                        <svg class="size-8" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="63" height="63" rx="14" fill="#5C2B85" />
                            <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                            <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                            <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                        </svg>
                        <span class="text-xl font-bold text-black">Clario</span>
                    </div>
                    <p class="text-sm text-black">
                        Clario was developed by The Arc of the United States. The Arc was established in 1950 from a grassroots movement of families working to create services and resources for their children and adults with an intellectual disability.
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
import { Info } from 'lucide-vue-next';
import { ref } from 'vue';

const isOpen = ref(false);

defineExpose({ open: () => { isOpen.value = true; } });
</script>
