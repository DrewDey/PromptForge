# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PromptForge — a community-driven platform for sharing AI projects, creations, and workflows. Users share what they BUILT with AI (the finished product, the prompts used, and the results at each step), NOT prompt templates. Organized by domain categories (finance, marketing, coding, etc.). Targets all skill levels.

**CRITICAL**: This is a project showcase platform, not a prompt template library. Every piece of content should represent a real finished project with actual outputs, not fill-in-the-blank templates with `[PLACEHOLDER]` brackets.

**Live**: https://prompt-forge-sandy.vercel.app
**Repo**: https://github.com/DrewDey/PromptForge

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

- **Tailwind v4**: No `tailwind.config.js`. Theme customization is in `src/app/globals.css` using `@theme {}`. Custom colors use `--color-primary-*`.
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

## Current state

MVP deployed with Supabase connected. Working: auth (signup/login/logout), landing page, browse with category/difficulty/sort filters and search, project detail with step-by-step prompt→result flow, submit form with model dropdown and image upload UI, admin dashboard with role protection. Not yet wired: submit form persistence to database, image upload to Supabase Storage, upvote/bookmark backend, user profiles page, karma system.
