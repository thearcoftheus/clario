# Context Agent — Phase A Event Schema

**Status:** Design brief (not yet implemented)
**Date:** 2026-07-22
**Depends on:** `docs/Clario_Context_Agent_Signal_Research.md` (the signal research this implements), the existing `behaviorEvents` telemetry system (`resources/js/stores/feedbackStore.ts`, documented in CLAUDE.md "Behavioral telemetry (local-only)")

Phase A instruments the four **Tier 1 signals** from the research — the explicit, user-initiated actions that most directly express reading-difficulty fit. It deliberately does **not** touch Tier 2 proxies (scroll behavior, reading speed, audio replays); those come in Phase B only after Tier 1 data exists to validate them against.

Phase A is **collection only**. Nothing in the UI changes based on these events yet. The adaptation logic (nudges, suggested level changes) is specified at the end of this document as Phase A2, gated on having real data.

---

## Ground rules (inherited, non-negotiable)

- **Local only.** All events live in `chrome.storage.local` under the existing `behaviorEvents` key. No API endpoint, no transmission, ever. Inference runs client-side over the local log.
- **No message content, no page content.** We log *that* things happened and coarse metadata (URL, counts, categories) — never chat text or article text. Even a local log can be read by someone else using the same machine; this population often shares devices with caretakers.
- **Additive schema.** New event types extend the existing `BehaviorEvent` discriminated union. The existing validator pattern (filter unknown shapes on load) already gives forward/backward compatibility — an older client reading a newer log silently drops events it doesn't recognize.
- **User can erase it.** Phase A ships with the "Clear behavior history" button in Settings (already flagged as a follow-up in CLAUDE.md — it becomes mandatory once we log more than one event type).

---

## The four Tier 1 signals → five event types

| # | Signal (from research) | Event type | Instrumented where | Status |
|---|---|---|---|---|
| 1 | End-of-article difficulty check | `difficulty_feedback` | `DifficultyFeedback.vue` | ✅ already shipping |
| 1b | *Reach rate* of the difficulty check | `difficulty_check_shown` | `DifficultyFeedback.vue` (IntersectionObserver) | new |
| 2 | Manual reading-level switches | `level_switch` | `SettingsDialog.vue` `onSave()` + `OnboardingOverlay.vue` | new |
| 3 | Escalation to a simpler rendering | `pane_visit` | `Sidebar.vue` view-change choke point | new |
| 4 | Chat clarification questions | `chat_message_sent` | `chatStore.addUserMessage()` | new |

Signal 1b isn't in the research's signal catalog — it exists to answer the research doc's **Open Question #1** ("does the emoji check actually get answered, or do users bail first?"). Without a "the check was seen" denominator, answered/unanswered is uninterpretable: silence could mean abandonment *or* never reaching the last slide. It also doubles as a coarse reading-completion signal (Tier 2's "did they finish the Easy Read rendering") for free.

---

## Schema

All new types below extend the union in `resources/js/stores/feedbackStore.ts`. Shared fields follow the existing `DifficultyFeedbackEvent` conventions: `timestamp` is epoch ms (`Date.now()`), `articleUrl`/`articleTitle` identify the page the sidebar was showing.

```ts
// ——— shared context, present on every new event ———
// (difficulty_feedback already carries these; keep field names identical)
type ArticleContext = {
    articleUrl: string;
    articleTitle: string;
};

// ——— 1. difficulty_feedback (EXISTING, unchanged) ———
export type DifficultyFeedbackEvent = {
    type: 'difficulty_feedback';
    timestamp: number;
    simplificationLevel: SimplificationLevel;
    choice: 'too_easy' | 'just_right' | 'too_hard';
} & ArticleContext;

// ——— 1b. difficulty_check_shown (NEW) ———
// Fired once per article when the DifficultyFeedback section first becomes
// ≥50% visible (IntersectionObserver). Gives the denominator for the check's
// completion rate, and doubles as "user reached the end of Simple Read."
export type DifficultyCheckShownEvent = {
    type: 'difficulty_check_shown';
    timestamp: number;
    simplificationLevel: SimplificationLevel;
} & ArticleContext;

// ——— 2. level_switch (NEW) ———
// Any change to settings.simplificationLevel. Direction is derivable
// (SimplificationLevels is ordered Easy < Moderate < Challenging) so we
// don't store it redundantly.
export type LevelSwitchEvent = {
    type: 'level_switch';
    timestamp: number;
    fromLevel: SimplificationLevel;
    toLevel: SimplificationLevel;
    // 'settings'   — changed via SettingsDialog
    // 'onboarding' — initial choice during onboarding (baseline, not a
    //                struggle signal; the analysis layer treats it differently)
    source: 'settings' | 'onboarding';
    // The article on screen when the switch happened, if any — this is what
    // lets the analysis layer attribute a switch to a content domain.
    articleUrl: string | null;
    articleTitle: string | null;
};

// ——— 3. pane_visit (NEW) ———
// One event per user-initiated view change in the sidebar. Covers the
// "escalation to a simpler rendering" signal (visits to 'summary') and
// satisfies the TODO.md "Usage analytics" wish (all panes) in one shape.
export type PaneVisitEvent = {
    type: 'pane_visit';
    timestamp: number;
    pane: View; // 'home' | 'summary' | 'chat' | 'narrate' | 'avatar'
    // How the user got there — distinguishes deliberate choice from browsing:
    // 'home_card'         — tapped a card on the home screen
    // 'learn_another_way' — the end-of-pane cross-sell (LearnAnotherWay.vue);
    //                       this is the strongest "escalation" trigger: the user
    //                       finished one modality and chose another
    // 'nav'               — header/back navigation
    trigger: 'home_card' | 'learn_another_way' | 'nav';
    articleUrl: string | null;
    articleTitle: string | null;
};

// ——— 4. chat_message_sent (NEW) ———
// One event per user chat message. We store a client-side intent
// classification and coarse size — NEVER the message text.
export type ChatMessageSentEvent = {
    type: 'chat_message_sent';
    timestamp: number;
    // 'clarification' — the user signals they didn't understand something
    // 'other'         — everything else (curiosity, extension, task questions)
    // Per the research: only clarification indicates difficulty; curiosity
    // ("tell me more") is a GOOD sign and must not count against the level.
    intent: 'clarification' | 'other';
    wordCount: number;
    // Position in the conversation (1 = first message about this article).
    // Clarification as the FIRST message is a stronger difficulty signal than
    // clarification deep into an exploratory chat.
    messageIndex: number;
} & ArticleContext;

export type BehaviorEvent =
    | DifficultyFeedbackEvent
    | DifficultyCheckShownEvent
    | LevelSwitchEvent
    | PaneVisitEvent
    | ChatMessageSentEvent;
```

Each new type gets a validator following the existing `isBehaviorEvent` pattern, and `isBehaviorEvent` becomes a dispatch over `v.type`.

### The clarification heuristic (v1)

Client-side, no API call, no stored text. A message is `intent: 'clarification'` if it matches any of (case-insensitive, after trimming):

- `what does … mean` / `what is a|an …` / `what's a|an …`
- `i don't understand` / `i do not understand` / `i'm confused` / `this is confusing`
- `explain …` / `can you explain` / `help me understand`
- `what are they talking about` / `i don't get it`

Everything else — including "tell me more", "why did…", "what happened next" — is `other`. **Bias the heuristic toward precision, not recall:** a missed clarification just loses one vote; a curiosity question misread as struggle pushes toward over-simplifying, which the research flags as the *worse* failure mode (dignity cost). The heuristic lives in one exported function (`classifyChatIntent(text: string): ChatIntent`) so it's unit-testable and swappable for something smarter later.

Known tradeoff, decided deliberately: because we don't store message text, we can't reclassify historical events when the heuristic improves. Data minimization wins; the log rebuilds itself quickly with use.

---

## Instrumentation points (precise)

1. **`difficulty_check_shown`** — in `DifficultyFeedback.vue`: attach an `IntersectionObserver` (threshold 0.5) to the root `<section>`; on first intersection for a given `articleUrl`, record the event and disconnect. Guard with the same once-per-article check used for `answered` (a `hasCheckShownFor(url)` helper on the store, mirroring `hasDifficultyFeedbackFor`).

2. **`level_switch`** — in `SettingsDialog.vue` `onSave()` (currently line ~168): before calling `appState.updateSettings(formValues.value)`, compare `appState.settings.simplificationLevel` to `formValues.value.simplificationLevel`; if different, record with `source: 'settings'`. Same comparison in `OnboardingOverlay.vue` where the level is set (line ~48) with `source: 'onboarding'`.
   *Why call sites and not inside `appStateStore.updateSettings()`:* `feedbackStore` imports `SimplificationLevels` from `appStateStore`, so the store recording into `feedbackStore` would create a module cycle. Two call sites is acceptable; if a third appears, extract the shared types into `types/` and centralize.

3. **`pane_visit`** — `Sidebar.vue` currently changes views two ways: the injected `setActiveView` (line ~216) and inline `@click="activeView = 'summary'"` handlers in the template. Unify these into a single `navigateTo(view, trigger)` function that records the event and sets `activeView`, then update `LearnAnotherWay.vue`'s `nav.setActiveView(...)` calls to pass `trigger: 'learn_another_way'` (extend `NavigationContext` accordingly). This refactor is required — without a single choke point the data will silently undercount.

4. **`chat_message_sent`** — in `chatStore.addUserMessage()` (single choke point already; both `Chat.vue` and `ChatModal.vue` route through it). Compute `intent` and `wordCount` from the message before it's appended, record the event, discard the text from telemetry's perspective. `messageIndex` = count of prior user messages in the current conversation + 1.

### Storage housekeeping (ships with Phase A)

- **Pruning:** on `loadEventsFromStorage()`, drop events older than **180 days**, then if still over **5,000 events**, keep the most recent 5,000. At ~200 bytes/event that's a ≤1 MB ceiling, comfortably inside the 5 MB `chrome.storage.local` quota shared with settings/history.
- **"Clear behavior history"** button in `SettingsDialog.vue`: calls a new `feedbackStore.clearAllEvents()` (`chrome.storage.local.remove('behaviorEvents')` + reset in-memory state). Copy should mirror the DifficultyFeedback privacy language ("stays on your device").

---

## What we do with the data, and when

### Phase A (now → next release): collect only

Ship the five event types with **zero behavior change**. Ideally this is live before the next round of user testing so testing sessions generate real logs we can inspect (`chrome.storage.local.get('behaviorEvents', console.log)` in the side-panel DevTools).

### Phase A validation (during/after next testing round)

Answer the research doc's open questions from the collected data:

1. **Check reach & completion rate:** `difficulty_check_shown` vs `difficulty_feedback` per article. If the check is rarely reached, the self-selection bias the research warns about is confirmed and Tier 1 signal #1 needs a different placement (e.g., earlier or floating).
2. **Heuristic audit:** during moderated sessions, note what users actually type in chat and check it against `classifyChatIntent` outputs. Tune patterns before trusting the signal.
3. **Felt experience of adjustment:** the testing-round question ("how do users feel about Clario auto-adjusting?") determines how aggressive Phase A2 gets.

### Phase A2 (after ≥ ~10 difficulty answers per active user, or post-testing-round — whichever first): the suggestion engine

A pure function, client-side, spec'd now so instrumentation captures everything it needs:

```
computeLevelSuggestion(events: BehaviorEvent[], currentLevel, currentDomain)
  → { suggest: 'simpler' | 'more_detailed'; confidence: number } | null
```

Draft decision rules (to be tuned against real logs — these encode the research's "weight by tier, require corroboration, nudge don't override"):

- **Scope to domain first, global second.** Evaluate events for the current article's hostname; fall back to all events if the domain has < 3 signals. (Full topic classification is Phase B+; hostname is the cheap Phase A proxy for content type.)
- **Difficulty answers are primary votes.** Among the last 5 `difficulty_feedback` events at the current level: ≥3 `too_hard` and zero `too_easy` → suggest `simpler`. ≥3 `too_easy` and zero `too_hard` → suggest `more_detailed`. Mixed → no suggestion.
- **Manual switches are stronger votes** (revealed preference): a recent `level_switch` *toward* the tentative suggestion raises confidence; one *away* from it vetoes the suggestion outright — the user has spoken.
- **Chat clarifications corroborate only.** High clarification density (≥2 clarification-intent messages on ≥2 recent articles) can raise the confidence of an existing `simpler` suggestion; it can never *create* a suggestion alone.
- **`pane_visit` escalations corroborate only,** same rule.
- **Asymmetric bar.** Per the research's dignity finding, require strictly more evidence to suggest `simpler` than `more_detailed` — when uncertain, ask nothing, and never default downward.

**Delivery is a nudge, never an override:** a dismissible banner in the Easy Read pane — "Want me to use simpler words on pages like this?" — with one-tap Yes / No thanks. Accepting performs a normal `updateSettings` (which itself logs a `level_switch`; add `source: 'suggestion_accepted'` to the union then). The nudge's own outcomes become two new Phase A2 event types (`suggestion_shown`, `suggestion_response`) so the engine can learn to stop asking — two dismissals of the same suggestion suppress it for 30 days.

### Explicitly NOT in Phase A

Scroll speed/revisits, normalized reading speed (dwell ÷ word count), audio/video replay tracking, hover/bounce signals. These are Tier 2/3: they only become interpretable *after* per-user Tier 1 baselines exist to validate them against (research doc, "Phase B"). Resist the temptation to instrument them "while we're in there" — every added sensor raises the privacy surface on a vulnerable population, and uncorroborated proxies are exactly what the research says not to act on.

---

## Open decisions for Ben / Katy

1. **Does `pane_visit` logging need user-facing disclosure beyond the existing feedback-pane privacy note?** Recommendation: add one line to the onboarding/About copy ("Clario keeps private notes on your device about which tools you use, to make itself work better for you") — consent as an ongoing process, per the research's ethics section.
2. **Threshold to activate Phase A2** — the "≥10 difficulty answers" trigger is a placeholder; Round 2 testing volume should calibrate it.
3. **Should onboarding's initial level choice count as a baseline "vote"?** Current design: logged but treated as baseline only, never as evidence for/against a suggestion.
