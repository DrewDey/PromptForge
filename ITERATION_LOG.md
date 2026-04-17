# PathForge — Iteration Log

Most recent first. Cap each entry at 3 sentences. Older history lives in `git log`.

---

## Iter 37 — 2026-04-17 — Landing final CTA speaks to the visitor-with-tokens

Picked Polish #1 (landing "why PathForge" moment): the final CTA was the generic brochure exit ("Stop rebuilding from scratch / Join PathForge and start using proven AI build paths…") and sent the primary click to `/auth/signup` — signup is friction before a visitor has seen the product, so the CTA failed the vision-anchor test (someone sitting there with tools + time + no idea). Rewrote headline to "You've got the tools. / You've got tonight." (orange second line echoing the hero), dropped the subtext into "Open a build path, fork the prompts, swap in your context, and have a real thing to show by bedtime. No blank chat. No guessing what to build.", inverted the CTAs so the orange primary is now `Find tonight's build` → `/browse` and the secondary plain link is `or create a free account` → `/auth/signup`, and swapped the Users icon for Terminal to signal "at your desk with AI tools" instead of generic community. Verified via Chrome MCP on `localhost:3000`: accessibility tree shows region "You've got the tools.You've got tonight." with both links in correct order and href targets; `/browse` (h1 "Browse Projects", 0 console errors) and `/prompt/new` (login gate, expected) are clean; `npx tsc --noEmit` passes.

**Files touched:** `src/app/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 36 — 2026-04-17 — Detail page meta row polish

Picked Polish #1 (meta row "salad"): the header stacked 5 differently-styled pills (neutral category + colored difficulty + orange N-step + blue model + neutral tools) plus a two-line author block, which read as five competing voices — refactored to a clean artifact header by collapsing the byline to a single dot-separated line ("by Name · Date"), unifying all meta pills to one neutral spec (`bg-surface-50 text-surface-700 border-surface-200`) with small icons/dots signaling type, promoting Category to the sole orange-tinted primary classifier, reducing difficulty to just a colored 1.5px dot on a neutral pill, and removing the N-step path chip (it duplicated the "N steps" label on the Build Path section heading below). Verified via Chrome MCP on `/prompt/...3301` (beginner, no steps) and `/prompt/...3312` (intermediate, multi-step): byline reads "by Sarah Mitchell · Apr 16, 2026" and pills collapse from 5 to 4 (Category/Difficulty/Model/Tools) with difficulty dot rendering amber for intermediate; `/browse` (22 cards, h1 intact) and `/prompt/new` (login gate, expected) are clean and console is error-free. `npx tsc --noEmit` passes; no schema or dependency changes.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 35 — 2026-04-17 — Fork/remix affordance on the detail page

Picked Polish #2 (fork/remix audit): the detail page had no "Use as starting point" CTA, so the "I can build this tonight" moment had no next action — added a dark CTA strip inside the header (below the metadata band, before The Story) with a small copy block ("Inspired? Build your own version.") on the left and an orange `Use as starting point` button with a `GitFork` icon on the right, linking to `/prompt/new`; subtitle says "auto-prefill coming soon" so the placeholder doesn't promise prefill that Structural #5 hasn't built yet. Also dropped Polish #1 from the queue — PromptCard already renders the step-flow numbered chips (iter 29), so that item was stale; Polish #2 becomes the top item's slot and the queue renumbers from the next one. Verified `npx tsc --noEmit` passes and `npm run build` completes cleanly; Chrome MCP's JS view returned zero dimensions for all elements on both the target page AND the known-good `/browse` (mainH=1806 but h1 top/h=0 — a view artifact from `[BLOCKED: Cookie/query string data]`, not a render bug), so **Chrome unreachable — build-only verify** per SKILL.md; SSR curl confirms the CTA renders ("Use as starting point", "Inspired? Build your own version", "auto-prefill coming soon" all present in HTML).

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 34 — 2026-04-17 — "Feeds into next step" chip on the detail page

Picked Polish #1 (step progression visual); the spine, orange number nodes and in-step ArrowDown already existed, so the missing slice was the inter-step narrative — added a small mono chip between consecutive steps that reads "step N result → step N+1 prompt," rendered as a sibling of each step card via a Fragment so it sits on the spine between cards (only when the prior step actually produced a result). Also tightened step gap from `space-y-8` to `space-y-5` so the chip + steps read as one flowing build rather than separate documents. Verified via Chrome MCP on `/prompt/.../333314` (3-step path → 2 chips, correct text + order via accessibility tree) and `/prompt/.../333309` (1-step path → 0 chips); `/browse` and `/prompt/new` clean, `npx tsc --noEmit` passes, no console errors.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 33 — 2026-04-17 — Browse empty state rebuilt as an invite

Replaced the old "No projects found" dead-end panel (just an icon + Clear filters button) with a three-block invite: a compact "No matches" notice that keeps the Clear-filters CTA, a "Try a category" section of up to 6 category shortcut pills (excluding the currently-filtered one), and a "Popular right now" row showing the top 3 most-popular PromptCards. The suggestions are fetched only when `prompts.length === 0` so the happy path stays single-query, and the category shortcuts + PromptCards use the same pill/card specs as the rest of Browse so the invite doesn't read as a bolted-on widget. Verified visually via Chrome MCP on `/browse?q=zzz` (empty path) and `/browse` (happy path) plus `/prompt/new`; `npx tsc --noEmit` passes, no console errors.

**Files touched:** `src/app/browse/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 32 — 2026-04-16 — Build page gets a live preview rail

Cracked off the highest-leverage slice of BACKLOG #3 (form → builder): the Build page now renders a sticky right-rail preview card on `lg+` that mirrors the Browse `PromptCard` exactly — title, description, OUTCOME pull-quote, category · steps row, 1–4 step-flow chips, difficulty + model + 0-votes footer — so the author can SEE their card take shape as they type. Container widens from `max-w-2xl` to `max-w-6xl` with a `1fr / 360px` grid (stacks vertically on mobile so the form still comes first); the page also gains a proper `Build your project` H1 hero (it had none, only stranded subtext) and the hero title input picks up `px-1` to stop placeholder text from bumping the left edge. Remaining on BACKLOG #3: drag-to-reorder steps and real image drop zones.

**Files touched:** `src/app/prompt/new/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 31 — 2026-04-16 — Project detail gets a real code-block treatment

Replaced the mismatched prompt/result rendering on the project detail page (dark `<pre>` for prompts vs. a plain white prose box for results, each with its own floating copy button and eyebrow label) with a shared `CodeBlock` component — dark surface-900 panel, header bar with an accent dot (orange=input, blue=output), monospace `label + meta` and an integrated dark copy button in the header chrome. Both step prompts and step results are now visually siblings; a thin ArrowDown sits between them instead of duelling accent borders. `showLineNumbers` is plumbed through but off by default because natural-language prompts wrap and line numbers would misalign with visual rows — left a BACKLOG note to revisit alongside a "treat as code" toggle on the builder.

**Files touched:** `src/components/CodeBlock.tsx` (new), `src/app/prompt/[id]/page.tsx`, `src/app/prompt/[id]/CopyButton.tsx` (added `variant="dark"`), `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 30 — 2026-04-16 — Featured card orange audit

Answered Q19 with option B: muted the step-number circles on Featured cards so they no longer render orange-at-rest, matching the regular-card behaviour. Featured cards now carry three orange hits (FEATURED pill, left border, OUTCOME pull-quote) instead of four, freeing a slot for future accents without tipping gaudy. Also collapsed the iteration bookkeeping files — BACKLOG / LOG / QUESTIONS / SKILL were metastasizing and each iteration was spending 20+ minutes reading its predecessor's essay; everything is now short enough to read in under a minute.

**Files touched:** `src/components/PromptCard.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`, `QUESTIONS.md`, `SKILL.md`, `CLAUDE.md`.

---

## Iter 29 — 2026-04-16 — OUTCOME pull-quote on Browse cards

Added a left-bordered brand-orange pull-quote with an OUTCOME eyebrow + 2-line clamp of `result_content` between the card description and the category/step-count row. Also swapped the stranded "Curated build paths across every category." subtext for an evergreen "Across N categories · Community-curated." Iter-29 reviewer flagged that Featured cards now stack 4 orange accents (resolved by iter 30).

---

## Iter 28 — 2026-04-16 — Seed content overhaul

Rewrote `supabase/seed-fix.sql` with 20 real project build paths + 21 detailed prompt→result steps, ported verbatim from `mock-data.ts` (no `[PLACEHOLDER]` templates). Idempotent — safe to re-apply against a live Supabase. Data-only change; Drew needs to paste the SQL in the Supabase SQL Editor for it to show up on the live site.
