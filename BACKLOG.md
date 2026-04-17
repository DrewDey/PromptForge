# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How this file works

Three queues. Iterations pick from the **Polish queue** only unless explicitly told otherwise. Structural items need product judgment, new dependencies, or schema changes — Drew + live-session work only. Drew actions are blocked on a non-code operation from Drew.

**Vision anchor:** PathForge serves someone sitting there with AI tools, time, and no clear idea what to build. Every polish item should make the "I can build this tonight" moment clearer, the build process feel alive, and the fork/remix affordance obvious. *Sitting next to someone building it*, not reading a case study.

Pick the top item in your queue, ship it, move it to the Done table with one line.

---

## Polish queue — routine-safe, frontend-design focus

Small, well-scoped, visible improvements. A human landing on the site should notice.

1. **Detail page meta row polish.** Model used + tools used + votes + author + date — tighten the hierarchy. Right now it's a salad; make it feel like a clean artifact header.
2. **Landing page "why PathForge" moment.** Does the landing copy speak to the visitor-with-tokens-and-no-idea? If it reads as generic "share your prompts" → rewrite one section to speak to the real use case.
3. **CodeBlock header consistency.** The dark header bar from iter 31 — confirm the dot + label + meta + copy button all behave identically across prompt (orange) and result (blue) on mobile widths. Polish any asymmetry.
4. **PromptCard long-title truncation.** Confirm titles longer than 2 lines clamp cleanly with ellipsis across Featured + regular card variants.
5. **Focus-ring consistency audit.** Tab through Browse + Build + detail. Note any interactive element with missing, wrong-color, or inconsistent focus ring. Fix in one pass.
6. **Typography scale pass on the detail page.** H1 title, H2 section headers, step labels, body, metadata — are the sizes + weights + tracking consistent? Tighten any outliers.

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
| 2026-04-17 | Iter 35 — Fork/remix affordance: dark CTA strip in the detail-page header with GitFork icon + "Use as starting point" orange button linking to `/prompt/new`; copy is explicit ("auto-prefill coming soon") so the placeholder doesn't mislead until Structural #5 wires real prefill. |
| 2026-04-17 | Iter 34 — Detail page "feeds into next step" chip: between consecutive steps (when the prior step had a result) a small mono chip reads "step N result → step N+1 prompt," sitting on the spine between cards so the flow reads like watching the build. |
| 2026-04-17 | Iter 33 — Browse empty state rebuilt as an invite: "No matches" notice + Clear filters, plus "Try a category" (6 shortcut pills) and "Popular right now" (top 3 PromptCards). Suggestions fetched only on the empty path. |
| 2026-04-17 | Repo cleanup — pruned 449 Cowork ghost files + 1.3 GB on-disk junk, tightened `.gitignore`, fixed stale `.git/*.lock` files; SKILL.md gained a visual-verify gate via Chrome MCP; "Drew only pushes" rule dropped (Claude Code pushes itself). |
| 2026-04-16 | Iter 32 — Build page gets a live preview rail: two-pane layout on `lg+`, sticky BuilderPreview mirrors the Browse PromptCard, page gains H1 hero. |
