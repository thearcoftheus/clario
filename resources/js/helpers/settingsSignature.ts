import type { SettingsState } from '@/stores/appStateStore';

// The settings that change what /api/translate returns — and nothing else.
// Each cached tab records the signature its simplified text was generated
// with, so a tab the user was not on when they changed the reading level can
// be regenerated lazily on activation instead of all at once. Display and
// playback preferences (textSize, playbackSpeed…) are deliberately left out:
// they don't flow into the prompt, so they must not force a regeneration.

export type ContentSettings = Pick<SettingsState, 'simplificationLevel' | 'summaryLength' | 'emoji'>;

export function settingsSignature(settings: ContentSettings): string {
    return `${settings.simplificationLevel}|${settings.summaryLength}|${settings.emoji}`;
}
