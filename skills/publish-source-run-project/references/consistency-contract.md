# Public Project Page Consistency Contract (full)

Every public project page — generic `/prompt/[id]` or a special showcase route — must expose the same core experience. The artifact and response details vary; the product shell does not. A custom showcase route is a renderer override, not an exception.

## Shell sections

- **Header / title area** (dark `bg-surface-900`): project title, short description, author/date where available, category/domain, difficulty, model, tools, and real engagement controls. Includes `RunSummary` (3-col grid: model / run-type / captured date) and `ProjectEngagementBar`.
- **Primary result (artifact-first)**: the final artifact/outcome appears first and loads without blank frames, broken paths, local-only files, or hidden required context. `ArtifactFrame` carries `id="final-result"` (the scroll target — preserve it), a dark border/shadow, a header bar (label + title + Open link), and an iframe with `sandbox="allow-scripts allow-same-origin"` (add `allow-downloads` only for CSV-emitting artifacts), `src` -> `/artifacts/*.html`, fixed height per project.
- **Build path**: each prompt is paired with the response that followed it. `PipeNode` components, green pipe styling with exact hex `#2bd15f` (bright) and `#07551f` (dark). Node 01 = prompt (left border brand-orange). Node 02+ = response package in a collapsible `details`. Each response: intro text, filename badge, nested code-block `details` (`max-h-[460px] overflow-auto`, scrolls if longer), `CopyButton variant="dark"`, source-run link.
- **Versioning (multi-response)**: pages with multiple artifact versions need a visible selector. The selected response state is obvious (`CheckCircle2`), and the mounted artifact above matches the selection. Final approved artifact loads first by default; earlier artifacts stay inspectable. HP 10Bii uses `Hp10BiiSourceRunExplorer` for this (not a plain BuildPath); the main `page.tsx` passes the prompts in.
- **Forking**: a visible fork action (`ProjectForkCallout`) that opens `/build?fork={projectId}&forkTitle={projectTitle}` — not just a passive fork count. Must appear on special mounted pages too, not only generic pages.
- **Community**: `ProjectCommunityPanel` wraps the fork callout + comments zero-state + discussion-signal sidebar with real zero counts. No fake comments/forks/activity. (`ProjectCommunityPanel` fetches the project and returns null if not found.)
- **Routing**: `/paths` (browse), profile pages, admin rows, and direct project links all resolve to the correct page shape via `PROJECT_ROUTE_OVERRIDES`.
- **Mobile**: the same essential actions stay reachable without text overlap, hidden buttons, or broken sticky controls.

## Engagement

`ProjectEngagementBar` is async and checks `isPersistableProjectId`. Persistable (real-UUID) projects render interactive `VoteBookmarkButtons size="large"`. Demo projects show static read-only counts and no interactive buttons. Engagement clicks must NOT navigate to the project page. Never seed counts to fake popularity.

## Component imports every page.tsx needs

- `Link` (next/link)
- icons from `lucide-react`: `ExternalLink`, `FileCode2`, `GitBranch` (plus `CheckCircle2` for multi-response selectors)
- `CopyButton` from `@/app/prompt/[id]/CopyButton`
- `ProjectEngagementBar` and `ProjectCommunityPanel` from `@/components/`

## Artifact loading

`getModelResponse()` style helper reads `public/artifacts/[filename].html` at build time via `fs.readFileSync`; render a fallback message on read error. Artifacts must be self-contained (sandboxed iframe) — no external scripts, styles, or CDN dependencies.

## Styling tokens

Container `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. Main bg `surface-50`; dark sections `surface-900`; borders `surface-200`/`surface-800`. Primary accent brand-orange, secondary brand-blue.

## CopyButton variants

- `ghost` — for prose contexts
- `dark` — for code-header contexts
They style completely differently; pick the one matching the surface.

## Approval-to-live verification checklist

Before calling a source-run page done / approving / publishing / pushing:

1. Admin Pending Review is clear; the dashboard count dropped; the source-run detail says published only because the linked prompt is approved. (Approval is the `prompts` row being approved + source-run linked + queue cleared — NOT merely a working route, deployed artifact, or `extracted_prompt_id`.)
2. Special route loads.
3. Mounted artifact is non-blank and the main interaction works.
4. Package switching works (multi-prompt) and the mounted artifact matches the selected package.
5. Prompt count and response-package count match the source run exactly.
6. Code blocks collapse; copy/open controls exist.
7. Fork action is visible and routes to `/build?fork=PROJECT_ID`.
8. Engagement clicks do not open/navigate to the project page.
9. Browse card and author-profile links route to the special page.
10. The stale generic `/prompt/[id]` page is NOT what users see (route override in place).

If any item fails, keep fixing before reporting done.
