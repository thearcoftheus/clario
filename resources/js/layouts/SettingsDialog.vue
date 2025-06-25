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
                <div class="space-y-4 py-4">
                    <div class="grid gap-2">
                        <Label for="simplification_level">Simplification Level</Label>
                        <Select id="simplification_level" v-model="formValues.simplificationLevel" required>
                            <SelectTrigger>
                                <SelectValue>
                                    {{ settings.simplificationLevel }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="level in SimplificationLevels" :key="level" :value="level">
                                    {{ level }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SimplificationLevels, useSettingsStore } from '@/stores/settingsStore';
import { CircleCheck, Settings } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, ref } from 'vue';
import { toast } from 'vue-sonner';

const isOpen = ref(false);

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const formValues = ref(settings.value);

function onSubmit() {
    settingsStore.updateSettings(formValues.value);
    isOpen.value = false;
    toast(h('div', { class: 'flex items-center gap-2' }, [h(CircleCheck), 'Settings saved successfully.']));
}
</script>
