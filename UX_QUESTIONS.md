# UX Questions for Designer

1. Can I get an SVG version of the "speaker" icon that appears next to the "listen to this page" text in the Clario toolbar? I can't seem to export it correctly from the Figma file.

2. What should "Help" and "About" in the extension's footer link to?

3. **Listen pane voice quality vs. word highlighting accuracy tradeoff.** Google Cloud TTS offers two tiers of voices:
   - **Neural2 voices** (e.g. en-US-Neural2-C): Lower quality, more robotic sound — but the API returns precise word-level timestamps, enabling accurate word-by-word highlighting synced to the audio.
   - **Chirp3-HD voices** (e.g. en-US-Chirp3-HD-Kore): Much higher quality, natural-sounding — but the API does NOT return word timestamps, so highlighting is estimated based on word length (less accurate, can drift).
   - Which should we prioritize? Or should we offer both as a user setting? 
