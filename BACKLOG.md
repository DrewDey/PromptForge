# PathForge — Backlog

Live: https://prompt-forge-sandy.vercel.app

## How this file works

Four queues. **Content queue is top priority** — iterations pull from it first. Polish queue is second. Structural + Drew actions are off-limits to unattended iterations.

**Vision anchor:** PathForge serves someone sitting there with AI tools, time, and no clear idea what to build. Every item should make "look at what was built" the dominant moment, and "here's how it was built" a secondary layer you expand when you want it. Build-log / case-study aesthetic — NOT prompt-library aesthetic.

**The grudge against padding work:** iters 43–48 shipped 2–8px spacing tweaks that no visitor would ever notice. That is officially over. If an iteration is about to commit a diff whose only change is `mb-X → mb-Y`, `py-A → py-B`, `text-base → text-lg`, or any pure-spacing / pure-type-size utility swap, the iteration fails. Pick a task that touches PAGE STRUCTURE (Polish) or generates REAL CONTENT (Content) — not how much air is between things.

Pick the top item in your queue. Ship it. Move to Done with one line.

---

## Content queue — REAL Claude-generated prompt chains (APPROVED, ACTIVE)

**Target:** 50 total projects in `supabase/seed-content-chains.sql`. **Currently at 1** (project `55...5550001`, Freelancer Tax Estimator, Jake Torres, Finance, 3 steps — Drew approved this on 2026-04-17 as the quality bar). Iterations append 2–3 more per firing until 50.

### Quality bar — review project 0001 before starting

Read `supabase/seed-content-chains.sql` end-to-end before drafting anything. You must match or beat it. Specifically:

- **Prompts are verbose and contextual.** 80+ words. First-person voice. Explains what they're building, what constraints they have, their prior context, and specifies exactly what they want in the output. Reads like a real person who sat down to type a real ask, not a one-liner.
- **Responses are substantive real artifacts.** 300–600 words per step result. Actual working code / real drafts / real calculations — NOT summaries of what an AI would produce. Annotate code with inline comments. Sanity-check math where applicable ("for $92k: federal ≈ $10,424, verify: 10% × 11,925 = ..."). Flag edge cases a CPA / engineer / writer / designer would actually appreciate.
- **Chain coherence.** Step N+1's prompt references step N's output. Natural transitions ("Nice, that matches my mental math. Now add…", "Great. Last piece…", "Good catch on the ordering — here's why…"). A reader should follow the build without extra context.
- **Real Claude voice.** Substantive, occasionally opinionated, doesn't hedge with "it depends." Mentions gotchas. Reads the way Claude actually responds when asked to do real work.

### Constraints

- **Varied chain lengths:** mix of 2-step, 3-step, 4-step, 5-step, up to 8-step. Don't ship a streak of same-length chains.
- **Varied categories:** rotate through all 10 before repeating. Finance (3 ids: `...11101`), Marketing (`...11102`), Writing (`...11103`), Coding (`...11104`), Design (`...11105`), Education (`...11106`), Productivity (`...11107`), Data (`...11108`), Strategy (`...11109`), Personal (`...11110`). Aim for ~5 projects per category at 50.
- **Match author to category fit:** `jakefinance` (Finance), `sarahgrows` (Marketing), `emwriter` (Writing), `marcusdev` or `cto_derek` (Coding), `priya_creates` (Design), `teacherben` (Education), `ops_nina` (Productivity), `dataraj` (Data), `cto_derek` or `lena_solopreneur` (Strategy), `lena_solopreneur` (Personal). Profile IDs in `supabase/seed-fix.sql` at `22222222-2222-2222-2222-22222222XXXX`.
- **Varied Claude models:** rotate `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. Sonnet for straightforward, Opus for heavier thinking. `model_recommendation` string should be the human-readable version ("Claude 4.6 Sonnet", "Claude 4.6 Opus", "Claude 4.7 Opus").
- **UUID sequence:** continue from `55555555-5555-5555-5555-555555550001`. Next project is `...550002`, then `...550003`, etc. Steps use `66666666-6666-6666-6666-6666666XYSS` where X is the 2-digit project counter hex and SS is step 01+ (e.g. project 0002 step 1 = `66666666-6666-6666-6666-666666620101`).
- **Realistic engagement counts:** `vote_count` 15–120, `bookmark_count` 5–60. Vary — don't make every project a hit.
- **Tags:** 3–6 real tags per project. Don't pad with generic ones.
- **Screenshot slots:** leave empty. Drew fills them once Structural #1 (image upload) lands.

### Iteration work shape

1. Read `supabase/seed-content-chains.sql` to see what's already there and what categories are covered.
2. Pick 2–3 project ideas in categories that haven't been hit yet (or are under-represented). Pick varied chain lengths.
3. For each project: draft the story / result_content at the prompt level; then generate each step's verbose prompt and real response. Don't cheat — actually generate the response as if you were Claude being asked the question cold.
4. Append the new projects to `supabase/seed-content-chains.sql` ABOVE the `END OF FILE` marker comment. Do not modify existing projects.
5. `npx tsc --noEmit` to make sure nothing downstream broke (should be no-op for SQL-only changes).
6. Commit + push.
7. Log entry in ITERATION_LOG.md notes which project IDs + categories + chain lengths landed, plus a brief note on quality choices (why this topic, what's strong about the chain).

### What NOT to do

- **No placeholder content** (`[RESULT HERE]`, `{TODO: fill in}`, etc). Every response must be real.
- **No fake-looking numbers.** 2026 tax brackets must be plausible. A marketing email's company/product names must sound real, not "Acme Widget Corp."
- **No modifying project 0001** or any prior iteration's projects. Append-only.
- **No short, terse prompts.** "Build a blog post" is too thin. Prompts should sound like a human with context wrote them.
- **No generic filler responses.** If you can't generate a real artifact for a prompt, rewrite the prompt until you can.

### Done when

`supabase/seed-content-chains.sql` contains 50 unique projects across 10 categories with varied chain lengths. Drew repastes the file into Supabase to see them live.

---

## Polish queue — VISION-ALIGNED STRUCTURAL TASKS

Restocked 2026-04-17 after 16 iterations of spacing-polish drift. These tasks change what the page IS, not how it's spaced. Ordered by impact on the "this is a build showcase, not a prompt library" shift.

1. **Purge "prompt" from step chrome vocabulary.** Now that iter 52 shipped the `<Prose>` variant for natural-language step content, the Prose `label` prop still passes `"prompt"` / `"result"` from the detail page. Swap the prose-path label for "ask" / "approach" / "brief" (reserve "prompt" for the CodeBlock path, where it's literal code). Similarly, the literal string "prompt" appears on the single-prompt branch as `<h2>The Prompt</h2>` — rename to "The Approach" or "The Ask." Reserve "prompt" ONLY for literal-code content.

2. **Reassess the "feeds into next step" chip.** Iter 34 added the `step N result → step N+1 prompt` chip between step cards. Meant to sell the narrative, but reads as process-diagram vocabulary (flowcharty, prompt-library-ish). Iter 53 already removed the Browse-card "N steps" chip and step-flow number strip. Remaining call: if removing the inter-step chip on `prompt/[id]` makes the step flow cleaner and more editorial, drop it; if it genuinely communicates "this is a chained build," keep it but restyle away from the mono/chip aesthetic toward something more editorial (italic marginalia, typographic arrow, etc.). Document the judgment call in the iteration log.

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
| 2026-04-17 | Iter 55 — **Persistent fork/remix CTA + narrative step headers** (Polish #1 & #2): detail page restructured as a 2-column grid on `lg+` (`max-w-[1216px]` outer, `grid-cols-[minmax(0,1fr)_288px]` with `gap-10`). Old inline "Use as starting point" CTA removed from the header. Right-rail `<aside class="hidden lg:block">` renders a sticky (`sticky top-16`) project-action card — dark eyebrow strip ("Your turn · Inspired? Build your own version."), full-width brand-orange "Use as starting point" button, and a quiet 3-row mono meta list (Difficulty dot + label, Chain step-count, Model name with `truncate`). Below `lg`, rail hidden; CTA mirrors into a fixed bottom-bar `<nav aria-label="Project actions">` with `backdrop-blur-md bg-surface-900/92` + "Use this" CTA — main column carries `pb-28 lg:pb-0` so tags/related aren't covered. Also shipped Polish #2: step header bars now promote `step.title` (or a narrative `narrativeStepLabel(idx, total)` fallback — "Setting the stage" / "Building on it" / "Refining" / "Pushing further" / "Pulling it together") to a `font-bold text-[15px] text-white truncate` h3 with an orange accent dot, and demote the counter to a quiet right-aligned `font-mono tabular-nums` `01/04`-style badge — no more neutral "Step N/M" mono eyebrow as the primary label. |
| 2026-04-17 | Iter 54 — **The Story: callout → editorial feature body** (Polish #5): dropped the `bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8` callout box entirely and removed the `MessageSquare` header icon. Body now renders as un-framed editorial prose: quiet mono eyebrow (`The story · why they built it`, matching iter-51 Final-output hero vocabulary), paragraphs split on `\n\n`, first paragraph carries a `first-letter:text-[3.5rem] sm:first-letter:text-[4rem] first-letter:font-black first-letter:text-brand-orange first-letter:float-left` drop cap, body at `text-lg sm:text-xl leading-[1.75] text-surface-800 max-w-prose` with `whitespace-pre-line` preserving author's intra-paragraph breaks. The detail page no longer stacks two orange-bordered "important!" surfaces — the Final Output hero is the dominant exhibit, The Story reads as its author-voiced feature body underneath. |
| 2026-04-17 | Iter 53 — **Result-first Browse card** (Polish #1): `PromptCard` restructured so the dominant visual block is a "what got built" hero panel at the top — hairline orange→neutral→blue gradient frame around a white inner surface, "Outcome · what they shipped" (or `from step N of M` when falling back to the last step's result) eyebrow and a 3-line prose preview sourced from `resolveOutcome()`. Title, description, and category metadata now live BELOW the hero as supporting scaffolding, not above it as the hook. Removed the step-number/ChevronRight chip strip and the "N steps" count chip entirely — Browse cards now sell the project, not the process diagram. `SkeletonCard` updated to match (placeholder outcome hero on top). Fallback: if no outcome payload exists the card reverts to title-led sizing so it still composes. Verified: `tsc` clean, `npm run build` clean (10/10 static pages), curl-served HTML on `/browse` (20 cards), `/` (6 cards), `/prompt/[id]` "More in category" (3–4 cards), and `/user/marcusdev` (4 cards) all render the new `from-brand-orange/55 to-brand-blue/55` gradient frame + "Outcome" eyebrow + "what they shipped" meta. Chrome MCP tab group errored on "Grouping is not supported by tabs in this window" — build-only verify path per SKILL.md. |
| 2026-04-17 | Iter 52 — **Demote CodeBlock for natural-language step content** (Polish #1): new `<Prose>` sibling component (`src/components/Prose.tsx`) renders step payloads on a light white card with a hairline border, a quiet eyebrow (accent dot + small-caps label + meta), a reading-weight sans body at `text-[15px] leading-[1.7]` with `whitespace-pre-line`, and a ghost `CopyButton` (new third variant) that fades in on hover/focus. A new heuristic classifier (`src/lib/content-kind.ts`) picks `code` vs `prose` per payload (detects fenced code, HTML tags, dense semicolons, JSON braces, dense indentation) — defaults to prose for step content. Detail-page step prompts, step results, and single-prompt branch now go through a `<StepContent>` dispatcher that selects `<Prose>` or `<CodeBlock>` automatically. Net: the page stops looking like a code editor and reads as an editorial build-log. 14/14 mock-data step payloads classify as prose (verified via inline node sanity test); CodeBlock stays the fallback for the literal-code edge cases. |
| 2026-04-17 | Iter 51 — **Case-study hero above The Story** (Polish #1): new `<section aria-labelledby="final-output-eyebrow">` between the fork CTA and The Story renders the final output as an editorial hero — hairline orange→neutral→blue gradient border around a generous `min-h-[220px]` white card, `text-xl` reading-prose body (NOT a `CodeBlock`), "Final output · what they shipped" eyebrow (or `from step N of M` meta when it falls back to the last step's result). Legacy bottom "The Result" section deleted to stop double-rendering the same payload. Detail page now opens with "look what was built" above the fold — The Story is explicitly backstory under it. |
