---
name: unpublish-showcase-project
description: Clean inverse of publish-source-run-project — fully remove / unpublish a PathForge showcase project. Use when the user wants to take down or delete a published showcase page (HP 10Bii, Tic-Tac-Toe, Pomodoro, Decision Matrix, Snake, or a new one). Reverses every wiring point in the publish skill, deletes the route + artifacts, greps for dangling references, and verifies with tsc + build. Removes ONLY the project-specific entries/files, never shared components. Push/deploy only with explicit approval (local-first).
---

# Unpublish Showcase Project

## Goal

Cleanly and completely remove ONE published PathForge showcase project, leaving zero dangling references and a repo that still type-checks and builds. This is the exact inverse of `skills/publish-source-run-project`: that skill wires a project IN across a fixed set of files; this skill takes the same project OUT of all of them.

This architecture (the wiring map below) is the **current standard** for how showcase projects are added and removed. It is expected to **evolve** with new ideas and improvements — when the publish skill changes its wiring map, update this inverse skill in the same change so the two stay symmetric. Treat it as current best practice, not a frozen spec.

## Non-Negotiable Guardrails

1. **Remove only the project-specific entries and files.** Delete the target project's UUID export, its showcase entry, its route override, its `APPROVED_PROJECT_IDS` / `CODE_ONLY_SHOWCASE_IDS` membership, its mock-data entries, its route directory, and its artifact files — and nothing else.
2. **Never delete shared components.** `ProjectEngagementBar`, `ProjectCommunityPanel`, `CopyButton`, `ArtifactFrame`/`PipeNode` helpers, the `PreparedShowcaseProject` type, the `isPersistableProjectId` function, etc. are shared by every showcase. Do not touch them. Only the project's own entries leave.
3. **No dangling references.** After removal, a repo-wide grep for the project's UUID, slug, route, artifact filenames, and exported constant name must come back clean. A reference that compiles but points at a deleted thing is a bug.
4. **Verify before done.** `npx tsc --noEmit` and `npm run build` must pass after removal.
5. **Push only with explicit approval.** Local-first project; pushing `main` deploys to production. Commit locally, push only when the user explicitly says to in that turn.
6. **Don't fabricate a takedown.** Only unpublish a project that the user actually asked to remove. Confirm exactly which project (by title / route / UUID) before deleting anything.

## Required Inputs

Before starting, pin down the target precisely:

- The project's **exported ID constant** name and value (e.g. `POMODORO_TIMER_PROJECT_ID = '3b9c61d8-…'`) from `src/lib/featured-projects.ts`.
- The project **slug / route** (e.g. `pomodoro-timer`, `/pomodoro-timer-demo`).
- The **artifact filenames** under `public/artifacts/` (the final artifact plus every `<slug>-step-N.html`, and any `<slug>-capture-notes.md`).
- Whether it was **code-only** (in `CODE_ONLY_SHOWCASE_IDS`) or a **real-persistence** project (a live Supabase `prompts` row, like Snake). See "Real-persistence projects" below — those need an extra ops step.

Grep first to discover everything tied to the project:

```bash
grep -rn "MY_PROJECT_ID\|my-project-demo\|my-project-slug" src/ public/ supabase/
ls public/artifacts/ | grep my-project-slug
```

---

## Removal Map (reverse of the publish wiring map)

Do all of these. Missing one leaves a half-removed project: a 404 link still in browse, a dead route override, an undefined import, or an orphaned artifact.

1. **`src/lib/prepared-showcase-projects.ts`** — delete the `const MY_PROJECT_SHOWCASE: PreparedShowcaseProject = {…}` block, remove it from the `PREPARED_SHOWCASE_PROJECTS` array, and remove its now-unused import of the ID constant from `./featured-projects`.
2. **`src/lib/featured-projects.ts`** — delete the `export const MY_PROJECT_ID = '<uuid>'` line (and any legacy-id export for this project).
3. **`src/lib/project-links.ts`** — delete the `[MY_PROJECT_ID]: '/my-project-demo'` entry from `PROJECT_ROUTE_OVERRIDES`, and remove the now-unused `MY_PROJECT_ID` import.
4. **`src/lib/data.ts`** — remove `MY_PROJECT_ID` from the `APPROVED_PROJECT_IDS` Set, and remove its now-unused import.
5. **`src/lib/project-engagement.ts`** — remove `MY_PROJECT_ID` from the `CODE_ONLY_SHOWCASE_IDS` Set (only present if it was a code-only project), and remove its now-unused import.
6. **`src/lib/mock-data.ts`** — remove (a) the `...MY_PROJECT_SHOWCASE.steps.map(...)` spread from `mockSteps`; (b) the `mockPrompts` entry for this project; (c) the dedicated author profile in `mockProfiles` **only if** it was created solely for this project (e.g. a sequential `22222222-…-2222222222NN` id) and no other project uses it — never remove the shared `PathForge Projects` profile (`22222222-2222-2222-2222-222222222211`) or any profile another showcase still references; and (d) the now-unused `MY_PROJECT_SHOWCASE` import.
7. **`src/app/my-project-demo/`** — delete the entire route directory. Most current multi-prompt source-run pages use a `page.tsx` that passes source-run steps into the shared `SourceRunShowcase`; delete only the project-specific route files, never the shared showcase component.
8. **`public/artifacts/`** — delete the project's artifact files: the final artifact, every `<slug>-step-N.html`, and the `<slug>-capture-notes.md`. Leave other projects' artifacts untouched.

### Import-cleanup discipline

Removing a usage often leaves an unused import that `tsc`/ESLint will flag (or a tree-shake no-op). After deleting each usage above, delete the matching import line in the same file. When in doubt, let `npx tsc --noEmit` and `npm run build` tell you what is now unused or undefined — that is exactly what the VERIFY step is for.

### Real-persistence projects (Snake-style)

If the project was a real-persistence project (it had a live Supabase `prompts` row and was NOT in `CODE_ONLY_SHOWCASE_IDS`, the way Snake is seeded in `supabase/prompt-engagement.sql`), code removal alone does NOT delete the live row. The approved `prompts` row (and its votes/bookmarks/steps) still exists in production Supabase. Removing it is an **ops action** (DELETE in the live SQL editor) that the agent cannot do from the repo — flag it as a Drew/ops follow-up item, do not pretend it is done, and do not delete the `supabase/*.sql` seed file if it is shared or documents history. Most showcase projects are code-only and need no ops step.

---

## Verify (do not skip)

1. **Grep for dangling references — must be clean:**

   ```bash
   grep -rn "<uuid>" src/ public/ supabase/        # the project UUID
   grep -rn "MY_PROJECT_ID" src/                    # the exported constant name
   grep -rn "my-project-demo" src/ public/          # the route
   grep -rn "my-project-slug" src/ public/          # the slug / artifact basenames
   ls public/artifacts/ | grep my-project-slug       # artifact files gone
   ```

   Any hit means the removal is incomplete — track it down and remove it before continuing.
2. **`npx tsc --noEmit`** — must pass clean (catches undefined imports / now-unused symbols).
3. **`npm run build`** — must pass (also type-checks; confirms the deleted route no longer compiles and nothing imports it). Note: sandboxed/network-restricted environments can fail on Google Fonts fetches; if that is the only failure, record it and rely on the type-check.
4. **`git status` / `git diff --stat`** — confirm the change set is exactly the removal map files plus the deleted route dir and artifacts, with no collateral edits to shared components.

If any check fails, keep fixing. Do not call the unpublish done because one file looks right in isolation.

---

## Publish the removal

Local-first. Pushing `main` deploys (here, the takedown) to production.

1. Stage and commit only the scoped removal: the wiring files in the Removal Map, the deleted route directory, and the deleted artifacts. Keep unrelated changes out.
2. Use a concise message describing the unpublished/removed showcase project.
3. **Push only with the user's explicit approval.** Do not push, deploy, or run production SQL (the real-persistence DELETE) without an explicit go-ahead in that turn.
4. End commit messages with the repo's required co-author trailer if committing on the user's behalf per repo policy.

## Output To User

Keep it factual and short:

- which project was removed (title / route / UUID),
- the exact files changed and files/dirs deleted,
- grep-clean confirmation (no dangling references),
- verification result (`tsc`, `build`),
- whether it is committed locally and waiting on push approval,
- any real-persistence Supabase row left for a Drew/ops follow-up.

## Relationship to the publish skill

Every step here mirrors a step in `skills/publish-source-run-project/SKILL.md`. If that skill's wiring map gains or loses a file, this removal map must change in lockstep. Keep the two symmetric so adding and removing a showcase project are always exact inverses.
