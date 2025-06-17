<template>
    <Dialog>
        <DialogTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8">
                <Settings class="h-5 w-5" />
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription> Adjust your extension settings here.</DialogDescription>
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
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Settings } from 'lucide-vue-next';
</script>
