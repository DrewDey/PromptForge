# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PromptForge — a community-driven platform for discovering, sharing, and building AI prompts and workflows. Targets all skill levels, from one-click prompts to multi-step API-driven chains. Organized by domain categories (finance, marketing, coding, etc.).

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

Admin actions (approve/reject prompts) use **Next.js Server Actions** in `src/lib/actions.ts`, which call `data.ts` and revalidate paths.

### Supabase integration

- `src/lib/supabase/server.ts` — server-side client (uses `cookies()` from `next/headers`)
- `src/lib/supabase/client.ts` — browser client
- `src/middleware.ts` — refreshes auth sessions; skips entirely when Supabase is not configured
- Database schema with RLS policies: `supabase/schema.sql`
- Seed data: `supabase/seed-fix.sql` (handles the `profiles → auth.users` FK by using `NOT VALID`)

### Prompt moderation

All user-submitted prompts start with `status: 'pending'`. Only `'approved'` prompts appear in public views. Admin dashboard at `/admin` shows pending queue with approve/reject buttons.

### Types

Core types in `src/lib/types.ts`: `Category`, `Profile`, `Prompt`, `PromptStep`, `PromptWithRelations` (Prompt with joined category, author, steps).

## Key patterns

- **Tailwind v4**: No `tailwind.config.js`. Theme customization is in `src/app/globals.css` using `@theme {}`. Custom colors use `--color-primary-*`.
- **Supabase queries**: Use `.select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')` for prompts with relations.
- **Dynamic route params**: In Next.js 16, `params` and `searchParams` are `Promise` types that must be awaited.

## Supabase setup

1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/seed-fix.sql` for seed data
4. Copy `.env.local.example` → `.env.local` with project URL and anon key

## Current state

MVP built with Supabase connected. Working: landing page, browse with filters/search, prompt detail with copy, submit form, admin dashboard. Not yet working: auth flow, upvote/bookmark backend, user profiles.
