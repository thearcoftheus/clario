<template>
    <section aria-label="Welcome to Clario" class="bg-sidebar-bg flex h-full flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto">
            <OnboardingPaneIntro v-if="currentPane === 1" @next="currentPane = 2" @skip-all="completeOnboarding" />
            <OnboardingPaneReadingLevel
                v-else-if="currentPane === 2"
                :initial="draftReadingLevel"
                @next="onReadingLevelNext"
                @back="currentPane = 1"
                @skip-question="currentPane = 3"
            />
            <OnboardingPaneFormFactor
                v-else-if="currentPane === 3"
                :initial="draftFormFactors"
                @next="onFormFactorNext"
                @back="currentPane = 2"
                @skip-question="currentPane = 4"
            />
            <OnboardingPaneThankYou v-else-if="currentPane === 4" @complete="completeOnboarding" />
        </div>

        <div class="shrink-0 px-6 py-4">
            <OnboardingProgressDots :current="currentPane" :total="4" />
        </div>
    </section>
</template>

<script lang="ts" setup>
import OnboardingPaneFormFactor from '@/components/onboarding/OnboardingPaneFormFactor.vue';
import OnboardingPaneIntro from '@/components/onboarding/OnboardingPaneIntro.vue';
import OnboardingPaneReadingLevel from '@/components/onboarding/OnboardingPaneReadingLevel.vue';
import OnboardingPaneThankYou from '@/components/onboarding/OnboardingPaneThankYou.vue';
import OnboardingProgressDots from '@/components/onboarding/OnboardingProgressDots.vue';
import type { FormFactor, SimplificationLevel } from '@/stores/appStateStore';
import { useAppStateStore } from '@/stores/appStateStore';
import { ref } from 'vue';

const appStateStore = useAppStateStore();

const currentPane = ref<1 | 2 | 3 | 4>(1);

// Local drafts let the user navigate Back without losing their selection.
const draftReadingLevel = ref<SimplificationLevel | null>(null);
const draftFormFactors = ref<FormFactor[]>([]);

async function onReadingLevelNext(value: SimplificationLevel) {
    draftReadingLevel.value = value;
    await appStateStore.updateSettings({ simplificationLevel: value });
    currentPane.value = 3;
}

async function onFormFactorNext(value: FormFactor[]) {
    draftFormFactors.value = value;
    await appStateStore.updateSettings({ preferredFormFactors: value });
    currentPane.value = 4;
}

async function completeOnboarding() {
    await appStateStore.updateSettings({ hasCompletedOnboarding: true });
}
</script>
