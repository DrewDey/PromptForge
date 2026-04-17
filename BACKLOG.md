# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How to use this file
Pick the top item. Ship it. Move it to Done with one line. That's it.

## Top of queue

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Until this ships, no card can show a thumbnail, and the Browse gallery will always feel thin.
2. **Run the seed SQL on live Supabase.** `supabase/seed-fix.sql` has 20 real projects + 21 steps. Drew needs to paste it into Supabase SQL Editor. No code deploy needed. Until this lands, the live site still shows old/empty seed data and every design change is invisible.
3. **Build page — turn the form into a builder.** Drag-to-reorder steps, live preview of what the project page will look like, proper image drop zones.
4. **Browse card thumbnail slot.** Requires #1 to land first. Card top becomes a 16:9 image when present; everything below stays as-is.
5. **Project detail — code-block treatment.** Prompts and results should look like a real code editor (monospace, line numbers optional, copy button). Today they're plain `<pre>`.

## Done (rolling last 5)
History older than this lives in `git log`.

| Date | Change |
|------|--------|
| 2026-04-16 | Iter 30 — Featured card orange audit: step-number circles unified with regular cards to drop Featured from 4 orange accents to 3. Q19 option B. `src/components/PromptCard.tsx`. |
| 2026-04-16 | Iter 29 — OUTCOME pull-quote on Browse cards; evergreen "Across N categories" subtext. |
| 2026-04-16 | Iter 28 — Seed content overhaul: 20 real projects + 21 steps in `supabase/seed-fix.sql`. Data change, needs Drew to run SQL on live Supabase. |
| 2026-04-16 | Iter 27 — Browse toolbar nit sweep: segmented control sizing, dark Category pill, card-footer middle-dot separators, popover a11y. |
| 2026-04-16 | Iter 26 — Filter-toolbar collapse + solid FEATURED pill + card-footer declutter. |
