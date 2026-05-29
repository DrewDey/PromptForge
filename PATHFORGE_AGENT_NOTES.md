# PathForge Agent Notes

Living notes for the agents and workflows that will eventually become a Codex skill for building PathForge examples. Update this file whenever the product direction changes so the important context survives across chats.

## Current Product Thesis

PathForge helps people get past AI paralysis by showing proven AI build paths: real prompts, real responses, real files, screenshots, and a final artifact they can inspect or use immediately.

The final result should appear first. The prompt and response chain below it explains how the result was made. The site should never replace exact source material with a fake or polished summary when the exact prompt or response is available.

Important language and concepts:

- AI paralysis
- token maxing
- burn your tokens
- one-shot builds
- multi-prompt builds
- forks
- source runs
- final artifact first
- Build Requests
- Vault

## Core Capture Rule

Source-run import should be the default path whenever a platform supports it. Manual input is a fallback, not the primary workflow.

ChatGPT source runs are currently the best-supported example. For those, the user should be able to provide a source run or export, then let an agent format the run into the PathForge page. The user should not have to manually enter 14 prompts and 14 responses when the platform can provide that information directly.

Manual input still matters because not every AI platform will expose clean source runs or exports. PathForge should not lock users out when source-run import is unavailable.

Fork and project creation surfaces should present those two paths side by side:

- Source run: provide a shared run URL or uploaded export so an agent can extract the chain.
- Manual entry: add prompts, exact responses, and artifact references by hand when import is unavailable.

## Required Page Shape

- Final artifact embedded at the top.
- Prompt and response chain below the final artifact.
- The title area should be the project title plus a short description of what the run produced.
- Each response should preserve the exact response text.
- Code inside a response should be formatted as code and collapsed when long.
- Every prompt and every code block should have a one-click copy button.
- The whole response package should also be collapsible.
- Files, screenshots, and generated artifacts should be tied to the response that produced them.
- Summaries and verification notes can exist, but they must not replace exact source text.
- Forks should visually branch from the main chain.
- Each response should be forkable into a new branch where the source chain compacts left and the fork prompt/response chain grows to the right.
- Project pages should include real community surfaces: upvotes, downvotes, saves/bookmarks, comments, and replies. Counts start at zero and should not be seeded with fake activity.
- The current visual direction for chain connections is chunky green pipe/tube connectors, inspired by Flappy Bird pipes.
- Avoid response packages that feel like generic attachment grids or hide what actually happened.

## Agent Map

### Source Run Ingestion Agent

Accepts ChatGPT shared/source runs, uploads, exports, or manual fallbacks. Extracts messages, roles, timestamps, model/settings, tool use, files, attachments, code blocks, artifacts, and links.

This agent must preserve exact prompt and response text. It should not rewrite the response into marketing copy.

### Path Structuring Agent

Turns a source run into a PathForge build path. Detects whether the run is one-shot, multi-step, forked, or incomplete.

It maps each prompt to the response that followed it and links generated files, screenshots, or artifacts to the specific response that created them.

### Artifact Mounting Agent

Finds the final artifact, stores it, and mounts it at the top of the page. For runnable HTML or app artifacts, it should avoid internal iframe scrolling when realistic.

For multi-prompt chains, this agent should preserve every generated or modified artifact version, not just the final result. Each response package should be able to show the artifact version produced by that response when one exists.

This agent also needs to think about sandboxing and safety for user-generated runnable code.

### Verification Agent

Uses browser and computer-use workflows to open artifacts, test basic interaction, and capture screenshots.

It produces a concise verification summary, but that summary is metadata. It must not replace the exact AI response.

### Page Composer Agent

Builds the public PathForge page from structured run data.

It keeps the final artifact first, the exact prompt/response chain below, and the visual system consistent with the PathForge direction. It should support pipe/tube connectors and clear forked paths.

### Curation And Approval Agent

Keeps only approved projects public.

Generic or weak examples should stay out of browse until approved. The current approved public seed example is the Snake game.

### Suggestion Response Agent

Reviews suggestion box entries, drafts useful responses, and returns responses to the person who submitted the suggestion when possible.

The Suggestion Box is only for feedback about PathForge itself: confusing pages, missing product features, bugs, moderation concerns, pricing ideas, and other ways the site should improve. It is not where users ask for examples of things to build.

Public suggestion posting should be delayed by 24 hours. The user should be able to stop a suggestion from being posted publicly during that window.

### Build Request Agent

Maintains a separate Build Requests area where users ask the community for specific builds they want to see created, forked, or found.

Requests should be outcome-focused and can be answered with PathForge links, forks, source-run results, or working artifacts. Build requests should support upvotes so demand is visible before a request becomes an approved seed path.

Build Requests must not be mixed into the Suggestion Box. Suggestion Box is product feedback; Build Requests are community asks for artifacts.

### Forking Agent

Suggests ways to fork existing paths into adjacent ideas, different audiences, different formats, or stronger versions of the same concept.

The purpose is to help users see horizons when they are staring at an AI screen and do not know what to build.

### Automation And Seeding Agent

Runs regularly to create candidate examples for the site.

It can create one-shot, multi-prompt, and forked project candidates, but it should not publish them without approval.

### Source Run Extraction Agent

Turns queued source-run links/uploads into pending PathForge project pages.

The preferred workflow is source-run first, not manual reconstruction:

- User pastes a ChatGPT, Gemini, Claude, OpenRouter, or exported run link into Build your project.
- The source run is saved to `source_run_submissions` with status `queued`.
- The extraction agent opens the source run using an authorized browser session or import file.
- It extracts exact prompts, exact responses, code blocks, generated files, screenshots, model/provider details, and final artifact relationships.
- It builds a Snake-style project page: final artifact first, source path below, prompt/response packages collapsed where needed, and exact response text preserved.
- It submits the created project as `pending`, never directly public.
- Admin review approves/rejects the project before it appears in Build Paths.

Manual entry remains a fallback only for platforms where a usable source run cannot be shared or exported.

Seed ideas should start with obvious, desirable, low-hanging fruit. The site is early and mostly empty, so the first wave should not over-index on huge enterprise workflows or obscure niche builds. The visitor should be able to understand the artifact and want to try/fork it within about 15 seconds.

Prioritize both games and productivity. Early seeding can roughly split 50% games/playful experiments, 40% productivity/work tools, and 10% other broad categories when especially strong. Game examples should lean toward self-contained browser games and remixable mechanics. Productivity examples should lean toward one-file tools that calculate, organize, export, track, or clarify something useful.

First prompts should be simple but well written: specific enough to get a visible artifact, short enough to feel like a real user typed it, and not packed with monstrous feature lists. "Make me a polished one-file Breakout game with one original power-up and keyboard/touch controls" is closer to the bar than "make an advanced full game with everything."

Seed chain lengths should be weighted heavily toward short runs. A good default distribution is about 55% one-prompt, 25% two-prompt, 12% three-prompt, 5% four-prompt, 2% five-prompt, and 1% six-or-more. Longer chains are allowed, but they need to earn their length through actual observed issues, forgotten requirements, useful forks, or artifact fixes.

The agent should not prewrite prompt 2, 3, or 4 before seeing the previous output. Follow-up prompts should react to the artifact: fix something broken, refine something visibly weak, add a requirement the user plausibly forgot, or fork the build in a meaningful direction. If the chain does not relate to the actual project or its issues, it looks fake and should be rejected.

### Vault Agent

Maintains each user's Vault as the user's own uploaded projects.

The Vault is not a general bookmark shelf, request inbox, or activity feed. It should strictly show projects uploaded by that user, going back over time, so their completed AI build history can be browsed from their profile.

## Data To Preserve

- Source URL or uploaded source file
- Platform or provider
- Model and settings
- Run date and time
- Every prompt with exact text
- Every response with exact text
- Code blocks with exact code
- Generated files
- Generated artifact version for each response when applicable
- Screenshots
- Final artifact path
- Previous artifact paths
- Verification status and notes
- Fork and branch relationships
- Approval status
- Privacy status
- Public-delay status

## Multi-Prompt Artifact Versions

For a multi-prompt build, the top of the page should show the final artifact by default, but the user should still be able to inspect earlier builds.

The likely model:

- Every response package can contain the artifact generated or modified by that response.
- The final artifact remains mounted at the top by default.
- A version picker or timeline near the top embed should let the user switch between response artifacts when multiple runnable versions exist.
- Each response package should have a local preview or link for its own artifact version.
- The agent should detect when a response creates a new file, changes an existing file, or only gives text advice.
- The agent should summarize what changed between artifact versions, but the exact response remains the source of truth.
- If a chain has 10 prompts and 10 HTML outputs, PathForge should preserve all 10 outputs and make them easy to cycle through without cluttering the page.

## Submission UX Direction

The preferred submission flow should be:

1. User provides a source run link, upload, or export.
2. Agent parses the run into a structured path.
3. Agent attaches files, code, screenshots, and final artifact relationships.
4. User reviews the formatted path.
5. User approves whether it appears publicly.

Manual entry should still exist for unsupported platforms. It should support bulk paste or transcript import so multi-prompt examples do not become tedious.

The Snake demo fork workspace and the original project Build page now reflect this direction locally: source-run import is the default choice, with manual entry beside it as a fallback. The source-run UI currently prepares an import package; the real extraction agent and storage pipeline still need to be built.

## Current Decisions

- Source-run import is the preferred workflow when available.
- Manual input remains supported as a fallback.
- Exact response text is mandatory on project pages.
- Code should be collapsed inside the response package when long.
- Prompts and code blocks must be directly copyable without selecting text manually.
- The entire response package should be collapsible.
- The final artifact belongs at the top of the page.
- Attachments should be tied to the response that produced them.
- Public examples require approval.
- Suggestion box entries should support private review before public posting.
- Public suggestion posting should be delayed by 24 hours.
- Suggestion Box is only for PathForge feedback.
- Build Requests are the separate place for users to request builds from the community.
- Vault means projects uploaded by that user, not all saved or viewed projects.

## Open Questions

- Which platforms can reliably provide source runs or exports?
- Which formats should be accepted: URL, HTML export, JSON export, transcript, zip, screenshots, or all of them?
- How should private or sensitive chats be handled?
- How should generated files and artifacts be detected automatically?
- How should runnable artifacts be stored and sandboxed?
- How much verifier summary should appear by default?
- Should public source links be optional?
- Should source-run import require login?
- What approval queue interface should the user use for agent-generated seed projects?
