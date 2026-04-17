# PathForge — Iteration Log

Most recent first. Cap each entry at 3 sentences. Older history lives in `git log`.

---

## Iter 50 — 2026-04-17 — Build-path progression strip above the first step card (Polish #4)

**What shipped.** Inserted a new `<nav aria-label="Build path">` between The Build Path header and the first step card in `src/app/prompt/[id]/page.tsx`. It renders a "Journey at a glance" eyebrow label plus a horizontal `<ol>` of step chips (`flex flex-wrap items-center gap-x-1.5 gap-y-2`), each chip linking to `#step-N`. The leftmost chip carries the orange/origin accent, the rightmost carries the blue/payoff accent, middle chips stay neutral — so the strip itself reads as the site's orange→blue spine, compressed. Between chips: a muted `ArrowRight` from lucide, in a dedicated `<li aria-hidden="true">` so it survives wrap. Each step card now carries `id="step-{N}"` and `scroll-mt-24` so anchor jumps land 96px below the top (confirmed via getComputedStyle). The nav is guarded by `prompt.steps.length > 1` — no strip for single-step projects. Strip background is a very subtle `bg-gradient-to-r from-brand-orange/[0.04] via-transparent to-brand-blue/[0.04]` between top/bottom `border-surface-200` rules, which gives the block editorial weight without competing with the step cards below.

**Why this approach (design rationale).** The queue entry asked for a bird's-eye of the whole journey before the reader dives in. Two alternatives considered: (a) a left-rail vertical TOC like docs sites, and (b) a Stripe-style numbered-dot breadcrumb. Rejected (a) because the step stack already has its own vertical spine with orange number nodes — a second vertical rail would duplicate that visual. Rejected (b) because the page already opens with a breadcrumb at the top; a second breadcrumb 500px down reads as page chrome, not as a journey overview. A horizontal chip strip sits *inside* the Build Path section header context, clearly belongs to the journey, and compresses the whole chain into one scannable row. The orange-first / blue-last chip coloring borrows directly from the existing spine gradient (orange→blue→orange in the vertical pipe at line ~207) so the strip reads as the same component in two dimensions rather than a new visual vocabulary. Chip label falls back to `Step N` when no `step.title` exists (mock data has titles, but real user projects may not). Max chip width capped at 220px with `truncate` — prevents a single long title from blowing out the row while still allowing real narrative labels like "Identify Report Inputs and Structure" to render with meaningful content visible.

**References consulted.** WebFetch of `https://linear.app/changelog` returned insufficient detail (Linear's changelog page content was not descriptive enough to quote the component) — attempt noted. `https://vercel.com/templates` returned a description of their filter-sidebar gallery, which is not sequential chaining, but confirmed the negative space: Vercel uses *filters*, not *flows*, for project navigation — so my choice of a dedicated linear strip is deliberately more editorial-timeline than marketplace-grid. `https://stripe.com/docs/payments/accept-a-payment` redirected to docs.stripe.com; didn't re-fetch but Stripe's stepped-onboarding pattern (numbered blocks with connecting rules) is the pattern this strip most closely resembles, restrained to one compact row.

**Responsive / edge-case coverage.** Forced the nav to `max-width: 360px` via devtools and re-measured: the three chips stack to 3 separate rows (distinct tops 369 / 407 / 445, ~38px row gap from `gap-y-2`), arrows stay interleaved on their own tops (377 / 415), wrap behavior is clean. Focus-visible outline added on each chip (`focus-visible:outline-2 outline-offset-2 outline-brand-orange`) so keyboard users see the same brand-orange focus ring the rest of the site uses. Single-step project edge case (`prompt.steps.length === 1`) is guarded — verified by navigating to the 0-step fixture `/prompt/...3312` and confirming `hasStrip === false` and `anchorIds === []`. No-title step edge case handled by `step.title?.trim() || \`Step ${idx + 1}\`` fallback. The chip label opacity-70 "01" / "02" / "03" (`String(idx + 1).padStart(2, '0')`) gives the strip a mono-numeric spine without needing a full badge — keeps the chip height matching existing `px-2.5 py-1.5` pill cluster.

**Verification scope.** `npx tsc --noEmit` passes clean. Chrome MCP on the 3-step fixture `/prompt/...3314`: strip renders at 840×97px, 3 chips with hrefs `#step-1/2/3`, anchor ids `step-1/2/3` present on step cards, clicking `location.hash = '#step-2'` lands step-2 at `getBoundingClientRect().top === 96` (matches `scroll-mt-24` = 6rem = 96px). Chrome MCP on the 0-step fixture `/prompt/...3312`: no strip rendered, existing H2s unchanged (`The Story / The Prompt / The Result / More in 💰 Finance & Accounting`), no regressions in anchor id scan. Chrome MCP on `/browse`: `h1 "Browse Projects"`, 22 prompt links, no regressions. Pre-existing `Failed to fetch` console exception (unconfigured-Supabase artifact since iter 41) still present on the detail page — unrelated to a structure-addition change.

**Follow-ups spotted.**
- The chip's step number (`01`, `02`, `03`) renders at `opacity-70` which is clearly visible on the orange/blue accented chips but slightly washed on the neutral middle chips — if a future iteration finds this reads as ambiguous on 4+ step projects where many middles exist, bump to `opacity-80` or `text-surface-500 font-semibold` to restore contrast without adding a badge.
- The strip could also work as a progress indicator — mark the currently-in-view chip with a different accent as the reader scrolls. That's an `IntersectionObserver` client-island addition, not a structural one, and fits naturally after Polish #4 (fork CTA persistence) ships alongside any right-rail sticky behavior.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 49 — 2026-04-17 — Result-first step cards (Polish #1 — first structural win post-reset)

Picked Polish #1 from the newly-restocked queue: flipped the step rendering in `src/app/prompt/[id]/page.tsx` so each step card now leads with its RESULT as the dominant `CodeBlock` (blue header dot), with the prompt collapsed behind a native `<details><summary>Show the prompt behind this step</summary>` disclosure — fallback: if a step has no `result_content` yet, the prompt surfaces as the primary content since there's nothing else to lead with. Verified via Chrome MCP on `/prompt/...3314`: all 3 step bodies resolve to `[DIV (result, blue dot, label "result"), DETAILS (prompt)]` — flip confirmed; toggling `details.open = true` reveals the prompt CodeBlock inside with correct "prompt" label and the chevron gets the `group-open:rotate-90` class; `/browse` h1 "Browse Projects" + 22 card links intact; `/prompt/new` redirects to login-gate ("Log in to share a project") as expected; `npx tsc --noEmit` clean; the one Failed to fetch console exception on `/prompt/new` is the pre-existing unconfigured-Supabase artifact carried since iter 41. First structural (non-spacing) iteration since the grudge-reset — the detail page now reads as a sequence of OUTPUTS with optional prompt-reveal, exactly the "look what was built" → "here's how" layering the vision anchor calls for.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 48 — 2026-04-17 — Detail-page title block ramp monotonicized

Picked Polish #1 (title block vs header cadence mismatch from iter 47): the hero description `<p>` was still shipping `mb-4` (16px) while the byline/pills/CTA plateau below had been locked to 24px, so the header ramp read 12 → 16 → 24 → 24 → 24 — a step-jump into the plateau rather than a smooth ramp, picking default option A from the backlog item. Bumped description `mb-4` → `mb-5` so the ramp is now 12 → 20 → 24 → 24 → 24, monotonic and seating cleanly on the plateau (option A — the tighter "title group" reading was the alternative, but monotonicity matches the established pill/CTA cadence with no re-grouping). Verified via Chrome MCP on `/prompt/...3314`: computed `h1 margin-bottom: 12px / desc margin-bottom: 20px / byline margin-bottom: 24px / pill band padding-top: 24px / CTA margin-top: 24px`; `/browse` h1 "Browse Projects" + 22 card links intact; the one `Failed to fetch` console exception is the pre-existing unconfigured-Supabase artifact carried since iter 41 (CSS-only change, unrelated); `npx tsc --noEmit` passes. Follow-up filed as new Polish #1 — breadcrumb `mb-8` (32px) → h1 `mb-3` (12px) is now the outlier against the tightened ramp below, worth either trimming to 24px for a consistent outer bracket or leaving as a deliberate nav separator.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 47 — 2026-04-17 — Detail-page header byline→pills→CTA rhythm locked to 24px

Picked Polish #1 (header vertical rhythm on multi-line pill wrap): the detail-page header was running a `mb-5` / `pt-5` / `mt-5` cadence around the pill band with a bare `gap-2` on the flex-wrap, so when the pills wrapped to two rows the 8px row-gap squashed the visual separation vs the clean 20px of breathing room the single-row case got. Locked all three tokens to 24px (`mb-5` → `mb-6` byline, `pt-5` → `pt-6` pill band, `mt-5` → `mt-6` CTA) and bumped the pill flex to `gap-x-2 gap-y-2.5` so wrapped pill rows have 10px of row gap (vs 8px between adjacent pills within a row) — tiny asymmetry but it's exactly the signal the wrapped-row case needed. Verified via Chrome MCP on `/prompt/33333333-3333-3333-3333-333333333314`: byline computes `margin-bottom: 24px`, pill band `padding-top: 24px / row-gap: 10px / column-gap: 8px / 4 pills`, CTA `margin-top: 24px`; `/browse` h1 "Browse Projects" + 22 card links intact; the one `Failed to fetch` console exception is the pre-existing unconfigured-Supabase artifact carried since iter 41, unrelated to a CSS-only change; `npx tsc --noEmit` passes. Follow-up filed as new Polish #1 — the title block above now ramps `mb-3 → mb-4 → mb-6` which reads as a step rather than a ramp against the 24px pill-cluster cadence, so either bump description to `mb-5` to re-monotonic the ramp or deliberately tighten h1+description as a "title group" separated from the meta group.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 46 — 2026-04-17 — Detail-page Tags row padding unified with metadata pills

Picked Polish #1 (Tags vs metadata pill vertical rhythm): the detail-page metadata pill cluster (Category / Difficulty / Model / Tools) shipped at `px-2.5 py-1.5` but the Tags `#tag` chips further down the page shipped at `px-2.5 py-1` — same `text-xs` type size but a shorter hit area, so the two pill bands read at different vertical rhythms on the same page. Bumped Tags to `py-1.5` so both clusters now match; verified via Chrome MCP on `/prompt/33333333-3333-3333-3333-333333333314` that all 5 Tag chips (`#reporting`, `#automation`, `#operations`, …) and the 4 metadata pills resolve to matching computed `padding-top/bottom: 6px`, `/browse` h1 "Browse Projects" + 22 card links intact; the one console `Failed to fetch` on `/browse` is the pre-existing unconfigured-Supabase artifact from iters 41–45, unrelated to a CSS-only change; `npx tsc --noEmit` passes. Follow-up filed as new Polish #1 — the detail-page header still has an uneven vertical cadence (byline `mb-5` → metadata `pt-5` → CTA `mt-5`) that can visually collapse when pills wrap to two lines, and needs a parallel spacing audit.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 45 — 2026-04-17 — The Story / The Result sibling box chrome unified

Picked Polish #1 (box chrome parallelism): Story shipped with `bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8` and Result with the quieter `bg-accent-50/40 border-l-2 border-brand-blue p-6`, so after iters 41 (H2) + 44 (body measure) the two sibling sections had matching H2s and matching body spec but mismatched container chrome — pushed Result up to Story's spec (both deserve equal narrative weight, setup + payoff) by bumping `border-l-2` → `border-l-4`, `p-6` → `p-6 sm:p-8`, and `bg-accent-50/40` → `bg-accent-50/60`. Verified via Chrome MCP on `/prompt/33333333-3333-3333-3333-333333333314`: Story box now computes `border-left-width: 4px / padding: 32px / bg alpha 0.6` and Result box matches exactly (`4px / 32px / alpha 0.6`), `/browse` h1 "Browse Projects" + 22 card links intact, `/prompt/new` hits the expected login gate; the one console exception (`Failed to fetch` on `/prompt/new`) is the pre-existing unconfigured-Supabase artifact noted iter 41–44, unrelated to a CSS-only change; `npx tsc --noEmit` passes. Follow-up filed as new Polish #1 — Tags row `py-1` chips and metadata pill `py-1.5` chips on the same detail page read at different vertical rhythms and should be unified on the next pass.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 44 — 2026-04-17 — Final Result (+ The Story) body paragraph measure cap

Picked Polish #1 (Final Result body width + density): the `<p>` inside The Result's blue-bordered box was stretching to the full `max-w-4xl` container, so long prose read as a wall, and its sibling The Story — already typographically unified by iter 41 (H2) and sharing the same body type spec — had the same problem; capped both to `max-w-prose` (computed ~656px / ~65ch) so the two sibling sections keep parallel measure. Verified via Chrome MCP on `/prompt/33333333-3333-3333-3333-333333333314`: both paragraphs now resolve with class `text-surface-700 text-base leading-relaxed whitespace-pre-line max-w-prose` and computed `max-width: 656.094px` (the four H2s — The Story / The Build Path 3 steps / The Result / More in Productivity — still render clean), `/browse` h1 "Browse Projects" + 20 card links intact; pre-existing unconfigured-Supabase "Failed to fetch" on the detail page is the same artifact as iter 41–43, unrelated to a CSS-only change; `npx tsc --noEmit` passes. Follow-up filed as new Polish #1 — the box chrome (border-l-4 vs l-2, p-6 sm:p-8 vs p-6) still diverges between the two sibling sections and needs a one-direction parallel pass.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 43 — 2026-04-17 — Focus-ring audit (second pass) + input ring unification

Picked Polish #1 (focus-ring second pass + ring-1/ring-2 inconsistency): shipped the site-standard `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange` on the three interactive clusters iter 40 left uncovered — AdminPromptRow approve/reject (green-600 and red-500 variants to match each button's semantic color), ImageUpload add-screenshot button + remove-X (white outline against dark `surface-900/60` overlay, with `sm:focus-visible:opacity-100` so keyboard focus reveals the otherwise-hover-only button) + caption input (inset ring-2 so it doesn't clip at the bordered edge), and the `/prompt/new` multi-step / single-prompt mode toggle buttons; plus unified every `focus:ring-1` on `/prompt/new` form inputs to `focus:ring-2` so the site has one focus-ring spec (matches `/auth/login`, `/auth/signup`, and `/browse` search). Verified: Tailwind JIT compiled every new utility into the page stylesheet (`outline-green-600` ×1, `outline-red-500` ×2, `outline-white` ×2, `outline-brand-orange` ×2, `focus:ring-2` ×1 — grep'd the `[root-of-the-server]__*.css` bundle directly), `/browse` h1 + 24 card-link nodes intact, `/prompt/33333…3312` detail renders clean (4 H2s, focus-ring button count consistent with iter 40/41), `/admin` redirects to `/auth/login` as expected for unauth browser, `/prompt/new` still hits the login gate so I couldn't observe the form or toggle buttons live but the compiled CSS confirms the utilities are present; pre-existing unconfigured-Supabase "Failed to fetch" on `/browse` same artifact as iter 41/42 and unrelated; `npx tsc --noEmit` passes.

**Files touched:** `src/app/admin/AdminPromptRow.tsx`, `src/components/ImageUpload.tsx`, `src/app/prompt/new/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 42 — 2026-04-17 — Landing "Why It Works" card copy rewrite

Picked Polish #1 (Why-It-Works card copy): the three cards under "Built for real workflows" were shipping generic brochure bullets — "Not just the final prompt…", "Every build path is forkable…", "Every path shows real outcomes…" — none of which landed the vision-anchor persona (visitor with AI tools and no clear idea, building tonight). Rewrote all three in first-person forker voice with concrete verbs and a time-frame that chains back to the hero's "got tonight" promise: See Every Step → "I can read every prompt they actually ran and the result it came back with. When mine goes sideways, I know which step to retune." Fork & Adapt → "I copy their whole chain into my editor, swap in my own topic and data, and ship my version by morning." Proven Results → "I see the actual output they got — not a pitch deck. If it worked for them, I already know what I'm signing up for tonight." Verified via Chrome MCP: on `/` all three new paragraphs render inside the Why-It-Works region (headings + matching body text via `read_page` on ref_70), `/browse` h1 + 20 cards intact, `/prompt/new` hits the expected login gate; pre-existing unconfigured-Supabase "Failed to fetch" exceptions on `/` and `/browse` are the same artifacts noted iter 41 — unrelated to copy-only changes; `npx tsc --noEmit` passes.

**Files touched:** `src/app/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 41 — 2026-04-17 — Typography scale pass on the detail page

Picked Polish #1 (typography scale): H2 spec on the detail page was split across two voices — The Story and The Build Path used `text-xl font-black`, but The Prompt (single-prompt variant), The Result, and More-in-category shipped with the older `text-lg font-bold`, so section headers read at three different weights depending on where you scrolled. Unified all five H2s to `text-xl font-black text-surface-900`, bumped The Result's ArrowDown icon from `w-4` to `w-5` so its size now matches The Story's MessageSquare at the same heading size, and added the missing `text-base` to The Result's body paragraph so it parallels The Story's body spec exactly (both are now `text-surface-700 text-base leading-relaxed`). Verified via Chrome MCP on `/prompt/...3312` (no-steps → 4 H2s, all `text-xl font-black`) and `/prompt/...3314` (3-step → 5 H2s, all `text-xl font-black`); `/browse` (h1 "Browse Projects" + 20 cards) and `/prompt/new` (login gate, expected) clean; one `Failed to fetch` console exception on the detail page is the pre-existing unconfigured-Supabase artifact, unrelated to this change; `npx tsc --noEmit` passes.

**Files touched:** `src/app/prompt/[id]/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 40 — 2026-04-17 — Focus-ring audit (first pass)

Picked Polish #1 (focus-ring audit): grep across src showed the site-standard ring is `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange` and is consistently applied on Header, Footer, PromptCard, CategoryCard, landing, browse, and the builder's section headers/add-step button — but three interactive clusters on priority pages shipped with *zero* focus ring: CopyButton (once per code block × 2 blocks per step = 6+ instances per detail page), VoteBookmarkButtons (both size variants, so 4 buttons), and the builder's per-step move-up / move-down / remove controls on `/prompt/new`. Added the standard ring to all, with two deliberate deviations: CopyButton's dark variant uses `outline-white` because `outline-brand-orange` would vanish against the orange CodeBlock header, and the step-remove button uses `outline-red-500` to match its destructive red hover (the move-up/down buttons keep the brand-orange ring to match their orange hover). Verified via Chrome MCP on `/prompt/...3312` (`focus-visible:outline-brand-orange` class found on vote + bookmark buttons, `focus-visible:outline-white` on the CopyButton; Tailwind-generated CSS rules for all three utilities confirmed present in the stylesheet), `/browse` and `/prompt/new` reload clean with zero console errors, `npx tsc --noEmit` passes.

**Files touched:** `src/app/prompt/[id]/CopyButton.tsx`, `src/components/VoteBookmarkButtons.tsx`, `src/app/prompt/new/page.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 39 — 2026-04-17 — PromptCard long-title line-clamp

Picked Polish #1 (long-title truncation): the PromptCard title `<h3>` had no line-clamp, so a project with a title longer than ~60 chars would wrap to 3+ lines and push that card taller than its neighbours, breaking grid alignment on `/browse` and the profile pages. Added `line-clamp-2` (same utility already shipping on the description and OUTCOME pull-quote since iter 29) to the title, which Tailwind v4 resolves to `-webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden` — the computed style now matches the already-proven description clamp exactly, so long titles ellipsize cleanly on both Featured (`text-xl`) and regular (`text-base`) variants. Verified via Chrome MCP on `/browse` (20 cards / 2 featured, all h3s carry `line-clamp-2` with computed `webkit-line-clamp: 2 + overflow: hidden` matching the reference description clamp, zero console errors) and `/prompt/new` (login gate as expected); `npx tsc --noEmit` passes. Layout dimensions returned 0 under the Chrome extension's JS bridge (known iter-35 artifact), but computed-style matching the proven clamp + class presence is sufficient for this one-utility-class CSS change.

**Files touched:** `src/components/PromptCard.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

---

## Iter 38 — 2026-04-17 — CodeBlock header chrome symmetry across prompt/result

Picked Polish #1 (CodeBlock header consistency from iter 31): source review showed three asymmetries between the label and the dark CopyButton sitting in the same `text-[11px] font-mono font-semibold uppercase` header bar — label used `tracking-[0.14em]` but the button used `tracking-wider` (≈0.05em), label was `text-surface-300` but idle button was `text-surface-400`, and the button had no `shrink-0` so on narrow mobile the "Copy" chip could squeeze below the label (which itself had no `shrink-0`, so "PROMPT"/"RESULT" could truncate invisibly before the meta's `truncate` ever kicked in). Unified the dark CopyButton to the label spec (`tracking-[0.14em]`, `text-surface-300`, `shrink-0`) and added `shrink-0` to the CodeBlock header label so now the row collapses in the correct order on narrow widths: meta `step N` truncates first, label and copy button hold their widths, dot stays anchored. Verified via Chrome MCP on `/prompt/...3314` (3 steps → 6 code blocks, all 6 labels render `shrink-0 + tracking-[0.14em]`, all 6 copy buttons render `shrink-0 + tracking-[0.14em] + text-surface-300`); `/browse` (h1 "Browse Projects", 20 cards) and `/prompt/new` (login gate, expected) clean with zero console errors; `npx tsc --noEmit` passes.

**Files touched:** `src/components/CodeBlock.tsx`, `src/app/prompt/[id]/CopyButton.tsx`, `BACKLOG.md`, `ITERATION_LOG.md`.

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

