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
- captured AI sessions
- final artifact first
- Build Requests
- Vault

## Core Capture Rule

Captured-session intake is the only active Build page upload path for now. Manual input is closed off and should stay visibly marked as "Not available for now" until the user explicitly reopens it.

Before changing source-run submission behavior, run `npm run check:source-run-intake`. The guard exists to keep upload as title + real AI session link + agent notes, and to prevent agents from reintroducing direct prompt/upvote-page creation into intake.

ChatGPT shared sessions are currently the best-supported example. For those, the user should be able to provide a session link or export, then let an agent queue that source run for review. The user should not have to manually enter 14 prompts and 14 responses when the platform can provide that information directly.

Manual input may matter later because not every AI platform will expose clean session links or exports. For now, the Build page should keep it disabled rather than accepting a second upload shape.

Fork and project creation surfaces should show the intended direction without enabling manual submission:

- AI session link: provide a short intake title, shared run URL, and agent notes so an agent can extract the chain.
- Manual entry: display as closed with a diagonal red "Not available for now" bar.

## One Queue Rule

There is one review queue for getting work onto the website.

Do not create separate product surfaces, nav items, stats, or queue language for session links. A session link is only an input method. Manual submissions and session-link entries both feed the same review flow.

If an entry starts as a session link, the source-run intake record is the submission. The admin reviews that intake first. A project page should only be drafted after an explicit admin/user decision to build from that intake.

Approval is the first real publishing checkpoint, not an afterthought. A project is not fully live because a route exists, an artifact file deploys, or a source-run row has `extracted_prompt_id`. The prompt itself must be approved, the source-run row must point to that approved prompt, and the admin dashboard must no longer show the item in Pending Review.

For every source-run promotion, verify the whole chain in this order:

1. The public artifact route exists and production can serve it.
2. The project page is wired to the correct route and data.
3. The prompt is approved through the admin flow or prepared-source publish action.
4. The admin dashboard Pending Review count drops and the row is gone.
5. The source-run detail says published only when the linked prompt is approved.
6. Browse, profile, direct project route, artifact URL, and stale `/prompt/[id]` links all land on the intended public experience.

## Required Page Shape

The shared fork implementation and release runbook lives in [PathForge forks](./PATHFORGE_FORKS.md). Keep this page-direction summary aligned with that contract.

- Final artifact embedded at the top.
- Prompt and response chain below the final artifact.
- Custom showcase routes are renderer overrides, not exceptions. They still need the same public project shell as generic project pages.
- The title area should be the project title plus a short description of what the run produced.
- Each response should preserve the exact response text.
- Raw model response text should be collapsed by default on public pages. Generated artifact HTML/file bodies should not be dumped into the public reading path.
- Every prompt and every code block should have a one-click copy button.
- The whole response package should also be collapsible.
- Files, screenshots, and generated artifacts should be tied to the response that produced them.
- Summaries can exist, but verification notes and internal QA/audit text belong in admin/repo metadata, not in public product-page copy.
- Multi-prompt source-run pages must use `SourceRunShowcase`. Do not reintroduce one-off source-run explorer components for HP, Weekend, Neon, Swish, Meeting Cost, or future pages with the same shape.
- Run `npm run check:source-run-showcases` after adding or repairing a source-run public page. The guard exists to catch the recurring misses: summary text in `response_exact`, missing selectable response artifacts, public admin source-run IDs/record links, verification-note leakage, missing route overrides, missing public fallback wiring, and local-only artifact paths.
- Model variants are one canonical project's developer-operated run history, not community forks. Keep the model selector alphabetical and stable; selecting a run must never reorder the choices. Shared engagement and discussion stay attached to the canonical project.
- Forks should visually branch from the main chain.
- Each response should be forkable into a new branch where the inherited prompt/response path compacts left, the exact source response forms the branch socket, and the child prompt/response continuation grows prominently to the right. Child pages must reconstruct the same inherited path and socket; narrow layouts stack the same relationship vertically.
- A fork from a model variant must retain the canonical project, exact model-variant row, `source_run_id`, exact response/step ID and number, selected artifact path, and artifact SHA-256. Never fall back from an unresolved exact response ID to a same-numbered response from another run.
- Every public project page should expose an obvious fork action that opens the build flow with the source project identified. A passive fork count by itself is not enough.
- Project pages should include real community surfaces: upvotes, downvotes, saves/bookmarks, comments, and replies. Counts start at zero and should not be seeded with fake activity.
- The current visual direction for chain connections is chunky green pipe/tube connectors, inspired by Flappy Bird pipes.
- Avoid response packages that feel like generic attachment grids or hide what actually happened.
- Before publication, verify the page by route, not component assumption: artifact loads, source count matches, fork action exists, engagement does not click through, browse/profile links route correctly, and the page does not fall back to stale generic `/prompt/[id]` presentation.

## Agent Map

### Captured Session Ingestion Agent

Accepts ChatGPT shared sessions, supported shared-run links, or manual fallbacks. Extracts messages, roles, timestamps, model/settings, tool use, files, attachments, code blocks, artifacts, and links.

This agent must preserve exact prompt and response text. It should not rewrite the response into marketing copy.

### Path Structuring Agent

Turns a captured session into a PathForge build path. Detects whether the run is one-shot, multi-step, forked, or incomplete.

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

Requests should be outcome-focused and can be answered with PathForge links, forks, captured-session results, or working artifacts. Build requests should support upvotes so demand is visible before a request becomes an approved seed path.

Build Requests must not be mixed into the Suggestion Box. Suggestion Box is product feedback; Build Requests are community asks for artifacts.

### Forking Agent

Suggests ways to fork existing paths into adjacent ideas, different audiences, different formats, or stronger versions of the same concept.

The purpose is to help users see horizons when they are staring at an AI screen and do not know what to build.

### Automation And Seeding Agent

Runs regularly to create candidate examples for the site.

It can create one-shot, multi-prompt, and forked project candidates, but it should not publish them without approval.

### Source-Run Intake Agent

Queues captured session links for PathForge review.

The preferred workflow is captured session first, not manual reconstruction:

- User pastes a ChatGPT, Gemini, Claude, or OpenRouter run link into Build your project.
- User adds a short title so the admin review queue has a clickable intake record.
- The entry is saved to `source_run_submissions` with status `queued`.
- A developer-operated package may supply a checked UUID `source_run_id` when the same immutable identity must survive queue import, model history, and fork lineage. An exact reimport reuses the matching author/profile and source URL; a conflicting reuse is rejected. Ordinary user uploads omit it.
- The extraction agent opens the captured session using an authorized browser session or import file.
- It extracts exact prompts, exact responses, code blocks, generated files, screenshots, model/provider details, and final artifact relationships.
- It does not create a prompt/upvote page as part of submission.
- It leaves the entry as a queued source-run intake until a separate explicit page-build action.
- Admin review decides whether the intake should become a project before anything appears in Build Paths.

Manual entry is visible but closed for now. Do not use it as a submission path unless the user explicitly reopens manual entry in a later turn.

Seed ideas should start with obvious, desirable, low-hanging fruit. The site is early and mostly empty, so the first wave should not over-index on huge enterprise workflows or obscure niche builds. The visitor should be able to understand the artifact and want to try/fork it within about 15 seconds.

Prioritize both games and productivity. Early seeding can roughly split 50% games/playful experiments, 40% productivity/work tools, and 10% other broad categories when especially strong. Game examples should lean toward self-contained browser games and remixable mechanics. Productivity examples should lean toward one-file tools that calculate, organize, export, track, or clarify something useful.

First prompts should be simple but well written: specific enough to get a visible artifact, short enough to feel like a real user typed it, and not packed with monstrous feature lists. "Make me a polished one-file Breakout game with one original power-up and keyboard/touch controls" is closer to the bar than "make an advanced full game with everything."

Seed chain lengths should be weighted heavily toward short runs. A good default distribution is about 55% one-prompt, 25% two-prompt, 12% three-prompt, 5% four-prompt, 2% five-prompt, and 1% six-or-more. Longer chains are allowed, but they need to earn their length through actual observed issues, forgotten requirements, useful forks, or artifact fixes.

The agent should not prewrite prompt 2, 3, or 4 before seeing the previous output. Follow-up prompts should react to the artifact: fix something broken, refine something visibly weak, add a requirement the user plausibly forgot, or fork the build in a meaningful direction. If the chain does not relate to the actual project or its issues, it looks fake and should be rejected.

### Vault Agent

Maintains each user's Vault as the user's own uploaded projects.

The Vault is not a general bookmark shelf, request inbox, or activity feed. It should strictly show projects uploaded by that user, going back over time, so their completed AI build history can be browsed from their profile.

## Data To Preserve

- Source URL
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
- Exact fork source model variant, source run, response step, artifact path, and artifact SHA-256
- Approval status
- Privacy status
- Public-delay status

## Public Browse Model Facets

The `/paths` model filter should be generated from the same public model label shown on each path card. Do not maintain a separate stale model list for browse facets, and do not let an old `model_recommendation` bucket a card under a model name that the card itself does not display. Raw model/provider provenance should stay available in source-run review and detail-page provenance where it belongs.

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

1. User provides a session link.
2. Agent or user adds short notes.
3. The source-run intake is queued for review.
4. Admin reviews the source-run intake.
5. A separate explicit page-build/publish step decides whether it appears publicly.

Manual entry may come back later for unsupported platforms. While closed, it should remain visibly disabled rather than accepting a different upload shape.

The Snake demo fork workspace and the original project Build page now reflect this direction locally: captured-session import is the active choice, with manual entry shown beside it as unavailable for now. The intake UI stores a source-run review entry; the real extraction/page-build agent is a later explicit step.

## Current Decisions

- Source-run import is the preferred workflow when available.
- Manual input is closed on the Build page for now and marked with a red "Not available for now" bar.
- Exact response text is mandatory on project pages.
- Code should be collapsed inside the response package when long.
- Prompts and code blocks must be directly copyable without selecting text manually.
- The entire response package should be collapsible.
- The final artifact belongs at the top of the page.
- Attachments should be tied to the response that produced them.
- Public examples require approval, and approval means the admin Pending Review row is cleared, not just that a page can be opened.
- Suggestion box entries should support private review before public posting.
- Public suggestion posting should be delayed by 24 hours.
- Suggestion Box is only for PathForge feedback.
- Build Requests are the separate place for users to request builds from the community.
- Vault means projects uploaded by that user, not all saved or viewed projects.

## Open Questions

- Which platforms can reliably provide session links or exports?
- Which formats should be accepted: URL, HTML export, JSON export, transcript, zip, screenshots, or all of them?
- How should private or sensitive chats be handled?
- How should generated files and artifacts be detected automatically?
- How should runnable artifacts be stored and sandboxed?
- How much verifier summary should appear by default?
- Should public source links be optional?
- Should captured-session import require login?
- What approval queue interface should the user use for agent-generated seed projects?
