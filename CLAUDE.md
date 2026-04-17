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
composer dev              # Start all services (Laravel server, queue, logs, Vite)
npm run build             # Build Chrome extension (generates ziggy routes + 3 vite builds)
npm run build:production  # Production build (requires VITE_API_URL set or --url flag)
```

### Testing & Code Quality
```bash
composer test             # Run Pest tests
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
- `POST /api/avatar/*` - Avatar video generation (D-ID and Simli)

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

Backend AI/TTS keys:
- `GEMINI_API_KEY` - For AI agents via Prism
- `GOOGLE_APPLICATION_CREDENTIALS` - For Cloud Text-to-Speech
- `DID_API_KEY` - For D-ID avatar generation
