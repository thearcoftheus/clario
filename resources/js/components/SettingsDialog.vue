<template>
    <Dialog v-model:open="isOpen">
        <DialogTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8">
                <Settings class="h-5 w-5" />
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
            </DialogHeader>

            <form @submit.prevent="onSubmit">
                <div class="space-y-10 py-4">
                    <div class="grid gap-3">
                        <Label for="simplificationLevel">Reading level</Label>
                        <Slider v-model="simplificationLevel" :min="0" :max="SimplificationLevels.length - 1" :step="1" id="simplificationLevel" />
                        <div class="text-muted-foreground flex justify-between">
                            <div
                                v-for="(level, i) in SimplificationLevels"
                                :key="level"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == SimplificationLevels.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ level }}
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-3">
                        <Label for="summaryLength">Summary length</Label>
                        <Slider v-model="summaryLength" :min="0" :max="SummaryLengths.length - 1" :step="1" id="summaryLength" />
                        <div class="text-muted-foreground flex justify-between">
                            <div
                                v-for="(length, i) in SummaryLengths"
                                :key="length"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == SummaryLengths.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ length }}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <Checkbox id="emoji" v-model="formValues.emoji" />
                        <Label for="emoji">Use emoji?</Label>
                    </div>
                </div>

                <DialogFooter class="mt-4">
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { SimplificationLevels, SummaryLengths, useAppStateStore } from '@/stores/appStateStore';
import { CircleCheck, Settings } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const isOpen = ref(false);

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

const formValues = ref(settings.value);

const simplificationLevel = ref([0]);

watch(
    () => settings.value.simplificationLevel,
    () => {
        simplificationLevel.value = [SimplificationLevels.indexOf(settings.value.simplificationLevel)];
    },
);

watch(simplificationLevel, () => {
    formValues.value.simplificationLevel = SimplificationLevels[simplificationLevel.value[0]];
});

const summaryLength = ref([0]);

watch(
    () => settings.value.summaryLength,
    () => {
        summaryLength.value = [SummaryLengths.indexOf(settings.value.summaryLength)];
    },
    { immediate: true },
);

watch(summaryLength, () => {
    formValues.value.summaryLength = SummaryLengths[summaryLength.value[0]];
});

function onSubmit() {
    appState.updateSettings(formValues.value);
    isOpen.value = false;
    toast(h('div', { class: 'flex items-center gap-2' }, [h(CircleCheck), 'Settings saved successfully.']));
}
</script>
