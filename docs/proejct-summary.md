**Purpose & context**

Ben is a developer working on **Clario**, a Chrome browser extension that helps people with intellectual and developmental disabilities (IDD) understand web content. The project is in **Phase 2**, funded by Google.org, and built for **The Arc** — a nonprofit client. Ben's primary collaborator and client contact is **Katy Schmid** from The Arc; **Erin** is the Google lead contact. Ben works with a colleague named **Will** on UX/design considerations.

The core vision for Clario is to feel like a helpful companion rather than a utility — ideally replicating the kind of support provided by direct support professionals. Phase 2 centers on building an **AI Context Agent** that learns from user behavior to automatically personalize content presentation, alongside a suite of accessibility features. The project has open-source requirements and is intended to become a reusable toolkit for other nonprofits. Final deliverables are due by end of Q3 2026\.

**Current state**

Ben is actively developing Clario through an agile sprint structure (9–11 sprints across Q1–Q3 2026). Early sprints focused on accessibility "low-hanging fruit" — particularly **text-to-speech (TTS)** — while Ben familiarized himself with the codebase. More formal sprint structure is picking up in Q2 2026\.

The next sprint challenge is adding a **video avatar feature** that reads simplified page summaries aloud to users. Ben has selected **D-ID** as the API provider (over HeyGen LiveAvatar, which is built for real-time conversational streaming), using the **V3 Pro avatar tier** (`/clips` endpoint) with an avatar named **Emma**. A comprehensive implementation brief (`AVATAR_FEATURE_BRIEF.md`) has been produced for use with Claude Code, covering:

* Full UX flow (hidden Watch button that appears when video is ready)  
* Server-side architecture with two endpoints (generate \+ status polling)  
* Extension-side polling logic with timeout  
* 800-character summary truncation for cost control  
* Silent failure handling  
* D-ID authentication via base64-encoded Basic Auth (`DID_API_KEY` env variable)

**Basecamp** is used for project management. Standing client meetings occur on Thursdays.

**On the horizon**

* Continued sprint work through Q2 2026: context agent integration, accessibility feature implementation, user testing sessions  
* Q3 2026: final feature implementation, user testing, public launch (late Q3/early Q4), open-sourcing by September 30  
* Q4 2026: Arc-led deliverables with minimal involvement from Ben's team  
* Invoicing structured across five payments tied to quarterly milestones  
* Google wants to create a reusable nonprofit toolkit from this work; Google's communications team handles public-facing promotion  
* Katy committed to exploring free API access with Google to address long-term cost sustainability for TTS and other API-dependent features

**Key learnings & principles**

* **TTS architecture**: Both a free native browser voice and higher-quality Google Cloud TTS API voices are offered; the system may auto-detect connection speed to recommend the appropriate option. Long-term API cost sustainability is an open concern for the nonprofit context.  
* **Avatar API selection**: For non-interactive, asynchronous video generation (avatar reads content, no user response needed), D-ID's `/clips` endpoint is the right fit over real-time conversational streaming APIs like HeyGen LiveAvatar.  
* **AI Context Agent design philosophy**: Start simple (e.g., thumbs up/down feedback), then gradually add complexity. The agent should learn from behavioral signals (time on page, scroll speed, interaction patterns) as proxies for comprehension.  
* **UX/design balance**: The project is heavily dev-weighted; UX work focuses on accessibility and settings presentation rather than visual design. Rapid prototyping and accessibility testing are the primary UX contributions.  
* **User identification**: Recommended approach is a hybrid — local UUID generation with server-side data storage — to balance privacy with personalization functionality.

**Approach & patterns**

* Ben prefers **implementation-ready artifacts** (e.g., markdown briefs, updated contract documents) that can be dropped directly into his project or handed off to Claude Code.  
* Uses **Claude Code** with a local codebase (server-side and extension components).  
* Researches API options before committing, with a preference for understanding tradeoffs (e.g., interactive vs. asynchronous avatar APIs) before selecting.  
* Project knowledge is stored in a Claude project; Ben uses it to catch up on project state after gaps away from the work.

**Tools & resources**

* **Claude Code** — primary implementation tool for the Clario codebase  
* **Basecamp** — project management  
* **D-ID API** (V3 Pro / `/clips` endpoint) — video avatar generation  
* **Google Cloud TTS API** — higher-quality text-to-speech  
* **Chrome Extension APIs** (including `chrome.storage`) — core platform  
* **Cursor** — code editor (referenced in earlier conversations)  
* **Loom** — used for demo videos shared with Katy  
* **Pandoc / bash DOCX extraction** — used to process uploaded Word documents within the project environment
