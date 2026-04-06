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
