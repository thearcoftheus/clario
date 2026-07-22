# Behavioral Signals for Automatic Reading-Level Setting

### A research review for Clario's AI Context Agent

**Prepared for:** Ben Freda, BFC Digital
**Question:** What user signals can Clario monitor to automatically set (or adjust) the reading-difficulty level — simple (2–3), medium (5–6), challenging (9–10 / no transformation) — and which are actually grounded in research?

> Source of truth: [Google Drive doc](https://docs.google.com/document/d/1soy2lVn3ohhrf9UzGTcl7UC5K6vlBrHl-VldNQoEng4/edit) (created 2026-07-01). This copy imported into the repo on 2026-07-21.

---

## The short version

There is real research here, but it comes with a large asterisk: **almost all of the behavioral-signal work was done on general-population or neurotypical readers, not on adults with intellectual and developmental disabilities (IDD).** The one study that tested these signals directly on the IDD population found that the *behavioral proxies got noisier and the direct signals held up best*. That finding should shape the whole design.

Three practical conclusions fall out of the literature:

1. **Rank signals by how directly they express the user's own experience.** The user's own choices (switching levels, invoking simpler text, replaying audio, asking "what does this mean?") and a lightweight explicit check ("too easy / just right / too hard") are the most trustworthy. Inferred proxies (scroll speed, time-on-page) are supporting evidence, not primary evidence.

2. **Model each user against their own baseline, not a population threshold.** Reading behavior varies enormously person-to-person — and even more so within the IDD population — so absolute cutoffs don't generalize. What's diagnostic is *change relative to that user's own norm*, per content type.

3. **Prefer nudging over silent override, and keep the user in control.** For this population specifically, autonomy and dignity are not a nice-to-have — they're the point. Serving text that's too simple carries a real cost (condescension, boredom), just as serving text that's too hard does.

The rest of this document catalogs the candidate signals, what the evidence says about each, and a recommended architecture for combining them.

---

## What the research actually establishes

**Scrolling behavior is a validated (coarse) readability signal.** Google Research's 2021 study recruited 518 participants reading texts of varying difficulty and showed that features of scrolling behavior — speed, acceleration, and how often areas of text were revisited — can predict how difficult a text is. Crucially, they also found that scrolling-speed distributions differ by reading proficiency and first language. The appeal is that these measures are language-agnostic and unobtrusive. The limitation is that the prediction was strongest *in aggregate across a group*, and the population was general adults, not IDD readers.

**On the IDD population specifically, direct measures beat proxies.** The most relevant study to Clario is Säuberli et al. (CHI 2024), which tested four ways of measuring comprehensibility — multiple-choice comprehension questions, perceived-difficulty ratings, response time, and reading speed — with 18 adults with intellectual disabilities and an 18-person control group reading original, human-simplified, and AI-simplified texts on tablets. For the IDD group, **comprehension questions emerged as the most reliable measure**, while reading speed offered "valuable insight into reading behavior" but was noisier. The study also cites earlier eye-tracking work (Schiffl) finding *fundamental differences in eye movements* between readers with and without intellectual disabilities, and repeatedly notes the **high heterogeneity of reading ability within the IDD group**. (Nice coincidence: their testing app was version 0.3.1-alpha, same as your build.)

**Reading/dwell time is genuinely noisy as an interest/difficulty signal.** The information-retrieval literature has debated this for two decades. Claypool et al. (2001) found reading time and amount of scrolling could predict relevance in web browsing; but Kelly & Belkin (2004) found reading time was *not* reliably indicative of relevance because it varies so much between people and tasks that it's hard to interpret. The consensus that emerged: dwell time is a useful *implicit* signal, but works far better as a **within-user, relative** measure than as an absolute one, and needs corroboration.

**Mouse/cursor/hover behavior is a weak signal.** Studies correlating implicit indicators with explicit relevance ratings (e.g., Akuma et al. 2014) found dwell time positively correlated with ratings but **mouse movement/distance did not** significantly correlate. Some work (Guo & Agichtein, "Beyond dwell time") extracts signal from cursor movement, but it's subtle and noisy — and for IDD users, motor differences and assistive-technology use (switch access, alternative pointing) confound it heavily. Treat hover-before-click as low-confidence at best.

**Personalized simplification systems already assume difficulty is subjective and learn per-user.** Bingel et al.'s Lexi (COLING 2018) — an adaptive, personalized simplification tool — is built on the premise that readers perceive difficulty *individually and subjectively*, so a one-size-fits-all notion of "hard" is inadequate. Lexi builds a per-user model and adapts quickly from relatively little feedback (users mark which words are hard). More recent surveys of personalized TS (e.g., Sun et al. 2025) name the core challenges plainly: accurately modeling reader profiles, and doing so while handling **privacy and ethical data use**.

**The intervention itself is well-supported.** A large Google study (Aharoni et al. 2025, n=4,563) found readers of LLM-simplified text answered comprehension questions more accurately than readers of the original (a ~3.9% absolute gain). So the thing Clario *does* with these signals — adjusting simplification — has evidence behind it. The open problem is the targeting, which is what this document is about.

---

## The signal catalog

Signals are grouped into three tiers by how directly they reflect the user's actual reading experience — and therefore how much weight the Context Agent should give them.

### Tier 1 — Explicit and semi-explicit signals (highest confidence)

These are the user's own actions and answers. They're closest to ground truth and least confounded by motor/attention noise. Build the agent's core on these.

| Signal | How to capture in Clario | What research says | Confounds / cautions |
| --- | --- | --- | --- |
| **End-of-article difficulty check** ("too easy / just right / too hard") | The emoji check already planned (Cesar/Katy/Ben) | Self-report difficulty ratings + comprehension questions were the *reliable* measures for IDD readers (Säuberli 2024) | Self-selection: users who find it too hard may bail before reaching the question, skewing data positive (already flagged). Acquiescence bias in IDD populations — frame it about *the content* ("was this hard?"), not the person, to avoid the reflexive "I like it" (Katy's point). |
| **Manual reading-level switches** | Log every time a user changes the level, in which direction, on what content type | Direct revealed preference; the strongest personalization signal in adaptive-TS systems (Bingel 2018) | Some users may not know the control exists or may not switch even when struggling — absence of a switch isn't evidence of a good fit. |
| **Escalation to a simpler rendering** (invoking Easy Read, or dropping to "simple") | Log invocations and level, per content type | Analogous to Lexi's "mark this as hard" — a per-user difficulty vote | Same discoverability caveat. |
| **Chat clarification questions** ("what does this mean?", "explain this") | Count and classify follow-up/clarification questions per page (contract already lists "follow-up question frequency") | Comprehension-gap signal; conceptually the closest behavioral analog to a comprehension question | Distinguish *clarification* ("I don't understand") from *curiosity/extension* ("tell me more") — only the former indicates difficulty. This needs light intent classification, not just a raw count. |

### Tier 2 — Behavioral proxies with research support (supporting evidence)

Use these to *corroborate* Tier 1, and only against a per-user baseline. Individually they're ambiguous; in combination and over time they add real signal.

| Signal | How to capture | What research says | Confounds / cautions |
| --- | --- | --- | --- |
| **Scroll revisits / regressions** (scrolling back up to re-read) | Count backward scrolls and re-entries into already-seen regions | Revisiting text areas was one of the difficulty-predictive scroll features (Google 2021); mirrors eye-tracking "regressions" that index processing difficulty | More defensible than raw speed. Still confounded by navigation habits. |
| **Reading speed / normalized dwell** (words ÷ time on visible content) | Time on page divided by extracted content length → effective WPM | Predicts readability in aggregate (Google 2021); "valuable insight" for IDD readers but noisy (Säuberli 2024) | **Directionally ambiguous:** slow can mean careful *or* struggling; fast can mean fluent *or* skimming/giving up (Dyson & Haselgrove 2000 found faster reading lowered comprehension). Never interpret speed alone — pair it with a comprehension or difficulty signal. |
| **Audio/video re-plays and reliance** | Log TTS/avatar invocations, replays, and whether they replace vs. supplement reading | Re-listening/re-watching is a plausible difficulty/effort signal; consistent with the effort interpretation of dwell time (Rayner) | Could equally reflect *preference* for audio, multitasking, or accessibility need unrelated to text difficulty (e.g., vision). Interpret as "this content was effortful for this user," not "reading level is wrong." |
| **Reading-completion of simplified text** | Did they scroll/page through the whole Easy Read rendering, or abandon partway? | Engagement/effort proxy | Ambiguous — abandonment can mean too-hard, not-interested, or interrupted. Self-selecting (same bail-before-the-end problem). |

### Tier 3 — Weak or ambiguous signals (use as tie-breakers only, or not at all)

| Signal | Why it's weak |
| --- | --- |
| **Hover/dwell time before clicking a button** | Mouse/hover behavior showed no significant correlation with explicit judgments in IR studies (Akuma 2014); heavily confounded by motor differences and assistive tech in the IDD population. Low value, high noise. |
| **Bounce / quick page abandonment** | Genuinely ambiguous: too-hard, uninterested, or finished-because-easy all look similar. Self-selects out the very users you most want to detect. |
| **Raw time-on-page (un-normalized)** | Without dividing by content length it conflates "long text" with "hard text," and dwell time varies too much between people/tasks to interpret absolutely (Kelly & Belkin 2004). |

---

## Recommended architecture for combining signals

The literature points to a fairly clear design pattern:

**1. Weight by tier, and require corroboration before acting.** Let Tier 1 signals carry the decision; use Tier 2 to raise or lower confidence; mostly ignore Tier 3. A single noisy proxy should never move the level on its own — this is exactly Katy's instinct not to "rely solely on" the emoji check, generalized to all signals.

**2. Learn a per-user baseline, not a population threshold.** Because within-group heterogeneity is so high (Säuberli 2024; Jones et al.) and reading time varies so much person-to-person (Kelly & Belkin 2004), the diagnostic quantity is *deviation from this user's own norm* — "this page took Sydney 3× her usual time and she scrolled back four times" — not comparison to an absolute WPM cutoff.

**3. Segment by content type / topic.** Difficulty is domain-dependent: the same reader handles familiar topics easily and unfamiliar ones poorly (a recurring theme in the concept-simplification literature). The contract already anticipates this ("reading-level preferences across different content types"). Maintain the model per content category, not one global level.

**4. Gate action on confidence; nudge before you override.** Borrow the adaptive-control framing (e.g., Zhang 2026's target-mastery model): make small adjustments toward a comfortable difficulty and only when the evidence crosses a threshold. Below that threshold, *suggest* ("Want me to make this a bit simpler?") rather than silently changing the setting. Above it, change but make the change visible and one-tap reversible. This directly satisfies the contract's "balance autonomy with transparency."

**5. Respect the asymmetry — and the dignity cost of over-simplifying.** It's tempting to treat "too hard" as the only failure mode. But this population is sensitive to being infantilized (your own testing surfaced this — "grown-ups" → "adults"). Serving needlessly simple text is a real harm, not a safe default. When uncertain, ask rather than defaulting downward.

### A staged build (matches the "start simple" philosophy already in the project)

- **Phase A (now):** End-of-article difficulty check + log manual level switches + count Easy Read / simpler-rendering invocations + count chat clarification questions. All Tier 1, all cheap to instrument, and enough to make a first defensible inference.
- **Phase B (once logging + per-user baselines exist):** Add scroll-revisit counts and normalized reading speed as corroborating Tier 2 signals. Combine into a confidence score.
- **Phase C (later, if validated):** Add audio/video reliance patterns. Hold hover and bounce unless your own user testing shows they carry signal for *your* users — don't inherit them from general-population studies.

---

## Population-specific cautions (read this before building)

These are the reasons a naïve port of the general-population research would go wrong.

- **Heterogeneity defeats thresholds.** Reading ability within the IDD population spans a very wide range (Säuberli 2024; Jones et al.). Any fixed WPM or scroll-speed cutoff will misclassify large numbers of users. Per-user modeling isn't a refinement here — it's a requirement.
- **The proxies are calibrated on the wrong population.** The Google scroll study and the IR dwell-time work used general adults. Eye-movement and reading behavior differ *fundamentally* between IDD and non-IDD readers (Schiffl). Use these proxies as *within-user relative* signals and validate them against your own users' emoji-check answers before trusting them.
- **Motor and assistive-tech confounds.** Switch access, alternative pointing devices, tremor, and slower motor execution all distort scroll speed, hover time, and click latency independent of comprehension. This is the strongest reason to discount Tier 3.
- **Acquiescence / social-desirability bias.** The documented tendency to click "I like" / agree is why the end-of-article check should ask about the *content* ("too hard?") rather than eliciting a preference or self-assessment — Katy already caught this.
- **Self-selection on abandonment.** Users who find content too hard tend to leave before any end-of-content signal fires, biasing your data toward "everything's fine." Weight completion-dependent signals accordingly, and don't treat silence as satisfaction.
- **Privacy, consent, and autonomy are first-order.** You're collecting fine-grained behavioral data on a vulnerable, protected population. The disability-tech literature stresses that consent should be treated as an ongoing process, that systems should be co-designed with users, and that assistive technology supports autonomy only when it serves the user's *own* goals transparently rather than deciding for them (AAIDD; Frontiers 2018 on AT and autonomy for people with IDD). Practically: keep data collection minimal and local-first where you can (your hybrid local-UUID approach helps), make the agent's inferences visible and correctable, and never let "the system decided you need simple text" happen silently.

---

## Open questions worth resolving in the next testing rounds

1. Does the emoji difficulty check actually get answered, or do users bail first? (Measure completion rate of the check itself.)
2. For *your* users, do scroll-revisit counts and normalized reading time correlate with their emoji answers? This is the validation that tells you whether Tier 2 is usable at all.
3. Can chat questions be reliably split into "clarification" (difficulty) vs. "extension" (curiosity)?
4. How do users react to the agent *suggesting* a level change vs. *making* one? (Autonomy/transparency question — Sydney was enthusiastic about auto-adjustment in principle; test the felt experience.)
5. Do users notice or resent being moved to a simpler level? (The over-simplification dignity cost.)

---

## References

- Aharoni et al. (2025), *LLM-based Text Simplification and its Effect on User Comprehension and Cognitive Load* — arXiv:2505.01980
- Akuma et al. (2014) / *Implicit Predictive Indicators: Mouse Activity and Dwell Time* — link.springer.com/chapter/10.1007/978-3-662-44654-6_16
- Bingel et al. (2018), *Lexi: A tool for adaptive, personalized text simplification* (COLING 2018) — aclanthology.org/C18-1021.pdf; and Bingel, *Personalized and Adaptive Text Simplification* (PhD thesis, U. Copenhagen, 2018)
- Dyson & Haselgrove (2000/2001), *The influence of reading speed and line length on the effectiveness of reading from screen* — sciencedirect.com/science/article/abs/pii/S1071581901904586
- Google Research (2021), *Predicting Text Readability from Scrolling Interactions* — research.google/blog/predicting-text-readability-from-scrolling-interactions/
- Kelly & Belkin (2004), via *Evaluating Accuracy of Implicit Feedback from Clicks and Query Reformulations* (ACM TOIS 2007) — dl.acm.org/doi/pdf/10.1145/1229179.1229181
- Säuberli et al. (2024), *Digital Comprehensibility Assessment of Simplified Texts among Persons with Intellectual Disabilities* (CHI '24) — arxiv.org/pdf/2402.13094
- Sun et al. (2025), *Redefining Simplicity: Benchmarking LLMs from Lexical to Document Simplification* (personalized-TS section) — arxiv.org/pdf/2502.08281
- Zhang (2026), *An Adaptive Task Difficulty Model for Personalized Reading Comprehension in AI-Based Learning Systems* — mdpi.com/1999-4893/19/2/100
- AAIDD, *Autonomy, Decision-Making Supports, and Guardianship* (position statement) — aaidd.org
- Frontiers in Public Health (2018), *Autonomy Benefits and Risks of Assistive Technologies for Persons With Intellectual and Developmental Disabilities* — frontiersin.org/articles/10.3389/fpubh.2018.00296/full

*Note: two of the references above (the Google scroll study's exact author list and the Kelly & Belkin finding) were read via secondary sources; worth pulling the primary papers before citing them in anything public-facing.*
