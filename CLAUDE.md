# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clario is a Chrome browser extension with a Laravel backend that provides AI-powered web content analysis features including reading level analysis, content summarization, chat, text-to-speech narration, and avatar video generation.

## Common Commands

### Node version
The system default is Node v14.17.3, which is too old for npm. Before running ANY `npm` command (including `npm run build`, `npm run lint`, etc.), switch to Node 20 first:
```bash
source ~/.nvm/nvm.sh && nvm use 20
```
If the version switch doesn't stick in your shell, prefix the command with the explicit path:
```bash
PATH="/Users/benfreda/.nvm/versions/node/v20.9.0/bin:$PATH" npm run build
```

### Development
```bash
composer dev              # Start all services (Laravel server, queue, logs). Needs Node 20 on PATH (see above) — npx runs concurrently. There is no Vite dev server; the extension is always built statically via npm run build.
npm run build             # Build Chrome extension (generates ziggy routes + 3 vite builds)
npm run build:production  # Production build (requires VITE_API_URL set or --url flag)
```

### Testing & Code Quality
```bash
composer test             # Run Pest tests (PHP)
npm test                  # Run Vitest tests (JS/TS — currently the suggestion engine + chat-intent heuristic)
npm run lint              # ESLint with auto-fix
npm run format            # Prettier formatting
npm run format:check      # Check formatting without fixing
```

### Single Test
```bash
php artisan test tests/Feature/ChatTest.php
php artisan test --filter=test_name
```

## Architecture

### Chrome Extension Build System
The extension has three separate Vite entry points built via `build.js`:
- `vite.config.ts` → `chrome_extension/build/sidebar.js` (main sidebar UI)
- `vite.config.content.ts` → `chrome_extension/build/content.js` (content script)
- `vite.config.background.ts` → `chrome_extension/build/background.js` (service worker)

The build process runs `php artisan ziggy:generate --types` first to generate route types.

### Backend Services (app/Services/)
- `BaseAgent.php` - Base class for AI agents using Prism with Gemini 2.5 Flash
- `HeadlineAgent.php` - Extracts clean article title + one-sentence summary (JSON response)
- `OverviewAgent.php` - Content overview/summary generation *(currently orphaned — see note below)*
- `SummaryAgent.php` - Text simplification at different reading levels
- `ChatAgent.php` - Conversational AI about page content
- `NarrationService.php` - Google Cloud Text-to-Speech integration
- `Readability.php` - Flesch-Kincaid reading level calculation *(currently orphaned — see note below)*

### Frontend Structure (resources/js/)
- `sidebar.ts` - Main Vue app entry point for Chrome side panel
- `content.ts` - Content script injected into web pages
- `background.ts` - Service worker for extension background tasks
- `layouts/Sidebar.vue` - Main sidebar with tabs: Summary, Chat, Narrate, Avatar
- `stores/` - Pinia stores (appStateStore, historyStore, chatStore, avatarStore)
- `helpers/` - API config, Chrome messaging, content extraction

### API Endpoints (routes/api.php)
All routes require API key authentication via `ValidateApiKey` middleware:
- `POST /api/readability` - Analyze reading level *(currently orphaned — see note below)*
- `POST /api/overview` - Generate content summary (streaming) *(currently orphaned — see note below)*
- `POST /api/headline` - Extract clean article title + one-sentence summary (JSON, non-streaming)
- `POST /api/translate` - Simplify text (streaming)
- `POST /api/chat` - Chat with AI (streaming)
- `POST /api/narrate` - Text-to-speech audio
- `POST /api/narrate-sync` - Text-to-speech with word-level timepoints for synchronized highlighting (JSON response)
- `POST /api/avatar/script` - Prepare the easy-read summary as a TTS-friendly script (markdown stripped, no preamble)
- `POST /api/avatar/cartesia/tts` - Generate PCM16 audio from text via Cartesia TTS (streamed to Simli)
- `POST /api/avatar/simli/generate` - End-to-end Simli + Cartesia video generation (unused by current frontend; kept available)

### UI Components
Uses shadcn-vue style components in `resources/js/components/ui/`. Built with reka-ui primitives, Tailwind CSS v4, and class-variance-authority.

## Environment Variables

Key variables for the extension build:
- `VITE_API_URL` - Backend server URL (localhost for dev, production URL for deployment)
- `VITE_API_KEY` - API key baked into extension (matches `CLARIO_API_KEY` on server)

## Orphaned Code: Readability / Reading Level

The Flesch-Kincaid reading level feature was removed from the toolbar widget during a Phase 2 redesign. The code is intentionally kept in place — it computes a reading grade level (Easy/Moderate/Challenging/Advanced) for any page's text and could be reintroduced in the sidebar, toolbar, or as input to other AI features in the future.

The full orphaned chain:
- **Backend**: `app/Services/Readability.php`, `app/DTO/FleschKincaidReadability.php`, the `readability()` method in `AiController.php`, and the `POST /api/readability` route
- **Frontend**: `resources/js/helpers/getReadability.ts`, the `getReadability` case in `background.ts`, `FleschKincaidReadability` type in `types/types.ts`, and `CmGetReadability` in `types/messages.ts`

None of this code is called at runtime. It can be safely deleted if the feature is permanently dropped, or wired back in if needed.

## Orphaned Code: Overview / Content Summary (Widget)

The expandable overview panel was removed from the toolbar widget during the Phase 2 redesign. It used to show a bullet-point AI summary of the page content, with a button to open the full sidebar. The code is intentionally kept — it could be reintroduced as a quick-glance summary in the toolbar or elsewhere.

The full orphaned chain:
- **Backend**: `app/Services/OverviewAgent.php`, the `overview()` method in `AiController.php`, and the `POST /api/overview` route
- **Frontend**: `resources/js/helpers/getOverview.ts`, the `overview` port listener in `background.ts`, `CmToggleOverview`/`CmOverviewResponse`/`CmOverviewError` types in `types/messages.ts`, and `resources/js/components/BasicMarkdown.vue`

Note: the sidebar's `PageSummary.vue` does its own summary display independently — it does not use the overview agent or endpoint. These are separate features.

None of this code is called at runtime. It can be safely deleted if the feature is permanently dropped, or wired back in if needed.

## Removed Settings: internetSpeed and voiceOption

These two settings were removed entirely in 0.3.2 after audit revealed nothing consumed them. They had been carried since earlier prototypes where `internetSpeed` was meant to gate `voiceOption` (Basic vs Advanced TTS), but the current `NarrationService` doesn't branch on voice quality. Both the frontend slider for Internet Speed and the auto-detection of `navigator.connection.downlink` are gone.

If reintroducing TTS-quality control later, prefer a single explicit user-facing setting (e.g., "Voice quality") rather than two coupled fields. Do not restore the auto-detection of `navigator.connection.downlink` — it was unreliable across Chrome versions and never actually changed user-visible behavior.

## Removed: D-ID avatar provider

The "Watch" feature originally supported two video providers selected by a `videoProvider` setting (`'D-ID' | 'Simli'`). The old `AvatarPane.vue` switched between them. During the WatchPane redesign, Simli became the only path users see, but the D-ID code lingered as dead branches for several releases. The full chain was removed in 0.3.2:

- **Backend**: `AvatarController::generate()`, `AvatarController::status()`, `condenseSummary()` and its 1000-char `MAX_SUMMARY_LENGTH` cap, `getAuthHeader()`, `getReadingLevelGrade()`, `READING_LEVELS`, `PRESENTER_ID`. The `POST /api/avatar/generate` and `POST /api/avatar/status/{jobId}` routes. Title-extraction helpers (`determineTitle`, `extractTitleFromSummary`, `cleanPageTitle`) — they were only used to build the preamble "This article is called X. Here's what it's about." which was itself removed earlier (commit 5bd3a92) so audio + video would match the easy-read summary exactly.
- **Frontend**: `AvatarPane.vue` (the old provider switcher), `avatarStore.ts`'s polling state (`status`, `videoUrl`, `jobId`, `errorMessage`, `generateAvatarVideo`, `startPolling`, `stopPolling`, `MAX_POLLS`), the `videoProvider` setting field along with `VideoProviders` const/`VideoProvider` type/`isVideoProvider` validator.
- **Environment**: `DID_API_KEY` is no longer read by the app. Safe to remove from `.env` / deployment configs.

If reviving D-ID later: WatchPane.vue is Simli-only by design. Don't reintroduce `videoProvider` as a settings-level switch — pick the provider at the route or component level instead. The condense step was a D-ID cost cap; Simli pricing is structured differently (per-minute streaming, not per-clip-length), so don't blindly port it across.

## Cache directories

- `storage/narrations/` — MP3 + JSON timepoints for the Listen pane, written by `NarrationService::generateAudioWithTimepoints`. Cleaned up via `NarrationService::cleanupCache($daysOld)`.
- `storage/avatar/` — PCM16 + JSON timepoints for the Watch pane, written by `AvatarController::cartesiaTTS` on cache miss. Cleaned up via `AvatarController::cleanupCache($daysOld)`. **Grows ~5× faster than `narrations/`** because PCM16 is uncompressed — a 5-minute article is ~10 MB here vs ~2 MB in `narrations/`. Plan to prune more aggressively in production.

## Behavioral telemetry (local-only)

Clario records small, structured behavioral events to inform future "adaptive defaults" work (auto-adjusting `simplificationLevel`, recommending different panes, etc.). The Clario user community is privacy-sensitive — this data **stays on the user's device and is never transmitted to a server**. That's a deliberate architectural constraint, not a future-toggle.

- **Storage:** `chrome.storage.local` under the `behaviorEvents` key. Shape: `{ events: BehaviorEvent[] }`. Per Chrome profile, per install — same isolation as the `settings` key.
- **Schema:** `resources/js/stores/feedbackStore.ts` defines a `BehaviorEvent` discriminated union covering the Phase A Tier 1 signals (design rationale in `docs/Context_Agent_Phase_A_Event_Schema.md`): `difficulty_feedback` (DifficultyFeedback.vue), `difficulty_check_shown` (IntersectionObserver in the same component — the check's reach-rate denominator), `level_switch` (SettingsDialog.vue + OnboardingOverlay.vue; recorded at call sites, not in `updateSettings()`, to avoid a feedbackStore↔appStateStore module cycle), `pane_visit` (the `navigateTo()` choke point in Sidebar.vue — all view changes MUST route through it or telemetry undercounts), and `chat_message_sent` (chatStore.addUserMessage; stores intent classification from `helpers/classifyChatIntent.ts` + word count, NEVER message text). Phase B (Tier 2 proxies, collection-only): `simple_read_session` (`composables/useSimpleReadSession.ts`, wired into EasyReadPane) — one summary per reading session with activeMs, wordCount, backwardPageTurns, furthestSlide; measured on the Simple Read pane deliberately, NOT via content-script scroll listeners on the raw page. New event types can be unioned in without migration.
- **Phase A is collection-only:** nothing reads these events to change behavior yet. The Phase A2 suggestion engine exists as a pure, fully unit-tested function (`resources/js/helpers/computeLevelSuggestion.ts`, tests via `npm test`) but is NOT wired into any UI — its tuning constants are placeholders awaiting Round 2 testing data. The `settings.adaptiveDifficulty` flag ("I choose it" / "Clario picks for me" in Settings) is likewise UX-only and consumed by nothing yet.
- **No API endpoint:** there is no `/api/feedback` or equivalent route. Do not add one. The future auto-adjustment logic must run client-side over the local event log.
- **Retention:** pruned on load to 180 days / 5,000 events (constants in feedbackStore). Users can wipe the log via Settings → Privacy → "Clear behavior history".
- **Inspection during dev:** in the side panel's DevTools console — `chrome.storage.local.get('behaviorEvents', console.log)` and `chrome.storage.local.remove('behaviorEvents')`.
- **Why `chrome.storage.local` and not IndexedDB:** at ~200 bytes per event, even tens of thousands of events fit under the 5 MB cap. Migration to IndexedDB is straightforward later if scale demands it.

## Deployment

- **Production server:** `https://phpstack-562680-6324204.cloudwaysapps.com` — hosted on Cloudways. The hostname is Cloudways' auto-generated default subdomain; update this entry if a custom domain is ever added.
- **Build the extension for production:** `npm run build:production -- --url https://phpstack-562680-6324204.cloudwaysapps.com` (after `nvm use 20`). The URL is baked into `chrome_extension/build/sidebar.js` and `chrome_extension/build/background.js` at build time.
- **Server requirements:**
  - `storage/app/avatar/` must exist and be writable by the web user. Grows ~5× faster than `storage/app/narrations/`.
  - Web server must not buffer SSE responses. The `/api/avatar/cartesia/tts` endpoint returns `text/event-stream` and sets `X-Accel-Buffering: no` (defeats nginx buffering) plus `Content-Encoding: identity` (defeats gzip middleware). Verify nothing in the stack overrides those headers — the streaming latency win for the Watch pane depends on bytes arriving incrementally.
  - PHP `output_buffering` should be `Off` or low (`4096`); the controller calls `ob_end_clean()` inside the response closure so even non-zero values are usually safe.
- **After deploying new backend code:** `php artisan optimize:clear && php artisan route:cache`, then reload PHP-FPM if applicable (Cloudways handles this via its dashboard).
- **Note on `config:cache`:** safe to run — all third-party API keys (Cartesia, Simli, Google Cloud TTS, Clario, Gemini) are read via `config('services.*.api_key')`, never via `env()` directly in controllers/services. If you ever add a new `env()` call to a controller, either add a matching entry in `config/services.php` and use `config()` instead, or skip `config:cache` for that release — Laravel's `env()` returns null in non-config files once config is cached.

Backend AI/TTS keys:
- `GEMINI_API_KEY` - For AI agents via Prism
- `GOOGLE_APPLICATION_CREDENTIALS` - For Cloud Text-to-Speech
- `SIMLI_API_KEY` - For Simli lip-sync video generation
- `CARTESIA_API_KEY` - For Cartesia text-to-speech (drives Simli audio)
