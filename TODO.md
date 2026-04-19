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
- [ ] Persist audio state across navigation. Currently, navigating away from the Listen pane unmounts the component, discards the audio, and loses playback position. Moving audio state into a Pinia store (like chatStore) would preserve it. Desired behavior: navigating away pauses the audio automatically; navigating back shows the paused state at the same position; the user must click play to resume. Audio should NOT continue playing in the background while on other panes.

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

## Analytics & Logging
- [ ] **Usage analytics**: Track which panes users navigate to (Easy Read, Listen, Ask, Watch), how often, and which they avoid. Could log pane navigation events (view name + timestamp) to help understand user behavior and prioritize development.
- [ ] **API response time logging**: Measure and log how long each backend operation takes end-to-end:
  - (a) Headline + one-sentence summary (`/api/headline` → HeadlineAgent)
  - (b) Simplified summary for Easy Read (`/api/translate` → SummaryAgent, streaming)
  - (c) Audio generation for Listen (`/api/narrate-sync` → Google TTS, chunked)
  - (d) Avatar video generation (`/api/avatar/*` → D-ID/Simli)
  - Could log to Laravel logs initially, then later pipe to a dashboard or analytics service.
- [ ] **Metrics report**: Create a script (artisan command or standalone) that parses the logs and generates a simple HTML report for the team — pane usage breakdown, average API response times, error rates, etc. Something we can open in a browser and share without needing a full analytics platform.

## Feature Enhancements
- [ ] Add pause/resume functionality for video avatars (D-ID and Simli)
- [ ] Add replay functionality for Simli avatar - cache generated audio so user can replay without regenerating speech and reconnecting

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
