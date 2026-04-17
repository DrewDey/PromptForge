# PathForge — Iteration Log

Most recent first. Cap each entry at 3 sentences. Older history lives in `git log`.

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
