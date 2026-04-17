# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How this file works

Three queues. Iterations pick from the **Polish queue** only unless explicitly told otherwise.

**Vision anchor:** PathForge serves someone sitting there with AI tools, time, and no clear idea what to build. Every item should make "look at what was built" the dominant moment, and "here's how it was built" a secondary layer you expand when you want it. Build-log / case-study aesthetic — NOT prompt-library aesthetic.

**The grudge against padding work:** iters 43–48 shipped 2–8px spacing tweaks that no visitor would ever notice. That is officially over. If an iteration is about to commit a diff whose only change is `mb-X → mb-Y`, `py-A → py-B`, `text-base → text-lg`, or any pure-spacing / pure-type-size utility swap, the iteration fails. Pick a task below that touches the PAGE STRUCTURE — what renders first, what renders second, how components compose — not how much air is between them.

Pick the top item in your queue. Ship it. Move to Done with one line.

---

## Polish queue — VISION-ALIGNED STRUCTURAL TASKS

Restocked 2026-04-17 after 16 iterations of spacing-polish drift. These tasks change what the page IS, not how it's spaced. Ordered by impact on the "this is a build showcase, not a prompt library" shift.

1. **Case-study hero above The Story.** Right now the detail page opens with breadcrumb → title → description → byline → pills → fork CTA → `<section>The Story</section>` (text-only orange bordered box). Insert a new hero block right after the fork CTA: a prominent "Final output" visual exhibit that renders `prompt.result_content` (or the final step's `result_content` if present) at larger typographic scale, on a distinctive surface (dark panel with subtle orange→blue gradient border, or a generous editorial card) — explicitly NOT styled like `CodeBlock`. Give it real above-the-fold weight (min-height, `text-lg` or larger prose, generous padding). The Story becomes backstory UNDER the hero.

2. **Demote CodeBlock for natural-language content.** `src/components/CodeBlock.tsx` today wraps everything in a dark mono-font panel with a header dot, meta, copy button — the visual grammar of a code editor. But most PathForge step content is natural language. Add a `naturalLanguage` prop (or a new sibling `<Prose>` component). When true: render on a light editorial surface, serif-friendly body font (or at least a reading-weight sans — not monospace), still copyable (small ghost copy button top-right) but NOT in a code panel. Detect heuristically: default to `naturalLanguage=true` for step prompts/results UNLESS the content contains `\n\`\`\``, HTML tags, `{ }` braces above some density, or `;` line-ending density — the "this is literal code" signals. Apply the new variant across the detail page step renderings. Net effect: the page stops looking like a prompt library even before any structural flip.

3. **Browse PromptCard: lead with output, not process.** `src/components/PromptCard.tsx` currently puts FEATURED pill → category → title → description → OUTCOME pull-quote → step-count/flow → difficulty/model/votes. The OUTCOME block is the closest thing to "what they made" and it's buried. Restructure: the card's dominant visual block is a "what they made" panel at the top (pull `prompt.result_content` or the final step's result, render in a distinctive frame — not the card's default neutral surface). Title/metadata/category all orbit THIS, not the other way around. Step-flow chips go below the fold inside the card or disappear entirely. The card must sell the PROJECT, not the step-count structure.

4. **Persistent fork/remix CTA.** The "Use as starting point" button currently sits inside the header block (~line 162–174 of `prompt/[id]/page.tsx`) and scrolls out of view. Make it persistent: on `lg+` widths, move it into a sticky right-rail sidebar next to the main content column (use a `grid-cols-[1fr_280px]` layout wrapper around the main body). On smaller widths, render as a sticky bottom bar with backdrop blur. The visitor should be able to hit "build my own version" from any scroll depth — this is the single most important button on the site and it disappears after 400px of scroll.

5. **Purge "prompt" from step chrome vocabulary.** `CodeBlock` is invoked with `label="prompt"` and `label="result"` for step content (`prompt/[id]/page.tsx` lines 253–268). For the natural-language variant from #3, drop the label entirely or swap "prompt" for "ask" / "approach" / "brief." Similarly, the literal string "prompt" appears on the single-prompt branch at line 287 (`<h2>The Prompt</h2>`) — rename to "The Approach" or "The Ask." Reserve "prompt" ONLY for literal-code content.

6. **Narrative step headers.** Step card headers currently render `Step 1/4` in mono on a dark bar (~line 234–246). For steps with author-provided titles, promote the title to the primary label and demote `1/4` to a right-aligned counter. For step cards WITHOUT titles, generate narrative labels rule-based by position: first step = "Setting the stage", last step = "Pulling it together", middle steps = "Building on it" / "Refining" / "Pushing further". Better to have evocative generated labels than neutral `Step N/M` mono counters — the latter reads as build-system documentation.

7. **Reassess the "feeds into next step" chip and N-step chip.** Iter 34 added the `step N result → step N+1 prompt` chip between step cards. Iter 29 added a `N steps` chip on Browse cards. Both were meant to sell the narrative, but now read as process-diagram vocabulary (flowcharty, prompt-library-ish). Iteration decides per chip: if removing it makes the step flow cleaner and more editorial, drop it; if it genuinely communicates "this is a chained build," keep it but restyle away from the mono/chip aesthetic toward something more editorial (italic marginalia, typographic arrow, etc.). Document the judgment call in the iteration log.

8. **The Story: from callout to editorial.** `prompt/[id]/page.tsx:183` renders The Story in `bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8` — a classic documentation-callout pattern ("heads up, important note!"). That tone does not match the "author telling you what they built" voice. Drop the orange-bordered callout box entirely and render The Story as generous editorial prose (larger serif-friendly body, `max-w-prose`, no box). OR: treat it like a magazine intro block — pull author avatar + name inline, large drop-cap-style first character on the body text. Move from "alert box" to "opening paragraph of a feature article."

---

## Structural queue — Drew + live-session only

Items that need Drew's product calls, new deps, schema work, or non-trivial UX spec.

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Needs Storage bucket, signed-URL policy, RLS. Until this ships, no card can show a thumbnail and no step can show a screenshot of the build — which cripples the "watching someone build" vision harder than any spacing issue.
2. **Build page — finish the builder.** Drag-to-reorder steps (real grip handle) + image drop zones on step Result blocks. Pairs with #1.
3. **Browse card thumbnail slot.** Blocked on #1. Card top becomes a 16:9 image when present — the card-level "look what they made" moment.
4. **CodeBlock `showLineNumbers` wiring + code-vs-prose toggle in the builder.** Natural-language content shouldn't number; literal code should. Polish #3 handles the detection heuristic; structural work is the explicit builder-side toggle so authors can override.
5. **Fork / remix flow — actual data wiring.** Polish #6 makes the CTA persistent; the real prefill-a-new-draft-from-this-project flow needs schema thought, copy-on-fork semantics, attribution. Spec before shipping.

---

## Drew actions

Blocked on a non-code op from Drew. Not an iteration target.

1. **Run the seed SQL on live Supabase.** `supabase/seed-fix.sql` — paste into Supabase SQL Editor. Until done, the live site shows old/empty seed data and every design change is invisible on production.

---

## Done (rolling last 5)
History older than this lives in `git log`.

| Date | Change |
|------|--------|
| 2026-04-17 | Iter 50 — **Build-path progression strip** (Polish #4): new `<nav aria-label="Build path">` above the first step card renders a "Journey at a glance" horizontal chip strip — orange origin chip, blue payoff chip, neutrals between, `ArrowRight` icons connecting. Each chip is an in-page anchor (`#step-N`) to a `scroll-mt-24`-padded step card. Hidden on single-step projects. Detail page now previews the whole journey before a visitor commits to reading any step. |
| 2026-04-17 | Iter 49 — **Result-first step cards** (Polish #1): each step now leads with its RESULT (blue CodeBlock) as the dominant content; the prompt collapses behind a native `<details>` disclosure ("Show the prompt behind this step"). First structural win after the queue reset — the detail page now reads as a sequence of outputs, not a sequence of prompts. |
| 2026-04-17 | **BACKLOG restocked** — Polish queue rewritten around structural/vision-aligned tasks after 16 iterations of padding drift (iters 33–48); SKILL.md sharpened to explicitly ban pure-spacing diffs as iteration output. Next iteration will pull from the new queue. |
| 2026-04-17 | Iter 48 — Detail-page title block ramp monotonicized: description `<p>` `mb-4` → `mb-5`. (The last padding-polish iteration before the queue reset.) |
| 2026-04-17 | Iter 47 — Detail-page header byline/pills/CTA rhythm locked to uniform 24px cadence. |
