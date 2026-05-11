# Agent Card: Clario

**Team:** Indigo Slate (Ben Freda, Will)
**Contact:** Ben Freda
**Status:** Prototype

## What it does

Clario is a Chrome browser extension that makes web content accessible for people with intellectual and developmental disabilities. It uses AI to simplify page text to adjustable reading levels, provides conversational Q&A about page content, narrates simplified text aloud with synchronized word highlighting, and generates video avatar presentations of page summaries.

## Who it helps

- [x] Cognitive (dyslexia / IDD / autism)
- [x] BLV (blind / low vision) — text-to-speech narration with word-level highlighting
- [ ] DHH (deaf / hard of hearing)
- [ ] Motor (limited mobility / tremor)
- [ ] Speech (nonverbal / atypical speech)
- [x] Aging

## How it works

**Input:** Web page content (extracted from the active browser tab via content script)
**Output:** Simplified text at adjustable reading levels, streaming chat responses, audio narration with word-level timepoints, video avatar clips
**Modality transform:** text → plain language, text → audio, text → video (avatar)
**Module type:**
- [x] Transform — simplifies text to different reading levels, converts text to speech and avatar video
- [x] Memory — tracks browsing history and user preferences across sessions (context agent planned)

## Technical

**Runs in web browser?** Partially — the Chrome extension UI and content extraction run entirely in-browser; AI processing, TTS, and avatar generation happen server-side via API calls.
**Latency:** AI text simplification and chat stream in real-time; TTS narration takes 1-3 seconds; avatar video generation takes 30-60 seconds (async polling).
**Dependencies:** Vue 3, Tailwind CSS v4, Pinia, Vite, Laravel (PHP), Google Gemini 2.5 Flash (via Prism), Google Cloud Text-to-Speech API, D-ID API (avatar video), Chrome Extension APIs
**Code:** Not yet public (will be open-sourced by September 30, 2026)
**Timeline to contribute:** Months — active development through Q3 2026

## Limitations

- English-language content only (no multilingual support yet)
- Requires an internet connection for all AI features — no offline mode
- Cannot process content behind login walls or in iframes, Canvas, or WebGL
- Avatar video generation is asynchronous and can take 30-60 seconds
- TTS and AI API calls have ongoing cost implications for nonprofit deployment
- Summary truncation at 800 characters for avatar cost control may lose nuance on longer pages

## Human involvement

Users control all features — they choose when to simplify, which reading level to use, when to narrate, and when to generate avatar videos. No adaptations are applied automatically without user action. The planned AI Context Agent will learn from user behavior (e.g., thumbs up/down feedback, time on page) to personalize defaults, but the user will always retain control. People with IDD are involved through user testing sessions conducted with The Arc.

## Data & Privacy

User preferences are stored locally via `chrome.storage`. Page content is sent to the server for AI processing but is not persisted. No user accounts or personal data are collected. The planned context agent will use a locally generated UUID paired with server-side preference storage — no PII required.

## Demo

Demo videos shared with The Arc via Loom. Public demo link TBD.

## Evaluation

Success is measured through user testing sessions with people with IDD, conducted in partnership with The Arc. Target outcomes: users can independently comprehend simplified page content, complete information-finding tasks, and prefer Clario's assistance over unassisted browsing. Formal metrics TBD as user testing progresses.
