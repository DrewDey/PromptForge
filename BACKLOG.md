# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How to use this file
Pick the top item. Ship it. Move it to Done with one line. That's it.

## Top of queue

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Until this ships, no card can show a thumbnail, and the Browse gallery will always feel thin.
2. **Run the seed SQL on live Supabase.** `supabase/seed-fix.sql` has 20 real projects + 21 steps. Drew needs to paste it into Supabase SQL Editor. No code deploy needed. Until this lands, the live site still shows old/empty seed data and every design change is invisible.
3. **Build page — finish the builder.** Live preview landed in iter 32. Remaining: drag-to-reorder steps (replace up/down arrows with a real grip handle) and proper image drop zones on the step Result blocks.
4. **Browse card thumbnail slot.** Requires #1 to land first. Card top becomes a 16:9 image when present; everything below stays as-is.
5. **CodeBlock line-number gutter.** `showLineNumbers` prop exists on `CodeBlock` but isn't wired on the detail page — natural-language prompts wrap and numbers would misalign with visual rows. Revisit when the builder supports a "treat as code" toggle or when we add a real fenced-code renderer.

## Done (rolling last 5)
History older than this lives in `git log`.

| Date | Change |
|------|--------|
| 2026-04-16 | Iter 32 — Build page gets a live preview rail: two-pane layout on `lg+`, sticky BuilderPreview mirrors the Browse PromptCard, page gains H1 hero, title input padding bug fixed. Slice of #3. |
| 2026-04-16 | Iter 31 — Code-block treatment for prompts + results: new `CodeBlock` shared component, dark chrome with dot/label/meta/integrated copy, parity between prompt (orange) and result (blue). |
| 2026-04-16 | Iter 30 — Featured card orange audit: step-number circles unified with regular cards to drop Featured from 4 orange accents to 3. Q19 option B. `src/components/PromptCard.tsx`. |
| 2026-04-16 | Iter 29 — OUTCOME pull-quote on Browse cards; evergreen "Across N categories" subtext. |
| 2026-04-16 | Iter 28 — Seed content overhaul: 20 real projects + 21 steps in `supabase/seed-fix.sql`. Data change, needs Drew to run SQL on live Supabase. |
