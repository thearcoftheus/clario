# How Clario's Adaptive Difficulty Works

**Audience:** the whole Clario team, not just engineers.
**Status:** shipped in extension 0.6.0 (September 2026). Thresholds are starting points awaiting Round 2 testing data.
**For the implementation:** see `Context_Agent_Phase_A_Event_Schema.md` (event design and Phase A2 status notes) and `Clario_Context_Agent_Signal_Research.md` (the research this is built on). Code lives in `resources/js/helpers/computeLevelSuggestion.ts`, `resources/js/helpers/decideSuggestion.ts`, and `resources/js/stores/suggestionStore.ts`.

---

Clario offers three reading levels: Easy, Simplified, and Detailed. Every user picks one during onboarding, and can change it any time under Advanced Settings. Adaptive difficulty is the layer on top of that choice. Its job is to notice when the level a person is using no longer fits them, and to help them move. In Settings this appears as two options: "I choose it" and "Clario picks for me." The difference between the two is not what Clario notices but what it does about it.

## What Clario watches

Everything Clario learns comes from how a person uses the side panel itself, never from the web page underneath. The strongest signal by far is the person's own answer to the question at the end of every Simple Read article: was this too easy, just right, or too hard? Clario treats these answers as votes. It also pays attention to two things that add weight to those votes: asking Clario's chat to explain something ("what does this mean?"), and finishing Listen or Watch and then choosing to Read. Both suggest the text was harder than it should have been. Clario also records how a person reads, such as how long they spend and how often they page backwards, but it does not act on those yet. The research says those signals are noisy for our users, so they wait until we can check them against real answers from the next round of testing. All of this stays on the person's own computer. Nothing about their reading behavior is ever sent to a server.

## How Clario decides

Clario looks at the last five difficulty answers a person gave at their current level, preferring answers from the same website when there are enough of them, since a person may find news sites hard and hobby sites easy. If at least three of those five say "too hard" and none say "too easy," Clario leans toward suggesting simpler text. The reverse leans toward more detail. The bar is deliberately higher for going simpler: three "too hard" answers alone are not enough, and Clario needs either a fourth or one of the supporting signals above. That asymmetry is intentional. Our testing surfaced how much this community dislikes being talked down to, so when Clario is unsure, it asks rather than defaulting to simpler. One more rule matters most of all: if a person recently changed their level by hand in the opposite direction, Clario drops the idea entirely. The person has already spoken.

## What Clario does about it

Clario only ever acts in the moment right after someone answers the difficulty question, and only if that answer agrees with what the pattern shows. It never interrupts mid-read. If the person has chosen "I choose it," a small banner appears under the article asking, for example, "Want Clario to use simpler words on pages like this?" with Yes and No thanks. Saying yes changes the level and redoes the article. If the person has chosen "Clario picks for me," Clario makes the change right away, redoes the article they just finished so they can see the difference, and shows a notice with an Undo button that stays until they respond. Undo puts the level back and Clario treats it as a firm no.

## How Clario learns to stop asking

Nagging would undo any good this feature does. Clario asks at most once per article. One "No thanks" or Undo silences that suggestion for a week. Two within a month silence it for the month. After any change, in either mode, Clario starts counting again from zero at the new level: it needs at least three fresh, consistent answers there before it can consider moving again, so a person cannot be walked from Easy to Detailed in a single sitting. Every prompt Clario shows, and every response to it, is recorded locally alongside the other signals so we can see whether people accept, dismiss, or undo, and tune from there.

## What is still open

All the thresholds above are starting points, not findings. They were chosen to be conservative and will be calibrated against the logs from Round 2 testing. Reading speed and re-reading are collected but unused until we know they track real difficulty for our users. And the audio and video paths have no equivalent signals yet, which Cesar has flagged as a gap worth closing.
