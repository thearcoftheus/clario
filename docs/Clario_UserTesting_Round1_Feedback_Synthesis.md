# Clario User Testing — Round 1 Feedback Synthesis

**Sessions:** Chloe Rothschild (4/30 AM) & Sydney Badeau (4/30 PM)
**Build tested:** v0.3
**Team:** Ben, Katy, Cesar

---

## Quick Headline

Both users rated Clario significantly higher than the baseline pages on every task (Chloe: 1→3, 1→3, 1.5→3; Sydney: 1→2.5, 2→3, 2→3). Both said they'd use it again, both lit up at the chat / Easy Read / video features. The feedback we got is overwhelmingly about **refinement**, not direction — i.e., the core proposition works, and what we're hearing is "fix these specific friction points."

The strongest signals are the items that came up in **both sessions** plus the team debrief — those are at the top of the priority list below.

---

## Priority 1 — Strong, Convergent Signals (do before next round of testing on 5/14–15)

### 1. Audio "Generate" needs to behave like Video "Generate"
**Signal:** Chloe explicitly called this out — the video had a countdown / "this may take X seconds" messaging, the audio didn't. She thought audio was broken. Sydney didn't complain but was already conditioned to AI wait times.

**Cesar's framing in the debrief nails it:** with video you *click Generate*, with audio you *land on a page that's already generating*. Make audio consistent with video: explicit click-to-generate button + the same "this may take ~X seconds" wait message.

**Effort:** Small. Mostly UX wiring + reusing the existing wait component.

---

### 2. Pagination in Easy Read feels overwhelming because of the numbers
**Signal:** Sydney said "page 3 of 29" made her feel "this is going to take forever." Cesar confirmed this matched his hunch. Ben proposed two alternatives in the debrief.

**Options on the table:**
- **(a) Strip the totals** — show just "Page 1, Page 2…" with a progress indicator bar instead of "X of Y"
- **(b) Cesar's hybrid** — keep click-through pages, but each page = headline + short scrollable body, breaking content down further
- **(c) Katy's variant** — horizontal scroll across instead of vertical (research suggests IDD users absorb left-to-right better than up-down)

Chloe *liked* the current click-through model ("yeah, no, it's great"), so we're solving for Sydney's pain without breaking Chloe's experience. **Option (a) is the cheapest test of the hypothesis** — if removing the scary numbers fixes it, we don't need to rebuild the whole pattern.

**Recommendation:** Ship (a) for the next round, ask both styles of user about it, and keep (b) and (c) in our pocket if (a) doesn't fully resolve it.

---

### 3. "Easy Read" label — reconsider the terminology
**Signal:** Sydney (a self-advocate with deep plain-language expertise) flagged this directly. In the disability community, "Easy Read" has a specific meaning — one idea per line, short sentences, icons per line. What Clario produces is closer to *plain language*.

**Katy's take:** "Easy Read" was chosen because it reads more accessibly to people *outside* the disability community than "Plain Language" does (which is jargon-y for laypeople). Both rationales are valid.

**Katy floated "Simple Reader"** as a possible compromise.

**Recommendation:** This needs a deliberate copy decision, not a quick edit. I'd suggest: Ben + Katy + Cesar pick a working term (Katy's "Simple Reader" is a solid starting point), update it for the next test, and use the next sessions to validate. Worth asking the next users specifically: "Does this label make sense?"

---

### 4. Chat box greeting is too generic
**Signal:** Katy flagged this from Phase 1 — "Hello, how can I help you today?" sounds like generic AI assistance, not page-specific Q&A.

**Decided in debrief:** Change to **"Do you have any questions about this article?"** (Katy's wording, Ben agreed to implement.)

**Effort:** Trivial. String change.

---

### 5. The avatar reveal is a surprise (and not in a good way)
**Signal:** Both users had the same reaction. Chloe: "Where did he come from, and who is he?" Sydney: "I wasn't really expecting a person to pop on… Notebook LM lets you choose the graphics."

**Two issues nested here:**
- **Wording:** "Watch a video" implies generated visual content; what users get is a person reading. The expectation gap is in the *language*, not the feature.
- **Feature scope:** Sydney explicitly wants customization ("ability to decide stuff about the video"). Katy is interested in eventually offering a Notebook-LM-style generated video as an alternative to the avatar.

**Recommendation for the next build:**
- **Now:** Change the button copy from "Watch a video" to something more honest about what it does — e.g., "Listen with video," "Watch someone read this," or similar. Let's brainstorm 2–3 candidates.
- **Later:** Track the "generate-a-real-video" feature as a P3 / future exploration. Ben noted it'd require a different service (Google has one) + LLM-as-scriptwriter step. Worth probing on next user tests before committing.

---

### 6. "Grown-ups" → "adults" (and other plain-language copy in generated content)
**Signal:** Sydney, as a plain-language expert, noted "grown-ups" felt geared toward kids. "Adults" is the right register for the target audience.

**Effort:** This is a prompt-engineering change, not UX. Update the simplification prompt to specify adult-appropriate plain language (no childish substitutions). Worth a focused pass on the prompt to catch similar tonal issues.

---

## Priority 2 — Real but Lower-Urgency

### 7. Default the audio reader's emoji-icon-reading to OFF
**Signal:** Katy caught this live — when audio plays Easy Read content with icons, the TTS reads the icon names aloud. Disruptive. Both Katy and Ben noted it.

**Effort:** Small. Default toggle change.

---

### 8. "Moderate" reading level label is ambiguous
**Signal:** Sydney said "easy" and "challenging" are clear, but "moderate" she'd be unsure about — for herself or the people she advocates for.

**Options:** Rename ("Standard"? "In-between"?), add hover/help text, or rely on the AI context agent to pick reading level automatically (Sydney was enthusiastic about this).

**Recommendation:** Light touch for now (clearer label) since the context agent work is the real fix and that's coming.

---

### 9. Top bar — keep, but acknowledge friction
**Signal:** Mixed.
- Chloe initially called it "an extra step" and would prefer the panel to open directly, but after a few minutes said "I got used to it, it's fine."
- Sydney was fine with it but wanted to **minimize / move it**.
- Cesar (in debrief) still isn't sure the bar is the right pattern and noted it covers other browser interactions.

**Recommendation:** Don't redesign yet — two users isn't enough to make this call. Add a minimize affordance (Sydney's specific ask) and keep watching this in next rounds. Cesar's reservation is real but we need more data.

---

### 10. Sidebar width is fixed and that's a problem
**Signal:** Cesar noticed nobody widened the sidebar — possibly because it's not obvious you can, possibly because the Chrome default is too skinny. Ben confirmed it's tied to Chrome's native extension sidebar API and changing the default width isn't directly supported.

**Recommendation:**
- Short term: raise with Google on Monday's call — they may know a workaround
- Longer term: Ben to evaluate whether to ditch the native Chrome sidebar and build our own panel. This is a meaningful scope decision, not a quick fix.

---

### 11. "What you're learning about" thumbnail occasionally fails to load
**Signal:** Cesar's tracking sheet noted this for Chloe's session — the thumbnail image didn't load on at least one article (likely the article didn't have an extractable image).

**Effort:** Small. Build a fallback (placeholder image or text-only mode for that card when no image is available).

---

## Priority 3 — Notes for Future Rounds / Bigger Decisions

### 12. End-of-article comprehension check (feeds the Context Agent)
**Cesar's idea, picked up enthusiastically by Ben and Katy:** When a user finishes an Easy Read article, ask a single emoji-based question — "Too easy / Just right / Too hard?" — to feed the AI Context Agent's reading-level inference.

**Ben's caveat:** Users who find content too hard may bail before reaching the question, so the data skews positive. But this is *one signal among many* the context agent will use — that's fine.

**Katy's framing was sharp:** asking *about the content* ("too easy" / "too hard") avoids the IDD-population tendency to always click "I like" on like/dislike prompts.

**Recommendation:** Add this to the AI Context Agent workstream Ben mentioned running in parallel.

---

### 13. "Help" button — placeholder or real?
**Signal:** Sydney asked if the Help button connected to 24/7 support. It's currently a placeholder.

**The bigger question Sydney raised:** real human support would be genuinely valuable — self-advocates already come to her for tech help. This is a Katy-side / Arc-side question about ongoing support model post-launch, not something Ben needs to build now, but it's worth flagging in the Google conversation.

---

### 14. Allow avatar customization
**Signal:** Sydney said yes to being able to change the avatar. Just one data point so far.

**Recommendation:** Keep on the radar, ask about it in upcoming sessions before committing.

---

### 15. Visual impairment / text size
**Signal:** Chloe (who has a visual impairment) said the current text size is okay because there's *less* text, but for users with more limited vision, ability to increase text size would help.

**Effort:** Moderate. A text-size control could live in advanced settings.

---

### 16. Turbo / pre-generation mode (and the paid-tier question)
**Signal:** Ben proposed an option where audio starts generating on page load (rather than on click) to eliminate wait. Cost is the blocker — pre-generating audio for content users never play wastes money. Ben and Katy discussed this as a possible **paid-tier feature** once a sustainability model is in place.

**Katy's important constraint:** strong aversion to the "disability tax" — gating accessibility behind payment. Possible compromise: free version with usage caps + paid for unlimited / turbo.

**Recommendation:** Park this until Katy has clarity on the Google funding conversation. Not urgent.

---

## Suggested Order of Operations (Before 5/14–15 Testing)

1. Audio click-to-generate + wait messaging (#1)
2. Chat greeting copy change (#4)
3. "Grown-ups" → adult-language prompt pass (#6)
4. Default emoji-reading off in audio (#7)
5. Easy Read label decision + change (#3)
6. Easy Read pagination — strip the "X of Y" numbers (#2 option a)
7. Watch-video button rewording (#5, the wording half)
8. Thumbnail fallback (#11)
9. Minimize/move on the top bar (#9)
10. Surface the sidebar-width issue with Google on Monday (#10)

Items 1–4 are all small. Items 5–8 are slightly bigger but well-scoped. That's a realistic two-week scope to me, which lines up with Cesar's "2–3 weeks" estimate from the debrief.

---

## Open Questions to Validate in Round 2 Testing

- Does removing pagination numbers actually resolve the overwhelm, or does Sydney's preference for scrolling persist?
- Does the new Easy Read label (whatever we land on) read well to users?
- Is the top bar still feeling like friction after users have a moment to acclimate? Cesar's reservation deserves more data.
- Would users want / use a generated-video option (à la Notebook LM) alongside the avatar?
- How do users feel about Clario auto-adjusting their reading level (early read on the Context Agent question)?
