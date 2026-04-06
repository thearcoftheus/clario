# Clario: D-ID Avatar Feature — Implementation Brief

## Overview

We have added a **video avatar feature** to the Clario Chrome extension. When Clario generates its simplified summary of a web page, a user can click a button and watch a friendly AI avatar read that summary aloud — like having a helper explain the article to them in plain language.

This is a one-way, non-interactive feature. The avatar simply reads the content. There is no conversation, no user response, no open streaming session. Think of it as "text-to-video" rather than "chatbot."

---

## The User Experience

1. User visits a page with Clario active
2. Clario generates its simplified summary as usual
3. User clicks "Full Overview" to get the larger side panel as usual
4. Along with Summary, Chat, and Narrate tabs, a new tab appears: **Avatar**
5. When the summary completes, Clario automatically prepares an avatar-ready script in the background
6. Clicking the Avatar tab shows:
   - The prepared "Script to Read" (condensed if needed, with reading level preserved)
   - A "Generate Reading Avatar" button
7. After clicking Generate, Clario fires off a request to the D-ID API to generate an avatar video
8. While the video renders (typically up to 2 minutes), the user sees a loading indicator
9. Once the video is ready, a **"Watch Summary"** button appears
10. The user clicks it and the video plays inline — the avatar (Alyssa) reads the Clario summary aloud

The script the avatar reads follows this format:
> "This article is called [article title]. Here's what it's about. [summary text]"

---

## Avatar: Alyssa

We use the avatar named **"Alyssa"** with presenter ID:
```
v2_public_Alyssa_NoHands_BlackShirt_Home@Mvn6Nalx90
```

Note: The original plan was to use "Emma" but she was not available in D-ID's presenter library.

---

## The Implementation

### Server-side Endpoints (Laravel)

Located in `app/Http/Controllers/AvatarController.php`:

#### 1. `POST /api/avatar/script` — Prepare the script

Called automatically when the summary completes. Accepts:
- `title` — the page title
- `summary` — the Clario-generated summary text
- `simplificationLevel` — the user's reading level setting (Easy, Moderate, Challenging)

This endpoint:
1. **Extracts the article title** — First looks for a markdown heading (`#` or `##`) at the start of the summary. If not found, cleans the page title by removing common site suffixes (e.g., " - The New York Times").
2. **Strips markdown** — Removes headings, bold, italic, links, bullet points, etc. for natural speech.
3. **Condenses if needed** — If the summary exceeds **2000 characters**, uses Gemini AI to condense it while preserving the user's reading level (e.g., "grades 2-3" for Easy).
4. **Builds the script** — `"This article is called {title}. Here's what it's about. {summary}"`

Returns:
```json
{ "script": "This article is called..." }
```

#### 2. `POST /api/avatar/generate` — Generate the video

Called when user clicks "Generate Reading Avatar". Same processing as above, then:

1. POSTs to D-ID's clips endpoint with the script
2. Returns the job ID and script:
```json
{ "jobId": "clp_abc123", "script": "This article is called..." }
```

#### 3. `GET /api/avatar/status/:jobId` — Poll for completion

Returns the status and video URL when done:
```json
{ "status": "done", "videoUrl": "https://result.d-id.com/.../video.mp4" }
```

### Extension-side (Vue/Pinia)

#### Avatar Store (`resources/js/stores/avatarStore.ts`)

Manages all avatar state:
- `scriptStatus`: 'idle' | 'preparing' | 'ready' | 'error'
- `status`: 'idle' | 'generating' | 'polling' | 'ready' | 'error'
- `scriptText`: The prepared script to display
- `videoUrl`: The generated video URL

**Key behavior:**
- Watches the history store for summary completion
- Uses `{ immediate: true }` to handle cases where summary is already complete when Avatar tab is opened
- Automatically calls `/api/avatar/script` when summary finishes streaming
- Passes the user's `simplificationLevel` setting to preserve reading level

#### Avatar Pane (`resources/js/components/AvatarPane.vue`)

The Avatar tab UI showing:
- Status indicator (preparing/generating/ready)
- "Script to Read" preview box
- "Generate Reading Avatar" button
- Inline video player when ready

---

## Key Technical Details

### Title Extraction

The article title is determined by:
1. **First choice:** Extract the first markdown heading from the summary (e.g., `## Article Title`)
2. **Fallback:** Clean the page `<title>` by removing common suffixes like " - The New York Times", " | CNN", etc.

### Summary Condensation

When summaries exceed 2000 characters, Gemini AI condenses them with this prompt:
```
You are a helpful assistant that explains complex topics in simple terms for children in {grade level}.

Condense the following summary into a shorter version that is no longer than {maxLength} characters.
Use basic words and short sentences while keeping the original meaning.
Keep the most important information and maintain a natural, conversational tone suitable for being read aloud.
Do not use any markdown formatting, bullet points, or special characters.
Write in plain text only, as this will be spoken by a voice avatar.
```

This preserves the same reading level as the original summary.

### Security
- The D-ID API key is stored in `.env` as `DID_API_KEY`
- All D-ID API calls go through server-side endpoints — never exposed to browser

### Error Handling
- Failures are silent — no error shown to user, just don't show the Watch button
- Errors are logged server-side for debugging

### Cost Awareness
- 2000-character limit helps control video length/cost
- Won't generate a new video if one is already in progress
- Polling stops after 3 minutes (36 polls at 5-second intervals)

### Voice
- Uses `en-US-JennyNeural` (Microsoft Azure Neural) — clear, warm, natural sounding

---

## Routes

Defined in `routes/api.php`:
```php
Route::post('/avatar/script', [AvatarController::class, 'prepareScript']);
Route::post('/avatar/generate', [AvatarController::class, 'generate']);
Route::get('/avatar/status/{jobId}', [AvatarController::class, 'status']);
```

Also registered in `resources/js/ziggy.js` for frontend routing.

---

## Testing

To verify it's working end-to-end:
1. Visit any article page with Clario active
2. Open the Clario sidebar and let the summary generate
3. Click the Avatar tab — you should see the prepared script immediately
4. Click "Generate Reading Avatar"
5. Wait ~30 seconds for the video to render
6. Click "Watch Summary" — Alyssa should read the summary aloud

A good test article: any BBC News or Wikipedia article with a clear headline and body text.

---

## What's NOT Built (Yet)

- No interactivity — the avatar does not listen or respond
- No voice selection UI
- No avatar selection UI
- No caching of generated videos across sessions

---

## Reference Links

- D-ID API Quickstart (V3 Pro): https://docs.d-id.com/docs/v3-pro-avatar-quickstart
- D-ID Clips API Reference: https://docs.d-id.com/reference/clips-overview
- D-ID Presenters List: https://docs.d-id.com/reference/getpresenters
- D-ID Pricing: https://www.d-id.com/pricing/api/
- Microsoft Neural Voices list: https://docs.d-id.com/docs/tts-microsoft
