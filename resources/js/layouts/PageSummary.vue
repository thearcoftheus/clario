<template>
    <div class="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div class="border-b p-6">
            <h3 class="text-lg leading-none font-semibold tracking-tight">Web Page Summary</h3>
            <p class="text-muted-foreground text-sm">A summary of the current page content</p>
        </div>
        <div class="p-6">
            <SimplifiedContent />
        </div>
        <!--        <div class="flex items-center justify-between border-t p-4">-->
        <!--            <div class="text-muted-foreground text-sm">Page tone analysis:</div>-->
        <!--            <div class="flex items-center gap-2">-->
        <!--                <ThumbsUp class="h-5 w-5 text-green-500" />-->
        <!--                <span class="text-sm font-medium">Positive & Informative</span>-->
        <!--            </div>-->
        <!--        </div>-->
    </div>
</template>

<script lang="ts" setup>
import SimplifiedContent from '@/components/SimplifiedContent.vue';
</script>
