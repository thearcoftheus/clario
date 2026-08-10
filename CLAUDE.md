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
- **No API endpoint:** behavior events have no route and must never get one. The future auto-adjustment logic must run client-side over the local event log. This rule is about *behavioral telemetry only* — it does not cover the user-typed feedback reports described in the next section, which are a separate, consented pipeline that deliberately does reach the server. Do not conflate the two: if you find yourself adding a route that transmits anything from `behaviorEvents`, stop.
- **Retention:** pruned on load to 180 days / 5,000 events (constants in feedbackStore). Users can wipe the log via Settings → Privacy → "Clear behavior history".
- **Inspection during dev:** in the side panel's DevTools console — `chrome.storage.local.get('behaviorEvents', console.log)` and `chrome.storage.local.remove('behaviorEvents')`.
- **Why `chrome.storage.local` and not IndexedDB:** at ~200 bytes per event, even tens of thousands of events fit under the 5 MB cap. Migration to IndexedDB is straightforward later if scale demands it.

## User feedback reports (server-side)

Separate from the local-only telemetry above. A **"Give feedback"** button in the sidebar footer opens a two-field modal (message + optional name); everything else is captured silently and the report is POSTed to the server. Built for the wider tester cohort so a problem can be reported the moment it happens, with the context attached — many Clario users find "remember and describe where you were" a real barrier.

Design spec: `~/Downloads/clario-feedback-mechanism-build-spec.md` (not in the repo).

- **Why the "report" naming:** the endpoint is `POST /api/reports`, not `/api/feedback`, and the code says *report* throughout (`ReportDialog.vue`, `reportStore.ts`, `FeedbackController`). Three things in this codebase were already called "feedback" — the telemetry store, `DifficultyFeedback.vue`, and this — so the internals were renamed to keep them distinct. Only the user-facing label still says "Give feedback".
- **What is sent:** the typed message and optional name, plus page URL/title, pane, reading level + whether it's manual or adaptive, the slide the user was on, **both the article text as extracted from the page and the AI-simplified version Clario was displaying**, an anonymous browser ID, extension version, and user agent. The modal states this in plain language before the user sends.
- **`original_text` is raw HTML, on purpose.** `extractContent.ts` returns `clone.innerHTML`, so that's literally what gets POSTed to `/api/translate` — the stored value is kept byte-identical to what the API received, because that's the thing being evaluated. The portal renders it through `FeedbackReport::originalTextAsPlainText()` (strip on display, never on save) with the raw markup behind a `<details>` toggle. Don't "fix" this by stripping before storage; you'd lose the record of the actual request.
- **`originalTextAsPlainText()` is not just `strip_tags()`.** That alone removes a `<style>` wrapper but keeps the CSS inside it, so a real NYT capture renders a wall of `.gps-module{display:none…}` as if it were prose. The helper drops `<script>`/`<style>`/comments whole first (including an unclosed one at the truncation boundary), converts block boundaries to newlines so paragraphs don't run together, bullets list rows, and clears bullets left behind by icon-only rows. It also removes standalone `Advertisement` / `SKIP ADVERTISEMENT` / `Continue reading the main story` lines — **whole-line matches only**, so an article about advertising keeps its words. That list is deliberately tiny; growing it into a per-publisher denylist would rot and would risk hiding real differences between API input and output.
- **Why both texts:** `original_text` is the exact input that went to `/api/translate`; `simplified_text` is the output. Stored as a pair so simplification quality can be judged on real examples later. `page_url` is not a substitute — news sites rewrite and re-slug articles, so re-fetching months later can return different text or nothing. Each is capped independently at 100 KB with its own truncation flag (`original_truncated` / `truncated`), and the route's body limit is 300 KB to hold both plus JSON escaping overhead. **If either cap changes, change the route's `LimitRequestSize` to match** or oversized reports start 413-ing before validation runs.
- ⚠️ **Privacy weight.** `original_text` is verbatim page content, which is more exposing than the simplified paraphrase — if a tester hits "Give feedback" on an email, patient portal, or bank statement, that text lands in the database word for word. Acceptable for a disclosed tester cohort and the modal says so explicitly ("the words from that page"). **Revisit before any public launch, and decide a retention/purge policy for both text columns first** — this raises the stakes on that open TODO rather than leaving them where they were.
- **Browser ID:** `resources/js/helpers/browserId.ts` — a `crypto.randomUUID()` minted once and kept in `chrome.storage.local` under `browserId`. Deliberately **not** `storage.sync`, which would tie it to the user's Google account and propagate across devices. Identifies a browser profile, not a person; survives disable/enable and updates; resets on reinstall. The build spec assumed this already existed for the Context Agent — it did not, and this is now the only one. If telemetry ever needs an ID, reuse this rather than minting a second.
- **Never dropped:** on any retryable failure the assembled payload is queued in `chrome.storage.local` under `pendingReports` (capped at 25, oldest dropped) and flushed from `sidebar.ts` on the next load. Only a 422/413 is treated as permanent, and that surfaces an honest error rather than a fake thank-you.
- **Server:** `FeedbackController@store` behind the existing `ValidateApiKey`, plus `LimitRequestSize:153600` and a `throttle:feedback-reports` limiter keyed on `browser_id` (20/hour) — keyed on the browser, not IP, because a chapter office may have many testers behind one NAT. Snapshots over 100 KB are truncated with `mb_strcut` and flagged, never rejected.
- **`pane` and `reading_level` are stored raw** (`summary`/`narrate`/`avatar`… and `Easy`/`Moderate`/`Challenging`), not as display labels. `FeedbackReport::PANE_LABELS` / `READING_LEVEL_LABELS` map them for the portal, so renaming a pane in the UI never rewrites history.

## Provider usage counters

`api_call_counts` — a daily tally of **outbound** calls to paid providers, for cost visibility. One row per `(day, service)`, incremented via `ApiCallCount::bump()` at the six real provider call sites (`AiController` translate/headline/chat, `NarrationService` ×2, `AvatarController` Cartesia + Simli). **Bump only on a cache miss**, or the numbers stop tracking spend.

Aggregation-only by design: no timestamps, no `browser_id`, no content — a daily count can't say anything about an individual, which keeps the "behavioral data stays on your machine" story intact. Distinct from `api_metrics`, which the `TrackApiMetrics` middleware fills with *inbound* requests; the two differ wherever a cached response means no provider call happened.

**Provider calls are not a proxy for use.** One "Generate audio" click becomes ~4–7 billable TTS calls, because Google caps SSML at 5,000 bytes and `buildSsmlChunks` splits at 4,500 — and every word carries a `<mark>` tag for the Listen pane's highlighting, roughly 22 bytes of markup per word, so 4,500 bytes is only ~150–200 words. Both numbers matter and they are shown separately in the portal: Usage = what people did, API metrics = what it cost.

## Usage tracking (`trigger` on `api_metrics`)

The portal's Usage panel derives human-level actions from the **existing inbound request log**, so it needed no new collection and works retroactively over `api_metrics` (data since April 2026). The action map lives in `PortalDashboardController::USAGE_ACTIONS`.

Most routes are already clean one-per-action signals (`narrate-sync`, `avatar.cartesia.tts`, `chat`, `reports.store` are all click-gated). The exception is `translate`, which fires automatically on every sidebar open **and** again on every content-affecting settings change — so the raw count reads like enthusiasm for Simple Read when most of it is prefetch.

The `trigger` column separates them (`ApiMetric::TRIGGERS`):
- `prefetch` — Clario generated it on its own when the sidebar opened. Set in `historyStore.add()`.
- `regenerate` — the user changed reading level / summary length / emoji on an article they had open. Set in the `historyStore` settings watcher, **before** it bumps `date` — the date bump is what remounts `HistoryItemStream`, and the new component reads `item.trigger` on mount, so reversing those two lines silently tags everything as prefetch.

`trigger` is metrics-only: validated in `TranslateRequest`, recorded by `TrackApiMetrics`, and never used to build a prompt. It's nullable and optional, so rows predating the column — and older extension builds still in the wild — keep working; the dashboard counts a null trigger as neither action rather than inventing a value.

`headline` and `avatar.script` are deliberately excluded from the Usage panel: the first duplicates `translate` on every article open, and the second fires on entering the Watch pane rather than on a decision to generate.

⚠️ **Pane-level engagement stays out of this.** "Which panes did someone visit and abandon" is `pane_visit` in the local-only `behaviorEvents` log, and it must not be moved server-side. If a future change adds `browser_id` or sub-day timestamps to any usage counter "just for deduplication," that rebuilds the per-user profile the privacy commitment rules out — the aggregate shape is the whole point.

## Clario Management Portal (`/portal`)

Small authenticated Blade app for the team to review feedback and watch usage. v1 is the feedback module.

- **Blade, not Inertia, on purpose.** The starter kit's Inertia frontend was deleted when this repo was repurposed for the extension — there is no `resources/js/app.ts` and no `pages/` directory, so `resources/views/app.blade.php` references files that don't exist. Reviving it would mean a fourth Vite build touching the pipeline the extension depends on. The portal uses server-rendered Blade plus a hand-written `public/portal.css`, with inline SVG bar charts (`portal/partials/bar-chart.blade.php`) instead of a chart library. **No npm dependency, no Vite entry.**
- **Auth** reuses the starter kit's existing (previously unused) `users` table and `User` model with the standard session guard. No self-registration, no roles. Accounts come from `PortalUsersSeeder` (`php artisan db:seed --class=PortalUsersSeeder`), which prints one-time random passwords. Login is rate limited via the `portal-login` limiter.
- `bootstrap/app.php` sets `redirectGuestsTo(route('portal.login'))` because the `auth` middleware's default `login` route doesn't exist here.
- **Ignore `routes/auth.php`, `routes/settings.php`, and `app/Http/Controllers/Auth/`** — starter-kit leftovers that are not registered in `bootstrap/app.php` and render Inertia pages that were deleted. The Pest tests covering them (`tests/Feature/Auth/*`, `Settings/*`, `DashboardTest`) fail for that reason and were already failing before the portal existed. Don't "fix" them by wiring the routes back up; delete them when someone has a moment.
- **Out of scope for v1:** triage/status workflow, notes on reports, user-management UI, email digests. CSV export (respecting active filters) is the meeting-prep artifact and the no-portal fallback; it omits `simplified_text` deliberately, since 100 KB per row makes a spreadsheet unusable.

## Deployment

- **Production server:** `https://phpstack-562680-6324204.cloudwaysapps.com` — hosted on Cloudways. The hostname is Cloudways' auto-generated default subdomain; update this entry if a custom domain is ever added.
- **Build the extension for production:** `npm run build:production -- --url https://phpstack-562680-6324204.cloudwaysapps.com` (after `nvm use 20`). The URL is baked into `chrome_extension/build/sidebar.js` and `chrome_extension/build/background.js` at build time.
- **Server requirements:**
  - `storage/app/avatar/` must exist and be writable by the web user. Grows ~5× faster than `storage/app/narrations/`.
  - Web server must not buffer SSE responses. The `/api/avatar/cartesia/tts` endpoint returns `text/event-stream` and sets `X-Accel-Buffering: no` (defeats nginx buffering) plus `Content-Encoding: identity` (defeats gzip middleware). Verify nothing in the stack overrides those headers — the streaming latency win for the Watch pane depends on bytes arriving incrementally.
  - PHP `output_buffering` should be `Off` or low (`4096`); the controller calls `ob_end_clean()` inside the response closure so even non-zero values are usually safe.
- **After deploying new backend code:** `php artisan optimize:clear && php artisan route:cache`, then reload PHP-FPM if applicable (Cloudways handles this via its dashboard).
- **Feedback reports + portal (first deploy only):**
  - `php artisan migrate` — creates `feedback_reports` and `api_call_counts`.
  - `php artisan db:seed --class=PortalUsersSeeder` — creates the portal accounts and prints one-time passwords. **Edit the placeholder addresses in the seeder first.**
  - **The database is SQLite** (`DB_CONNECTION=sqlite`), and stays that way — Cloudways provisions a MySQL instance (`bgfessnwdf`) that is deliberately unused. `database/database.sqlite` has held production data since April 2026 and is covered by `database/.gitignore` (`*.sqlite*`), so a git-based deploy never touches it. That glob also covers the `-wal` / `-shm` sidecars.
  - **SQLite is tuned for concurrent writes** in `config/database.php`: `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL` (overridable via `DB_JOURNAL_MODE` / `DB_BUSY_TIMEOUT` / `DB_SYNCHRONOUS`). This matters because Clario writes on nearly every request — `TrackApiMetrics` per inbound call, `ApiCallCount` per provider hit, plus feedback reports. On the SQLite defaults a second concurrent writer fails instantly with "database is locked"; metrics and counters swallow that, but a lock inside `FeedbackController@store` would 500 a real user's report. If lock errors ever appear in the logs at cohort scale, that is the signal to move to the MySQL instance — not before.
  - Text columns are `mediumText`, not `text`. SQLite ignores the distinction, but MySQL's `TEXT` caps at 65,535 bytes while `original_text` / `simplified_text` are capped at 100 KB — so the schema is already correct if the database is ever moved.
  - Sessions must work for `/portal` (`SESSION_DRIVER`), and `APP_URL` should be the real HTTPS host so login cookies are issued correctly.
  - `public/portal.css` is a plain static file — make sure the deploy copies it.
- **Note on `config:cache`:** safe to run — all third-party API keys (Cartesia, Simli, Google Cloud TTS, Clario, Gemini) are read via `config('services.*.api_key')`, never via `env()` directly in controllers/services. If you ever add a new `env()` call to a controller, either add a matching entry in `config/services.php` and use `config()` instead, or skip `config:cache` for that release — Laravel's `env()` returns null in non-config files once config is cached.

Backend AI/TTS keys:
- `GEMINI_API_KEY` - For AI agents via Prism
- `GOOGLE_APPLICATION_CREDENTIALS` - For Cloud Text-to-Speech
- `SIMLI_API_KEY` - For Simli lip-sync video generation
- `CARTESIA_API_KEY` - For Cartesia text-to-speech (drives Simli audio)
