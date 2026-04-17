# CLAUDE.md

This file provides guidance to Claude/Cowork (claude.ai/code) when working with code in this repository. This is a recurring iteration that goes on every single hour of the day.

## Project

PathForge — a community-driven platform for sharing AI projects, creations, and workflows. Users share what they BUILT with AI (the finished product, the prompts used, and the results at each step), NOT prompt templates. Organized by domain categories (finance, marketing, coding, etc.). Targets all skill levels.

**CRITICAL**: This is a project showcase platform, not a prompt template library. Every piece of content should represent a real finished project with actual outputs, not fill-in-the-blank templates with `[PLACEHOLDER]` brackets.

**Live**: https://prompt-forge-sandy.vercel.app
**Repo**: https://github.com/DrewDey/PathForge

## Design Direction (READ THIS FIRST)

**The founder (Drew) has explicitly defined the design direction. This overrides any previous design decisions:**

- **Aesthetic**: Modern dev tool. Think Linear, Vercel, Raycast. Dark/neutral tones, crisp typography, minimal but premium. NOT generic startup template.
- **Brand tokens**: Orange accent (#E87A2C) + sharp corners (0px border-radius). These are the brand — keep them. But execute at a high level. Orange pops against dark/neutral surfaces.
- **Surface palette**: Cooler zinc-based neutrals (defined in globals.css as `--color-surface-*`). Body bg is #fafafa. Header is dark (surface-900). Cards are white with subtle borders.
- **Priority pages**: Browse and Build pages are the #1 focus. These two pages ARE the product.
- **Build page vision**: Rich project builder, NOT a form. Think Notion page editor. Live preview, drag-and-drop steps, premium image uploads, portfolio-quality output.
- **Browse page vision**: Curated gallery feel. Cards that sell the project. Clear visual hierarchy (featured vs regular). Integrated filter bar.
- **Quality bar**: Drew said the old design was terrible. Don't be cautious — be bold. Make dramatic visual improvements. The site should look like a premium tool, not a homework project.

## Commands

```bash
npm run dev        # Start dev server with Turbopack (http://localhost:3000)
npm run build      # Production build (also type-checks)
npm run lint       # ESLint
```

## Architecture

**Next.js 16 App Router** with Server Components by default. Client components use `'use client'` directive.

### Data flow

All data access goes through `src/lib/data.ts`, which is the single abstraction layer:
- When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars are set → queries Supabase (PostgreSQL)
- When env vars are missing → falls back to in-memory mock data from `src/lib/mock-data.ts`

Every function in `data.ts` has dual implementations (mock and Supabase). New data functions must follow this pattern.

### Mutations

Admin actions (approve/reject prompts) use **Next.js Server Actions** in `src/lib/actions.ts`, which call `data.ts` and revalidate paths. Logout is also a server action.

### Auth

- Login/signup use client-side Supabase auth (`@supabase/ssr` browser client)
- Header checks auth state client-side via `onAuthStateChange` and profile role lookup
- Admin dashboard is protected server-side: checks auth user exists + profile role = 'admin'
- Admin link in header only visible to admin users

### Supabase integration

- `src/lib/supabase/server.ts` — server-side client (uses `cookies()` from `next/headers`)
- `src/lib/supabase/client.ts` — browser client
- `src/middleware.ts` — refreshes auth sessions; skips entirely when Supabase is not configured
- Database schema: `supabase/schema.sql`
- V2 migration (projects model): `supabase/migration-v2.sql`
- Seed data: `supabase/seed-fix.sql` (handles the `profiles → auth.users` FK by using `NOT VALID`)

### Project data model

Each project ("prompt" in the database) contains:
- `content` — the story (what they built and why)
- `result_content` — the final outcome/result (optional)
- `model_used` — AI model ID from `src/lib/models.ts`
- `tools_used` — array of tools/APIs used
- `steps` — ordered prompt→result pairs showing the build process
  - Each step has `content` (the prompt) and `result_content` (what AI produced, optional)
- `project_images` table exists for screenshots (architecture ready, not yet wired to upload persistence)

### Prompt moderation

All user-submitted projects start with `status: 'pending'`. Only `'approved'` projects appear in public views. Admin dashboard at `/admin` shows pending queue with approve/reject buttons.

### AI Models

`src/lib/models.ts` contains the dropdown list of AI models grouped by provider (Anthropic, OpenAI, Google, Meta, xAI, etc.) with an "Other" option for custom model names. Keep this list updated as new models release.

### Types

Core types in `src/lib/types.ts`: `Category`, `Profile`, `Prompt`, `PromptStep`, `ProjectImage`, `PromptWithRelations`.

## Key patterns

- **Tailwind v4**: No `tailwind.config.js`. Theme customization is in `src/app/globals.css` using `@theme {}`. Custom colors use `--color-primary-*` and `--color-surface-*`.
- **Surface palette**: Use `surface-*` classes for backgrounds, borders, text. These give the cooler, modern feel. Avoid raw `gray-*` — use `surface-*` instead.
- **Supabase queries**: Use `.select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')` for prompts with relations.
- **Dynamic route params**: In Next.js 16, `params` and `searchParams` are `Promise` types that must be awaited.
- **Seed profile FK workaround**: Seed profiles don't have matching auth.users entries. The FK constraint is dropped before insert and re-added with `NOT VALID`.

## Supabase setup

1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/migration-v2.sql` for V2 schema + seed data
4. Copy `.env.local.example` → `.env.local` with project URL and anon key
5. Disable "Confirm email" in Authentication settings for development
6. After signing up, set yourself as admin: `UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');`

## Deployment

Hosted on Vercel (auto-deploys from `main` branch). Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in Vercel project settings.

## Hourly Iteration System

This project runs autonomous hourly iterations focused on design and UX. Each iteration is a fresh Claude session; the full protocol lives in `SKILL.md` and must be followed.

### The one rule that matters
**An iteration finishes its own work — commit AND push.** Never tell Drew to `rm .git/index.lock`, "paste this SQL into Supabase", `npm install`, or "run these three commands locally". If an iteration would require Drew to do anything at all to close it out, it hasn't solved its own problem — it must commit via git plumbing, push directly, and bypass whatever was blocking it. (Earlier versions of this doc said Drew pushes manually; that was a Claude Cowork sandbox constraint. Claude Code pushes on its own.) The only time Drew runs something is for data/ops work that genuinely can't be done from the repo (e.g. pasting seed SQL into the live Supabase SQL Editor) — and even then, the iteration flags it as a Drew-action item in BACKLOG, never as a precondition for the commit.

### Files
- `SKILL.md` — the iteration protocol. Read this first every session. Short on purpose.
- `BACKLOG.md` — the next 5 items, plus the last 5 done. Older history is in `git log`.
- `ITERATION_LOG.md` — 3-sentence cap per entry. Rolling window, not cumulative.
- `QUESTIONS.md` — only open when an iteration genuinely can't make a call without Drew. Empty is a valid state.
- `MEMORY.md` (in Cowork auto-memory) — Drew's feedback carried across sessions. If memory conflicts with a file in the repo, trust memory.

### Current focus
Design/UX polish is largely done. The biggest remaining wins are structural: image upload persistence, applying the seed SQL to live Supabase, turning the Build page from a form into a builder. See `BACKLOG.md`.

## Current state

MVP deployed with Supabase connected. Working: auth (signup/login/logout), landing page, browse with category/difficulty/sort filters and search, project detail with step-by-step prompt→result flow, submit form with model dropdown and image upload UI, admin dashboard with role protection, voting/bookmarks, user profiles. Not yet wired: image upload to Supabase Storage, karma system.

Design overhaul in progress: Header redesigned (dark bg), Browse page rebuilt (toolbar filters, featured section), PromptCard redesigned (accent line, better hierarchy), CSS theme updated (cooler surface palette).
