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
                        <h4 class="text-base font-medium">The Future of Artificial Intelligence in Web Development</h4>

                        <p class="text-sm">
                            This article explores how artificial intelligence is transforming web development practices. It discusses the emergence of
                            AI-powered tools that can generate code, optimize performance, and enhance user experiences.
                        </p>

                        <p class="text-sm">Key points covered include:</p>

                        <ul class="list-disc space-y-1 pl-5 text-sm">
                            <li>AI-assisted code generation and its impact on developer productivity</li>
                            <li>Machine learning algorithms for optimizing website performance</li>
                            <li>Personalization capabilities through AI-driven user behavior analysis</li>
                            <li>Ethical considerations when implementing AI in web applications</li>
                            <li>Future trends in AI and web development integration</li>
                        </ul>

                        <p class="text-sm">
                            The article concludes with case studies of successful AI implementations in modern websites and provides recommendations
                            for developers looking to incorporate AI into their workflow.
                        </p>
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
                <div class="bg-card text-card-foreground flex h-[500px] flex-col rounded-lg border shadow-sm">
                    <div class="border-b p-6">
                        <h3 class="text-lg leading-none font-semibold tracking-tight">Chat</h3>
                        <p class="text-muted-foreground text-sm">Start a conversation</p>
                    </div>
                    <div class="flex-1 space-y-4 overflow-auto p-4" ref="chatContainer">
                        <div
                            v-for="(message, index) in chatMessages"
                            :key="index"
                            :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']"
                        >
                            <div
                                :class="[
                                    'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                                    message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                                ]"
                            >
                                {{ message.text }}
                            </div>
                        </div>
                    </div>
                    <div class="border-t p-4">
                        <form @submit.prevent="sendMessage" class="flex space-x-2">
                            <Input v-model="newMessage" placeholder="Type your message..." class="flex-1" />
                            <Button type="submit" size="icon">
                                <SendIcon class="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send as SendIcon, Settings, ThumbsUp } from 'lucide-vue-next';
import { nextTick, onMounted, ref } from 'vue';

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

// Chat functionality
const newMessage = ref('');
const chatContainer = ref<HTMLElement>();
const chatMessages = ref([
    { sender: 'assistant', text: 'Hello! How can I help you today?' },
    { sender: 'user', text: 'I need help with my Chrome extension.' },
    { sender: 'assistant', text: 'Sure, what specific issue are you having with your Chrome extension?' },
    { sender: 'user', text: "It's not loading properly in the browser." },
    { sender: 'assistant', text: "Let's troubleshoot that. Have you checked the console for any error messages?" },
]);

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    // Add user message
    chatMessages.value.push({
        sender: 'user',
        text: newMessage.value,
    });

    // Clear input
    newMessage.value = '';

    // Scroll to bottom
    await nextTick();
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }

    // Simulate assistant response after a delay
    setTimeout(() => {
        chatMessages.value.push({
            sender: 'assistant',
            text: 'I understand. Can you provide more details about the issue?',
        });

        // Scroll to bottom again after assistant response
        nextTick(() => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        });
    }, 1000);
};

// Scroll to bottom of chat on mount
onMounted(() => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
});
</script>

<style lang="scss" scoped>
.h-full {
    height: 100%;
}
</style>
