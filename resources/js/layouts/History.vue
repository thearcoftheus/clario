<template>
    <div class="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div class="p-6">
            <h3 class="text-lg leading-none font-semibold tracking-tight">Browsing History</h3>
            <p class="text-muted-foreground text-sm">Your recent browsing history</p>
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="(item, index) in historyItems" :key="index">
                    <TableCell>{{ item.name }}</TableCell>
                    <TableCell>{{ item.date }}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
</template>

<script lang="ts" setup>
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const historyItems = [
    { name: 'Getting Started with Vue.js', date: 'Today, 10:30 AM' },
    { name: 'The Ultimate Guide to Tailwind CSS', date: 'Today, 9:15 AM' },
    { name: 'Building Chrome Extensions with Vue', date: 'Yesterday, 4:45 PM' },
    { name: 'Modern JavaScript Techniques', date: 'Yesterday, 2:20 PM' },
    { name: 'How to Create Responsive Layouts', date: 'May 15, 2023, 11:05 AM' },
    { name: 'Understanding Web Components', date: 'May 14, 2023, 3:30 PM' },
    { name: 'The Future of Web Development', date: 'May 12, 2023, 9:45 AM' },
    { name: 'Mastering TypeScript', date: 'May 10, 2023, 1:15 PM' },
];
</script>
