<template>
    <div class="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div class="p-6">
            <h3 class="text-lg leading-none font-semibold tracking-tight">Browsing History</h3>
            <p class="text-muted-foreground text-sm">Your recent browsing history</p>
        </div>
        <div class="relative overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Url</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead class="bg-card sticky right-0 z-10"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <template v-if="historyItems.length">
                        <TableRow v-for="(item, index) in historyItems" :key="index" :class="{ 'font-bold': index === 0 }">
                            <TableCell>{{ item.formattedDate }}</TableCell>
                            <TableCell>{{ item.name }}</TableCell>
                            <TableCell>{{ item.url }}</TableCell>
                            <TableCell>{{ item.content.substring(0, 100) }}...</TableCell>
                            <TableCell class="bg-card sticky right-0 z-10">
                                <button @click="historyStore.remove(item)">
                                    <Trash2 class="h-5 w-5" />
                                </button>
                            </TableCell>
                        </TableRow>
                    </template>
                    <TableRow v-else>
                        <TableCell colspan="5" class="py-4 text-center italic">No items</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHistoryStore } from '@/stores/historyStore';
import { Trash2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';

const historyStore = useHistoryStore();

const { historyItems } = storeToRefs(historyStore);
</script>
