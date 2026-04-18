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

1. **Persistent fork/remix CTA.** The "Use as starting point" button currently sits inside the header block (~line 162–174 of `prompt/[id]/page.tsx`) and scrolls out of view. Make it persistent: on `lg+` widths, move it into a sticky right-rail sidebar next to the main content column (use a `grid-cols-[1fr_280px]` layout wrapper around the main body). On smaller widths, render as a sticky bottom bar with backdrop blur. The visitor should be able to hit "build my own version" from any scroll depth — this is the single most important button on the site and it disappears after 400px of scroll.

2. **Purge "prompt" from step chrome vocabulary.** Now that iter 52 shipped the `<Prose>` variant for natural-language step content, the Prose `label` prop still passes `"prompt"` / `"result"` from the detail page. Swap the prose-path label for "ask" / "approach" / "brief" (reserve "prompt" for the CodeBlock path, where it's literal code). Similarly, the literal string "prompt" appears on the single-prompt branch as `<h2>The Prompt</h2>` — rename to "The Approach" or "The Ask." Reserve "prompt" ONLY for literal-code content.

3. **Narrative step headers.** Step card headers currently render `Step 1/4` in mono on a dark bar (~line 234–246). For steps with author-provided titles, promote the title to the primary label and demote `1/4` to a right-aligned counter. For step cards WITHOUT titles, generate narrative labels rule-based by position: first step = "Setting the stage", last step = "Pulling it together", middle steps = "Building on it" / "Refining" / "Pushing further". Better to have evocative generated labels than neutral `Step N/M` mono counters — the latter reads as build-system documentation.

4. **Reassess the "feeds into next step" chip.** Iter 34 added the `step N result → step N+1 prompt` chip between step cards. Meant to sell the narrative, but reads as process-diagram vocabulary (flowcharty, prompt-library-ish). Iter 53 already removed the Browse-card "N steps" chip and step-flow number strip. Remaining call: if removing the inter-step chip on `prompt/[id]` makes the step flow cleaner and more editorial, drop it; if it genuinely communicates "this is a chained build," keep it but restyle away from the mono/chip aesthetic toward something more editorial (italic marginalia, typographic arrow, etc.). Document the judgment call in the iteration log.

---

## Structural queue — Drew + live-session only

Items that need Drew's product calls, new deps, schema work, or non-trivial UX spec.

1. **Wire image uploads to Supabase Storage.** `ImageUpload` component exists but doesn't persist. Needs Storage bucket, signed-URL policy, RLS. Until this ships, no card can show a thumbnail and no step can show a screenshot of the build — which cripples the "watching someone build" vision harder than any spacing issue.
2. **Build page — finish the builder.** Drag-to-reorder steps (real grip handle) + image drop zones on step Result blocks. Pairs with #1.
3. **Browse card thumbnail slot.** Blocked on #1. Card top becomes a 16:9 image when present — the card-level "look what they made" moment.
4. **CodeBlock `showLineNumbers` wiring + code-vs-prose toggle in the builder.** Natural-language content shouldn't number; literal code should. Iter 52 shipped the auto-detection heuristic (`src/lib/content-kind.ts`); the remaining structural work is the explicit builder-side toggle so authors can override when the heuristic guesses wrong.
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
| 2026-04-17 | Iter 54 — **The Story: callout → editorial feature body** (Polish #5): dropped the `bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8` callout box entirely and removed the `MessageSquare` header icon. Body now renders as un-framed editorial prose: quiet mono eyebrow (`The story · why they built it`, matching iter-51 Final-output hero vocabulary), paragraphs split on `\n\n`, first paragraph carries a `first-letter:text-[3.5rem] sm:first-letter:text-[4rem] first-letter:font-black first-letter:text-brand-orange first-letter:float-left` drop cap, body at `text-lg sm:text-xl leading-[1.75] text-surface-800 max-w-prose` with `whitespace-pre-line` preserving author's intra-paragraph breaks. The detail page no longer stacks two orange-bordered "important!" surfaces — the Final Output hero is the dominant exhibit, The Story reads as its author-voiced feature body underneath. |
| 2026-04-17 | Iter 53 — **Result-first Browse card** (Polish #1): `PromptCard` restructured so the dominant visual block is a "what got built" hero panel at the top — hairline orange→neutral→blue gradient frame around a white inner surface, "Outcome · what they shipped" (or `from step N of M` when falling back to the last step's result) eyebrow and a 3-line prose preview sourced from `resolveOutcome()`. Title, description, and category metadata now live BELOW the hero as supporting scaffolding, not above it as the hook. Removed the step-number/ChevronRight chip strip and the "N steps" count chip entirely — Browse cards now sell the project, not the process diagram. `SkeletonCard` updated to match (placeholder outcome hero on top). Fallback: if no outcome payload exists the card reverts to title-led sizing so it still composes. Verified: `tsc` clean, `npm run build` clean (10/10 static pages), curl-served HTML on `/browse` (20 cards), `/` (6 cards), `/prompt/[id]` "More in category" (3–4 cards), and `/user/marcusdev` (4 cards) all render the new `from-brand-orange/55 to-brand-blue/55` gradient frame + "Outcome" eyebrow + "what they shipped" meta. Chrome MCP tab group errored on "Grouping is not supported by tabs in this window" — build-only verify path per SKILL.md. |
| 2026-04-17 | Iter 52 — **Demote CodeBlock for natural-language step content** (Polish #1): new `<Prose>` sibling component (`src/components/Prose.tsx`) renders step payloads on a light white card with a hairline border, a quiet eyebrow (accent dot + small-caps label + meta), a reading-weight sans body at `text-[15px] leading-[1.7]` with `whitespace-pre-line`, and a ghost `CopyButton` (new third variant) that fades in on hover/focus. A new heuristic classifier (`src/lib/content-kind.ts`) picks `code` vs `prose` per payload (detects fenced code, HTML tags, dense semicolons, JSON braces, dense indentation) — defaults to prose for step content. Detail-page step prompts, step results, and single-prompt branch now go through a `<StepContent>` dispatcher that selects `<Prose>` or `<CodeBlock>` automatically. Net: the page stops looking like a code editor and reads as an editorial build-log. 14/14 mock-data step payloads classify as prose (verified via inline node sanity test); CodeBlock stays the fallback for the literal-code edge cases. |
| 2026-04-17 | Iter 51 — **Case-study hero above The Story** (Polish #1): new `<section aria-labelledby="final-output-eyebrow">` between the fork CTA and The Story renders the final output as an editorial hero — hairline orange→neutral→blue gradient border around a generous `min-h-[220px]` white card, `text-xl` reading-prose body (NOT a `CodeBlock`), "Final output · what they shipped" eyebrow (or `from step N of M` meta when it falls back to the last step's result). Legacy bottom "The Result" section deleted to stop double-rendering the same payload. Detail page now opens with "look what was built" above the fold — The Story is explicitly backstory under it. |
| 2026-04-17 | Iter 50 — **Build-path progression strip** (Polish #4): new `<nav aria-label="Build path">` above the first step card renders a "Journey at a glance" horizontal chip strip — orange origin chip, blue payoff chip, neutrals between, `ArrowRight` icons connecting. Each chip is an in-page anchor (`#step-N`) to a `scroll-mt-24`-padded step card. Hidden on single-step projects. Detail page now previews the whole journey before a visitor commits to reading any step. |
