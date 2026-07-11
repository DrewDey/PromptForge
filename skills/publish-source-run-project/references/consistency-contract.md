# Public Project Page Consistency Contract (full)

Every public project page — generic `/prompt/[id]` or a special showcase route — must expose the same core experience. The artifact and response details vary; the product shell does not. A custom showcase route is a renderer override, not an exception.

## Shell sections

- **Header / title area** (dark `bg-surface-900`): project title, short description, author/date where available, category/domain, difficulty, model, tools, and real engagement controls. Includes `RunSummary` (3-col grid: model / run-type / captured date) and `ProjectEngagementBar`.
- **Primary result (artifact-first)**: the final artifact/outcome appears first and loads without blank frames, broken paths, local-only files, or hidden required context. `ArtifactFrame` carries `id="final-result"` (the scroll target — preserve it), a dark border/shadow, a header bar (label + title + Open link), and an iframe with `sandbox="allow-scripts allow-same-origin"` (add `allow-downloads` only for CSV-emitting artifacts), `src` -> `/artifacts/*.html`, fixed height per project.
- **Build path**: each prompt is paired with the response that followed it. `PipeNode` components, green pipe styling with exact hex `#2bd15f` (bright) and `#07551f` (dark). Prompt nodes and response-package nodes are separate connected pipe nodes. A response package follows the prompt that produced it, connected by piping, but it is never embedded inside the prompt card. Each response: intro text, filename badge, nested code-block `details` (`max-h-[460px] overflow-auto`, scrolls if longer), `CopyButton variant="dark"`, source-run link.
- **Versioning (multi-response)**: pages with multiple artifact versions need a visible selector. The selected response state is obvious (`CheckCircle2`), and the mounted artifact above matches the selection. Final approved artifact loads first by default; earlier artifacts stay inspectable. HP 10Bii uses the shared `SourceRunShowcase` for this; route pages pass exact source-run steps into that component.
- **Model variants**: selecting another model changes the developer-operated run inside one canonical project; it is not a community fork. Sort the selector alphabetically by model label and never reorder it when selection changes. Every selected run may still expose a real response-level project fork.
- **Forking**: generic pages expose the visible fork action (`ProjectForkCallout`) that opens `/build?fork={projectId}&forkTitle={projectTitle}` — not just a passive fork count. Source-run pages pass the selected project/run identity into `SourceRunShowcase` so every response package exposes its own fork point. A model-run handoff must include the canonical project, exact model-variant row, `source_run_id`, exact response step ID and number, prompt family, selected artifact path, and lowercase artifact SHA-256. If an exact response ID cannot be resolved, fail closed instead of falling back to a same-numbered response from another run. Forked source-run submissions store those structured lineage fields on `source_run_submissions`; approved fork projects copy them onto `prompts`.

  The parent and child use the same lineage workspace. On desktop, inherited prompts/responses collapse left, the exact response forms a visible green socket, and the approved child continuation and its selectable artifacts receive the primary space on the right. The child page reconstructs that same inherited path rather than presenting a contextless continuation. On narrow screens, stack inherited path -> response socket -> child continuation without sideways-only navigation. Show branch capacity before real fork data exists, show only real approved branches once present, and never seed a fake fork count. A native provider branch may need an adaptive repair after a concrete defect; preserve the exact branch response, repair prompt, repaired response, and all real artifact versions rather than rewriting the evidence.
- **Community**: `ProjectCommunityPanel` wraps the fork callout + real approved fork lanes when present + comments zero-state + discussion-signal sidebar with real zero counts. No fake comments/forks/activity. (`ProjectCommunityPanel` fetches the project and returns null if not found.)
- **Routing**: `/paths` (browse), profile pages, admin rows, and direct project links all resolve to the correct page shape via `PROJECT_ROUTE_OVERRIDES`.
- **Mobile**: the same essential actions stay reachable without text overlap, hidden buttons, or broken sticky controls.

## Engagement

`ProjectEngagementBar` is async and checks `isPersistableProjectId(projectId)`, which is `true` only when the ID is a valid UUID **and not** in `CODE_ONLY_SHOWCASE_IDS` (`src/lib/project-engagement.ts`). Persistable projects render interactive `VoteBookmarkButtons size="large"`. Code-only / demo projects show static read-only counts and no interactive buttons. Engagement clicks must NOT navigate to the project page. Never seed counts to fake popularity.

**Code-only showcase projects MUST be in `CODE_ONLY_SHOWCASE_IDS`.** They have no row in the live Supabase `prompts` table, so a vote/bookmark `INSERT` fails the FK + RLS "approved prompts row" check and surfaces the red "Could not save vote." error. Adding the UUID to that set forces read-only counts and avoids the error. Only omit it (and seed a real approved `prompts` row à la Snake in `supabase/prompt-engagement.sql`) when interactive votes are explicitly wanted.

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
6. Prompt nodes and response-package nodes are visually separate connected pipe nodes. The response package follows the prompt that produced it, but is never embedded inside the prompt card.
7. Code blocks collapse; copy/open controls exist.
8. Fork actions are visible. Generic pages route to `/build?fork=PROJECT_ID`; source-run response packages include the exact response identity, and model-run forks additionally include the model variant, source run, artifact path, and artifact SHA-256. The build page shows the attached fork metadata.
9. Engagement clicks do not open/navigate to the project page.
10. Browse card and author-profile links route to the special page.
11. The stale generic `/prompt/[id]` page is NOT what users see (route override in place).

If any item fails, keep fixing before reporting done.
