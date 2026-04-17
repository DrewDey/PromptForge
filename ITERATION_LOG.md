# PathForge — Iteration Log

Most recent first. Cap each entry at 3 sentences. Older history lives in `git log`.

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
