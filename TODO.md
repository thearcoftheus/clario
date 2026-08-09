# Clario TODO

## Testing with Remote Server
- [x] Test Narrate with remote server (works, but has 5000 byte limit issue - see bug fixes)
- [x] Test Avatar (D-ID) with remote server (works, but uses wrong script - see bug fixes)
- [ ] Test Avatar (Simli) with remote server

## Bug Fixes
- [ ] Fix issue where D-ID Avatar video generation uses full summary as script, not shorter condensed summary from Avatar pane
- [ ] Fix Narrate "Advanced" option failing on long summaries (Google Cloud TTS 5000 byte limit)
  - Option 1: Chunk the text - split into ~4000 byte chunks, generate audio for each, concatenate on server (best UX)
  - Option 2: Truncate with warning - limit to ~4500 bytes, show warning if truncated (quick fix)
  - Option 3: Use Google's Long Audio API - async processing, requires Google Cloud Storage setup (complex)

## Sidebar — Phase 2 Redesign
- [ ] Implement internal pane designs (Easy Read, Listen, Ask, Watch)
- [ ] Wire up footer links (Help, About, Advanced Settings)

## Performance — Listen Pane
- [x] Persist audio state across navigation. Currently, navigating away from the Listen pane unmounts the component, discards the audio, and loses playback position. Moving audio state into a Pinia store (like chatStore) would preserve it. Desired behavior: navigating away pauses the audio automatically; navigating back shows the paused state at the same position; the user must click play to resume. Audio should NOT continue playing in the background while on other panes.
- [ ] Dedupe in-flight Listen audio requests across pane re-mounts. If the user switches Read↔Listen quickly during generation, a second mount issues a duplicate `/api/narrate-sync` call because the first hasn't returned yet (cache miss in `restoreFromStore()`). Both requests eventually cache the same data — wasteful but not broken. Fix: track an in-flight promise at the store level (`listenStore.pendingGeneration: { url, promise }`); `useListenPlayer.generate()` checks (1) cache, (2) matching pending promise to await, (3) otherwise issues a new request and registers the promise. Estimated ~15-20 lines across `listenStore.ts` and `useListenPlayer.ts`.

## Performance — Watch Pane
- [ ] Dedupe in-flight Cartesia TTS requests across Watch-pane re-mounts. If the user clicks Generate Video, switches to Easy Read, returns, and clicks Generate Video again *while* the first `/api/avatar/cartesia.tts` call is still in flight, a second request is issued (the store cache hasn't been populated yet). Both eventually return; the second write wins. Wasteful (~53s of TTS work paid twice). Same fix pattern as the Listen Case B item above: an in-flight promise on `avatarStore` keyed by article URL, awaited by subsequent calls.

## Performance — Sidebar
- [ ] Defer the `/api/translate` (summary generation) call until the user actually clicks a card. Currently `HistoryItemStream` fires the AI call immediately when the sidebar opens, even if the user only wants Chat or Listen. Could lazy-load per pane, or at least delay until "Easy Read" is tapped. Tradeoff: pre-fetching means the summary is ready instantly when they do click it.

## Nice to Have — Sidebar
- [x] Use AI to extract the real article headline instead of relying on `document.title` — implemented via `HeadlineAgent` + `POST /api/headline`
- [x] Use AI to generate a one-sentence summary for the "What You're Learning About" card — implemented via same `HeadlineAgent` endpoint (returns both title + summary)
- [ ] Fallback image for the article card when `og:image` is not available

## Watch Pane
- [ ] Handle Simli's 30-second idle timeout when video is paused. If the user pauses for more than ~30 seconds, Simli disconnects the WebRTC session. Options: (a) show a countdown warning after ~20 seconds of pause ("Connection will expire in 10 seconds — resume or replay"), (b) detect the disconnect and automatically transition to the "Replay Video" state so it's clear what happened, or (c) both.

## Documentation
- [ ] Create a `VOICES_AND_PROVIDERS.md` reference doc explaining what voice/video providers are used where:
  - **Listen pane**: Google Cloud TTS Neural2-C voice (lower quality but returns word-level timepoints for synchronized highlighting). Chirp3-HD voices sound better but do NOT return timepoints — see UX_QUESTIONS.md #3 for designer input on this tradeoff.
  - **Watch pane**: Cartesia Sonic-3 TTS (voice ID: 876c39e1) for audio generation → streamed to Simli avatar (face ID: 6ebf0aa7) via WebRTC for lip-synced video. D-ID provider code still exists but is not wired into the UI.
  - **HeadlineAgent / SummaryAgent / ChatAgent**: Google Gemini 2.5 Flash via Prism SDK (not a voice, but worth documenting alongside).
  - Include API key requirements, known limitations (5000-byte SSML limit, Chirp3-HD no timepoints, Cartesia ~30-60s generation time), and links to relevant provider docs.

## Feedback Mechanism (tester cohort)
- [x] **In-extension feedback reports**: "Give feedback" in the sidebar footer → modal → `POST /api/reports`, with silent context capture (page, pane, reading level, simplified-text snapshot, slide, anonymous browser ID). Local retry queue so a report is never dropped. See CLAUDE.md "User feedback reports".
- [x] **Management portal** at `/portal`: session auth, dashboard (usage + feedback), filterable reports list, detail view with snapshot, filtered CSV export.
- [x] **Provider usage counters**: `api_call_counts`, bumped on cache-miss at the six outbound provider call sites.
- [x] **Usage panel (human-level actions)**: derived from the existing `api_metrics` inbound log — no new collection, retroactive to April. Dashboard order is Usage → Feedback → API metrics. `trigger` column separates auto-prefetched `translate` calls from user-driven regenerations.
- [ ] **Decide whether to strip *remaining* HTML before sending to the translate API.** `<style>`, `<svg>`, and `<script>` are now removed at extraction (0.4.5), which was unambiguous noise. Still open: `clone.innerHTML` means class names, wrapper divs, and inline spans go to Gemini on every article. On a modern news site that can be the majority of the payload by bytes, and it is billed as input tokens on every prefetch and every reading-level change. Two open questions: (a) how much of the token spend is markup, measurable from stored `original_text` in feedback reports, and (b) whether tags actually help the model (headings and lists may carry useful structure) or just add noise. If they're mostly noise, stripping to structured plain text before the call is a cheap, sizeable saving. Don't strip blindly without checking output quality at each reading level.
- [ ] **Confirm whether Google bills SSML tag bytes as characters.** Every word carries a `<mark>` tag for Listen-pane highlighting (~22 bytes/word), so if tags are billable, word-level highlighting is inflating the TTS bill several times over the actual prose. Worth knowing before the cohort scales.
- [ ] **Consider whether `avatar.script` belongs in the Usage panel** as an "opened Watch pane" signal — it fires ~3× more often than `avatar.cartesia.tts`, which suggests people enter Watch and don't generate.
- [ ] **Copy pass with Katy/Cesar** — all strings are in `resources/js/lib/reportCopy.ts`, one-file change. Button label ("Give feedback" vs "Tell us something" vs "Report a problem") still open.
- [ ] **Design review with Cesar** — footer now has four items (Help / About / Give feedback / Advanced Settings) and is tight at narrow sidebar widths. Also wants a look at the modal and the portal.
- [ ] **Replace placeholder emails in `PortalUsersSeeder`** with Katy's and Cesar's real addresses before seeding production.
- [ ] **Decide a retention policy for `original_text` and `simplified_text`** (e.g. purge after 90 days) before anything wider than the known tester cohort. `original_text` is verbatim page content — if someone reports from an email or patient portal, it is stored word for word. Higher stakes than the simplified paraphrase alone.
- [ ] **Confirm the SQLite DB is on persistent, backed-up Cloudways storage** before the cohort starts reporting.
- [ ] **Delete the dead starter-kit auth scaffolding** — `routes/auth.php`, `routes/settings.php`, `app/Http/Controllers/Auth/`, `app/Http/Controllers/Settings/`, and `tests/Feature/{Auth,Settings,DashboardTest}`. They are unregistered, render deleted Inertia pages, and account for all 24 failing Pest tests, which makes `composer test` useless as a signal.

## Analytics & Logging
- [x] **Usage analytics**: Track which panes users navigate to (Easy Read, Listen, Ask, Watch), how often, and which they avoid. Done as the local-only `pane_visit` behavior event (view name + trigger + timestamp + article context) — see docs/Context_Agent_Phase_A_Event_Schema.md. Note: data lives in each user's `chrome.storage.local`, never on the server, so "prioritize development" insights come from inspecting logs during user-testing sessions, not from aggregate server analytics.
- [x] **API response time logging**: `TrackApiMetrics` middleware automatically logs every API call with endpoint, duration (ms), status code, and content length to `api_metrics` SQLite table.
- [ ] **Frontend timing for Simli/WebRTC**: The Simli session token request, ICE server fetch, and WebRTC connection all happen directly from the browser (no Laravel route) so they're invisible to backend metrics. To track Watch pane performance end-to-end (Cartesia TTS wait + Simli connection + video stream start), we'd need frontend-side timing that posts results back to the server.
- [ ] **Streaming endpoint timing**: The `translate`, `chat`, and `overview` routes return StreamedResponses — the middleware only captures setup time (~3ms), not actual generation duration. To get real timing, we'd need to measure inside the controller (time from first to last chunk) or add frontend-side timing.
- [x] **Metrics report**: `php artisan clario:metrics` generates both a terminal summary table and a standalone HTML report (`storage/reports/metrics.html`) with per-endpoint stats (count, avg, p50, p95, max, error rate) and daily breakdown. Use `--days=N` to adjust range.

## Feature Enhancements
- [ ] Add pause/resume functionality for video avatars (D-ID and Simli)
- [x] Add replay functionality for Simli avatar - cache generated audio so user can replay without regenerating speech and reconnecting (Cartesia PCM16 audio now cached in `avatarStore` keyed by article URL — survives WatchPane unmount/remount, so returning mid-generation skips the ~53s TTS step on the next click)

## Investigations
- [ ] Plan/investigate fixes for situation where opening different Chrome windows or tabs messes up the Clario sidebar for existing windows or tabs
- [ ] Test/investigate chat behavior when navigating to new article - Summary pane auto-updates but chat doesn't clear. Is this intentional? Should chat be cleared when user navigates to a new page?
- [ ] Improve how Narrate handles subheadings - reading headings aloud sounds unnatural. Experiment with conversational transitions instead of headings (e.g., "Next, let's talk about..." or "Another important point is...")
- [ ] Investigate ways to reduce Simli Avatar audio generation wait time (~53 seconds for Cartesia TTS)
  - Current speed setting: 0.85 (85% of normal) in AvatarController.php:309
  - Option 1: Stream audio chunks to Simli as they arrive (instead of waiting for full audio)
  - Option 2: Use a faster TTS provider or Cartesia streaming API
  - Option 3: Pre-generate audio in background when user enters Avatar tab
  - Option 4: Increase speech speed (currently 0.85, could try 1.0) - tradeoff with accessibility
