---
name: publish-source-run-project
description: End-to-end pipeline for turning one real AI build-session into a published PathForge showcase page. Use when the user wants to drive a real model run in the browser, capture the exact prompts/responses/artifact, build the special showcase route (mirroring HP 10Bii+ for multi-prompt or Snake/Decision-Matrix for one-shot), verify with tsc + build, and publish only after explicit approval. Covers CAPTURE -> BUILD -> VERIFY -> PUBLISH with hard anti-fabrication guardrails.
---

# Publish Source-Run Project

## Goal

Turn ONE real AI build-session into ONE published PathForge showcase page, consistently and correctly, every time.

This is the productionizing pipeline that comes after a run exists: drive a real model session in the browser, capture the exact prompts/responses/artifact, wire the special showcase route, verify, and publish on approval. It is the page-building counterpart to `skills/pathforge-seed-iteration` (which generates and submits seed runs). Use this skill when the job is "make a real run into a live public page", not "generate a new seed".

The pipeline has four phases: **CAPTURE -> BUILD THE PAGE -> VERIFY -> PUBLISH**. Do them in order. Do not skip VERIFY before PUBLISH.

### This architecture is the current standard, not a frozen spec

What follows is the **validated default** for every new showcase project: real captured run -> verbatim per-step artifacts -> artifact-first showcase route mirroring the HP 10Bii+ / Pomodoro explorers -> the exact file-wiring map below -> the engagement exclusion for code-only projects. Build new projects this way unless there is a reason not to. It is expected to **evolve** as the product grows (new artifact types, new explorers, real-persistence projects, richer engagement). When a better pattern is validated, update this skill and its inverse (`skills/unpublish-showcase-project`) together so both sides stay in sync. Treat this as the current best practice, not an immutable contract.

## Non-Negotiable Guardrails

These override convenience. If a step would violate one of these, stop and fix the approach instead.

1. **Never fabricate content.** Real captured runs only. If a run did not happen, do not invent prompts, responses, or an artifact. No imagined transcripts.
2. **Preserve exact prompts and exact responses — VERBATIM, never summarized.** The page must show the verbatim prompt text the user sent and the verbatim visible model response. For build-style runs the response **is** the generated artifact code: each step's response section must render that step's exact artifact file (the full verbatim code, in a collapsible + copyable code block) — never a paraphrase, recap, or feature blurb of what the code does. Summaries, titles, and page copy are allowed only *in addition to* the exact text, never as a replacement for it. Do not put per-step summary prose in `PreparedShowcaseStep.resultContent` as a stand-in for the response; leave it empty (or purely supplemental) and let the verbatim code be the response.
3. **Never use the admin profile as author.** Attribute the project to a non-admin seed/house profile (default: `PathForge Projects`, id `22222222-2222-2222-2222-222222222211`). Do not author a public page under the user's personal/admin account just because Chrome is signed into it.
4. **Artifact-first layout.** The final artifact/outcome mounts first and loads non-blank, before the prompt/response build path.
5. **Verify before publish.** `npx tsc --noEmit` and `npm run build` must pass, and the mounted artifact must load and be non-blank, before any commit/push.
6. **No fake engagement.** No invented votes, bookmarks, comments, forks, or fake user activity. Demo pages show read-only zero/static counts; real persistable IDs get real engagement controls. Never seed counts to look popular.
7. **Push only with explicit approval.** This is a local-first project; pushing `main` deploys to production. Commit locally, then push only when the user explicitly says to.
8. **Multi-step builds MUST ship a per-step artifact selector.** Any run with more than one prompt that produces a build at each step must save one artifact file per step (`<slug>-step-1.html` … `<slug>-step-N.html`, with the last step being the final) and ship a selector through the shared `SourceRunShowcase` pattern used by `/hp-10bii-calculator-demo`: selecting a step re-keys the mounted `ArtifactFrame` iframe to THAT step's HTML. Default the mounted view to the final step. A single mounted final artifact with earlier steps reduced to prose is not acceptable — the user must be able to mount and inspect each step's exact artifact.
9. **HP-style source-run order is strict.** Multi-prompt showcase pages read as: mounted artifact first; prompt 1; verbatim clickable/collapsible response package 1; prompt 2; verbatim clickable/collapsible response package 2; and so on in exact source order. The final response artifact is selected by default, earlier artifact versions stay selectable, and the page keeps the full provider source-run link plus the PathForge source-run record link when available.

## Required Inputs

Before starting, determine:

- Whether a real run already exists (source-run share URL) or this skill must drive the run live in CAPTURE.
- Chain type: `one-shot` (Snake / Decision-Matrix pattern) or `multi-prompt` (HP 10Bii+ pattern).
- The provider/model, and whether the model must be a specific tier (e.g. GPT 5.5 *Instant*, not *Thinking Heavy*).
- Category/domain and difficulty.
- A slug for the project (kebab-case, e.g. `pomodoro-focus-timer`).

If the run already exists and was captured correctly, skip to BUILD THE PAGE.

---

## Phase 1 — CAPTURE

Drive the user's real AI session in the browser using their logged-in Chrome session. Capture must be faithful enough that the page can show exact prompts and exact responses.

### Browser capture rules (learned the hard way)

These are real findings from live capture. Treat them as defaults, not edge cases.

- **The model picker is NOT in ChatGPT's accessibility tree at rest.** You cannot select the model by reading the a11y tree. You must *open the model menu* first, then select the target option by element `ref`. A fresh chat frequently defaults to the wrong tier (e.g. **GPT 5.5 Thinking Heavy**).
- **Confirm the model before sending the first prompt.** Verify the exact tier is selected (e.g. **GPT 5.5 Instant**, not Thinking Heavy / Pro / Max). The model label on the page is the source of truth; record it.
- **Capture path depends on the tier.** On **Instant**, code typically comes back **INLINE** in the chat — capture it from page text. On **Thinking** tiers, the code often hides in a **downloadable file** instead of inline — capturing it forces a download step. Prefer the faster adequate tier that returns code inline when the artifact is simple, and record the tier you actually used.
- **ChatGPT virtualizes off-screen turns.** It only keeps the visible turns in the DOM and unmounts/recycles the rest, so a single `get_page_text` / `read_page` call can return an **incomplete or mis-ordered** transcript (missing earlier prompts, missing parts of a long code block, steps out of order). Do NOT trust one page-text grab for a multi-step run. Instead: read the transcript reliably — scroll each turn into view and capture it individually, expand/open every code block before reading it, and reconcile against the prompts you actually sent. The goal is one **byte-exact, verbatim** copy of each step's prompt and each step's full code. If any step's code looks truncated or merged with another step, re-read that turn until you have the complete file.
- **Save one byte-exact verbatim HTML artifact PER step** to `public/artifacts/<slug>-step-N.html` as you go (last step = the final artifact). Do not reconstruct a step's code from memory or paraphrase it — copy the exact bytes the model returned for that turn.
- Send only the first prompt, wait for completion, inspect the real output, then decide whether another prompt is genuinely warranted (broken behavior, missing feature, real refinement). Do not pre-script later prompts.
- Capture per step: exact prompt, exact response (visible text), generated code blocks, generated files/downloads, provider/model/tier, date/time, and the source share URL.

### What to save

1. **Final artifact** to `public/artifacts/<slug>.html` (or appropriate extension). Save the exact model code; do not hand-edit it. For multi-prompt build runs, save EVERY step's artifact verbatim — one file per step, `<slug>-step-1.html` … `<slug>-step-N.html` (last step = final) — so the page's per-step selector can mount each step's exact HTML (guardrail 8). Do not summarize a step in place of saving its code.
2. **Capture notes** to `public/artifacts/<slug>-capture-notes.md` using the template in `references/capture-notes-template.md`. It must contain: source URL, provider/model/tier, final artifact path, and for every step the exact prompt and the exact result. Include a "Capture findings" section noting model-picker/tier/inline-vs-download behavior for this run.

### Verify the artifact during capture

Open `public/artifacts/<slug>.html` in a browser. Confirm it renders, the main interaction works, and there is no blank screen. Self-contained only: the artifact is mounted in a sandboxed iframe (`allow-scripts allow-same-origin`), so it must not depend on external resources. If verification fails, keep the run as `blocked` and record why — do not build a page on a broken artifact.

---

## Phase 2 — BUILD THE PAGE

Pick the closest existing pattern before building. Reuse structure; do not invent new layout.

- **one-shot playable/visual artifact** -> Snake (`/snake-demo`)
- **one-shot productivity/tool artifact** -> Decision Matrix (`/decision-matrix-demo`)
- **multi-prompt source run with artifact versions** -> HP 10Bii+ (`/hp-10bii-calculator-demo`)

A custom showcase route is a **renderer override, not an exception**: it must still satisfy the full Public Project Page Consistency Contract below.

### Files to edit (the wiring map)

Do all of these. Missing any one leaves the page half-wired (e.g. invisible in browse, or links to the stale `/prompt/[id]` page).

1. **`src/lib/featured-projects.ts`** — add `export const MY_PROJECT_ID = '<uuid>'`. The ID MUST be a valid UUID (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) or it cannot persist votes/bookmarks via `isPersistableProjectId()`.
2. **`src/lib/prepared-showcase-projects.ts`** — define `const MY_PROJECT_SHOWCASE: PreparedShowcaseProject` (import the new ID), then append it to `PREPARED_SHOWCASE_PROJECTS`. See the field shape and step shape below.
3. **`src/lib/project-links.ts`** — add `[MY_PROJECT_ID]: '/my-project-demo'` to `PROJECT_ROUTE_OVERRIDES` so browse/profile/admin/`/prompt/[id]` links route to the special page. Required.
4. **`src/lib/data.ts`** — add `MY_PROJECT_ID` to the `APPROVED_PROJECT_IDS` Set (currently `new Set([SNAKE_PROJECT_ID, HP_10BII_PROJECT_ID, TIC_TAC_TOE_PROJECT_ID])`). Without this the project is not publicly visible.
5. **`src/lib/mock-data.ts`** — (a) add/confirm the author profile in `mockProfiles` (default: reuse `PathForge Projects`, id `22222222-2222-2222-2222-222222222211`); (b) spread the project steps into `mockSteps` via `...MY_PROJECT_SHOWCASE.steps.map(...)`; (c) add the `mockPrompts` entry with `status: 'approved'`, `vote_count: 0`, `bookmark_count: 0`, and `author_id` pointing at the chosen non-admin profile.
6. **`src/lib/project-engagement.ts`** — add `MY_PROJECT_ID` to the `CODE_ONLY_SHOWCASE_IDS` Set. **This is mandatory for code-only showcase projects** (the default) and was learned from a real production bug. A prepared-showcase project has a valid UUID and renders via the in-memory mock fallback, but it has **NO row in the live Supabase `prompts` table** — so any upvote/bookmark `INSERT` against its ID fails the FK + RLS "approved prompts row" check and surfaces the red **"Could not save vote."** error to users. Adding the ID here makes `isPersistableProjectId()` return `false`, so `ProjectEngagementBar` renders **read-only static counts** instead of interactive controls. Skip this step ONLY if you are also seeding a real approved `prompts` row (see the engagement note below) — in that case the ID must NOT be in this set so the controls stay interactive.
7. **`src/app/my-project-demo/page.tsx`** — the special route page. For HP-style multi-prompt pages, use the shared `SourceRunShowcase` pattern from `/hp-10bii-calculator-demo` or `/pomodoro-timer-demo` rather than restoring old one-off explorer components.
8. **`public/artifacts/`** — the artifact file(s) saved in CAPTURE must exist at the paths the page reads (`<slug>-step-1.html` … `<slug>-step-N.html` for multi-prompt builds, plus the final artifact).

`PreparedShowcaseProject` fields: `id`, `sourceRunId`, `href`, `title`, `description`, `content`, `resultContent`, `categorySlug` (must match an existing mock category slug), `mockCategoryId`, `difficulty` (`beginner|intermediate|advanced`), `modelUsed`, `modelRecommendation`, `toolsUsed[]`, `tags[]`, `artifactPath` (points to a real file in `public/artifacts/`), `sourceUrl`, `authorDisplayName`, `authorUsername`, `createdAt`, `updatedAt`, `steps[]`.

`PreparedShowcaseStep` fields: `id` (must be prefixed with the project id, e.g. `${MY_PROJECT_ID}-step-1`), `stepNumber`, `title`, `content` (the exact prompt), `resultContent` (leave empty `''` for build steps — the verbatim step artifact code read from `public/artifacts/<slug>-step-N.html` is the response; never put a paraphrased summary here as a stand-in), `description`.

### Author wiring (non-admin only)

`authorUsername`/`authorDisplayName` on the PreparedShowcaseProject are free strings and are the source of truth for the displayed author. The actual joined author comes from `mockPrompts.author_id` -> `mockProfiles.id` via `attachRelations()` in `data.ts`; `normalizeProjectPresentation()` does NOT set the author. So the `mockPrompts.author_id` must point at a non-admin profile whose `username`/`display_name` match the showcase's `authorUsername`/`authorDisplayName`.

- **Default:** reuse `PathForge Projects` (`22222222-2222-2222-2222-222222222211`) — already wired, zero new profile needed.
- **New house profile:** if a distinct builder identity is wanted, add the next sequential mock id `22222222-2222-2222-2222-2222222222NN` with `role: 'user'`, a realistic handle/name, bio, and timestamps. Never use a profile with `role: 'admin'`.

### Engagement: code-only (default) vs real-persistence

Decide this explicitly for every project. There are exactly two valid modes; do not leave one half-wired.

- **Code-only showcase (the default).** The project lives only in the in-memory mock layer — it has a valid UUID and an `approved` `mockPrompts` row, but **no row in the live Supabase `prompts` table**. These MUST be excluded from interactive engagement by adding their UUID to `CODE_ONLY_SHOWCASE_IDS` in `src/lib/project-engagement.ts` (wiring step 6). Otherwise an upvote/bookmark `INSERT` fails the FK + RLS "approved prompts row" check and users see the red **"Could not save vote."** error. Code-only projects render **read-only static counts** (start them at `0`; never seed counts to fake popularity). HP 10Bii, Tic-Tac-Toe, Decision Matrix, and Pomodoro are all code-only today.
- **Real-persistence project (opt-in only).** If working votes/bookmarks are explicitly wanted, you must seed a real **approved `prompts` row in live Supabase**, the way Snake does in `supabase/prompt-engagement.sql` (insert the prompt + its step with `status = 'approved'`). Only then is the ID persistable: **do NOT** add it to `CODE_ONLY_SHOWCASE_IDS`, and `isPersistableProjectId()` will return `true` so `ProjectEngagementBar` renders interactive `VoteBookmarkButtons`. This is the only path that produces real engagement, and it requires the SQL to actually be applied to live Supabase (a Drew/ops action — flag it, don't fake it). Default to code-only unless real votes are an explicit requirement.

### Public Project Page Consistency Contract

Every showcase page — Snake, Decision Matrix, HP 10Bii, Tic-Tac-Toe, and this new one — exposes the same shell. The artifact varies; the shell does not. Full checklist in `references/consistency-contract.md`. Summary:

- **Header** (dark `bg-surface-900`): PathForge link, project `h1`, description, `RunSummary` (3-col grid: model / run-type / captured date), `ProjectEngagementBar`, then the mounted artifact.
- **ArtifactFrame** (`id="final-result"` — preserve it; it is the scroll target): dark border/shadow, header bar (label + title + Open link), iframe `sandbox="allow-scripts allow-same-origin"` (add `allow-downloads` only if the artifact emits a CSV), `src` pointing at `/artifacts/*.html`, fixed height per project.
- **BuildPath**: `PipeNode` components with green pipe styling (exact hex `#2bd15f` bright, `#07551f` dark). Node 01 = prompt (left border brand-orange). Node 02+ = response package (collapsible `details`). Each response: intro text, filename badge, nested code-block `details` (`max-h-[460px] overflow-auto`), `CopyButton variant="dark"`, source-run link.
- **Multi-response / multi-step (HP 10Bii pattern)**: the shared `SourceRunShowcase` manages a selectable artifact selector — one tab per step/response (obvious selected state with `CheckCircle2`) — plus an `ArtifactFrame` **keyed to the selected step** so the mounted iframe switches to that step's exact HTML, and sequential PipeNodes prompt -> response -> prompt -> response. Each step's response renders that step's verbatim artifact code (collapsible + copyable), never a summary. The final step loads first by default; every earlier step's artifact stays mountable and inspectable. Save one artifact file per step (`<slug>-step-N.html`).
- **Admin bridge**: source-run intake rows stay in the normal Pending Review table. When a prepared showcase exists, the dashboard/detail next action should say publish/approve prepared page; when it does not, the copy should say a prepared public page must be structured first.
- **Fork**: a visible fork action (`ProjectForkCallout`) routing to `/build?fork={projectId}` — not just a passive count.
- **Community**: `ProjectCommunityPanel` (fork callout + comments zero-state + discussion sidebar with real 0 counts). No fake comments/forks.
- **Engagement**: `ProjectEngagementBar` is async, checks `isPersistableProjectId`; persistable IDs render real `VoteBookmarkButtons size="large"`, demo IDs show static read-only counts.
- **Imports** every `page.tsx` needs: `Link`, icons from `lucide-react` (`ExternalLink`/`FileCode2`/`GitBranch`), `CopyButton` from `@/app/prompt/[id]/CopyButton`, `ProjectEngagementBar` and `ProjectCommunityPanel` from `@/components/`.
- **Artifact loading**: read `public/artifacts/[filename].html` at build time with `fs.readFileSync` and show a fallback message on error.

### Common wiring gotchas

- Project ID must be a real UUID or votes/bookmarks silently won't persist.
- `categorySlug` must match an existing mock category slug or the category lookup fails.
- `artifactPath` must point at a real file in `public/artifacts/` or the iframe is blank.
- Every step `id` must be prefixed with the project id and be unique.
- Forgetting `APPROVED_PROJECT_IDS` -> project never appears in browse.
- Forgetting the `PROJECT_ROUTE_OVERRIDES` entry -> links go to the generic `/prompt/[id]` page instead of the showcase.
- Forgetting `CODE_ONLY_SHOWCASE_IDS` for a code-only project -> upvote/bookmark throws the red "Could not save vote." (no live `prompts` row to persist against). Add the UUID there so engagement renders read-only counts.
- `author_id` must match a real `mockProfiles` id or `attachRelations()` returns `undefined` author.
- Artifacts must be self-contained (sandboxed iframe); no external scripts/styles/CDN.

---

## Phase 3 — VERIFY

Do not skip. Run these and confirm they pass before considering PUBLISH.

1. `npx tsc --noEmit` — must pass clean.
2. `npm run build` — must pass (also type-checks). Note: sandboxed/network-restricted environments can fail on Google Fonts fetches; if that is the only failure, record it and verify types/route locally instead.
3. `git diff --check` — no whitespace/conflict errors.
4. **Artifact loads and is non-blank** — open the special route (or the artifact URL directly) and confirm the iframe renders, the main interaction works, and the package switcher works for multi-prompt.
5. **Full approval-to-live chain** (from the consistency contract): route loads, artifact non-blank, prompt count and response-package count match the source, code blocks collapse, copy/open controls exist, fork action visible and routes to `/build?fork=PROJECT_ID`, engagement clicks do not navigate to the project page, browse card / profile links route to the special page, and the stale generic `/prompt/[id]` page is not what users see.

If any check fails, keep fixing. Do not call the page done because the changed component looks right in isolation. Stop any local dev server started for verification.

---

## Phase 4 — PUBLISH

Local-first. Pushing `main` deploys to production.

1. Stage and commit only the scoped files for this page (the wiring files in Phase 2 plus the artifact + capture notes). Keep unrelated changes out of the commit.
2. Use a concise message describing the published showcase project.
3. **Push only with the user's explicit approval.** Do not push, deploy, or apply production SQL without an explicit go-ahead in that turn.
4. End commit messages with the project's required co-author trailer if committing on the user's behalf per repo policy.

Report back: provider/model/tier, prompt count, artifact path, route, what was verified, what is local-only, and the approval-gated push step.

---

## Output To User

Keep it factual and short:

- which provider/model/tier ran and how many prompts,
- artifact path(s) and the special route,
- verification result (`tsc`, `build`, artifact-loads),
- whether it is committed locally and waiting on push approval,
- anything blocked.

## References

- `references/capture-notes-template.md` — the exact shape for `public/artifacts/<slug>-capture-notes.md`.
- `references/consistency-contract.md` — full Public Project Page Consistency Contract and approval-to-live checklist.
