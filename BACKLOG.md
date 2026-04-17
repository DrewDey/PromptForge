# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How this file works

Three queues. Iterations pick from the **Polish queue** only unless explicitly told otherwise. Structural items need product judgment, new dependencies, or schema changes — Drew + live-session work only. Drew actions are blocked on a non-code operation from Drew.

**Vision anchor:** PathForge serves someone sitting there with AI tools, time, and no clear idea what to build. Every polish item should make the "I can build this tonight" moment clearer, the build process feel alive, and the fork/remix affordance obvious. *Sitting next to someone building it*, not reading a case study.

Pick the top item in your queue, ship it, move it to the Done table with one line.

---

## Polish queue — routine-safe, frontend-design focus

Small, well-scoped, visible improvements. A human landing on the site should notice.

1. **Detail-page title block vs hero description vertical rhythm.** After iter 47 locked the byline/pills/CTA cluster to a uniform 24px rhythm, the block above it still ramps on the old scale: `h1` (`mb-3`, 12px) → description `<p>` (`mb-4`, 16px) → byline (`mb-6`, 24px). The jump from 16→24 now reads as a step rather than a ramp because the byline, pills, and CTA all sit at the same 24px cadence. Either bump the description to `mb-5` (20px) so the ramp stays monotonic (3→5→6), or accept the break as a deliberate "title group" vs "meta group" separator and lock h1+description together at a tighter spacing.

---

## Structural queue — Drew + live-session only

Items that need product calls, new dependencies, schema work, or UX judgment. Routine iterations **do not touch these**.

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Needs Storage bucket, signed-URL policy, RLS. Until this ships, no card can show a thumbnail.
2. **Build page — finish the builder.** Drag-to-reorder steps (real grip handle replacing up/down arrows) + proper image drop zones on step Result blocks.
3. **Browse card thumbnail slot.** Blocked on Structural #1. Card top becomes a 16:9 image when present.
4. **CodeBlock line-number gutter + "treat as code" toggle.** Natural-language prompts wrap so line numbers misalign. Either add a real fenced-code renderer or expose a per-step toggle in the builder.
5. **Fork / remix flow.** If one doesn't exist end-to-end (duplicate project → edit prompts → save as your own), spec and build. Core to the vision.

---

## Drew actions

Blocked on a non-code operation from Drew. Not an iteration target.

1. **Run the seed SQL on live Supabase.** `supabase/seed-fix.sql` — paste into Supabase SQL Editor. Until done, the live site still shows old/empty seed data and every design change is invisible on production.

---

## Done (rolling last 5)
History older than this lives in `git log`.

| Date | Change |
|------|--------|
| 2026-04-17 | Iter 47 — Detail-page header byline→pills→CTA rhythm locked to a uniform 24px cadence: byline `mb-5` → `mb-6`, pill band `pt-5` → `pt-6`, CTA `mt-5` → `mt-6`, plus the pill flex row bumped from `gap-2` to `gap-x-2 gap-y-2.5` so wrapped pill rows have 10px of breathing room (vs the 8px column gap between adjacent pills) — they no longer squash the next block on multi-line wrap. Verified via Chrome MCP on `/prompt/...3314`: byline `margin-bottom: 24px`, pill band `padding-top: 24px / row-gap: 10px / column-gap: 8px / 4 pills`, CTA `margin-top: 24px` — all three resolve to matching 24px. `/browse` h1 + 22 card links intact; the one console `Failed to fetch` is the pre-existing unconfigured-Supabase artifact carried since iter 41; `npx tsc --noEmit` passes. |
| 2026-04-17 | Iter 46 — Detail-page Tags row padding unified with metadata pills: Tags `#tag` chips were shipping at `px-2.5 py-1` while the metadata pill cluster (Category / Difficulty / Model / Tools) above them sat at `px-2.5 py-1.5`, so the two `text-xs` pill bands on the same page had different vertical rhythms (metadata ~28px tall vs Tags ~24px tall). Bumped Tags to `py-1.5` so both clusters now resolve to computed `padding-top/bottom: 6px` — verified via Chrome MCP on `/prompt/...3314` that all 5 Tag chips + the 4 metadata pills return matching `pt: 6px / pb: 6px`. `/browse` h1 + 22 card links intact; pre-existing unconfigured-Supabase `Failed to fetch` on `/browse` is the same artifact from iters 41–45; `npx tsc --noEmit` passes. |
| 2026-04-17 | Iter 45 — The Story / The Result sibling box chrome unified: Story shipped with `bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8` and Result with the quieter `bg-accent-50/40 border-l-2 border-brand-blue p-6`, so after iters 41 (H2 unify) + 44 (body `max-w-prose` cap) the two sibling sections had matching H2s and matching body type but mismatched container chrome. Pushed Result up to Story's spec (both deserve equal narrative weight — setup + payoff): `border-l-2` → `border-l-4`, `p-6` → `p-6 sm:p-8`, `bg-accent-50/40` → `bg-accent-50/60`. Verified via Chrome MCP on `/prompt/...3314`: Story box computed `border-left-width: 4px / padding: 32px / bg alpha 0.6`, Result box now matches exactly (`4px / 32px / alpha 0.6`), `/browse` h1 + 22 card links intact, `/prompt/new` hits expected login gate; pre-existing unconfigured-Supabase `Failed to fetch` is the same artifact as iter 41–44; `npx tsc --noEmit` passes. |
| 2026-04-17 | Iter 44 — Final Result body measure cap: capped the `<p>` inside The Result's blue-bordered box (was stretching to the full `max-w-4xl` container = long prose read as a wall) to `max-w-prose` (computed ~656px / ~65ch), then applied the same cap to The Story's body `<p>` so the two sibling sections stay parallel after iter 41 unified their H2 spec and body type spec. Verified via Chrome MCP on `/prompt/...3314` (both paragraphs resolve to `max-w-prose` in computed styles, classes `text-surface-700 text-base leading-relaxed whitespace-pre-line max-w-prose`), `/browse` h1 "Browse Projects" + 20 card links intact; pre-existing unconfigured-Supabase "Failed to fetch" on the detail page same artifact as iter 41–43; `npx tsc --noEmit` passes. |
| 2026-04-17 | Iter 43 — Focus-ring audit second pass: shipped site-standard `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange` on the three clusters iter 40 left uncovered — AdminPromptRow approve/reject (green-600 / red-500 variants to match each button's semantic color), ImageUpload add-screenshot + remove-X (white outline on the dark overlay, with `sm:focus-visible:opacity-100` so keyboard focus reveals the hover-only button) + caption input (inset ring-2 so the ring doesn't clip at the bordered edge), and `/prompt/new` multi-step / single-prompt mode toggles. Unified every `focus:ring-1` on `/prompt/new` form inputs to `focus:ring-2` so the site has one focus-ring spec (matches `/auth/login`, `/auth/signup`, `/browse` search). Verified Tailwind JIT compiled every new utility into the page stylesheet (grep'd the CSS bundle: `outline-green-600`, `outline-red-500`, `outline-white`, `outline-brand-orange`, `focus:ring-2` all present), detail page + `/browse` render clean, `/prompt/new` login gate as expected; `npx tsc --noEmit` passes. |
