# PathForge — Iteration Backlog

> This file is the single source of truth for what to work on. Each hourly iteration picks the top unblocked item from the current sprint.
> After completing work, move the item to "Completed" with the date and a one-line summary of what was done.

## How to use this file

1. **Start of iteration**: Read this file. Pick the top item from "Current Sprint" that isn't blocked.
2. **During iteration**: Do the work. Run `npm run build` to verify no breakage.
3. **End of iteration**: Move the item to "Completed", update "Current State", and note any new issues discovered.
4. **If blocked**: Note the blocker next to the item and move to the next one. Add a question to `QUESTIONS.md` if Drew's input is needed.

---

## Current State

MVP is live at https://prompt-forge-sandy.vercel.app. Auth, browse, project detail, admin dashboard, voting/bookmarks, and user profiles all work. The site uses a light theme with sharp edges and orange/blue brand colors.

**Last updated**: 2026-04-16 (Iteration 13)

---

## Current Sprint — UX & Polish

Priority order. Work top-down.

### 1. Landing page UX improvements
- The hero section needs to immediately communicate what PathForge is and why someone would use it
- Review the visual hierarchy — is the CTA clear? Does the value prop land in 5 seconds?
- Check mobile responsiveness on all landing page sections
- Improve the "Popular Paths" carousel — does it invite clicking?

### 2. Browse page refinement
- Filter UX: Are categories easy to scan? Does search feel responsive?
- Card design: Do PromptCards communicate enough at a glance (title, what it is, difficulty, author)?
- Empty states: What happens when no results match? Is there a helpful message?
- Sort options: Are they intuitive?

### 3. Project detail page improvements
- Step-by-step flow: Is the prompt→result progression visually clear and easy to follow?
- Make the "story" section (what they built and why) prominent — this is what differentiates PathForge
- Copy button UX for prompts
- Metadata display (model used, tools, tags) — is it scannable?

### 4. Submit form UX
- The multi-step chain builder needs to feel intuitive
- Form validation and error messaging
- Preview what the project will look like before submitting
- Progress indication for multi-step forms

### 5. Navigation & information architecture
- Is it obvious how to get from landing → browse → detail → submit?
- Header: Is the nav clear? Does it work well on mobile?
- Footer: Are the links useful?
- Breadcrumbs or back-navigation on detail pages

### 6. ~~Visual consistency & polish~~ ✅
- ~~Consistent spacing, typography, and color usage across all pages~~
- ~~Loading states for async content (skeleton components)~~ ✅
- ~~Hover/focus states on all interactive elements~~
- ~~Transition animations that feel smooth but not excessive~~

### 7. ~~Auth pages & user profile polish~~ ✅
- ~~Brand personality on login/signup (split-layout with value prop panel)~~
- ~~Focus ring accessibility on all form inputs~~
- ~~Design system compliance (transitions, button hover states)~~
- ~~Password helper text with real-time validation~~
- ~~User profile stat card affordance fix~~
- ~~Empty state with CTA on user profiles~~

---

## Next Sprint — Core Features

These are queued but not yet prioritized for hourly iterations.

- **Image upload persistence**: Wire ImageUpload component to Supabase Storage so project screenshots actually save
- **Project editing**: Let authors edit their submitted projects
- **Forking/remixing**: Let users clone a project as a starting point for their own version
- **Comments/discussions**: Threaded comments on project detail pages
- **User profile enhancements**: Bookmarks tab, activity feed, bio editing
- **Karma/reputation system**: Points for submissions, upvotes received, etc.
- **Search improvements**: Autocomplete, suggested searches, "similar projects"
- **Draft saving**: Auto-save submit form progress so users don't lose work

---

## Backlog — Future

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
| 2026-04-16 | Submit form — typography hierarchy, step builder, validation UX | Blue section numbers, text-xl headers, stronger dividers, step completion badges + progress bar, solid Add Step button, client-side validation with inline errors, inset shadow mode toggle |
| 2026-04-16 | Landing page — Popular Paths discovery & mobile responsiveness | Responsive header stacking, "View all" upgraded to bordered button, gap-5→gap-6, PromptCard active/focus states, 44px secondary CTA tap targets, mobile accent bar, empty state redesign |
| 2026-04-16 | Project detail page — step flow, story prominence, metadata layout | 48px solid orange step nodes, pipeDraw animation on vertical pipe, "Step X of Y" headers, story section promoted with stronger heading/background, author row moved above metadata, metadata grouped into context + technical clusters |
| 2026-04-16 | Browse page filter UX polish (unified active states, removable filter chips, spacing) | Unified difficulty/category filter active states to brand orange, added removable filter summary chips, upgraded clear button visibility, fixed spacing rhythm, search icon button, focus ring accessibility |
| 2026-04-16 | Landing page hero clarity & typography normalization | De-emphasized tagline chip, removed hero mini-flow, tightened subtitle, clarified CTA hierarchy, normalized all section heading sizes, added focus-visible states and accent bar |
| 2026-04-16 | Skeleton loading states for all data-fetching pages | Shimmer-animated skeleton placeholders for browse, detail, landing, profile, admin pages — eliminates blank screens during load |
| 2026-04-16 | Auth pages & user profile polish (brand panels, focus states, empty states) | Split-layout auth with brand panels, focus rings, password helper, profile stat card fix, empty state CTA |
| 2026-04-16 | Visual consistency & polish (transitions, hover states, design tokens) | Standardized all transitions to 200ms, unified card hover pattern (border + offset shadow), added design token documentation |
| 2026-04-16 | Navigation & information architecture (active states, breadcrumbs, related projects, footer) | Header active state indicators, breadcrumb navigation on detail pages, "More in this category" related projects section, footer light theme |
| 2026-04-16 | Submit form UX (sections, mode toggle, step builder) | Restructured into 3 numbered sections, replaced hidden checkbox with prominent mode toggle, redesigned Add Step button, added required field indicators and aria attributes |
| 2026-04-16 | Landing page UX improvements (hero, pipes, flow, visual hierarchy) | Redesigned hero with tagline chip + mini flow preview, pulsing pipe connectors, responsive flow diagram with directional arrows, better CTAs, empty state for popular paths, acted on Drew's Q1-Q4 feedback |
| 2026-04-16 | Browse page refinement (cards, filters, empty states) | PromptCard redesign with mini step-flow viz, search icon, filter labels, result count, clear filters, better empty state, mobile responsive filters |
| 2026-04-16 | Project detail page improvements (steps, story, metadata, copy UX) | Redesigned prompt/result distinction with color-coded left borders, larger step nodes, metadata chip layout, author avatar, story section with orange accent, improved CopyButton feedback |

---

## Blocked / Needs Drew's Input

_Items that require a decision or input from Drew. Add questions to `QUESTIONS.md` with space for his responses._

_(none currently)_
