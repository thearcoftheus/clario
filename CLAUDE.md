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
- `OverviewAgent.php` - Content overview/summary generation
- `SummaryAgent.php` - Text simplification at different reading levels
- `ChatAgent.php` - Conversational AI about page content
- `NarrationService.php` - Google Cloud Text-to-Speech integration
- `Readability.php` - Flesch-Kincaid reading level calculation

### Frontend Structure (resources/js/)
- `sidebar.ts` - Main Vue app entry point for Chrome side panel
- `content.ts` - Content script injected into web pages
- `background.ts` - Service worker for extension background tasks
- `layouts/Sidebar.vue` - Main sidebar with tabs: Summary, Chat, Narrate, Avatar
- `stores/` - Pinia stores (appStateStore, historyStore, chatStore, avatarStore)
- `helpers/` - API config, Chrome messaging, content extraction

### API Endpoints (routes/api.php)
All routes require API key authentication via `ValidateApiKey` middleware:
- `POST /api/readability` - Analyze reading level
- `POST /api/overview` - Generate content summary (streaming)
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

Backend AI/TTS keys:
- `GEMINI_API_KEY` - For AI agents via Prism
- `GOOGLE_APPLICATION_CREDENTIALS` - For Cloud Text-to-Speech
- `DID_API_KEY` - For D-ID avatar generation
