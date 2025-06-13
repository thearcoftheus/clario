<template>
    <div class="flex h-full flex-col gap-4 p-4">
        <!-- Header with settings link -->
        <div class="mb-2 flex items-center justify-between">
            <h1 class="text-xl font-bold">Extension</h1>
            <Dialog>
                <DialogTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-8 w-8">
                        <Settings class="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription> Adjust your extension settings here. </DialogDescription>
                    </DialogHeader>

                    <div class="space-y-4 py-4">
                        <!-- Example settings -->
                        <div class="flex items-center justify-between">
                            <div class="space-y-0.5">
                                <Label htmlFor="dark-mode">Dark Mode</Label>
                                <p class="text-muted-foreground text-sm">Enable dark mode for the extension</p>
                            </div>
                            <Checkbox id="dark-mode" />
                        </div>

                        <Separator />

                        <div class="flex items-center justify-between">
                            <div class="space-y-0.5">
                                <Label htmlFor="notifications">Notifications</Label>
                                <p class="text-muted-foreground text-sm">Enable notifications from the extension</p>
                            </div>
                            <Checkbox id="notifications" />
                        </div>

                        <Separator />

                        <div class="space-y-2">
                            <Label htmlFor="refresh-interval">Refresh Interval</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <Button variant="outline" id="refresh-interval" class="w-full justify-between">
                                        <span>5 minutes</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent class="w-full min-w-[200px]">
                                    <DropdownMenuItem value="1">1 minute</DropdownMenuItem>
                                    <DropdownMenuItem value="5">5 minutes</DropdownMenuItem>
                                    <DropdownMenuItem value="15">15 minutes</DropdownMenuItem>
                                    <DropdownMenuItem value="30">30 minutes</DropdownMenuItem>
                                    <DropdownMenuItem value="60">1 hour</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <Tabs default-value="summary">
            <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
                <div class="bg-card text-card-foreground rounded-lg border shadow-sm">
                    <div class="border-b p-6">
                        <h3 class="text-lg leading-none font-semibold tracking-tight">Web Page Summary</h3>
                        <p class="text-muted-foreground text-sm">A summary of the current page content</p>
                    </div>
                    <div class="space-y-4 p-6">
                        <PageContent />
                    </div>
                    <div class="flex items-center justify-between border-t p-4">
                        <div class="text-muted-foreground text-sm">Page tone analysis:</div>
                        <div class="flex items-center gap-2">
                            <ThumbsUp class="h-5 w-5 text-green-500" />
                            <span class="text-sm font-medium">Positive & Informative</span>
                        </div>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="chat">
                <ChatTab />
            </TabsContent>
            <TabsContent value="history">
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
            </TabsContent>
        </Tabs>
    </div>
</template>

<script lang="ts" setup>
import PageContent from '@/components/PageContent.vue';
import ChatTab from '@/components/ChatTab.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, ThumbsUp } from 'lucide-vue-next';

// Example history data
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

<style lang="scss" scoped>
.h-full {
    height: 100%;
}
</style>
