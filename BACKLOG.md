# PathForge — Iteration Backlog

> This file is the single source of truth for what to work on. Each hourly iteration picks the top unblocked item from the current sprint.
> After completing work, move the item to "Completed" with the date and a one-line summary of what was done.

---

## Current State

MVP is live at https://prompt-forge-sandy.vercel.app. Auth, browse, project detail, admin dashboard, voting/bookmarks, and user profiles all work.

**Design direction has changed (2026-04-16).** Drew has reviewed the site and is deeply unhappy with the overall design quality. The site looks generic and unpolished. The previous UX polish sprint made incremental tweaks but never addressed the fundamental problem: the design doesn't feel like a modern, premium tool. Everything needs to level up — especially the browse and build pages.

**New design direction**: Modern dev tool aesthetic (think Linear, Vercel, Raycast). Dark/neutral tones, crisp typography, minimal but premium feel. Keep the orange accent color and sharp corners — they're the brand — but execute them at a much higher level. The orange should pop against darker/cooler surfaces, not sit on generic white/gray.

**Code changes already made (2026-04-16 Drew session)**:
- `globals.css` — Updated surface palette to cooler zinc tones, body bg to #fafafa, tighter animations, better scrollbar
- `Header.tsx` — Redesigned with dark (surface-900) background, compact 48px height, 13px type, Plus icon on Build link
- `PromptCard.tsx` — New design with top accent line on hover, better hierarchy, `featured` prop for larger cards
- `browse/page.tsx` — Rebuilt with toolbar-style filters, featured projects section, cleaner grid

These changes are a starting point. Iterations should build on them, not revert them.

**Last updated**: 2026-04-16 (Iteration 26 — Browse toolbar collapse: ~200px 3-row filter wall compressed to one Linear-style row with native `<details>` category popover, promoted result count to section anchor, solid FEATURED pill, decluttered card footer; fixed in-sandbox screenshot pipeline so iterations stop skipping the visual audit)

---

## Current Sprint — Design Overhaul

Priority order. Work top-down. **Every iteration should be making the site look and feel significantly better.** Small bug fixes are NOT the priority — visible, dramatic design improvements are.

### 1. Browse page — make it actually good
The browse page is the core experience. People land here to find projects. Right now it's nowhere near ready.
- **Cards need to sell the project**: Show what was built, make people want to click. The card should communicate the "wow factor" — not just list metadata.
- **Visual hierarchy**: There needs to be a clear sense of what's trending, what's new, what's featured. Everything can't look the same weight.
- **Filters should feel integrated**: Not tacked on. Think Linear's filter bar — compact, powerful, part of the page design.
- **Grid layout and spacing**: The grid needs to feel intentional. Consider different card sizes for featured vs regular.
- **The page needs personality**: It should feel like a curated gallery of AI projects, not a generic CRUD list.
- Reference: Linear app list views, Vercel templates page, Raycast store, GitHub Explore

### 2. Build/Submit page — rich project builder
This is how people share their work. It needs to feel like building a portfolio piece, not filling out a government form.
- **Transform from form to builder**: The experience should feel like you're crafting something, not submitting data.
- **Live preview**: As you fill in steps, show what the project will actually look like. Side-by-side or toggle preview.
- **Step builder needs to be polished**: Drag-and-drop reordering, smooth animations when adding/removing steps, each step should feel like a card you're building.
- **Image uploads need to feel premium**: Not just a file input. Think drag-and-drop zones, image previews, the kind of upload experience you'd see on Dribbble or Behance.
- **Smart defaults and less friction**: Auto-suggest tags, remember the user's preferred model, make common paths easy.
- Reference: Notion page builder, Linear issue creation, Vercel project setup flow

### 3. Header — refine the new dark design
The header was redesigned in the Drew session. It needs refinement:
- Make sure the dark header works well with all page backgrounds
- Logo treatment — does the current logo work on dark? May need a light version
- Active states need to be clear but subtle
- Mobile menu needs to match the new dark aesthetic
- Consider: should there be a command palette (Cmd+K) feel?

### 4. Project detail page — showcase the build path
The detail page is where people experience a full project. It needs to feel premium.
- The step-by-step prompt→result flow is the core differentiator — make it beautiful
- Code/prompt blocks should look like a real code editor (think VS Code's aesthetic)
- Results should feel distinct from prompts — different visual treatment
- The "story" section needs to draw people in
- Images/screenshots need to display beautifully when they're available
- Apply the new dark/modern aesthetic consistently

### 5. Landing page — match the new direction
The landing page needs to match whatever the browse/build pages look like after their overhaul.
- Don't work on this until browse and build are in good shape
- The hero needs to immediately communicate the new, premium feel
- Show real project examples prominently
- The visual flow/pipe concept may need to evolve with the new aesthetic

### 6. Seed project content — replace with real, impressive examples
**Drew says the current example projects are worthless.** They have vague ideas, no real prompts, no images, no actual results. The whole platform is supposed to showcase what people BUILT — and the seed data doesn't demonstrate that at all. If a first-time visitor sees these projects, they'll think the platform is a joke.
- **Every seed project needs to be a real, complete build path**: A specific thing that was actually built with AI, with the actual prompts used (not placeholder text), the actual results at each step (not "AI generated a response"), and screenshots/images of the final output where possible.
- **The prompts need to be good**: Show real prompt engineering — system prompts, specific instructions, iteration. Not "Write me a blog post about X."
- **Results need substance**: Show what the AI actually produced. Code snippets, copy, designs described in detail, data analysis output — whatever the project created.
- **Cover diverse, interesting use cases**: Finance dashboard, marketing campaign, code generation, data analysis, creative writing, design work. Things that make people think "oh wow, I could do that."
- **Quality bar**: Each seed project should be something you'd be proud to show an investor or put on Product Hunt. If it doesn't make you want to click into it, it's not good enough.
- This is in `supabase/seed-fix.sql` and `src/lib/mock-data.ts` — both need to be updated together.
- Consider adding 8-12 high-quality projects across different categories rather than a handful of generic ones.

### 7. Overall design system consistency
After the individual pages are improved:
- Consistent component styling across all pages
- Button hierarchy (primary/secondary/ghost) that works everywhere
- Form input styling that feels premium
- Loading states that match the new aesthetic
- Color usage — orange as accent, not as primary bg on everything

---

## Next Sprint — Core Features

These are queued but not yet prioritized for hourly iterations.

- **Image upload persistence** (Drew confirmed priority — Q10 answered "C"): Wire ImageUpload component to Supabase Storage so project screenshots actually save. Once live, the Browse page cards should gain a thumbnail preview slot at the top so cards can sell the project visually — this is the "gallery feel" unlock for Browse.
- **Project editing**: Let authors edit their submitted projects
- **Forking/remixing**: Let users clone a project as a starting point for their own version
- **Comments/discussions**: Threaded comments on project detail pages
- **User profile enhancements**: Bookmarks tab, activity feed, bio editing
- **Karma/reputation system**: Points for submissions, upvotes received, etc.
- **Search improvements**: Autocomplete, suggested searches, "similar projects"
- **Draft saving**: Auto-save submit form progress so users don't lose work

---

## Backlog — Future

- **Cmd+K command palette**: Keyboard-first navigation for power users. Search projects, navigate pages, trigger actions. Signals "this is a technical tool." Lower priority per Drew.
- Private collections / saved searches
- Team features / organizations
- API access for developers
- Featured/promoted projects
- Project certification/verification
- Notification system
- OAuth providers (Google, GitHub login)
- Analytics dashboard for project authors
- Embed widgets (share projects on external sites)
- AI-powered project recommendations

---

## Completed

| Date | Item | Summary |
|------|------|---------|
| 2026-04-16 | Browse page — filter-toolbar collapse + promoted result count + solid FEATURED pill + card-footer declutter + in-sandbox screenshot pipeline | Compressed ~200px 3-row filter wall (search / 11-pill category wall / level+sort) into a single Linear-style toolbar: search + native `<details>` category popover (3-col grid, keyboard-accessible, no JS) + inline Level segmented control + Newest/Popular sort. Promoted "33 Projects" from orphaned `text-[13px]` to `text-2xl font-bold tabular-nums` section anchor with active-filter chips + "Clear all" inline. Upgraded Featured / All Projects eyebrows to `text-lg font-bold` + Sparkles / Layers icons + uppercase tracking count ("2 HIGHLIGHTED", "31 TOTAL"). Swapped PromptCard's invisible outlined `★ Featured` eyebrow for solid `bg-brand-orange text-white` FEATURED pill + subtle `color-mix` orange-tinted featured card bg. Dropped decorative user-icon box from card footer; author now reads as `by {name}` prefix on a single typographic line. Fixed the chronic screenshot-gate problem by installing Playwright headless chromium inside the sandbox — 5 before PNGs + 4 after PNGs + independent reviewer that actually loaded them. First iteration since #21 to pass the visual audit gate for real. |
| 2026-04-16 | User profile page — dev-tool identity row, GitHub-cadence stat tiles, palette migration | Killed 2018-era gradient-banner + overlapping-avatar SaaS header; replaced with clean identity row (square brand-orange monogram + Linear-style inline meta line: Joined · N projects · Top category). Stat cards migrated from centered `bg-gray-50` pastel tiles to GitHub-style left-aligned numeric tiles with Upvotes highlighted in brand-orange as the eye-guide accent. Section heading upgraded `text-lg font-semibold` → `text-xl font-bold`; heading + right-aligned count on one baseline. Empty-state CTA aligned to landing primary spec (`font-bold`, `duration-150`, `min-h-11`, `focus-visible`). Loading skeleton structure-matched + monogram tinted `bg-brand-orange/40` to prevent color pop. Zero `gray-*` classes remain in `src/app/user/[username]/`. |
| 2026-04-16 | Footer dark-bookend redesign + full public-palette migration | Footer swapped from light `bg-gray-50` 4-col Mailchimp footer to dark `bg-surface-900` footer (mirrors Header → "dark bookend" visual symmetry). Every remaining `gray-*` token eliminated from public non-admin code: Skeleton, CategoryCard, VoteBookmarkButtons, landing loading, project detail loading, user profile loading, layout body. Shimmer animation annotated with surface-* mappings. Footer links got focus-visible outlines (dark-bg a11y). |
| 2026-04-16 | Landing problem-card hierarchy + auth page design system consistency | "Blank Chat Tax" promoted to full-width primary card (border-l-4 brand-orange, text-2xl font-black, "The root problem" eyebrow); three siblings demoted to 3-col grid with surface-400 dots + p-5. Auth pages fully migrated gray-* → surface-* (zero gray-* classes remain); auth submit buttons aligned to landing primary spec (font-bold, duration-150, focus-visible ring, min-h-11); auth link font-weight harmonized to font-semibold. |
| 2026-04-16 | Landing page — screenshot-driven overhaul: removed 5 between-section pipe connectors, killed green leak (flow diagram + Proven Results card), migrated gray-* → surface-*, killed tagline chip, solid-orange H1, consolidated hero subtitle, py-20 standardized, min-h-11 secondary CTAs. Also added mandatory screenshot step (Step 1.5 + Step 6) to ITERATION_GUIDE and SKILL per Drew's direction. |
| 2026-04-16 | Build page — surface-* token migration, interactive control sizing (p-2 touch targets), progress bar upgrade (h-2, green at 100%), ImageUpload responsive grid + mobile remove button |
| 2026-04-16 | Browse page — card hierarchy (title-first), spacing rhythm (8px grid), interactive states (sort indicator, touch feedback, focus ring) |
| 2026-04-16 | Seed content overhaul — filled all 10 null result_content steps across 7 projects with high-quality content (code, copy, docs, templates) |
| 2026-04-16 | Project detail page — premium step flow (dark prompt blocks, blue result accent, surface-* palette), Build page multi-open accordion (Q7) |
| 2026-04-16 | Build page — progressive disclosure accordion sections (Drew's request), completion indicators, scroll anchoring, a11y fixes |
| 2026-04-16 | Header refinement — accessibility (contrast, focus indicators, ARIA, touch targets), unified orange active states, Build CTA with orange accent, shadow dark/light transition |
| 2026-04-16 | Build page — from form to builder (hero title, step cards, submit refinement) | Borderless Notion-style hero title, step cards as building blocks (shadow, reorder, grip handle), prompt/result tinted sections, mode toggle "Recommended" badge, adaptive submit button with completion summary |
| 2026-04-16 | Browse page — featured card distinction, card hierarchy, filter bar polish | Featured cards with orange left border + badge + text-xl title, consolidated single-row card footer, segmented sort toggle, search focus glow, section headers for featured/all |
| 2026-04-16 | Initial design overhaul kickoff | Updated theme (cooler surface palette), redesigned Header (dark bg), rebuilt Browse page (toolbar filters, featured section), redesigned PromptCard (accent line, better hierarchy) |
| 2026-04-16 | Submit form — typography hierarchy, step builder, validation UX | Blue section numbers, text-xl headers, stronger dividers, step completion badges + progress bar, solid Add Step button, client-side validation with inline errors, inset shadow mode toggle |
| 2026-04-16 | Landing page — Popular Paths discovery & mobile responsiveness | Responsive header stacking, "View all" upgraded to bordered button, gap-5→gap-6, PromptCard active/focus states, 44px secondary CTA tap targets, mobile accent bar, empty state redesign |
| 2026-04-16 | Project detail page — step flow, story prominence, metadata layout | 48px solid orange step nodes, pipeDraw animation on vertical pipe, "Step X of Y" headers, story section promoted with stronger heading/background, author row moved above metadata, metadata grouped into context + technical clusters |
| 2026-04-16 | Browse page filter UX polish | Unified difficulty/category filter active states, removable filter chips, upgraded clear button, spacing rhythm, search icon button, focus ring accessibility |
| 2026-04-16 | Landing page hero clarity & typography normalization | De-emphasized tagline chip, removed hero mini-flow, tightened subtitle, clarified CTA hierarchy, normalized section heading sizes, focus-visible states |
| 2026-04-16 | Skeleton loading states | Shimmer-animated skeleton placeholders for browse, detail, landing, profile, admin pages |
| 2026-04-16 | Auth pages & user profile polish | Split-layout auth with brand panels, focus rings, password helper, profile stat card fix, empty state CTA |
| 2026-04-16 | Visual consistency & polish | Standardized transitions to 200ms, unified card hover pattern, design token documentation |
| 2026-04-16 | Navigation & information architecture | Header active state indicators, breadcrumbs on detail, related projects section, footer light theme |
| 2026-04-16 | Submit form UX | 3 numbered sections, prominent mode toggle, redesigned Add Step button, required field indicators |
| 2026-04-16 | Landing page UX improvements | Hero with tagline chip + mini flow, pulsing pipe connectors, responsive flow diagram, better CTAs |
| 2026-04-16 | Browse page refinement | PromptCard with mini step-flow viz, search icon, filter labels, result count, clear filters |
| 2026-04-16 | Project detail page improvements | Color-coded left borders for prompt/result, larger step nodes, metadata chips, author avatar, story section accent |

---

## Blocked / Needs Drew's Input

_Items that require a decision or input from Drew. Add questions to `QUESTIONS.md` with space for his responses._

_(none currently)_
