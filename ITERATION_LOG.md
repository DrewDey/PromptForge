# PathForge — Iteration Log

> Each hourly iteration adds an entry here. Most recent at the top.
> This is how the next iteration knows what just happened.

---

## 2026-04-16 — Iteration 23: Landing Problem-Card Hierarchy + Auth Page Design System Consistency

**Audit findings** (top problems identified across two parallel audit areas):

*Area A — Button hierarchy inconsistency across pages:*
1. Auth submit buttons diverge from landing primary spec: `font-medium` vs landing's `font-bold`, `duration-200` vs site-standard `duration-150`, missing `focus-visible` ring, missing `min-h-11` touch target.
2. Auth pages (login/signup) still use raw `gray-*` Tailwind tokens (~15 instances: `bg-gray-50`, `text-gray-900`, `text-gray-700`, `text-gray-500`, `text-gray-400`, `border-gray-300`, `placeholder-gray-400`) — the site had otherwise migrated to `surface-*` tokens. Last holdout.
3. Secondary buttons/links have fragmented padding/font-weight specs across pages (addressed partially, wider cleanup deferred).

*Area B — Landing problem cards have zero visual hierarchy:*
1. All four problem cards rendered pixel-identical (same `bg-white border border-surface-200 p-6`, same `font-bold text-sm` titles, same `text-sm text-surface-500` body, same `w-1.5 h-1.5 bg-brand-orange` dot).
2. "Blank Chat Tax" is semantically the root insight (the other three are consequences/symptoms) but the design treats them as co-equal — no size, typography, icon, or color signal.
3. Iteration 22 explicitly scoped this out as "candidate for next round."

**Research insights** (Linear, Vercel, Geist UI, Stripe, Apple, GitHub Primer):
- **Typography-only hierarchy** (Apple product pages): one dominant headline at +3–4 type steps larger with bolder weight; no color shift needed. Fits light-theme minimalism.
- **Accent line on primary card only** (Stripe, Notion): 2–4px left border in accent color on the one card that matters. Works at equal or unequal sizes.
- **Consistent primary button spec** (Geist UI, Stripe): single color fill, same font-weight everywhere, opacity-based disabled state, sharp corners. No per-page variants — one primary, one secondary, one destructive. Tight system.
- **"Size asymmetry" + "symmetric supporting cards"** (Netflix thumbnail research, modern SaaS): one dominant card followed by 3 equal-weight supporting cards creates instant Z-scan clarity.

**Design brief** (3 primary goals):
1. Promote "Blank Chat Tax" to a dominant primary card: full-width, left accent bar (`border-l-4 border-l-brand-orange`), larger typography (`text-xl sm:text-2xl font-black` title, `text-base` body), "The root problem" eyebrow. Three sibling cards demoted to a 3-col grid below with smaller padding (`p-5`), subordinate `surface-400` dot icons, and unchanged `text-sm` type.
2. Migrate all `gray-*` tokens in `src/app/auth/login/page.tsx` + `src/app/auth/signup/page.tsx` to `surface-*` equivalents. Normalize `duration-200` → `duration-150`. Zero `gray-*` classes should remain after.
3. Align auth submit buttons to the landing primary button spec: `font-bold`, `duration-150`, `focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2`, `min-h-11`. Keep the full-width layout (auth is form-embedded, not a hero CTA).

**What was implemented**:

*Landing page (`src/app/page.tsx`):*
- Restructured `THE PROBLEM` section from `grid-cols-1 md:grid-cols-2 gap-4` (2x2 peer layout) to `space-y-4` wrapper with a primary card + nested 3-col grid underneath.
- **Primary card** ("Blank Chat Tax"): `bg-white border border-surface-200 border-l-4 border-l-brand-orange p-6 sm:p-8` with eyebrow (`text-xs font-bold uppercase tracking-widest text-brand-orange`), `font-black text-xl sm:text-2xl text-surface-900` title, `text-base text-surface-600` body, `max-w-2xl` body constraint for readability, kept hover shadow.
- **Supporting row** (Hidden Craftsmanship / Weak Reproducibility / Lost Branches): `grid-cols-1 md:grid-cols-3 gap-4` with `p-5` (was `p-6`), `w-1.5 h-1.5 bg-surface-400` dots (was `bg-brand-orange`) with `aria-hidden="true"`, unchanged text-sm typography.
- File-header comment refreshed to describe iteration 23 changes; iteration 22 history compressed to one line to keep header scannable.

*Login page (`src/app/auth/login/page.tsx`):*
- `bg-gray-50` → `bg-surface-50` (page container)
- `text-gray-900` → `text-surface-900` (h1 "Welcome back")
- `text-gray-500` → `text-surface-500` (subtitle, signup-link caption)
- `text-gray-700` → `text-surface-700` (input labels)
- `border-gray-300` → `border-surface-300` (input borders)
- `text-gray-900 placeholder-gray-400` → `text-surface-900 placeholder-surface-400`
- All `transition-colors duration-200` → `duration-150`
- Submit button: `font-medium` → `font-bold`; added `focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 min-h-11`
- Signup-link font-weight: `font-medium` → `font-semibold` (harmonization — flagged by reviewer as scope-adjacent but accepted)

*Signup page (`src/app/auth/signup/page.tsx`):*
- Same token migration as login (covers 3 inputs: username, email, password + success-state panel + "check your email" heading).
- Password-strength helper: `border-gray-300` → `border-surface-300`, `text-gray-400` → `text-surface-400`, durations normalized.
- Submit button: same primary-spec alignment as login.
- Login-link font-weight: `font-medium` → `font-semibold`.

**Review outcome**: Approve with nits. Reviewer confirmed:
- Zero `gray-*` classes remain in `src/app/auth/` (verified via grep).
- Zero `duration-200` stragglers in `src/app/auth/`.
- "Blank Chat Tax" genuinely dominant (border-l accent, eyebrow, font-black text-2xl).
- Supporting dots correctly demoted with `aria-hidden="true"`.
- Mobile degrades cleanly (`p-6 sm:p-8`, `grid-cols-1 md:grid-cols-3`).
- Button parity between auth and landing verified token-by-token.

*Nits addressed:*
- **Nit #3 (fixed)**: Primary card eyebrow was `text-[10px]` — inconsistent with other page eyebrows at `text-xs`. Unified to `text-xs`.

*Nits acknowledged (not fixed):*
- **Nit #1**: Auth link font-weight bump (`font-medium` → `font-semibold`) was a scope-adjacent harmonization not explicitly in the brief. Called out here so Drew is aware.
- **Nit #2**: Primary card eyebrow + title are read as two separate blocks by screen readers. Valid markup, could be tightened with `aria-describedby`. Low priority.
- **Nit #4**: Primary card inherits same hover shadow as small cards; reads proportionally lighter on a larger footprint. Intentional consistency over proportionality.
- **Nit #5**: Primary card body has `max-w-2xl` — left-aligned with empty right space is deliberate readability choice.

**Verification:**
- `npx tsc --noEmit` — clean, zero errors (this is the reliable signal since Vercel builds from clean state)
- `npm run build` blocked by known `.next` cache `.fuse_hidden*` permission issue (documented sandbox limitation per ITERATION_GUIDE)
- `next lint` and `eslint` both blocked by known v9 migration issue (pre-existing, not this iteration's problem)
- After-screenshot deferred: sandbox localhost not reachable from Drew's Chrome MCP (same fallback as iteration 22)

**What's next:**
- Problem-card visual hierarchy is now addressed. Remaining backlog #7 work: a site-wide Button component to finish the button-system consistency story (currently each page inlines its own variants).
- Browse page image-thumbnail question (Q10) still open — blocker for that work.
- Seed content SQL rewrite (BACKLOG #6) remains the biggest unaddressed item.
- Admin action buttons (`AdminPromptRow.tsx`) have their own ad-hoc palette — flagged by audit but not addressed this iteration.

---

## 2026-04-16 — Iteration 22: Landing Page — Screenshot-Driven Overhaul (Kill Pipes, Kill Green, Migrate Palette) + New Screenshot Requirement

**Process change (Drew's direction, mid-session):**
Drew asked: "Would you be able to add two instructions to take screenshots of everything that you're touching? I feel like if you visually see it, some things might come to mind on improvements we can do that may not be so clear and evident." — I adopted this for this iteration and permanently enshrined it:
- `ITERATION_GUIDE.md` Step 2: visual capture via Claude-in-Chrome MCP BEFORE audit; written observations required; Chrome-MCP-unavailable fallback documented.
- `ITERATION_GUIDE.md` Step 6: after-screenshots + before/after compare; fallback documented.
- `SKILL.md` got the same edits as a new "Step 1.5" (visual capture) and a Step 6 verification add.
- `MEMORY.md` got a new `feedback_screenshot_visual_audit.md` entry so future sessions don't forget.

**Visual audit findings** (from actually looking at https://prompt-forge-sandy.vercel.app via Chrome MCP):
1. Five decorative "pulsing pipe" connectors between sections read as keynote-slide chrome, not premium dev-tool transitions
2. Green color leak in two places: flow diagram "Done/Result" box (`green-400/green-50/green-600`) + "Proven Results" card (`green-500/green-50`) — green isn't in the brand palette, reads as accidental
3. Whole page still on raw Tailwind `gray-*` / `bg-white` while the rest of the site migrated to `surface-*` — the landing was the last holdout
4. H1 weight imbalance: "Build it yourself." gradient overwhelmed "See how it was built." — second line screaming, first line plain
5. Hero over-structured: chip + line1 + gradient-line2 + subtitle + sub-subtitle + CTA + secondary link = 7 stacked elements; Linear/Vercel use 3
6. Four problem cards visually identical — no visual priority between "Blank Chat Tax" and "Lost Branches"
7. Tagline chip above H1 ("Community-Driven AI Project Sharing") is a 2022 startup pattern, gone from Linear/Vercel/Raycast/Resend in 2025
8. Flow diagram 5-box-with-connectors reads as PowerPoint; premium dev tools don't do this

**Research insights** (Linear, Vercel, Raycast, Resend, Supabase):
- Chip-above-H1 is dead in 2025 — all five sites dropped it
- Section breaks via whitespace + typography + optional bg shift, NEVER decorative SVG dividers
- Feature cards in rows should have equal visual weight — no "this one is special" emphasis
- No horizontal step/flow diagrams on homepages — show the product, not an abstract workflow
- Vercel pattern: H1 + ONE supporting paragraph, no tagline chip, no sub-subtitle

**Design brief** (3 primary goals):
1. Remove all 5 between-section pipe connectors; let whitespace + typography + alternating bg (`#fafafa` ↔ `white`) carry the transitions
2. Kill green everywhere: flow diagram "Result" becomes brand-orange (closing the loop with "Build Path"), "Proven Results" card becomes brand-orange
3. Migrate `gray-*` → `surface-*` for text/borders; keep cards bg-white for contrast against `#fafafa` body (per CLAUDE.md design decision)

**Supporting fixes:** kill tagline chip, solid orange instead of gradient H1, consolidate hero subtitle to one paragraph, standardize section padding to `py-20`, `min-h-11` (44px) on all secondary CTAs, brand-consistent "View all paths" button treatment.

**What was implemented** (`src/app/page.tsx`, full rewrite):
- Deleted all 5 between-section `<div>` pipes (Hero→Problem, Problem→Solution, Solution→Features, Features→Popular, Popular→CTA)
- Sections now alternate: Hero (grid pattern) / Problem (`#fafafa` body) / Solution (`bg-white`) / Why It Works (`#fafafa`) / Popular (`bg-white`) / Final CTA (`#fafafa`) — each separated by `border-t border-surface-200`
- Extracted `FlowConnector` helper component to keep the in-diagram connectors consistent and free of green
- Flow diagram: 5 boxes now use only orange/blue/surface (no green). "Result" box echoes "Build Path" with `bg-brand-orange/10 border-2 border-brand-orange` to close the loop
- "Why It Works" third card (`Proven Results`): `green-500` → `brand-orange`, green hover shadow → orange shadow
- Hero: removed tagline chip; H1 second line solid `text-brand-orange` (was gradient); two subtitle paragraphs consolidated to one; `py-20` symmetric padding; `min-h-11` on both CTAs
- All `text-gray-*` → `text-surface-*`, all `border-gray-*` → `border-surface-*`, all `bg-gray-*` → `bg-surface-*` (≈40 instances); `duration-200` → `duration-150`
- Popular Paths: `View all paths` button switched to neutral surface treatment (was tinted blue) to complement the restored card grid
- Empty state: `border-gray-300 bg-gray-50/50` → `border-surface-300 bg-surface-50`, touch target upgraded, active/focus states added
- Removed unused `ChevronRight` and `Sparkles` imports

**Review outcome**: Approved with nits after 4 flagged issues were addressed:
1. `bg-white` on cards intentionally kept (per CLAUDE.md "cards are white with subtle borders") — file-header comment updated to note this explicitly instead of overclaiming completion
2. Hero padding `pt-24 pb-20` → `py-20` symmetric (complies strictly with "standardized to py-20")
3. `ITERATION_GUIDE.md` got Chrome-MCP-unavailable fallback in both Step 2 and Step 6 (was only in SKILL.md)
4. File-header comment rewritten to accurately describe scope

**Verification:**
- `npx tsc --noEmit` — clean, zero errors
- `npm run build` blocked by known sandbox `.next` cache permission issue (Vercel builds from clean state — see `ITERATION_GUIDE.md` for this known condition)
- ESLint config has a known v9 migration issue unrelated to this change
- **After-screenshots deferred**: sandbox localhost is not reachable from Drew's Chrome MCP; per the new fallback policy, I'll screenshot the live site on the next iteration once Drew has pushed this change

**What's next:**
- Next iteration should do the "after" screenshot pass on the deployed change to confirm the fixes read well in pixels (not just code).
- Browse page still has image-thumbnail opportunity (Q10 open)
- Seed content SQL rewrite (BACKLOG #6) remains the biggest unaddressed item
- Problem-card visual hierarchy (make "Blank Chat Tax" primary) was scoped out of this iteration — candidate for next round

---

## 2026-04-16 — Iteration 21: Build Page — Surface Token Migration, Interactive Controls, Progress Bar

**Audit findings** (top problems identified):
1. Build page uses ~40 raw `gray-*` Tailwind classes instead of the design system's `surface-*` palette — visually disconnected from the rest of the redesigned site
2. Step card reorder/delete buttons have ~20px touch targets (p-1, w-3.5 icons) — well below 44px mobile minimum, with weak hover feedback (`hover:text-gray-700`)
3. Progress bar at h-1.5 with `text-xs font-medium text-gray-600` label is nearly invisible — doesn't celebrate completion or motivate the user
4. Mode toggle buttons lack `cursor-pointer` and have minimal inactive hover states (`hover:border-gray-300 hover:bg-gray-50`)
5. Add Step button's 40% opacity border blends into the background — low discoverability
6. Section headers at `text-lg` compete with step card headers at same visual weight
7. Error message spacing too tight (`mt-1`) with small icon (`w-3`)
8. ImageUpload remove button hidden on mobile (opacity-0 without touch fallback), grid not responsive

**Research insights**:
- **Linear's consistent token usage**: Every interactive surface uses the same neutral palette — no mixing of color systems. Creates a "designed" feel vs "assembled from parts"
- **Typeform's inviting interactions**: Dashed borders that solidify on hover signal "drop zone" / "add here" — makes creation feel inviting rather than mechanical
- **Vercel's micro-progress**: Clear celebration at milestones (checkmarks, color shifts) motivates completion without feeling like a checklist
- **PatternFly inline edit patterns**: Larger touch targets with hover backgrounds make controls feel robust and discoverable

**Design brief** (3 key goals):
1. Migrate ALL gray-* → surface-* throughout Build page + ImageUpload for design system consistency
2. Strengthen progress bar (h-2, bolder labels, green celebration at 100%) and step completion feedback
3. Improve interactive control sizing (p-2 touch targets) and feedback (brand-colored hovers, cursor-pointer, dashed→solid Add Step)

**What was implemented**:

*Build page (`src/app/prompt/new/page.tsx`):*
- **Complete gray-* → surface-* migration**: All ~40 gray-* classes replaced with surface-* equivalents. Labels `text-gray-700` → `text-surface-700`, inputs `border-gray-300` → `border-surface-200`, placeholders `placeholder-gray-400` → `placeholder-surface-400`, descriptions `text-gray-500` → `text-surface-500`
- **Transition normalization**: All `duration-200` → `duration-150` per design token spec
- **Section header hierarchy**: Promoted from `text-lg` to `text-xl` to clearly differentiate from step card headers. Added `hover:bg-surface-50` for better affordance
- **Progress bar upgrade**: `h-1.5` → `h-2`, label from `text-xs font-medium text-gray-600` to `text-sm font-semibold text-surface-700`, 100% celebration with green bar + "All steps complete" text
- **Reorder/delete controls**: `p-1` → `p-2` (32px+ touch targets), icons `w-3.5` → `w-4`, hover states `hover:text-gray-700` → `hover:text-brand-orange hover:bg-surface-100`, delete gets `hover:bg-red-50`, disabled state `disabled:opacity-30` → `disabled:text-surface-200 disabled:cursor-not-allowed`
- **Mode toggle**: Added explicit `cursor-pointer` to both buttons, `border-gray-200` → `border-surface-200`, text classes migrated
- **Add Step button**: `border-brand-orange/40` → `border-dashed border-brand-orange/50` idle, `hover:border-brand-orange hover:border-solid` on hover. Plus icon gets `group-hover:scale-110` micro-animation
- **Form spacing**: Inter-section `space-y-3` → `space-y-4`, step cards `space-y-3` → `space-y-4`
- **Error messages**: `mt-1` → `mt-2`, icon `w-3` → `w-3.5`, `gap-1` → `gap-1.5`
- **Success state**: Emoji replaced with green check icon in square container for cross-platform consistency

*ImageUpload (`src/components/ImageUpload.tsx`):*
- **Token migration**: All `gray-*` → `surface-*` (labels, borders, backgrounds)
- **Responsive grid**: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` for mobile
- **Remove button**: Always visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`), `bg-black/50` → `bg-surface-900/60`, slightly larger (`w-6 h-6` → `w-7 h-7`)
- **Upload button**: Added `cursor-pointer`, increased padding `py-2` → `py-2.5`

**Review outcome**: Approved with nits. One functional nit fixed: dead `group-hover` class on GitBranch icon (parent lacked `group` class — removed the orphan class). Reviewer confirmed zero gray-* classes remain, all changes trace to the brief, accessibility attributes preserved, and mobile responsiveness improved.

**What's next**: Build page still needs live preview and further polish (#2 in backlog). Browse page card thumbnails and seed content SQL rewrite remain tracked. Header refinement (#3) is also ready.

---

## 2026-04-16 — Iteration 20: Browse Page — Card Hierarchy, Spacing Rhythm, Interactive States

**Audit findings** (top problems identified):
1. Card typography hierarchy is inverted — uppercase category label (11px, semibold, tracking-wider) competes with title (15px), causing user's eye to land on metadata first instead of project name
2. Spacing rhythm is broken — filter toolbar uses `p-5` (20px) which breaks the 8px grid, card grid `gap-4` (16px) feels cramped relative to toolbar breathing room
3. Sort button active state too subtle — white bg on light gray surface barely distinguishable; no non-color indicator for active tab
4. Filter chips lack mobile tap feedback — no `active:` state for touch, X dismiss icon at 60% opacity too subtle
5. Search focus ring nearly invisible — 8% opacity orange shadow on light bg imperceptible to keyboard users
6. Empty state low contrast — white bg with light gray icon and medium gray heading doesn't command attention
7. Category filter buttons below 44px touch target on mobile

**Research insights**:
- **Vercel two-line card pattern**: Title first and prominent, description truncated to 1-2 lines, metadata compact below — keeps scanning fast across a grid
- **Linear active filter indicators**: Background color change + positional indicator (bottom border) makes active state unmistakable without relying solely on color
- **Consistent card heights** (all platforms): Enforce 2-line description truncation, uniform metadata placement — prevents "jagged row" problem
- **Product Hunt/Vercel featured distinction**: Size contrast between featured (2-col) and regular (3-col) creates natural visual hierarchy
- **Sharp active filter chips** (Linear): Clear affordance with background change, dismiss controls clearly visible at rest

**Design brief** (3 key goals):
1. Fix card hierarchy: title first → description → category/steps as secondary metadata row. Demote category from uppercase/semibold to lowercase/medium
2. Snap all spacing to 8px grid: toolbar p-5→p-6, grid gap-4→gap-6, filter buttons px-2.5 py-1.5→px-3 py-2, section margins to mb-6
3. Make all interactive states unmistakable: orange bottom-border on active sort, active:bg on filter buttons, stronger filter chip dismiss, focus:ring on search

**What was implemented**:

*PromptCard (`src/components/PromptCard.tsx`):*
- **Title-first hierarchy**: Moved `<h3>` title above description, category+steps moved below as secondary metadata row
- **Title size bump**: Regular cards from `text-[15px]` to `text-base` (16px) for clearer dominance
- **Category demotion**: Removed `uppercase tracking-wider font-semibold`, now `font-medium text-surface-500` — visually distinct from title without shouting
- **Spacing tightened**: Description margin reduced (`mb-5`→`mb-4` featured, `mb-4`→`mb-3` regular) to keep card compact with new layout order

*Browse page (`src/app/browse/page.tsx`):*
- **Spacing rhythm**: Toolbar `p-5`→`p-6` (24px), grid `gap-4`→`gap-6` (24px), section headings `mb-4`→`mb-6`, result count `mb-5`→`mb-6`, sort area `gap-3`→`gap-4`
- **Filter button sizing**: All category and difficulty buttons `px-2.5 py-1.5`→`px-3 py-2` (exceeds 44px touch target)
- **Mobile tap feedback**: Added `active:bg-surface-100` to all filter buttons and `active:bg-brand-orange/25` to active filter chips
- **Sort active indicator**: Added `border-b-2 border-b-brand-orange` on active sort tab + `border-b-2 border-b-transparent` on inactive (prevents layout shift)
- **Inactive sort text**: `text-surface-400`→`text-surface-500` for better contrast
- **Sort tab padding**: `py-1`→`py-1.5` for better touch targets
- **Search focus ring**: Replaced `focus:shadow-[0_0_0_3px_rgba(232,122,44,0.08)]` with `focus:ring-2 focus:ring-brand-orange/15` — more visible and reliable
- **Filter chip dismiss**: X icon opacity `opacity-60`→`opacity-75`, chip backgrounds `orange/8`→`orange/10`, borders `orange/15`→`orange/20`
- **Empty state**: bg-white→`bg-surface-50`, icon `surface-400`→`surface-300` (more prominent), heading `surface-700`→`surface-900`, padding `py-12`→`py-16`

**Review outcome**: Approved with nits. Reviewer confirmed all changes trace to the design brief with no drift. Nits: (1) category metadata initially set to `surface-400` — fixed back to `surface-500` for readability while keeping visual demotion through removing uppercase/tracking. (2) Search focus ring at 15% could go to 20-25% — acceptable since solid border change is primary indicator. (3) Sort tab border-b-2 handled correctly with transparent inactive state to prevent layout shift.

**What's next**: Browse page still has room for improvement (card image thumbnails, further featured card differentiation). Build page (#2) gray-*→surface-* migration is also ready. Seed content SQL (seed-fix.sql) rewrite to match mock-data.ts quality is a separate tracked item.

---

## 2026-04-16 — Iteration 19: Seed Content Overhaul — Fill All Null Result Steps

**Audit findings** (top problems identified):
1. 10 steps across 7 projects had `result_content: null` — making those steps show only the prompt with no AI response, breaking the core "build path" showcase
2. All nulls were step 2+ (later steps) — first steps always had content, creating a pattern of "abandoned" projects
3. Prompt-6 (SaaS Dashboard) had ALL 3 steps empty — the only project with zero result content, making it look completely broken on detail page
4. Null steps skip the blue result section entirely in the detail page component — users see an incomplete build path with no explanation
5. SQL seed data (seed-fix.sql) still uses old placeholder-style content with `[BUSINESS/NICHE]` brackets — fundamentally different structure from mock-data.ts

**Research insights**:
- **Concrete artifacts pattern** (Dribbble, Behance): Show actual outputs — code snippets, formatted documents, email copy — not descriptions of outputs. The best existing steps (expense tracker, review analyzer) do this well.
- **Specific context pattern** (Product Hunt, Dev.to): Reference real names, numbers, tools (QuickBooks, Airtable, "Meridian Health") to make content feel authentic rather than templated.
- **Structure as content** (GitHub repos, tutorials): Show the format/structure of results (tables, JSON, file trees) not just narrative descriptions. Makes outputs scannable and steal-worthy.
- **Practical wisdom pattern** (best existing steps): Include warnings, edge cases, and "watch out for" notes that show real-world experience, not just theory.

**Design brief** (3 key goals):
1. Fill all 10 null result_content steps with high-quality, realistic content matching the tone and detail of the best existing steps
2. Each result should include concrete artifacts (actual code, copy, documents, formulas) — not vague descriptions
3. Content should feel like a real project output with specific context (names, numbers, tools) not generic templates

**What was implemented**:

*10 steps filled in `src/lib/mock-data.ts`:*

1. **step-1c** (Brand Identity — Brand Guidelines): Full structured guidelines document with 6 sections — Brand Overview, Mission & Values, Voice do's/don'ts with examples, Visual Identity table with hex codes, Social Media guidelines, and "talking about milling" section
2. **step-6a** (SaaS Dashboard — Architecture): Complete file tree, root layout with sidebar, full Sidebar.tsx component with route-aware active states and Lucide icons
3. **step-6b** (SaaS Dashboard — Stats Cards): Full StatsCard component with sparklines and trend indicators, Dashboard page with 4 metrics using exact numbers from prompt, responsive grid layout
4. **step-6c** (SaaS Dashboard — Customer Table): Complete searchable/sortable/paginated table component with status badges, sample customer data, and state management code
5. **step-16c** (Weekly Report — Iteration): Three specific fixes to the master prompt — archived project filter, specific executive summary with before/after examples, week-over-week utilization comparison with sample table
6. **step-17b** (Meeting Notes — Edge Cases): Two-pass extraction prompt (topic segmentation → per-segment extraction), carry-over tracking with completed/still-open flags, real-world test results (found 11 items vs 7 with single pass)
7. **step-19b** (Loom SOP — Troubleshooting): All 5 FAQ scenarios with detailed step-by-step solutions, warnings, and edge case handling. Includes actual response templates for client objections.
8. **step-22b** (Zapier — Email Templates): Three complete email templates (Small/Mid/Enterprise) with appropriate tone variation, specific service tiers and pricing, social proof points, and Calendly CTAs. Note about the 12-minute send delay.
9. **step-25b** (Notion — Migration Plan): 5-phase migration plan with time estimates totaling ~6 hours, database mapping guidance, and 4 complete templates (project kickoff, meeting notes, newsletter draft, weekly review)
10. **step-33b** (Spreadsheet Audit — Apps Script): Complete 46-line Google Apps Script with clipboard copy UI, sample JSON output showing 3 example formulas, and real-world results (found 3 #REF! errors and 7 hardcoded values)

**Review outcome**: Approved with nits. Reviewer confirmed all 10 steps are non-null, content matches prompts, quality matches the best existing steps (expense tracker, review analyzer), and TypeScript compiles cleanly. Minor nits: (1) Email template word counts are at the 120-word boundary the prompt specified, (2) step-6b narrative mentions RevenueChart gradient fill but that component's code isn't shown (it's implied as a separate file). Neither blocking.

**What's next**: The SQL seed data (seed-fix.sql) still uses the old placeholder-style content and needs a complete rewrite to match mock-data.ts — this is a separate, larger task. Browse page visual improvements (#1) and Build page gray-*→surface-* migration are also ready. All projects now have complete build paths.

---

## 2026-04-16 — Iteration 18: Project Detail Page — Premium Step Flow + Build Page Multi-Open Accordion

**Audit findings** (top problems identified):
1. Prompt & Result sections visually equivalent — both use border-l-4 at same weight, breaking the input→output reading flow that is PathForge's core differentiator
2. Gray-* palette used throughout instead of surface-* design tokens — 20+ instances breaking the cooler zinc-based design system
3. Step headers invisible — text-xs text-gray-400 on bg-gray-50 background kills contrast and scannability
4. Metadata grouped into two rows with inconsistent gap-6 (not on 4/8/16/24/32 grid) creating visual imbalance
5. Mobile author row used flex-wrap without column stacking, causing orphaned vote/bookmark buttons on narrow screens
6. CopyButton used gray-* palette instead of surface-*

**Research insights**:
- **Typed content sections** (Dev.to, Medium): Separate narrative from code using distinct visual containers — dark bg for input/code, lighter for output. Maps directly to prompt→result.
- **Code-editor aesthetic** (GitHub, VS Code): Monospace text on dark backgrounds with copy buttons signals "this is technical content." Developers expect this pattern.
- **Directionality signals** (Linear changelog): Use orange for actions/inputs, blue for results/outputs — functional color rather than decorative.
- **Compact metadata bands** (Medium, Linear): Single row of chips that wraps naturally instead of multi-group layout.

**Design brief** (3 key goals):
1. Replace all gray-* with surface-* on detail page and CopyButton for design system consistency
2. Create clear input→output directionality: prompts get dark code-editor bg (surface-900) with orange border-l-4; results get light bg (accent-50) with blue border-l-2
3. Make step headers high-contrast: dark bg (surface-900) with white text instead of gray-50 with faint gray text

**What was implemented**:

*Project Detail Page (`src/app/prompt/[id]/page.tsx`):*
- **Surface palette migration**: All gray-* classes replaced with surface-* equivalents (breadcrumb, title, description, author, metadata, tags, related section)
- **Step header redesign**: Changed from `bg-gray-50` with `text-xs text-gray-400` to `bg-surface-900` with `text-white` title and `text-surface-400` step counter — dramatically improved scannability
- **Prompt sections**: New code-editor aesthetic — `bg-surface-900 text-surface-200` monospace blocks with `border-l-4 border-brand-orange`. Prompts now look like terminal input.
- **Result sections**: Changed from green accent to blue — `bg-accent-50/40` with `border-l-2 border-brand-blue` and `ArrowDown` icon. Lighter visual weight than prompts creates clear directionality.
- **Metadata flattened**: Two-group layout with `gap-6` replaced by single `flex-wrap` band with `gap-2` — all chips in one row that wraps naturally
- **Mobile author row**: Changed from `flex-wrap` to `flex-col md:flex-row` for proper stacking on small screens; avatar gets `flex-shrink-0`
- **Section header**: "The Path" → "The Build Path" at `text-xl font-black` (was `text-lg font-bold`)
- **Single prompt view**: Now uses code-editor aesthetic with `bg-surface-900` header bar
- **Final result**: Changed from green accent to blue (`border-l-2 border-brand-blue`, `bg-accent-50/40`) — consistent with step results
- **Vertical pipe**: Thinned from 3px to 2px, reduced opacity to 40% for subtler connective tissue

*CopyButton (`src/app/prompt/[id]/CopyButton.tsx`):*
- Migrated from gray-* to surface-* palette (hover, bg, border states)
- Increased hover border opacity from `/40` to `/60` for better interactive feedback

*Build Page (`src/app/prompt/new/page.tsx`):*
- **Multi-open accordion**: Per Drew's Q7 response — switched from `activeSection` (single number) to `openSections` (Set<number>) state
- Sections now toggle independently — clicking one doesn't close others
- Guard prevents closing ALL sections (at least one stays open)
- Error handling additive — opens error section without closing others
- Scroll-into-view only fires when opening, not closing

**Review outcome**: Approved with nits. Reviewer confirmed all 4 brief items implemented correctly. Bug fixed: duplicate `text-surface-800` and `text-surface-200` on prompt `<pre>` tag — removed the incorrect one. Follow-up noted: Build page form internals still use gray-* (57 instances) — tracked for future iteration.

**What's next**: Build page gray-*→surface-* migration, or Seed content overhaul (#6). The detail page is now in good shape with the premium step flow — seed content quality is the bottleneck for making the site look impressive.

---

## 2026-04-16 — Iteration 17: Build Page — Progressive Disclosure with Collapsible Accordion Sections

**Audit findings** (top problems identified):
1. All 3 sections visible at once creates "form wall" — cognitive overload on first impression. Steps already had accordion pattern but parent sections didn't.
2. No section-level completion indicators — users couldn't tell when a section was done without scrolling through everything.
3. No scroll anchoring — expanding/collapsing sections with no auto-scroll disoriented users.
4. Section dividers (border-t-2) were visual noise without semantic meaning — redundant with numbered section headers.
5. Submit button buried at bottom — users who'd completed sections couldn't find it without full scroll.
6. GripVertical drag handle on step cards was misleading — suggested drag-and-drop but only arrow-button reorder existed.
7. SectionHeader buttons had no focus-visible indicator — keyboard users couldn't see focus position.
8. No aria-controls linking section headers to their content panels.

**Research insights**:
- **Single-active accordion** (Linear/Typeform): Only one section expanded at a time guides users through logical sequence, reducing visual footprint and maintaining focus.
- **Checkmark badge + summary text in collapsed headers** (Notion/Figma Community): Shows completion state at a glance without reopening, letting users navigate with confidence.
- **Numbered badges with state coloring** (Vercel setup wizard): Orange for active, green for complete, muted for pending — combines spatial awareness with completion feedback.
- **ChevronRight with 90° rotation** (modern accordion best practices): Clean, professional expand/collapse affordance with 200ms transition.
- **Progressive disclosure reduces cognitive load** (NN Group): Show essentials first, reveal on demand — transforms "form wall" into guided builder flow.

**Design brief** (3 key goals):
1. Transform 3-section form wall into single-active accordion — only one section expanded at a time, auto-collapse when switching
2. Add completion indicators to section headers — green checkmark + "Complete" badge when done, summary of entered data when collapsed (e.g., "My Project · Coding & Development")
3. Fix accessibility gaps — focus-visible on section headers, aria-controls/id linking, remove misleading GripVertical drag handle

**What was implemented**:
- **Collapsible SectionHeader component**: Refactored from static display to interactive button with `aria-expanded`, `aria-controls`, `focus-visible:outline-brand-orange`. Shows numbered badge (orange=active, green=complete, muted=pending), title, subtitle when expanded, summary text when collapsed, and ChevronRight icon with 90° rotation.
- **Single-active accordion state**: New `activeSection` state (default: 1). Only one section content panel visible at a time. Clicking a new section auto-collapses the previous one. At least one section always remains open (no all-collapsed state).
- **Section completion logic**: `section1Complete` checks title+description+story+category+difficulty. `section2Complete` checks at least one filled step (multi-step) or prompt content (single). Section 3 is all optional fields.
- **Collapsed section summaries**: Section 1 shows project title + category. Section 2 shows "X of Y steps filled". Section 3 shows tools + tags preview.
- **Scroll-into-view on expand**: `toggleSection()` uses `setTimeout` + `scrollIntoView({ behavior: 'smooth', block: 'start' })` to anchor the newly opened section.
- **Error-aware section navigation**: On submit validation failure, auto-opens the section containing the first error field, then scrolls to the error after 100ms delay for section expansion.
- **Section container styling**: Expanded sections get `border-surface-200 shadow-sm bg-white`. Collapsed sections get `border-surface-100 bg-surface-50/50` with subtle distinction.
- **Form spacing**: Reduced from `space-y-8` to `space-y-3` since sections now have their own borders and padding.
- **Removed GripVertical drag handle**: Was misleading (no drag-drop support). Arrow up/down buttons remain for reorder.
- **Removed section dividers**: `border-t-2 border-surface-200` lines between sections are gone — the accordion containers provide their own visual boundaries.
- **Added aria-controls + panel IDs**: Each SectionHeader button has `aria-controls="section-{n}-panel"` linking to the content div's `id="section-{n}-panel"`.
- **Files changed**: `src/app/prompt/new/page.tsx`

**Review outcome**: Approved with nits. Reviewer confirmed all 6 design brief items implemented. Nits addressed: (1) Added `focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2` to SectionHeader button — fixed. (2) Removed misleading GripVertical drag handle icon — fixed. (3) Added `aria-controls`/`id` associations for WAI-ARIA accordion compliance — fixed. (4) Remaining minor nits (gray-* vs surface-* inconsistency in Section 3, computeErrors() in render path) noted but not blocking.

**What's next**: Build page collapsible sections are now implemented per Drew's request (Q5). Next priority should be Project detail page (#4) or Seed content overhaul (#6). Also note: several prior iteration changes to browse page, globals.css, PromptCard, CLAUDE.md, and ITERATION_GUIDE.md were uncommitted and are included in this commit.

---

## 2026-04-16 — Iteration 16: Header Refinement — Accessibility, Active States, CTA Hierarchy, Dark/Light Transition

**Audit findings** (top problems identified):
1. Nav link contrast fails WCAG AA: `text-surface-400` (#a1a1aa) on `bg-surface-900` (#18181b) = ~3.2:1 ratio (needs 4.5:1). Admin link at `text-surface-500` even worse at ~2.4:1.
2. Inconsistent active states: desktop used white text for active nav, mobile used orange — different visual language on different breakpoints.
3. Zero focus-visible indicators on any interactive element — keyboard users completely unable to see focus position.
4. Mobile touch targets at ~24px (py-2 + text-[13px]) — well below the 44px WCAG AAA minimum.
5. Jarring dark/light transition: thin `border-b border-surface-800` between surface-900 header and #fafafa body creates a hard seam with no depth.
6. "Build" link styled identically to "Browse" — the primary creation action has no visual priority.
7. Missing ARIA attributes on hamburger button (no aria-label, no aria-expanded).
8. Logout button has no aria-label — screen readers see an unlabeled button.

**Research insights**:
- **Orange accent reserved for primary CTA** (Vercel Geist): The highest-priority action gets the brand color treatment — outline by default, filled on hover. Everything else stays neutral. Prevents "orange everywhere" dilution.
- **Warm dark header with shadow transition** (Linear redesign): Avoid hard border lines between dark header and light content. A subtle multi-layer shadow creates depth hierarchy without a visible line, feeling more sophisticated.
- **Consistent active states** (GitHub, Linear): Active nav items use the brand accent color universally across breakpoints. White text for active is generic; brand orange for active reinforces identity.

**Design brief** (3 key goals):
1. Fix all accessibility issues: boost nav link contrast to surface-300 (~12:1 ratio), add focus-visible:outline-brand-orange to every interactive element, increase mobile touch targets to 44px via py-3 + text-sm, add ARIA labels/expanded
2. Unify active state to orange on both desktop and mobile, making "Build" a distinct CTA with orange border/fill treatment (outline default → filled on hover/active)
3. Replace border-b with multi-layer shadow for softer dark/light transition

**What was implemented**:
- **Nav link contrast**: All inactive links changed from `text-surface-400` to `text-surface-300` (#d4d4d8), achieving ~12.1:1 contrast. Admin link upgraded from `text-surface-500` to `text-surface-300`.
- **Unified active states**: Both desktop and mobile Browse active state now uses `text-brand-orange bg-surface-800`. Consistent brand orange across all breakpoints.
- **Build as primary CTA**: Desktop Build link now has `border border-brand-orange/40` outline, `text-brand-orange`, and `font-semibold` by default. On hover: `bg-brand-orange text-surface-900` (fills with orange). Active state: inverted `text-surface-900 bg-brand-orange`. Uses `transition-all` for smooth border+color changes. Mobile Build link gets `font-semibold` to maintain CTA distinction.
- **Focus indicators**: Every interactive element (logo link, nav links, auth links, buttons, hamburger) now has `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange`. Sign-up button uses `focus-visible:outline-white` since it's on orange bg.
- **Mobile touch targets**: All mobile menu items increased from `py-2 text-[13px]` to `py-3 text-sm` — achieving ~44px touch targets. Hamburger button increased from `p-1` to `p-2.5`. Mobile links use `active:bg-surface-800` instead of `hover:bg-surface-800` for proper touch feedback.
- **ARIA improvements**: Hamburger button gets dynamic `aria-label` ("Open menu" / "Close menu") and `aria-expanded`. Logout button gets `aria-label="Log out"`. Logo alt text improved to "PathForge — AI Build Paths".
- **Dark/light shadow transition**: Replaced `border-b border-surface-800` with `shadow-[0_1px_3px_0_rgba(0,0,0,0.3),0_4px_12px_0_rgba(0,0,0,0.15)]` — a two-layer shadow that creates depth without a hard line.
- **Mobile menu divider**: Changed from `border-surface-800` to `border-surface-700` for better visibility.
- **Transition timing**: Unified all transitions to `duration-200` (was `duration-150`).
- **Desktop logout click target**: Increased from `p-1` to `p-2` (~30px target, appropriate for desktop mouse use).
- **Files changed**: `src/components/Header.tsx`

**Review outcome**: Approved with nits. Reviewer verified contrast ratios (all pass WCAG AA), confirmed focus indicators on every element, validated mobile touch targets reach 44px. Nits addressed: (1) desktop logout button target increased from p-1.5 to p-2, (2) mobile Build link given `font-semibold` to maintain CTA distinction, (3) active nav orange-on-surface-800 at 4.6:1 passes AA normal text threshold.

**What's next**: Header item #3 is now substantially complete. Next priority should be item #4 (Project detail page) or item #6 (Seed content overhaul). Seed content is important — the design improvements need real content to showcase them.

---

## 2026-04-16 — Iteration 15: Build Page — From Form to Builder (Hero Title, Step Cards, Submit Refinement)

**Audit findings** (top problems identified):
1. Step cards use `bg-white` on white page background with only subtle `border-gray-200` — virtually indistinguishable from the page itself, breaking the "builder" metaphor.
2. Page title "Share a Project" at `text-3xl` competes with section headers at `text-xl` — only ~67% size difference creates scattered hierarchy with no clear focal point.
3. "The Story" textarea dominates Section 1 without clear purpose differentiation from title/description — 3 text fields with nearly equal visual weight.
4. No drag-drop or reorder affordance on steps — step cards look like form fields, not building blocks. No drag handle or keyboard hints.
5. Mode toggle doesn't indicate which option is recommended — both modes presented at equal visual weight.
6. All 3 sections visible at once with no progressive disclosure — cognitive overload on first impression ("lots to fill out" not "I'm building something cool").
7. Submit button says "Submit for Review" — generic form language, not builder language.

**Research insights**:
- **Borderless hero title** (Notion/Linear): Large, borderless title input shifts psychology from "filling out a form" to "creating a document." Font-size ~28-32px, no border by default, brand-color underline on focus.
- **Step cards as interactive blocks** (Notion/Figma): Building blocks need visual depth (shadow, bg tint) and reorder affordance (grip handles, arrow buttons) to feel like a canvas rather than a form.
- **Progressive disclosure** (Vercel): Show essentials first, reveal on demand. Reduces cognitive load from 3 sections to focused flow.
- **Minimal progress-driven submit** (Linear): Understated button that lights up when ready, with completion summary text. Not a screaming CTA.
- **"Recommended" badge on preferred option** (various): Small pill badge draws attention without being obnoxious.

**Design brief** (3 key goals):
1. Transform the title from a labeled form field into a Notion-style borderless hero input (`text-2xl sm:text-3xl`, bottom-border on focus in brand orange) — make the first impression "I'm creating something"
2. Give step cards visual depth and interactivity: `bg-surface-50` collapsed state with `shadow-sm`, `shadow-md` expanded, grip handle icon, move up/down reorder buttons, visually distinct prompt (surface tint) and result (green tint) sections
3. Refine submit area: adaptive button styling (muted when incomplete, orange when ready), completion summary with accurate "Ready to publish" indicator, cleaner language

**What was implemented**:
- **Hero title** (page.tsx): Removed generic `<h1>Share a Project</h1>` and separate title input. Title field is now borderless `text-2xl sm:text-3xl font-bold` with `border-b-2 border-transparent focus:border-brand-orange` transition. Added `aria-label="Project title"` for accessibility.
- **Step cards redesigned** (page.tsx): Collapsed cards now `bg-surface-50 shadow-sm` with `hover:shadow-md hover:border-surface-300` — visually distinct from page bg. Expanded cards `shadow-md bg-white border-brand-orange/40`. Added `GripVertical` icon as reorder affordance (no cursor-grab since drag isn't wired). Added `ArrowUp`/`ArrowDown` buttons with `e.stopPropagation()` and `disabled` states. Added `moveStep()` function for reordering.
- **Prompt/Result visual separation** (page.tsx): Within expanded steps, prompt textarea wrapped in `bg-surface-50 border border-surface-200 p-4` container, result textarea wrapped in `bg-green-50/50 border border-green-100 p-4` — clear visual distinction between input (what you typed) and output (what AI produced).
- **Mode toggle badge** (page.tsx): Multi-step button now has `<span>Recommended</span>` badge in `text-[10px] uppercase tracking-wider text-brand-orange bg-brand-orange/10`.
- **Submit refinement** (page.tsx): Completion summary above button ("X of Y steps complete" + "Ready to publish" when `computeErrors()` returns empty). Button uses adaptive styling: muted `bg-surface-200` when incomplete, `bg-brand-orange text-white` when ready. Changed label to "Submit Project".
- **Surface palette migration** (page.tsx): Migrated section dividers, step card borders, and labels from `gray-*` to `surface-*` tokens for cooler, more consistent palette.
- **Files changed**: `src/app/prompt/new/page.tsx`

**Review outcome**: Approved with nits. Reviewer flagged: (1) unused `Sparkles` import — removed, (2) GripVertical had `cursor-grab` implying drag-drop — removed, added tooltip via wrapping span, (3) "Ready to publish" checked only title+category — fixed to use `computeErrors()` for accuracy, (4) missing `aria-label` on hero title — added, (5) "Publish Project" vs "Submit" naming — changed to "Submit Project" for accuracy since projects go to review queue. All issues resolved before commit.

**What's next**: Build page item #2 has had a strong second pass (Iteration 13 = validation/typography, Iteration 15 = builder transformation). Next priority should be item #3 (Header refinement) or continuing item #2 with live preview and progressive disclosure (collapsible sections). Seed content (#6) remains important alongside design work.

---

## 2026-04-16 — Iteration 14: Browse Page — Featured Card Distinction, Card Hierarchy, Filter Bar Polish

**Audit findings** (top problems identified):
1. Featured and regular cards differ by only 4px padding and 2px font size — users can't tell which are featured. No badge, border, or layout change signals editorial curation.
2. Card information is spread across 3 separate visual zones (metadata row, model/difficulty row, footer) with similar text weights — flat hierarchy makes scanning slow.
3. Sort toggle buttons are invisible before hover (no border/background in inactive state). Search focus ring is too subtle for a modern dev tool.
4. Active filter chip dismiss X is only 2.5px — tiny touch target, low discoverability.
5. Step visualization "+4" text overflow breaks the visual pattern of numbered boxes.
6. Spacing rhythm is inconsistent — page header uses py-8 while toolbar uses p-4.
7. Empty state icon (surface-300) has poor contrast on white background.
8. No section headers distinguish featured from regular projects in the grid.

**Research insights**:
- **Bento grid with variable card sizing** (Product Hunt): Featured cards should be visually distinct through layout + accent, not just slightly larger text.
- **Segmented sort control** (Linear/Vercel): Sort toggles housed in a bordered container with active state = white + shadow, creating a pill-switch feel.
- **Minimal card hierarchy** (Raycast Store): Bold title, muted description, consolidated footer — reduce vertical sections per card.
- **Search focus glow** (Linear): Subtle box-shadow ring on focus (0 0 0 3px rgba) + icon color change to brand color.
- **Section headers in grids** (Figma Community): Label "Featured" and "All Projects" sections explicitly so the visual hierarchy has textual reinforcement.

**Design brief** (3 key goals):
1. Make featured cards dramatically distinct: orange left border, "Featured" badge with star icon, text-xl title, orange-tinted step numbers, show 6 steps instead of 4
2. Consolidate card footer into a single row (difficulty + model on left, author + stats on right) — reduce from 3 visual zones to 2
3. Polish filter bar: search focus ring with shadow glow + icon color change, segmented sort toggle, subtle bg-surface-50 on inactive chips, larger filter chip dismiss icons, consistent spacing

**What was implemented**:
- **Featured card distinction** (PromptCard.tsx): `border-l-[3px] border-l-brand-orange` left accent, `Star` icon + "FEATURED" badge, title upgraded to `text-xl` (from `text-lg`), step numbers use orange tint (`bg-brand-orange/5`) by default (not just on hover), shows 6 steps instead of 4, hover lifts card with `-translate-y-0.5` + `shadow-lg`. Regular cards keep the top accent line on hover.
- **Card footer consolidation** (PromptCard.tsx): Merged difficulty/model badges and author/stats into a single `pt-3 border-t` footer row. Author section hidden on mobile (both avatar and name) to prevent orphaned icons. Step viz overflow now uses a sized badge (`w-5 h-5` / `w-6 h-6` for featured) instead of bare "+4" text.
- **Search focus ring** (browse/page.tsx): Added `focus:shadow-[0_0_0_3px_rgba(232,122,44,0.08)]` glow + `group-focus-within` to change search icon to `text-brand-orange` on focus. Input padding increased to `py-2.5`.
- **Segmented sort toggle** (browse/page.tsx): Sort buttons now in a `border border-surface-200 bg-surface-50 p-0.5` container. Active sort shows `bg-white shadow-sm`, creating a pill-switch effect.
- **Filter chip improvements** (browse/page.tsx): Inactive chips now `bg-surface-50` (recessed feel vs floating white). Dismiss X increased to `w-3.5 h-3.5` with `opacity-60 hover:opacity-100`. Chip padding increased to `px-2.5 py-1`. Border hover darkens on hover.
- **Spacing consistency** (browse/page.tsx): Header reduced to `py-6` (from `py-8`), toolbar increased to `p-5` (from `p-4`), filter gap to `gap-4`, divider to `border-surface-200` (from `surface-100`).
- **Featured section headers**: Added "Featured Projects" header with `Sparkles` icon above featured grid, and "All Projects" label above the regular grid.
- **Empty state**: Icon color improved to `surface-400` (from `surface-300`), border to `surface-300`, responsive padding.
- **TODO comment** added noting featured selection should be driven by a database flag, not positional.
- **Files changed**: `src/components/PromptCard.tsx`, `src/app/browse/page.tsx`.

**Review outcome**: Approved with nits. Reviewer flagged: (1) orphaned avatar on mobile — fixed by hiding both avatar and name with `hidden sm:flex`, (2) step overflow badge sizing mismatch for featured cards — fixed with conditional `w-6 h-6`, (3) TODO comment needed for positional featured logic — added. Also noted pre-existing `duration-200` vs `150ms` token mismatch (not introduced by this diff).

**What's next**: Browse page has now had 3 focused iterations (filter UX, card refinement, this featured/hierarchy pass). Consider marking item #1 substantially complete and moving to item #2 (Build/Submit page as rich project builder) or item #3 (Header refinement).

---

## 2026-04-16 — Iteration 13: Submit Form — Typography, Step Builder, Validation UX

**Audit findings** (top problems identified):
1. Section numbers (orange w-7 h-7) and step numbers (orange w-7 h-7) are visually identical — users can't distinguish form-level hierarchy from step-level hierarchy.
2. "Add Step" button uses dashed border and normal font weight — reads as a placeholder/dropzone rather than an actionable button. Core feature is under-afforded.
3. Collapsed step cards show only a 2px green dot for completion — no text badge, no progress indication at a glance. Users must expand each step to verify completeness.
4. Mode toggle (single vs multi-step) has same visual weight as form inputs — selected state isn't prominently differentiated from unselected.
5. No client-side validation — submitting with empty required fields produces only browser-native validation tooltips, not styled inline error messages.
6. Section dividers (border-t border-gray-200) are too subtle to create visual breathing room between the 3 form sections.
7. Typography hierarchy is flat: section titles (text-lg) barely differentiate from field labels (text-sm).

**Research insights**:
- Baymard Institute: top-aligned labels with clear section breaks make multi-section forms 20%+ faster to complete
- Smashing Magazine "reward early, punish late" validation: show errors only after first submit attempt, then clear reactively as user types
- GitHub/Linear issue forms: strong section differentiation with color-coded headers and generous whitespace
- Progressive disclosure research: step completion indicators on collapsed cards reduce "hidden content anxiety"

**Design brief** (3 key goals):
1. Differentiate section-level from step-level numbering: blue (brand-blue) w-9 h-9 section numbers vs orange w-7 h-7 step numbers, with text-xl section headers and stronger dividers
2. Improve step builder: solid "Add Step" button with font-semibold, text completion badges ("Complete"/"In progress"/"Click to edit") on collapsed cards, visual progress bar with percentage
3. Add client-side validation: `noValidate` on form, shared `computeErrors()` function, inline `<FieldError>` components with AlertCircle icons, red border states, scroll-to-first-error on submit, reactive error clearing

**What was implemented**:
- **Section headers redesigned**: Blue (`bg-brand-blue`) w-9 h-9 numbers (up from orange w-7 h-7), section titles upgraded to `text-xl font-bold`, gap increased to `gap-4`, subtitle has `mt-0.5` spacing.
- **Section dividers strengthened**: `border-t border-gray-200` → `border-t-2 border-gray-200` for all 3 section breaks.
- **Mode toggle enhanced**: Selected state uses `shadow-[inset_4px_0_0_var(--color-brand-orange)]` inset accent (not conflicting border-l-4). Labels upgraded to `font-semibold`. Unselected hover shows `shadow-sm`.
- **Step cards — completion badges**: Collapsed cards now show text status below the title: "Complete" (green), "In progress" (orange), or "Click to edit" (gray). Filled steps show green `bg-green-500` checkmark icon instead of number. Removed the old 2px green dot.
- **Step progress bar**: Added above step cards — "X of Y steps filled" with percentage and animated orange progress bar. Includes `role="progressbar"` with full ARIA attributes for accessibility.
- **"Add Step" button redesigned**: Dashed border → solid `border-brand-orange/40`. Font → `font-semibold`. Padding → `py-3.5`. Added `active:bg-primary-200` and `focus-visible:outline-2` states.
- **Client-side validation**: Added `noValidate` on `<form>`. Shared `computeErrors()` function validates all required fields. `<FieldError>` component shows red text with `AlertCircle` icon. Invalid fields get `border-red-400` styling. Errors appear only after first submit attempt, then clear reactively via `useEffect`. Scroll-to-first-error uses the freshly computed errors object (not stale React state).
- **All transitions**: Added `transition-colors duration-200` to all inputs for consistent interactive feedback.
- **Files changed**: `src/app/prompt/new/page.tsx`.

**Review outcome**: Initial review returned "Request changes" with 3 issues: (1) scroll-to-error used stale React state — fixed by returning errors from `validateForm()`, (2) `border-l-4` conflicted with `border-2` on mode toggle — fixed with `shadow-[inset_4px_0_0_...]`, (3) duplicated validation logic — fixed by extracting shared `computeErrors()` function. Also added ARIA progressbar attributes per reviewer nit. All issues resolved before commit.

**What's next**: Submit form item #4 now has solid second pass. Consider marking items 1-5 complete (all have had 2-3 passes) and starting the "Next Sprint" features, or doing a final holistic polish pass across all pages.

---

## 2026-04-16 — Iteration 12: Landing Page — Popular Paths Discovery & Mobile Responsiveness

**Audit findings** (top problems identified):
1. PromptCards have hover states but no active/pressed states — mobile users see no interaction feedback when tapping cards, making them feel static and non-interactive.
2. Popular Paths header uses `flex items-end justify-between` without responsive stacking — on small screens, heading and "View all" link compete for space horizontally.
3. Popular Paths grid uses `gap-5` (1.25rem) which violates the design spacing grid (4/8/16/24/32/48/64px). Other sections use gap-4 and gap-6.
4. "View all" is a bare blue text link with no border, background, or active state — it reads as low-priority footnote rather than an actionable discovery CTA.
5. Secondary CTA links ("or share your build", "or browse paths first") have no padding — their tap targets are well below the 44px WCAG minimum.
6. Problem section's left pipe sidebar disappears on mobile (`hidden sm:flex`) with no visual replacement, creating a jarring layout shift.
7. Empty state in Popular Paths uses `py-16` on all screen sizes — oversized on mobile — and the CTA lacks visual weight.

**Research insights**:
- Product Hunt/Figma Community pattern: featured content CTAs need strong visual affordance (borders, backgrounds, icons) to compete with the content cards for attention
- Mobile touch feedback research: `active:scale-[0.98]` creates a convincing "push" effect without janky animations
- Responsive stacking: `flex-col gap-4 sm:flex-row sm:items-end` is the standard mobile-first pattern for header + action layouts
- Touch target minimum: 44px per WCAG, achieved via `px-4 py-3` padding on text links

**Design brief** (3 key goals):
1. Add mobile touch feedback to PromptCards and make Popular Paths section invite clicking with a stronger "View all" button and responsive header layout
2. Fix all secondary CTA tap targets to meet 44px minimum and standardize grid spacing to the design grid
3. Add mobile visual anchor (top accent bar) to replace hidden left sidebar pipe

**What was implemented**:
- **PromptCard active state**: Added `active:scale-[0.98] active:shadow-none` for touch press feedback, plus `focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2` for keyboard accessibility.
- **Popular Paths header responsive**: Changed from `flex items-end justify-between` to `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`. Header stacks on mobile, sits side-by-side on sm+.
- **"View all" upgraded to button-like element**: From bare `text-brand-blue` text link to bordered element with `border border-brand-blue/30 bg-brand-blue/5 px-4 py-2` plus hover, active, and focus-visible states. Label changed from "View all" to "View all paths" for clarity. Added `w-fit` to prevent full-width stretch when stacked.
- **Grid spacing fixed**: `gap-5` → `gap-6` (24px), snapping to the design spacing grid.
- **Empty state improved**: Responsive padding `py-10 sm:py-16`, border upgraded `gray-200` → `gray-300`, background `bg-gray-50/50`, text contrast `gray-400` → `gray-500`, CTA turned into bordered button with icon and active/focus states.
- **Secondary CTA tap targets**: Both "or share your build" and "or browse paths first" gained `px-4 py-3`, bringing total height to ~44px.
- **Mobile accent bar**: Problem section content div gained `border-t-2 border-brand-orange sm:border-t-0 pt-4 sm:pt-0` — orange top accent on mobile replaces the hidden left pipe.
- **Files changed**: `src/app/page.tsx`, `src/components/PromptCard.tsx`.

**Review outcome**: Approved with nits. Reviewer confirmed all 3 brief items implemented faithfully with no drift. Nits flagged: missing focus-visible states on "View all" link, empty state CTA, and PromptCard itself — all fixed before commit. Reviewer noted the changes are "minimal, targeted, and consistent with the design system."

**What's next**: Landing page item #1 has been thoroughly polished across 3 iterations (1, 9, 12). Consider marking it complete and moving to Submit form (#4) or Navigation (#5) for a second pass.

---

## 2026-04-16 — Iteration 11: Project Detail Page — Step Flow, Story Prominence, Metadata Layout

**Audit findings** (top problems identified):
1. Step numbers use `text-xs` (same size as descriptions) inside 38px bordered circles — they blend into content rather than serving as visual anchors for scanning the progression. The `pipeDraw` CSS animation exists but is never applied to the actual pipe.
2. Vertical pipe between steps is at 30% opacity with no animation — reads as a faint placeholder rather than a core feature of the product. Doesn't communicate progression or flow.
3. Story section ("what they built and why") uses same heading size as "The Path" section and a barely-visible `bg-primary-50/50` background — it's not prominent enough despite being the primary narrative hook.
4. Metadata chips are 5 different color schemes in one flat row with no grouping — users must parse everything linearly to find specific info.
5. Author section appears after all metadata, separated from the title by the chip wall — delays human connection with the creator.
6. Copy button feedback is functional but unceremonial — subtle color flash without animation.

**Research insights**:
- USWDS Step Indicator pattern: large bold step numbers as primary visual anchors that guide the eye down the page
- Product Hunt launch pages: author avatar + name immediately under the title creates instant human connection
- GitHub/Dev.to: grouped metadata (context vs. technical specs) separated visually rather than one flat row
- Instructables: "Step X of Y" inline text in step headers reinforces progression without adding visual clutter
- Notion gallery: full background tints on featured content blocks create clear visual prominence

**Design brief** (3 key goals):
1. Make step flow the hero — 48px solid orange step nodes (not bordered circles), apply `pipeDraw` animation to the vertical pipe, increase pipe opacity to 50%, add "Step X of Y" headers, increase step spacing
2. Promote the Story section — upgrade heading to `text-xl font-black`, strengthen background to full `bg-primary-50`, responsive padding
3. Reorganize header — move author row immediately after title for human connection, group metadata into context (category + difficulty + steps) and technical (model + tools) clusters

**What was implemented**:
- **Step nodes redesigned**: From 38px white-bg bordered circles with `text-xs` number → 48px solid `bg-brand-orange` squares with `text-base font-black text-white` number. Left padding increased `pl-14` → `pl-16`, pipe repositioned to `left-[23px]` to center on larger nodes.
- **Pipe animation activated**: Applied `pipeDraw 1s ease-out forwards` animation via inline style. Opacity increased from `opacity-30` → `opacity-50`. The `pipeDraw` keyframe was already in globals.css but unused — now it's wired up.
- **Step headers always render**: Previously conditional on `step.title || step.description`. Now always shows "Step X of Y" text (e.g., "Step 1 of 3 — Title"), ensuring every step has a header and screen readers get progression context.
- **Step spacing**: `space-y-8` → `space-y-10`, section heading `mb-6` → `mb-8`.
- **Story section promoted**: Heading from `text-lg font-bold` → `text-xl font-black`. Background from `bg-primary-50/50` → `bg-primary-50` (full opacity). Padding responsive: `p-6 sm:p-8`. Text explicitly `text-base`.
- **Author row repositioned**: Moved from below metadata (after border-t) to immediately after title/description, before metadata. Avatar slightly larger: `w-9 h-9` → `w-10 h-10`.
- **Metadata grouped**: Split from single flat `flex` row into two groups separated by `gap-6`: context group (category, difficulty, step count) and technical group (model, tools). Wrapped in `items-start` for clean wrapping behavior. Border-t separator now sits between author and metadata rather than between metadata and author.
- **Header spacing**: `mb-8` → `mb-10` for more breathing room before story section.
- **Loading skeleton updated**: All structural changes mirrored — 48px step nodes, `pl-16`, `space-y-10`, author row position, grouped metadata with `gap-6`, `sm:p-8` on story section, pipe at `left-[23px]`.
- **Files changed**: `src/app/prompt/[id]/page.tsx`, `src/app/prompt/[id]/loading.tsx`.

**Review outcome**: Approved with nits. Reviewer confirmed all 3 brief items implemented faithfully with no drift. Skeleton fidelity praised as excellent. Nits noted: (1) inline style for animation is the only one in the file — a CSS utility class would be more consistent, low priority; (2) step number appears twice (node + "Step X of Y" text) — mild redundancy but "of Y" provides useful context the node alone doesn't; (3) pre-existing lack of focus-visible on metadata chips not introduced by this change.

**What's next**: Second pass on remaining landing page items (Popular Paths carousel, mobile responsiveness) or fresh audit of Submit form (#4) or Navigation (#5).

---

## 2026-04-16 — Iteration 10: Browse Page Filter UX Polish

**Audit findings** (top problems identified):
1. Difficulty filter active state uses `bg-gray-900` (dark gray) while category filters use `bg-brand-orange` — users learn "orange = selected" from categories, then difficulty buttons violate that pattern with a completely different color semantic.
2. "Clear filters" button is a tiny `text-xs text-gray-400` text link that blends into the filter UI — users who apply filters may not discover this important action.
3. Vertical spacing rhythm is inconsistent: mb-8 (header) → mb-6 (search) → mb-4 (categories) → mb-8 (difficulty) — three different gap values between four consecutive sections.
4. Search bar has a redundant text "Search" button next to an input with placeholder "Search build paths..." — the button wastes horizontal space and creates text redundancy.
5. Empty state uses `py-20` (80px top/bottom padding), creating excessive whitespace around a small content block.
6. Search input lacks a focus ring for keyboard accessibility.

**Research insights**:
- Dribbble/Figma Community use inline removable filter chips (with × icons) below filter controls so users see exactly what's filtered and can remove individual filters without clearing all — this pattern reduces confusion and gives users fine-grained control.
- Product Hunt and Figma use consistent color semantics across all filter types — active state is always the same color regardless of filter category.
- Filter bars with a visible "Clear all" styled as a chip (not a dim text link) have significantly better discoverability per Baymard usability research.

**Design brief** (3 key goals):
1. Unify all filter active states to brand orange — difficulty filters match category filters, creating a single consistent visual language for "selected."
2. Add removable filter summary chips — when any filter is active, show tinted orange chips with × icons for individual removal, plus upgrade the "Clear all" to a visible bordered chip.
3. Fix spacing rhythm and search affordances — standardize section gaps to clean increments, replace text search button with icon button, improve focus ring, reduce empty state padding.

**What was implemented**:
- **Difficulty filter active state**: Changed from `bg-gray-900 text-white border-gray-900` to `bg-brand-orange text-white border-brand-orange`. Hover state also aligned to `hover:border-brand-orange/50` matching category chips.
- **Active filter summary bar**: New section between filter controls and result count. Shows "Filtered by:" label followed by tinted `bg-brand-orange/10` chips for each active filter (category name, difficulty level, search query). Each chip has an × icon and links to a URL that removes just that filter. Only renders when `hasActiveFilters` is true.
- **Clear button upgrade**: From `text-xs text-gray-400 hover:text-gray-600` text link to `text-xs font-semibold text-gray-600 border border-gray-300 px-3 py-1.5 hover:border-gray-400` bordered chip. Label shortened from "Clear filters" to "Clear all" for conciseness.
- **Search button**: Replaced text "Search" with `<Search />` icon, added `aria-label="Search"` for accessibility. Padding adjusted to `px-4` for icon-sized button.
- **Search focus ring**: Added `focus:ring-2 focus:ring-brand-orange/25` (reviewer flagged initial `/10` as too subtle — increased to `/25`).
- **Spacing rhythm**: Search form `mb-6` → `mb-8`, category filters `mb-4` → `mb-6`. Resulting rhythm: header `mb-8`, search `mb-8`, categories `mb-6`, difficulty `mb-8`, chips `mb-4`, results `mb-5`.
- **Empty state padding**: `py-20` → `py-12`.
- **Loading skeleton synced**: Search button width updated from `w-20` to `w-[42px]`, spacing values updated to match page.
- **Files changed**: `src/app/browse/page.tsx`, `src/app/browse/loading.tsx`.

**Review outcome**: Approved with nits. Reviewer confirmed all 7 brief items implemented correctly, no drift. One nit fixed before commit: focus ring opacity too low (`/10` → `/25`). Reviewer noted that both "All" (category) and "All Levels" (difficulty) showing orange in default state is a lot of orange for "nothing is filtered" — pre-existing design choice, not introduced by this change.

**What's next**: Continue Browse page polish (card design, search responsiveness) or move to Project detail page (#3) for fresh audit pass.

---

## 2026-04-16 — Iteration 9: Landing Page Hero Clarity & Typography Normalization

**Audit findings** (top problems identified):
1. Hero cognitive overload — tagline chip in orange competes with the main headline for visual attention; both use bold uppercase, splitting the user's eye between two focal points.
2. Mini-flow diagram (Prompt→Result→Refine→Ship) in the hero adds cognitive load for first-time visitors. It duplicates the Solution section's flow diagram and introduces 4 colors and tiny 10px text into the hero.
3. Hero subtitle is 3 dense sentences in one block (max-w-2xl = 896px wide), requiring mental parsing before the value prop lands. Fails the 5-second test.
4. Three competing CTAs — "Browse Build Paths" (orange button), "Share Your Build" (bordered button), and "Get Started Free" (orange button in footer) — all with similar visual weight, creating decision paralysis.
5. Typography hierarchy inconsistent — "Why It Works" uses `text-2xl sm:text-3xl` while Problem and Solution sections use `text-3xl sm:text-4xl`. Popular Paths heading also undersized.
6. Pipe connector heights arbitrary — h-16, h-10, h-6 with no consistent rhythm.
7. Problem cards and feature cards lack focus-visible states for keyboard accessibility.
8. Popular Paths section header has no visual accent connecting it to the page's design language.

**Research insights**:
- Linear's categorical positioning: single bold headline > feature lists. "The system for product development" — one declarative statement.
- Vercel/Stripe dual-CTA pattern: clear primary + visually distinct secondary. Never two equal-weight buttons.
- Product Hunt card gallery with social proof baked in — engagement metrics visible without requiring testimonials.
- 80-120px vertical padding between major sections with visual transitions (Stripe, Linear).

**Design brief** (3 key goals):
1. Reduce hero cognitive load — de-emphasize tagline chip (gray not orange), remove mini-flow diagram, split subtitle into 2 concise lines with reduced max-width
2. Clarify CTA hierarchy — primary "Browse Build Paths" (bigger, bolder), secondary "or share your build" (text link, not bordered button)
3. Normalize typography & spacing — all section h2s to text-3xl sm:text-4xl, pipe connectors standardized, accent bar on Popular Paths, focus-visible on all interactive cards

**What was implemented**:
- **Hero tagline chip**: Changed from `border-brand-orange/30 bg-brand-orange/5` with orange text to `border-gray-200 bg-gray-50` with gray text. Headline now dominates immediately.
- **Mini-flow diagram removed**: 30 lines of JSX (4-step Prompt→Result→Refine→Ship with connectors) removed from hero. The Solution section's fuller flow diagram remains as the explanatory context.
- **Subtitle tightened**: From 3 sentences in `max-w-2xl` to 2 lines — primary ("Browse real AI projects with every prompt, result, and step visible") in `text-lg max-w-xl` + secondary ("Fork what works. Skip the blank-chat guesswork.") in `text-base text-gray-400 max-w-lg`. Visual weight split reinforces hierarchy.
- **CTA hierarchy clarified**: Primary button upgraded to `px-10 py-4 font-bold`. Secondary changed from bordered button (`border border-gray-300 px-8 py-3.5`) to text link (`text-sm font-semibold text-gray-500`) with "or" prefix matching footer's pattern.
- **Hero spacing increased**: `pt-16 pb-12` → `pt-20 pb-16` for more breathing room.
- **Typography normalized**: "Why It Works" h2 from `text-2xl sm:text-3xl` → `text-3xl sm:text-4xl`. "Popular Build Paths" h2 same upgrade. All section headings now use identical size.
- **Pipe connectors normalized**: Hero→Problem from `h-16` → `h-12`. Problem→Solution from `h-10` → `h-12`. Other pipes kept at `h-5`+dot+`h-5` for sub-section rhythm.
- **Focus-visible states**: Added `focus-visible:outline-2 focus-visible:outline-{color} focus-visible:outline-offset-2` to all 7 interactive cards (4 problem cards with orange, 1 feature card with blue, 1 with green).
- **Popular Paths accent bar**: Added `border-l-4 border-brand-orange pl-4` to section header for visual connection to brand language.
- **Loading skeleton updated**: Structure-matched to new hero layout (no mini-flow skeleton, updated padding, 2-line subtitle, single button + text link CTA, accent bar on Popular Paths skeleton, pipe height corrected).
- **Import cleanup**: Removed unused `Image` (next/image) and `Zap` (lucide-react) imports.
- **Files changed**: `src/app/page.tsx`, `src/app/loading.tsx`.

**Review outcome**: Approved with nits. Reviewer confirmed all changes trace to design brief, mobile responsiveness preserved, accessibility improved. Noted: focus-visible on non-focusable divs (problem cards) is harmless dead code — divs aren't keyboard-reachable without tabindex. Low priority cleanup for future pass.

**What's next**: Landing page item #1 has been refined across two iterations now. Consider a second pass on Browse page (#2) or Project detail (#3) with fresh audit eyes, or start tackling Next Sprint items.

---

## 2026-04-16 — Iteration 8: Skeleton Loading States

**Audit findings** (top problems identified):
1. Zero `loading.tsx` files anywhere — every page blocks on the slowest query with no progressive rendering. No Suspense boundaries, no skeleton components, no loading infrastructure at all.
2. Browse page shows a completely blank grid during data fetch — no categories, no cards, no indication anything is loading. On slow 3G, this persists for 5+ seconds.
3. Project detail page has sequential blocking fetches (prompt data → related projects) creating up to 5 seconds of blank screen on slow connections. The entire page appears at once rather than progressively.
4. User profile and admin dashboard both block on multiple parallel fetches with no fallback UI. Stats cards flash from "0" to real values (layout shift).
5. Header auth state flash: client-side `useEffect` auth check means auth buttons briefly show "Log in" then flip to user profile.

**Research insights**:
- Shimmer wave animation (left-to-right gradient sweep) feels ~65% faster than pulse variants according to UX research (Syncfusion, web.dev). Used by Vercel, Linear dashboards.
- Structure-matched skeletons (exact same dimensions as final content) are critical for preventing CLS — stressed by NN/G, LogRocket, and Boneyard (Vercel's framework).
- Sharp-edge skeletons with flat gray palette reinforce brand identity — PathForge's `border-radius: 0` applies to skeletons too, making them feel native rather than generic.
- Next.js `loading.tsx` convention automatically wraps pages in Suspense boundaries, enabling streaming server rendering.
- `prefers-reduced-motion` media query should disable shimmer for accessibility (Clay, LogRocket).

**Design brief** (3 key goals):
1. Create reusable Skeleton component library (SkeletonBox, SkeletonText, SkeletonCard, SkeletonCardGrid) with shimmer animation
2. Add `loading.tsx` for all 5 data-fetching routes: landing, browse, detail, profile, admin
3. Structure-match all skeletons to real page layouts — same padding, grids, element sizes — to eliminate layout shift

**What was implemented**:
- **Shimmer CSS animation** in `globals.css`: `@keyframes shimmer` with left-to-right gradient sweep (1.8s ease-in-out), `.skeleton-shimmer` utility class, `prefers-reduced-motion` fallback to static gray.
- **Skeleton.tsx components**: `SkeletonBox` (basic shimmer block), `SkeletonText` (multi-line text placeholder with configurable widths), `SkeletonCard` (matches PromptCard: step flow bar + badges + title + description + model/tools + tags + author/stats footer), `SkeletonCardGrid` (responsive 3-column grid of SkeletonCards).
- **Browse loading.tsx**: Full page skeleton — header, search bar, 8 category filter chips, 4 difficulty chips, sort controls, result count, and 6-card grid. Structure-matched to browse/page.tsx.
- **Detail loading.tsx**: Breadcrumb trail, title/description, 4 metadata chips, author row with vote buttons, story section with left-border accent, 3 step skeletons with pipe visualization, related projects grid (`md:grid-cols-3` matching real page).
- **Landing loading.tsx**: Hero skeleton with grid background, CTA buttons, mini flow preview, pipe connector, problem section cards, popular paths grid.
- **Profile loading.tsx**: Card with gradient banner, overlapping avatar (`-mt-10`), name/username/bio, stat cards in 3-column grid, project grid. Matched `max-w-5xl` to real page.
- **Admin loading.tsx**: Stat cards (5 cards, `grid-cols-2 lg:grid-cols-5`), mobile tab nav, pending review table rows. No outer wrapper (admin layout provides container).
- **Accessibility**: All loading containers have `aria-busy="true"`. Shimmer disables with `prefers-reduced-motion: reduce`.
- **Files changed**: `globals.css`, new `Skeleton.tsx`, 5 new `loading.tsx` files.

**Review outcome**: Initial review flagged 3 structural mismatches: (1) User profile skeleton had `max-w-4xl` instead of `max-w-5xl` and flat layout instead of card-with-banner — completely rewritten to match. (2) Admin skeleton had 4 stat cards instead of 5 and wrong grid breakpoint — fixed to `grid-cols-2 lg:grid-cols-5` with 5 cards. (3) Detail page related projects grid used default `SkeletonCardGrid` breakpoints instead of the real page's `md:grid-cols-3` — replaced with inline grid. All fixed before commit.

**What's next**: All current sprint items are complete. Consider starting next sprint (core features) or further polish (header auth flash, empty state animations).

---

## 2026-04-16 — Iteration 7: Auth Pages & User Profile Polish

**Audit findings** (top problems identified):
1. Auth input focus states were invisible — `focus:outline-none` removed browser default with no `focus:ring` replacement. Keyboard users had zero visual feedback when tabbing through form fields.
2. Auth buttons used `hover:opacity-90 transition-opacity` instead of the design system's standardized `hover:bg-brand-orange-dark transition-colors duration-200`. Navigation links had no transition class at all.
3. Auth pages were generic white forms with no brand personality — every other page had been polished with PathForge's visual language, but login/signup could belong to any SaaS app.
4. User profile stat cards (Projects/Upvotes/Saves) used `bg-white border-gray-200` identical to clickable PromptCards, creating false click affordance.
5. Profile empty state was a plain text message with no visual treatment or call-to-action.
6. Password requirements only visible as placeholder text — no persistent helper or real-time validation feedback.
7. Error messages lacked icon and `role="alert"` for screen readers.

**Research insights**:
- Split-layout auth (Linear, Vercel): form + brand panel reinforces identity and differentiates from generic forms. Works well with PathForge's sharp-edge geometric aesthetic.
- Inline validation with color feedback (Linear, GitHub): real-time checkmarks for password requirements create confidence without interrupting flow.
- Empty state with clear CTA (GitHub, Product Hunt): converts blank profiles into onboarding moments with icon + action button + descriptive text.
- Recessed stat displays (vs card-like): non-interactive data should look visually distinct from interactive cards — lighter background, softer borders.

**Design brief** (3 key goals):
1. Add brand-reinforcing split layout to auth pages — orange gradient panel on login (value prop: "See what others built"), blue gradient panel on signup (value prop: "Share what you built"), each with numbered step/feature list and grid pattern background. Hidden on mobile.
2. Fix all design system violations — focus:ring-2 on inputs, transition-colors duration-200 on buttons and links, hover:bg-brand-orange-dark instead of hover:opacity-90, htmlFor/id pairs, role="alert" on errors.
3. Polish user profile — recessed stat cards (bg-gray-50 border-gray-100), empty state with dashed border + Plus icon + CTA button, uppercase tracking-wide stat labels.

**What was implemented**:
- **Login page redesign**: Split layout with `hidden lg:flex lg:w-[45%]` orange gradient brand panel containing logo, "See what others built with AI" headline, descriptive paragraph, and 3-step numbered flow diagram (Prompt → Result → Iterate). Form panel gets proper heading hierarchy (h1 on desktop, logo on mobile). All inputs get `focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-200`. Button changed to `hover:bg-brand-orange-dark transition-colors duration-200`. Error state gets icon + `role="alert"`. Loading state gets animated SVG spinner.
- **Signup page redesign**: Split layout with blue gradient brand panel containing logo, "Share what you built with AI" headline, and 3 numbered value props. Password field becomes controlled input with real-time `passwordLongEnough` check — orange checkbox appears when 8+ chars entered. Success state replaces emoji with branded icon in orange-tinted box. Same focus/transition/error/loading improvements as login.
- **User profile polish**: Stat cards changed from `bg-white border-gray-200` to `bg-gray-50 border-gray-100` with `uppercase tracking-wide` labels — clearly non-interactive. Empty projects state gets dashed border, Plus icon in orange-tinted box, descriptive text, and "Share your first project" CTA button linking to `/prompt/new`.
- **Files changed**: `src/app/auth/login/page.tsx`, `src/app/auth/signup/page.tsx`, `src/app/user/[username]/page.tsx`.

**Review outcome**: Approved with nits. Fixed before commit: (1) Replaced emoji-based value props on signup panel with numbered boxes matching login's pattern for visual consistency. (2) Fixed mid-sentence capitalization bug where mobile text produced "Create your account and Start sharing" — split into separate mobile/desktop spans.

**What's next**: Loading skeleton states for async content, or begin next sprint items (image upload persistence, project editing).

---

## 2026-04-16 — Iteration 6: Visual Consistency & Polish

**Audit findings** (top problems identified):
1. Transition durations were chaotic — mix of 150ms (default), 200ms, 300ms, and unspecified across 40+ interactive elements. Some interactions felt snappy while others were sluggish.
2. Card hover states were inconsistent — PromptCard used orange offset shadow + border, CategoryCard only had border change, landing page problem cards used gray border hover, feature cards each used different colors with no shadow.
3. Button and chip padding used 5+ different scales across pages (px-2 py-0.5, px-3 py-1.5, px-4 py-2, px-5 py-2.5, px-8 py-3.5) without clear semantic mapping.

**Research insights**:
- Standard 200ms transition duration for all hover/focus states (Josh Comeau, web.dev consensus) — creates cohesive, responsive feel
- 8-point spacing grid (Atlassian, Carbon, Tailwind best practices) — documented as design tokens
- Consistent card hover language: border-color change + offset shadow lift (Linear, Vercel Geist patterns)

**Design brief** (3 key goals):
1. Standardize ALL transition durations to 200ms across the entire codebase
2. Unify card hover states: border change + brand-colored offset shadow (4px 4px) consistently
3. Document design tokens (spacing, transition, chip/button tiers) in globals.css

**What was implemented**:
- **Transition standardization**: Added `duration-200` to every `transition-colors`, `transition-all`, and `transition-transform` instance across ALL source files (13 files, 50+ instances). Previously mixed default 150ms with unspecified durations.
- **Card hover unification**: CategoryCard now has orange offset shadow matching PromptCard. Landing page problem cards changed from `hover:border-gray-300` to `hover:border-brand-orange` + matching offset shadow. Feature cards ("Why It Works") now have matching offset shadows in their respective brand colors (orange, blue, green).
- **Design token documentation**: Added comment block in `globals.css` documenting the design system: transition timing (200ms), spacing scale (4/8/16/24/32/48/64px), chip tiers (sm/md), button tiers (sm/md/lg).
- **Files changed**: globals.css, PromptCard.tsx, CategoryCard.tsx, VoteBookmarkButtons.tsx, Header.tsx, Footer.tsx, page.tsx, browse/page.tsx, prompt/[id]/page.tsx, prompt/new/page.tsx, ImageUpload.tsx, admin/AdminPromptRow.tsx, admin/layout.tsx.

**Review outcome**: Initial review flagged 10 missing `duration-200` instances (5 in submit form, 4 in landing page, 1 in ImageUpload). All fixed before commit. Final sweep confirmed zero remaining transition instances without explicit duration.

**What's next**: Current UX sprint is complete (all 6 items done). Next sprint could focus on: loading skeleton states, auth page polish, or moving to core features (image upload persistence, project editing).

---

## 2026-04-16 — Iteration 5: Navigation & Information Architecture

**Audit findings** (top problems identified):
1. Header nav links (Browse, Submit) had no active state indicator — users couldn't tell which page they were on
2. Project detail page was a dead end — only a "Back to browse" link, no related projects, no next action to keep users exploring
3. Browse filters reset when navigating back from detail — clicking "Back to browse" went to `/browse` with no query params, losing the user's category/difficulty selections
4. Footer used dark theme (bg-gray-900) clashing with the site's light design system
5. Mobile nav had identical styling for all links regardless of current page

**Research insights**:
- Sticky header with active section indicator (Stripe, GitHub): persistent visual cue for current page using underline + color change
- Breadcrumb trail pattern (GitHub, Google Drive): slash-separated path segments (Browse > Category > Title) with each level clickable for multi-level navigation
- Related content at end of detail pages (Behance, Dribbble): "More in this category" prevents dead-end browsing and encourages deeper exploration
- Sharp-edge active states (Linear): no border-radius, background fill on hover, saturated color on active — fits PathForge's visual language

**Design brief** (3 key goals):
1. Add orange underline + text active state to header nav links so users always know where they are
2. Replace "Back to browse" with a proper breadcrumb (Browse > Category > Title) and add "More in this category" related projects section at the bottom of detail pages
3. Align footer with light theme and ensure consistent visual language across all navigation elements

**What was implemented**:
- **Header active state**: `usePathname()` hook determines current page. Active nav links get `text-brand-orange` color + 2px orange bottom underline (absolute positioned). Browse link activates for `/browse` and `/prompt/[id]` pages (but not `/prompt/new`). Inner spans use `hover:bg-gray-100` for subtle hover feedback.
- **Mobile active state**: Active mobile nav links get `text-brand-orange`, `bg-brand-orange/5` warm tint, and a `border-l-2 border-brand-orange` left accent — consistent with the sharp-edge design system.
- **Breadcrumb navigation**: Replaced simple back link with `<nav aria-label="Breadcrumb">` containing an ordered list: Browse > Category (with icon) > Project Title (truncated at 300px). Each breadcrumb segment is a link except the current page (`aria-current="page"`). Chevron separators use `aria-hidden="true"`.
- **Related projects section**: Fetches up to 3 other projects from the same category (with `limit: 4`, filtering out current project). Displayed in a 3-column grid using existing `PromptCard` component. "View all" link with arrow animation navigates to filtered browse page.
- **Footer light theme**: Changed `bg-gray-900` → `bg-gray-50`, `border-gray-800` → `border-gray-200`, text colors adjusted from `text-gray-400/500` to `text-gray-500` for proper contrast on light background.

**Review outcome**: Approved with nits. Fixed: `isActive` logic bug where `/prompt/new` triggered Browse active state (added exclusion), cleaned up double `ChevronRight` import to single import, added `limit: 4` to related projects query for performance. Remaining nit: long mobile nav className strings could be extracted to helper (cosmetic, not blocking).

**What's next**: Visual consistency & polish (Backlog item #6) — consistent spacing, typography, loading/hover/focus states, transition animations.

---

## 2026-04-16 — Iteration 4: Submit Form UX Redesign

**Audit findings** (top problems identified):
1. The multi-step chain builder — PathForge's core differentiator — was hidden behind a small checkbox mid-form. Users might never discover it.
2. The form was a flat wall of 12+ input fields with no section grouping, no progress sense. Felt overwhelming, especially on mobile.
3. The "Add Step" button used link-style text (colored text, no padding), making it look like a hyperlink rather than an actionable control.
4. No required field indicators — required fields had the `required` HTML attribute but no visual asterisk. Optional fields inconsistently marked.
5. The "Final Result" field was ambiguous in multi-step mode — unclear if it replaces or complements step results.
6. Step accordion headers lacked `aria-expanded`, and no hover contrast change to signal clickability.

**Research insights**:
- Linear-style collapsible cards: each step as a card with left-border accent when active, collapsed to show title + completion state
- Zapier's persistent "+ Add Step" button always positioned below the last step — users expect to add at the bottom
- On-blur validation (not on-type) per NN/g and Smashing Magazine research — less frustrating, catches errors before submit
- Typeform/GitHub review patterns: summary section before submit helps users see the full shape before committing

**Design brief** (3 key goals):
1. Make multi-step the default mode with a prominent visual toggle (two cards: "Multi-step" vs "Single prompt") instead of a checkbox
2. Structure the form into 3 numbered sections with headers and dividers to reduce overwhelm
3. Upgrade interactive affordances: proper Add Step button, required indicators, step completion dots, aria attributes

**What was implemented**:
- **3 numbered sections**: "Project Basics" (title, description, story, category/difficulty/model), "Your Build Journey" (mode toggle + steps or single prompt), "Details & Publish" (tools, tags, final result, submit). Each with a SectionHeader component (orange badge + title + subtitle) and border-t dividers.
- **Mode toggle**: Two-card selector replacing the checkbox. Multi-step selected by default. Cards have orange border + warm bg when active, gray with hover transition when inactive. `aria-pressed` attributes for accessibility.
- **Add Step button**: Full-width, dashed orange border, warm background, shows "Add Step N" with plus icon. Much more discoverable than the previous link-style text.
- **Required field indicators**: Orange asterisk `*` on all required labels, plus a legend at the top of the form ("Fields marked with * are required").
- **Step card improvements**: Three visual states for step number badge (active = solid orange, filled = orange/20 tint, empty = gray). Green completion dot on collapsed steps that have title + content filled. "— click to edit" hint on empty collapsed steps. `aria-expanded` on accordion buttons.
- **Contextual labels**: "Final Result" renamed to "Overall Outcome" in multi-step mode with contextual help text explaining its role relative to step results.
- **Focus states**: `focus:ring-1 focus:ring-brand-orange/20` added consistently to all inputs and selects.
- **ImageUpload fixes**: Removed `rounded-lg` and `rounded-full` that conflicted with sharp-edges design system. Upload button now uses brand-orange hover color instead of generic primary.
- **Submit area**: Slightly larger button (py-3.5, text-base), plus contextual note "Your project will be reviewed by an admin before appearing publicly."

**Review outcome**: Approved with nits. Fixed: removed unused `GripVertical` import, added `aria-expanded` to step accordion buttons and `aria-pressed` to mode toggle buttons. Remaining nits noted but not blocking: step `required` attributes only validate the currently expanded step (pre-existing pattern), mode toggle could use `grid-cols-1 sm:grid-cols-2` for sub-320px screens (works fine on standard phones).

**What's next**: Navigation & information architecture (Backlog item #5) — header, footer, breadcrumbs, mobile nav flow.

---

## 2026-04-16 — Iteration 3: Project Detail Page Redesign

**Audit findings** (top problems identified):
1. Prompt and result sections used nearly identical styling — impossible to distinguish input from output at a glance
2. Step numbers floated disconnected from cards; the vertical pipe didn't create a strong "path" metaphor
3. Section headers ("The Story", "The Path") used tiny text-xs uppercase — lost in visual noise
4. Metadata bar crammed author, votes, model, and tools into one wrapping line
5. Story section was a plain white box with no visual weight — the core differentiator felt flat

**Research insights**:
- GitHub-style metadata chips: scannable tag row below the title with semantic color coding (model = blue, difficulty = colored dot, category = gray)
- Dev.to article typography: strong H2 headers with icons to anchor sections, breathing room between content blocks
- Product Hunt author pattern: avatar + name + date as a compact left-aligned block, actions (vote/bookmark) right-aligned

**Design brief** (3 key goals):
1. Make prompt vs result instantly distinguishable via color-coded left-border accents (orange = prompt, green = result) and distinct background tints
2. Strengthen the step flow visualization — larger nodes (38px), thicker pipe, better visual anchoring
3. Reorganize metadata into scannable chip row + clean author/actions row

**What was implemented**:
- **Prompt/Result distinction**: Orange 4px left-border + warm bg tint for prompts, green 4px left-border + green bg tint for results. Each also has a colored square dot next to the label. Immediately scannable.
- **Step flow**: Nodes enlarged to 38px with 3px border, pipe thickened to 3px at 30% opacity (background element, not competing). Steps spaced at 8-unit gap for breathing room.
- **Section headers**: "The Story" and "The Path" upgraded to text-lg font-bold with lucide icons (MessageSquare, ChevronRight). Step count shown as muted inline text.
- **Metadata chips**: Category, difficulty (with colored dot), step count, model (with Cpu icon), and tools (with Wrench icon) all as scannable tag chips below the title.
- **Author row**: Avatar placeholder (gradient from orange→blue, first letter), display name, date — left-aligned. Vote/bookmark buttons right-aligned. Clean separation via border-top.
- **Story section**: Orange left-border accent with primary-50 background tint — warm and prominent.
- **CopyButton**: Green background + border + "Copied!" on success (was just gray text color change). Timeout extended to 2.5s. Hover states use brand-orange tint.
- **Tags**: Now prefixed with # for consistency with browse page cards.
- **Semantic HTML**: Replaced generic divs with `<header>` and `<section>` elements.

**Review outcome**: Approved with nits. Fixed the CSS border-color conflict on the result section (changed `border-green-500` to `border-l-green-500` for explicit side targeting). Other nits were cosmetic or pre-existing (clipboard API error handling, aria-live for copy state).

**What's next**: Submit form UX (Backlog item #4) — multi-step chain builder intuitiveness, form validation, progress indication.

---

## 2026-04-16 — Iteration 2: Browse Page Refinement

**What was done**: Redesigned the browse page and PromptCard component for better usability and visual polish. Key changes:
- **PromptCard redesign**: Added mini step-flow visualization at top of cards (numbered step boxes with chevron connectors showing the build journey at a glance), difficulty badges now include colored dots for quicker scanning, added user avatar placeholder in footer, tags prefixed with # for clarity, tools truncated with "+N" for overflow, hover state adds brand-colored offset shadow for depth
- **Search bar**: Added search icon (magnifying glass) inside input field for clearer affordance
- **Filter labels**: Added "Category" and "Level" section labels (Level label visible on mobile only) to make filter groups scannable
- **Result count**: Shows "N paths in Category at level matching query" contextual result summary above the grid
- **Clear filters**: Added "Clear filters" link next to sort controls when any filter is active, plus a prominent "Clear all filters" CTA in the empty state
- **Empty state**: Redesigned with FolderOpen icon, dashed border, and contextual messaging (different text for search vs filter misses)
- **Mobile responsiveness**: Filter controls stack vertically on small screens with proper labels

**Build note**: TypeScript compiles clean. Full `npm run build` fails only due to sandbox network restriction (can't fetch Google Fonts) — not a code issue. Will build fine in Vercel deployment.

**What's next**: Continue with Project detail page improvements (Backlog item #3) — step-by-step flow visual clarity, story section prominence, copy button UX, metadata display.

---

## 2026-04-16 — Iteration 1: Landing Page UX Overhaul

**What was done**: Redesigned the landing page hero and overall visual hierarchy. Key changes:
- **Hero section**: Added a branded tagline chip ("Community-driven AI project sharing"), rewrote headline to be more action-oriented ("See how it was built. Build it yourself."), added a mini flow preview showing the prompt→result→refine→ship concept at a glance, changed secondary CTA from "Create Account" to "Share Your Build" (more inviting)
- **Pipe connectors**: Replaced thick line connectors with thinner, more elegant lines with pulsing dot nodes (animated) — feels more like a living data flow between sections
- **Problem section**: Cleaned up card design with orange dot indicators instead of colored headers, better text contrast, hidden left-side pipe on mobile for cleaner layout
- **Solution flow diagram**: Added directional ChevronRight arrows between steps, made boxes larger/bolder, added mobile-responsive vertical layout (stacks on small screens)
- **Features section**: Added section header ("Why It Works / Built for real workflows"), reordered cards (See Every Step first — the core differentiator), added hover transitions on icon backgrounds
- **Popular Paths section**: Added subtitle text, added empty state for when no paths exist yet
- **Final CTA**: Added secondary "or browse paths first" link for lower-commitment visitors
- **CSS**: Added subtle pulse animation for pipe connector nodes
- **Drew's feedback**: Acted on Q1-Q4 responses — creative direction, between technical/approachable tone, desktop-first, stepped flow emphasis

**What's next**: Continue with Browse page refinement (Backlog item #2) — card design, filter UX, empty states, sort options.

---

## 2026-04-16 — Session 0 (Setup)

**What was done**: Set up the autonomous iteration system. Created BACKLOG.md, ITERATION_GUIDE.md, ITERATION_LOG.md, QUESTIONS.md. Updated CLAUDE.md with iteration instructions. Focus is purely on design, UX, visual polish, and production readiness — no backend feature work.

**What's next**: First real iteration should pick the top item from the Current Sprint in BACKLOG.md (landing page UX improvements).

---

---

# Plain English Summary (for Drew)

> What's actually changed on the site, in normal human language. Newest at the top. Let me know when you've reviewed and I'll clear the old stuff.

### The landing page finally has a "main" problem — and the auth pages join the design system (April 16 — Iteration 23)

Two things got better this round: the landing page's problem section actually tells a story now, and the login/signup pages finally look like they belong on the same site as everything else.

**The landing page problem section now has a clear "main" problem.** Before, there were four equal-sized cards stacked in a 2x2 grid: "Blank Chat Tax," "Hidden Craftsmanship," "Weak Reproducibility," and "Lost Branches." They were all the same size, same typography, same small orange dot icon. Nothing told a visitor "this is the main problem and these three are consequences of it" — even though that's what the words were actually saying. Now "Blank Chat Tax" sits at the top as a wider, taller card with a bold orange bar down its left edge, a little "THE ROOT PROBLEM" label above it, and a much bigger, bolder title. The other three cards moved into a three-across row underneath, smaller and with neutral gray dots instead of orange ones. The hierarchy matches the message: blank-chat is the problem; the other three are what that problem causes. The eye lands on it first, which is the right thing to land on.

**Login and signup pages now use the same color palette as the rest of the site.** Every other page migrated to a cooler zinc-based color palette weeks ago, but the auth pages were still using plain gray. If you looked carefully you could see it — the form input borders, the subtitle text, the page background were all slightly warmer and more generic than everything else. Now they use the same cool palette, which doesn't jump out as "look at me I fixed a thing" but it's the kind of detail that makes a site feel finished.

**The "Log in" and "Create Account" buttons match the hero CTA.** Before, the auth submit buttons used slightly different typography (medium weight), missing keyboard focus ring, and no minimum tap height for mobile. Now they match the "Browse Build Paths" button on the home page exactly — same font weight, same keyboard focus behavior, same 44px minimum height. Small but important for a site that's trying to feel like a real premium tool.

### Landing page feels calmer and more on-brand, and every iteration will now use screenshots (April 16 — Iteration 22)

Two things happened this round — one process change (your request) and one design overhaul (the landing page).

**The process change: every future iteration screenshots the page before and after.** You said that if we actually look at the site, we'll catch things that reading the code doesn't reveal. You were right. I added a mandatory "screenshot the live site before auditing, and screenshot again after implementing" step to both the iteration guide and the skill file that drives the scheduled runs, so this is now baked in permanently. I also wrote it into memory so I don't forget.

**The design overhaul: the landing page finally caught up to the rest of the site.** It was the last page still on the old color system — raw Tailwind grays, plain white backgrounds, and a bunch of stuff that didn't match the browse/build/detail pages you already signed off on. Three big changes:

- **The decorative "pipe" connectors between sections are gone.** There were five of them — little vertical lines with pulsing dots between each section. On screen they read as keynote-slide chrome, not as a premium dev tool. Linear and Vercel don't use anything like them. The page now flows section to section via alternating backgrounds (off-white → white → off-white) and clear borders, which feels much more confident.

- **The green color is gone.** The flow diagram had a green "Result" box at the end that stood out from the rest of the diagram in a jarring way, and one of the three "Why It Works" cards had a green icon and green hover shadow. Green isn't in the brand palette (orange and blue only), so it looked like a stray color. Now the "Result" box uses orange — which visually closes the loop with the "Build Path" box at the start — and the "Proven Results" card uses orange too.

- **The hero is cleaner.** The small "Community-Driven AI Project Sharing" chip above the big headline is removed (that pattern has fallen out of fashion on modern dev-tool landing pages). The second line of the headline — "Build it yourself." — used to have a loud orange gradient that overwhelmed the first line; it's now solid orange so both lines have equal visual weight. And the two separate gray subtitle lines underneath the headline are now one clean paragraph.

Smaller fixes: all the gray text/borders migrated to the cooler zinc palette the rest of the site uses; touch targets on the smaller "or share your build" and "or browse paths first" links are now big enough for mobile; section padding is consistent throughout; the "View all paths" button is now a neutral outline style so it doesn't compete with the orange primary button elsewhere.

**One caveat on screenshots:** I was able to take "before" screenshots of the live site this round, but I couldn't take "after" screenshots yet because the sandbox where I'm editing can't share a dev server with your browser. Once you push and Vercel deploys this change, the next iteration will screenshot the deployed version and confirm the fix reads well in pixels, not just code.

### Build page looks polished and consistent with the rest of the site (April 16 — Iteration 21)

The Build page was still using the old gray color palette while the rest of the site had moved to the new cooler zinc-based palette. It was like one room in a house that hadn't been repainted. Now all ~40 gray references have been swapped to the design system's surface tokens, so the Build page feels like part of the same product as the Browse and Detail pages.

Three interaction improvements: The little arrow buttons for reordering steps and the trash icon for deleting them were tiny and hard to tap on mobile. They're now bigger with better hover effects (they turn orange when you hover). The progress bar showing "2 of 3 steps filled" was barely visible — now it's taller with bolder text, and when you complete all steps it turns green and says "All steps complete" instead of just showing 100%. The "Add Step" button now has a dashed border that solidifies when you hover over it, making it feel more inviting to click.

### Browse page cards and filters are easier to scan and use (April 16 — Iteration 20)

The browse page got a focused hierarchy and interaction pass. Three main changes:

**Cards now lead with the project title, not the category.** Before, the first thing your eye hit on each card was "🎨 DESIGN" or "💰 FINANCE" in bold uppercase — the category label was visually shouting louder than the actual project name. Now the title comes first and is slightly larger. The category is still there, but it's demoted to a quieter line below the description. When you're scanning a grid of 12+ cards, your eye now catches project names first, which is what you actually care about.

**Everything is more evenly spaced.** The filter toolbar, card grid, and section headers were using a mix of 16px, 20px, and random gaps that felt slightly off. Now everything snaps to a clean 24px rhythm — the toolbar padding, the gaps between cards, the space above section headers. It's subtle but the page feels more "designed" and less thrown together.

**Filter controls give better feedback.** The sort toggle (Newest/Popular) now shows a little orange line under whichever is active — before, the active one was just slightly darker text on a slightly lighter background (too subtle). All the category and difficulty filter buttons now briefly darken when you tap them on mobile (before, there was zero visual feedback that your tap registered). The active filter chips (the orange pills that appear when you filter by category or difficulty) are slightly more visible with a stronger border, and the X to dismiss them is easier to see.

### Every project now has complete step-by-step results (April 16 — Iteration 19)

Previously, 10 project steps across 7 different projects were showing up empty — you'd see the prompt the person typed, but no result from the AI. This made those projects look broken or abandoned. The worst offender was the "SaaS Admin Dashboard" project which had ALL three steps empty — clicking into it showed three prompts with zero outputs.

Now every single step has real, detailed content. The SaaS Dashboard shows actual React component code. The Brand Identity project now ends with a complete brand guidelines document. The meeting notes tool shows how it handles long transcripts. The Zapier workflow has all three email templates written out. The spreadsheet audit bot includes a working Google Apps Script you could actually paste into a spreadsheet.

This is a big deal because the step-by-step build path is the core thing that makes PathForge different from other platforms. If visitors click into a project and see missing steps, they'll think the platform is half-baked.

### Project detail page looks way more premium now, and the Build page lets you jump between sections (April 16 — Iteration 18)

Two changes this round:

**The project detail page got a major visual upgrade.** When you click into a project and see the step-by-step build path, the prompts now look like a code editor — dark background with light text, like a terminal window. This makes it immediately clear "this is what the person typed into the AI." The results, by contrast, have a light blue-tinted background — softer and distinct. Before, prompts and results looked almost the same (both had colored stripes on the left with equal visual weight). Now there's a clear "input → output" flow. The step headers are also way more visible — they used to be light gray text on a light gray background (nearly invisible), now they're white text on a dark bar. You can actually scan through the steps quickly.

The whole page also switched from Tailwind's default gray colors to the proper PathForge surface palette (cooler zinc tones) — so it matches the rest of the site instead of feeling slightly warmer/different.

**The Build page now lets you open multiple sections at once.** Previously, clicking "Your Build Journey" would collapse "Project Basics." Drew said he'd prefer to jump freely between sections, so now clicking one section doesn't close the others. You can have all three open at once if you want. The only rule: at least one section always stays open so you never get a completely collapsed empty page.

### The header is now accessible and the "Build" button pops (April 16 — Iteration 16)

The navigation bar at the top of every page got a focused accessibility and design pass:

- **You can actually read the nav links now.** The text on the dark header was too low-contrast before (light gray that blended into the dark background). Now the links are brighter and pass accessibility standards. The Admin link was especially hard to see — that's fixed too.

- **"Build" stands out as the main action.** Instead of looking identical to "Browse," the Build link now has a subtle orange border that fills with orange when you hover over it. It's clearly the thing you're supposed to click if you want to share a project. On mobile, it's also bolder than the other links.

- **Active page is shown in orange everywhere.** Before, the currently-active page was highlighted in white on desktop but orange on mobile — inconsistent. Now it's orange everywhere, matching the brand.

- **Keyboard users can see where they are.** Every link and button now shows an orange outline when focused with the keyboard. Before, there was zero visual indication.

- **Mobile menu items are bigger.** The tap targets in the hamburger menu were too small (about 24px tall). Now they're 44px — the recommended minimum for comfortable tapping. The hamburger button itself is also larger.

- **The header blends better with the page below.** Instead of a hard line between the dark header and the light page, there's now a subtle shadow that creates a natural sense of depth.

### Browse page cards now look dramatically different when featured (April 16 — Iteration 14)

The browse page got a focused pass on three things: making featured projects actually stand out, cleaning up the cards, and polishing the filter bar.

- **Featured projects are now obvious.** Before, the "featured" cards at the top of the page were almost identical to regular cards — just slightly larger text (2px difference) and slightly more padding (4px difference). Nobody could tell they were special. Now featured cards have an orange stripe on the left edge, a "Featured" label with a star icon at the top, a noticeably larger title, and the step flow shows 6 steps instead of 4. There's also a "Featured Projects" header above the featured row and an "All Projects" header above the rest of the grid.

- **Cards are easier to scan.** The card footer used to have three separate visual zones stacked vertically: metadata badges, model info, then author + stats. Now it's all consolidated into one clean row at the bottom — difficulty badge and model on the left, author and vote/bookmark counts on the right. Less visual noise, faster scanning. The step overflow also looks better: instead of bare "+4" text, there's a small matching box with the count.

- **The filter bar feels more polished.** The search input now shows a subtle orange glow when you click into it (and the magnifying glass icon turns orange too). The sort toggle (Newest/Popular) is now inside a bordered container with the active option highlighted — it looks like a proper segmented control instead of floating text. Inactive filter chips have a light gray background instead of pure white, giving them a "recessed" feel. The dismiss × on active filter chips is bigger and more visible.

### The submit form is smarter and easier to navigate (April 16 — Iteration 13)

The form to share a project got a second design pass focused on making it less confusing and more helpful:

- **Section numbers are now blue instead of orange.** Before, the big "1 / 2 / 3" section headers used the same orange color as the step numbers inside the form, so your eye couldn't tell "section of the form" from "step in your project." Now sections are blue and steps are orange — two different levels, two different colors.

- **You can see how far along your steps are without expanding them.** Collapsed step cards now show "Complete," "In progress," or "Click to edit" in text underneath the title. There's also a progress bar at the top that fills up as you complete steps — "2 of 4 steps filled — 50%." Before, you had to expand each step one by one to check if you'd filled it in.

- **The form actually tells you what's missing before you submit.** Previously, hitting "Submit" with empty fields showed the browser's default error popup (that ugly little tooltip). Now the form checks everything itself: empty required fields get a red border with a message like "Project title is required" right below the field. If multiple fields are missing, the page scrolls you to the first one. The errors disappear in real-time as you fill things in.

- **The "Add Step" button looks like a real button now.** It had a dashed border before, which made it look like a placeholder or dropzone rather than something you should click. Now it has a solid border, bolder text, and a clear hover effect.

### Browse page filters are now cleaner and easier to use (April 16 — Iteration 10)

The browse page's filter system had a confusing inconsistency: when you selected a category, the chip turned orange, but when you selected a difficulty level, the chip turned dark gray. Now they both turn orange — "orange means selected" is the universal rule.

There's also a new "Filtered by" bar that appears when you have any filters active. It shows removable chips for each active filter — so if you're browsing "Marketing" at "Beginner" level, you'll see two little orange-tinted chips with × buttons. Click the × on "Marketing" to remove just that filter without clearing everything. There's also a visible "Clear all" button that's easier to spot than before (it used to be a tiny gray text link that blended into the background).

Other small fixes: the search button is now a magnifying glass icon instead of the word "Search" (saves space, looks cleaner), the search input shows a subtle orange glow when you click into it (accessibility for keyboard users), and the spacing between sections is more consistent.

### Pages now show skeleton placeholders while loading instead of blank screens (April 16 — Iteration 8)

Before this, when you navigated to any page (browse, project detail, profile, admin), the screen went completely blank while data was being fetched from the database. On a slow connection, this could last 3-5 seconds — it looked like the site was broken.

Now every page shows a "skeleton" loading state: gray placeholder shapes that match the layout of the real content, with a subtle shimmer animation sweeping across them. The browse page shows placeholder filter chips and a grid of placeholder cards. The project detail page shows placeholder breadcrumbs, title, steps, and related projects. The profile page shows the banner, avatar, and stat cards as placeholders. It all feels like the page is loading rather than broken.

The skeletons are carefully sized to match the real content, so when the data arrives, things don't jump around on screen. They use sharp edges (matching PathForge's design) and a reduced-motion option for accessibility.

### Login, signup, and profile pages got a proper design pass (April 16 — Iteration 7)

The login and signup pages used to be plain white forms — functional but generic. Now when you visit them on a desktop, there's a colored side panel with PathForge branding: the login page has an orange panel saying "See what others built with AI" with a little numbered flow diagram, and the signup page has a blue panel saying "Share what you built with AI" with feature highlights. On mobile, the panels disappear and you just get the clean form.

Other fixes: all form inputs now show a visible orange glow when you tab into them (they didn't before — bad for keyboard users), the submit buttons animate properly on hover, passwords show a real-time checkmark when you've typed 8+ characters, and error messages now have an icon so they're easier to spot.

On user profiles, the stats boxes (Projects/Upvotes/Saves) used to look like they should be clickable but weren't — now they have a recessed gray background so it's clear they're just displaying numbers. And if a user has no projects yet, instead of a bland "No projects" message, there's a proper empty state with an icon and a "Share your first project" button.

### Everything feels smoother and more consistent now (April 16 — Iteration 6)

Hover over any card on the site — project cards, category cards, the feature cards on the landing page — and they all respond the same way now: the border changes color and a subtle shadow slides in underneath. Before, every card had its own different hover behavior (some got shadows, some just changed border color, some did nothing). It felt inconsistent.

Same with animations. When you hover over a button or filter chip, the color change now happens at the same speed everywhere (200ms). Before, some things changed instantly while others felt sluggish — now it all feels uniform and polished.

This was a "boring but important" update — the kind of thing users feel rather than see. The site just feels more intentional and put together.

**The UX sprint is now complete!** All backlog items including loading states are done. The next question: what do we focus on next?

### Navigation now tells you where you are and where to go next (April 16 — Iteration 5)

Three things changed:

- **The header highlights which page you're on.** Before, the "Browse" and "Submit" links looked identical no matter where you were. Now the active page gets orange text and a little orange underline. Small thing, but it means you always know where you are.

- **Project pages have breadcrumbs and related projects.** Instead of just a "Back to browse" link at the top, there's now a trail: Browse > Category > Project Title — and each piece is clickable. At the bottom of every project, you'll see "More in [Category]" with 3 related projects. No more dead ends.

- **The footer matches the rest of the site.** It was dark gray (leftover from an earlier dark theme), now it's light gray like everything else.

### The submit form got a complete UX overhaul (April 16 — Iteration 4)

The "Share a Project" form was one long wall of fields with no structure. Now it's organized into three clear sections with numbered headers:

- **Section 1: Project Basics** — title, description, story, category, difficulty, model. All required fields now have an orange asterisk so you know what's mandatory.

- **Section 2: Your Build Journey** — this is the big one. The multi-step builder used to be hidden behind a tiny checkbox that said "This project has multiple steps." Most users would never find it. Now there are two big cards to choose from: "Multi-step" (the default!) and "Single prompt." Multi-step is selected by default because showing the step-by-step journey is what makes PathForge special.

- **Section 3: Details & Publish** — tools, tags, and the final result. In multi-step mode, the "Final Result" is now called "Overall Outcome" with help text explaining it's a summary of all your steps.

The "Add Step" button used to look like a plain text link. Now it's a proper full-width button with a dashed border that says "Add Step 3" (or whatever number you're on). Much easier to find. Each step card also shows a green dot when it's filled out, so you can see your progress at a glance.

### The project detail page got a major visual upgrade (April 16 — Iteration 3)

### Project detail page got a major flow + hierarchy upgrade (April 16 — Iteration 11)

When you open a project, three big things changed:

- **The step numbers are impossible to miss.** They used to be tiny text inside thin-bordered white squares. Now they're large bold white numbers on solid orange squares — each step is a clear visual anchor as you scroll down the page.
- **The vertical pipe between steps actually animates.** There was a pipe-draw animation defined in the code but it was never actually turned on. Now it is — the connecting line draws itself when the page loads and is more visible (stronger opacity). It makes the page feel alive.
- **The story comes first.** Previously, the author's name and the metadata chips (category, difficulty, model, tools) were all bunched between the title and the story section. Now the author appears right under the title for immediate human connection, the metadata is organized into two clean groups (context stuff like category/difficulty, and technical stuff like AI model/tools), and the Story section itself has a bigger heading and stronger background so it really stands out as "read this first."
- **Every step header says "Step 1 of 3"** (or whatever the count is). Before, steps without titles had no header at all.

### Project detail page improvements (April 16 — Iteration 3)

When someone clicks into a project to see the full step-by-step build journey, the page now looks and feels much better:

- **You can instantly tell prompts from results.** Before, they looked almost identical — just a tiny label difference. Now prompts have an orange stripe on the left and a warm background, while results have a green stripe and green tint. Your eye immediately knows "this is what the person typed" vs "this is what the AI gave back."

- **The step-by-step flow feels like a real path.** The numbered circles on the left are bigger and bolder, connected by a gradient line. It actually looks like you're following a trail — which is the whole point of PathForge.

- **Key info is in little tags at the top.** Instead of burying the AI model, difficulty, and tools in a cluttered text line, they're now neat little chips right under the title. You can scan them in a second.

- **The author section looks real.** Colored avatar circle with the author's initial, their name, the date. Vote and bookmark buttons sit neatly to the right.

- **"The Story" section pops.** The part where people explain what they built and why now has an orange accent bar — it signals "read this first."

- **The copy button actually shows you it worked.** The whole button turns green with "Copied!" for a couple seconds.

### The browse page got a redesign (April 16 — Iteration 2)

- **Project cards show a mini step-flow.** Little numbered boxes with arrows between them — see at a glance that a project has 3 or 5 steps before you click in.
- **Better filtering.** Search icon, filter labels, result count ("12 paths in Marketing at beginner level"), and a "Clear filters" link.
- **Difficulty badges have colored dots.** Green for beginner, amber for intermediate, red for advanced.

### The landing page hero got cleaned up (April 16 — Iteration 9)

The hero section was doing too much — a colored badge, a big headline, three sentences of description, two equal-looking buttons, AND a mini flow diagram. A first-time visitor had too many things competing for their attention. Now it's much simpler: the headline dominates, the description is two short punchy lines instead of a paragraph, and there's one clear "Browse Build Paths" button with a subtle "or share your build" text link underneath. The mini flow diagram was removed from the hero (it's still in the Solution section below where it makes more sense). All section headings across the page are now the same size — before, "Why It Works" and "Popular Build Paths" were noticeably smaller than the other sections. The Popular Paths section also got a small orange accent bar on the left of its title, tying it to the brand.

### The landing page got a full overhaul (April 16 — Iteration 1)

- **New hero.** "See how it was built. Build it yourself." — tells you what PathForge is immediately.
- **Pipe visual language.** Thin animated lines with pulsing dots connecting sections — feels like a living data flow (the "Flappy Bird pipes" idea).
- **Better CTAs.** "Explore Paths" + "Share Your Build" + a low-commitment "or browse paths first" link.
- **Solution flow diagram.** Four connected boxes: Describe → Prompt → Refine → Share.
