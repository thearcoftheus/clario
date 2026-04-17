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

## Performance — Sidebar
- [ ] Defer the `/api/translate` (summary generation) call until the user actually clicks a card. Currently `HistoryItemStream` fires the AI call immediately when the sidebar opens, even if the user only wants Chat or Listen. Could lazy-load per pane, or at least delay until "Easy Read" is tapped. Tradeoff: pre-fetching means the summary is ready instantly when they do click it.

## Nice to Have — Sidebar
- [x] Use AI to extract the real article headline instead of relying on `document.title` — implemented via `HeadlineAgent` + `POST /api/headline`
- [x] Use AI to generate a one-sentence summary for the "What You're Learning About" card — implemented via same `HeadlineAgent` endpoint (returns both title + summary)
- [ ] Fallback image for the article card when `og:image` is not available

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
