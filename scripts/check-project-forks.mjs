import { existsSync, readFileSync, readdirSync } from 'node:fs'

const failures = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function mustInclude(path, content, needle, message) {
  if (!content.includes(needle)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, content, needle, message) {
  if (content.includes(needle)) failures.push(`${path}: ${message}`)
}

function mustIncludeAtLeast(path, content, needle, count, message) {
  const matches = content.split(needle).length - 1
  if (matches < count) failures.push(`${path}: ${message}`)
}

function sharedSourceRunRoutes() {
  return readdirSync('src/app', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((routePath) => existsSync(routePath))
    .filter((routePath) => read(routePath).includes("from '@/components/SourceRunShowcase'"))
}

const forkLib = read('src/lib/project-forks.ts')
mustInclude('src/lib/project-forks.ts', forkLib, 'PROJECT_FORK_MAX_DEPTH = 10', 'fork depth must support the requested 10x path')
mustInclude('src/lib/project-forks.ts', forkLib, 'PROJECT_FORK_MAX_WIDTH = 10', 'fork width must support the requested 10x branch fanout')
mustInclude('src/lib/project-forks.ts', forkLib, 'sourceStepId', 'fork contract must preserve the exact response/step fork point')
mustInclude('src/lib/project-forks.ts', forkLib, 'promptFamilyId', 'fork contract must preserve prompt family identity')
mustInclude('src/lib/project-forks.ts', forkLib, 'clampForkLimit', 'fork URL parsing must clamp unsafe depth/width values')
mustInclude('src/lib/project-forks.ts', forkLib, 'projectForkSourceToSubmissionFields', 'fork source must map into durable source-run submission fields')
mustInclude('src/lib/project-forks.ts', forkLib, 'projectForkSourceFromSubmissionFields', 'admin surfaces must reconstruct fork source from stored fields')
mustInclude('src/lib/project-forks.ts', forkLib, 'groupProjectForkNetworkBySourceStep', 'public fork maps must group approved branches with reusable fork-network logic')
mustInclude('src/lib/project-forks.ts', forkLib, 'resolveProjectForkTrail', 'fork ancestry must be resolved by shared deterministic helper logic')
mustInclude('src/lib/project-forks.ts', forkLib, 'seenProjectIds', 'fork ancestry resolution must guard against lineage cycles')
mustInclude('src/lib/project-forks.ts', forkLib, 'missingSourceProjectId', 'fork ancestry resolution must preserve missing-parent state')

const promptComparisons = read('src/lib/prompt-comparisons.ts')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, "PromptComparisonMatchBasis = 'prompt-family' | 'heuristic'", 'model comparisons must distinguish exact prompt-family matches from heuristic matches')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, 'normalizePromptFamilyId', 'model comparisons must normalize stored prompt family ids')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, 'prompt.prompt_family_id', 'model comparisons must prefer durable prompt family ids when present')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, 'key: `prompt-family:${promptFamilyId}`', 'model comparisons must bucket explicit prompt families separately from heuristic title matches')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, "matchBasis: 'prompt-family'", 'explicit prompt-family comparisons must expose their match basis')
mustInclude('src/lib/prompt-comparisons.ts', promptComparisons, "matchBasis: 'heuristic'", 'fallback model comparisons must keep a heuristic match basis')

const sourceRunShowcase = read('src/components/SourceRunShowcase.tsx')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'buildProjectForkHref', 'response packages must build response-level fork links')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'ResponseForkHoverRail', 'desktop response forks must use a dedicated hover pipe affordance')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'data-response-fork-socket', 'response fork points must expose a visible socket at the exact response')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'data-response-fork-hover-rail', 'response fork hover must grow a pipe rail from the socket')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'scale-x-0', 'response fork pipe must start collapsed before hover/focus')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'group-hover/source-fork-node:scale-x-100', 'response fork pipe must expand on hover')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'Fork here', 'desktop hover pipe must expose a fork action')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'Fork from this response', 'mobile/narrow view must expose a response-level fork action')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'projectId?: string', 'source-run showcase must accept project identity for fork links')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'projectTitle?: string', 'source-run showcase must carry project title into fork links')
mustInclude('src/components/SourceRunShowcase.tsx', sourceRunShowcase, 'promptFamilyId: `${projectId}:${step.id}`', 'response-level forks must carry a stable prompt family id')

const lineageScaffold = read('src/components/ProjectForkLineageScaffold.tsx')
mustInclude('src/components/ProjectForkLineageScaffold.tsx', lineageScaffold, 'Shared path collapses left', 'fork graph must show collapsed shared history')
mustInclude('src/components/ProjectForkLineageScaffold.tsx', lineageScaffold, 'Original text preview', 'fork graph must offer hover/focus previews of original text')
mustInclude('src/components/ProjectForkLineageScaffold.tsx', lineageScaffold, 'New fork lane', 'fork graph must show the right-side branch lane')
mustInclude('src/components/ProjectForkLineageScaffold.tsx', lineageScaffold, 'CapacityDots', 'fork graph must visualize depth/branch capacity')
mustInclude('src/components/ProjectForkLineageScaffold.tsx', lineageScaffold, 'motion-safe:animate-pulse', 'fork point should have a visible socket effect')

const buildPage = read('src/app/prompt/new/page.tsx')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'ForkSourcePanel', 'build page must show a rich fork-source handoff panel')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'PROJECT_FORK_MAX_DEPTH', 'build page must surface fork depth capacity')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'PROJECT_FORK_MAX_WIDTH', 'build page must surface fork branch capacity')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'useSearchParams', 'build page must derive fork metadata directly from the current URL')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'const forkSource = useMemo(() => parseProjectForkSearchParams(searchParams), [searchParams])', 'build page must keep fork source available without waiting on an auth effect')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'serializeProjectForkSourceForNotes', 'source-run notes must keep fallback fork metadata before SQL is applied')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'fork_source: forkSource', 'forked source-run submissions must send structured fork metadata')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'setSourceRunTitle', 'fork handoff should prefill a useful source-run title')
mustInclude('src/app/prompt/new/page.tsx', buildPage, 'authReturnPath', 'logged-out fork handoffs must preserve the fork URL through login/signup')
mustIncludeAtLeast('src/app/prompt/new/page.tsx', buildPage, '{forkSource && <ForkSourcePanel forkSource={forkSource} />}', 3, 'fork source panel must render for loading, logged-out, and logged-in fork handoffs')

const promptDetailPage = read('src/app/prompt/[id]/page.tsx')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'projectForkSourceFromSubmissionFields(prompt)', 'generic project fork CTA must detect when the current project is already a fork')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'parentForkId: existingForkSource ? prompt.id : undefined', 'generic project fork CTA must preserve immediate parent when forking a fork')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'depth: nextForkDepth', 'generic project fork CTA must advance fork depth for fork-of-fork handoffs')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'promptFamilyId: existingForkSource?.promptFamilyId ?? forkContract.promptFamilyId', 'generic project fork CTA must preserve existing prompt family on fork-of-fork handoffs')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'canForkDeeper = nextForkDepth < PROJECT_FORK_MAX_DEPTH', 'generic project fork CTA must stop instead of silently clamping beyond max fork depth')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'Max fork depth reached', 'generic project fork CTA must expose a terminal max-depth state')
mustInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'Opens build intake with this path attached.', 'generic project fork CTA must describe the real fork handoff')
mustNotInclude('src/app/prompt/[id]/page.tsx', promptDetailPage, 'auto-prefill coming soon', 'generic project fork CTA must not advertise stale future-copy now that fork metadata is attached')

const browsePage = read('src/app/browse/page.tsx')
mustInclude('src/app/browse/page.tsx', browsePage, "group.matchBasis === 'prompt-family' ? 'Same prompt family' : 'Model matchup'", 'browse comparisons must label exact same-family reruns separately from heuristic matchups')
mustInclude('src/app/browse/page.tsx', browsePage, 'is-prompt-family', 'browse comparisons must expose a class hook for exact prompt-family groups')

const browseStyles = read('src/app/browse.css')
mustInclude('src/app/browse.css', browseStyles, '.compare-group.is-prompt-family', 'browse comparison styles must visually distinguish exact prompt-family groups')

const preparedShowcases = read('src/lib/prepared-showcase-projects.ts')
mustInclude('src/lib/prepared-showcase-projects.ts', preparedShowcases, 'promptFamilyId?: string', 'prepared source-run projects must be able to carry prompt family ids into model comparisons')

const pendingShowcases = read('src/lib/pending-source-run-showcases.ts')
mustInclude('src/lib/pending-source-run-showcases.ts', pendingShowcases, 'promptFamilyId?: string', 'pending source-run showcase descriptors must preserve prompt family ids when supplied')
mustInclude('src/lib/pending-source-run-showcases.ts', pendingShowcases, 'promptFamilyId: input.promptFamilyId', 'pending source-run showcase builder must copy prompt family ids')

const mockData = read('src/lib/mock-data.ts')
mustInclude('src/lib/mock-data.ts', mockData, 'prompt_family_id: project.promptFamilyId ?? null', 'mock/prepared public prompts must preserve prompt family ids for comparison grouping')

const communityPanel = read('src/components/ProjectCommunityPanel.tsx')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'PROJECT_FORK_MAX_WIDTH', 'community surface must reflect fork capacity honestly')
mustNotInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, '>Forks<', 'community surface must not show a fake forks count before real counts exist')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'ProjectForkOriginBand', 'public project pages must show source lineage for approved forks')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'resolveProjectForkTrail(project, getPromptById)', 'fork-of-fork pages must use the shared bounded ancestor resolver')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'ProjectForkAncestryTrail', 'forked public pages must show a nested fork ancestry ladder')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Fork ancestry', 'nested fork ladder must be visible as a first-class public surface')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Max depth', 'nested fork ladder must expose the supported fork depth')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Fork hop', 'mobile nested fork ladder must keep pipe/hop semantics')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'immediateSourceProject', 'inherited path display must reuse the resolved immediate parent')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'ProjectForkInheritedPathBand', 'forked public pages must show inherited source path plus current fork continuation')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'sourceProject={sourceProject}', 'forked public pages must pass the immediate source project into inherited path display')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Source continuation after fork point', 'forked public pages must mute the original source continuation after the fork point')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Current fork continues right', 'forked public pages must show the fork continuation on the right')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Source path collapses first', 'forked public pages must have a stacked mobile inherited-path view')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'MobileForkBreak', 'fork maps must have a mobile-safe pipe break visual')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'ProjectForkNetworkBand', 'public project pages must show actual approved fork branches when they exist')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'groupProjectForkNetworkBySourceStep', 'public fork network must use the reusable source-step grouping helper')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'MobileForkNetworkRow', 'public fork network must have a mobile-safe response-to-branch layout')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Branches right', 'mobile fork network must preserve the branch-right semantic')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'ForkNetworkRow', 'public fork branches must map back to their response row')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Original text preview', 'public fork network must preserve hover/focus previews of source text')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'sourceSteps={sourceSteps}', 'public fork network must receive the source path for response-level branch mapping')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'getApprovedProjectForks(projectId)', 'public fork branches must come from approved project data')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'projectForkSourceFromSubmissionFields(project)', 'public lineage must read structured fork fields from approved projects')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'Open source path', 'public fork lineage must link back to the source path')
mustInclude('src/components/ProjectCommunityPanel.tsx', communityPanel, 'promptFamilyId={forkSource?.promptFamilyId}', 'forking a fork must preserve the existing prompt family')

const forkCallout = read('src/components/ProjectForkCallout.tsx')
mustInclude('src/components/ProjectForkCallout.tsx', forkCallout, 'canForkDeeper = depth < PROJECT_FORK_MAX_DEPTH', 'public fork callout must stop instead of silently clamping beyond max fork depth')
mustInclude('src/components/ProjectForkCallout.tsx', forkCallout, 'Max fork depth reached', 'public fork callout must show a clear terminal state at the 10x boundary')
mustInclude('src/components/ProjectForkCallout.tsx', forkCallout, 'PROJECT_FORK_MAX_DEPTH} linked fork levels', 'max-depth terminal state must expose the supported fork depth')

for (const routePath of sharedSourceRunRoutes()) {
  const content = read(routePath)
  mustInclude(routePath, content, 'projectId={', 'direct SourceRunShowcase routes must pass projectId for response-level fork links')
  mustInclude(routePath, content, 'projectTitle={', 'direct SourceRunShowcase routes must pass projectTitle for response-level fork links')
}

const preparedWrapper = read('src/components/PreparedSourceRunPage.tsx')
mustInclude('src/components/PreparedSourceRunPage.tsx', preparedWrapper, 'projectId={project.id}', 'prepared source-run pages must pass project identity to fork links')
mustInclude('src/components/PreparedSourceRunPage.tsx', preparedWrapper, 'projectTitle={project.title}', 'prepared source-run pages must pass project title to fork links')

const dataLayer = read('src/lib/data.ts')
mustInclude('src/lib/data.ts', dataLayer, 'projectForkSourceToSubmissionFields', 'source-run creation must store structured fork metadata when available')
mustInclude('src/lib/data.ts', dataLayer, 'sourceRunForkColumnsMissing', 'source-run creation must gracefully fall back before fork columns are applied')
mustInclude('src/lib/data.ts', dataLayer, 'projectForkSourceFromSubmissionFields(sourceRun)', 'publishing a source-run fork must copy lineage onto the approved project')
mustInclude('src/lib/data.ts', dataLayer, 'omitForkFields(updatePayload)', 'project publish must gracefully fall back before prompt fork columns are applied')
mustInclude('src/lib/data.ts', dataLayer, 'getApprovedProjectForks', 'public pages must have a bounded approved-fork reader')
mustInclude('src/lib/data.ts', dataLayer, 'PROJECT_FORK_MAX_WIDTH', 'approved-fork reader must stay bounded to the fork width limit')

const types = read('src/lib/types.ts')
mustInclude('src/lib/types.ts', types, 'fork_source_project_id?: string | null', 'approved project type must carry fork source project id')
mustInclude('src/lib/types.ts', types, 'prompt_family_id?: string | null', 'approved project type must carry prompt family id')

const sourceRunSchema = read('supabase/source-run-submissions.sql')
mustInclude('supabase/source-run-submissions.sql', sourceRunSchema, 'fork_source_project_id TEXT', 'source-run schema must store source project id for forks')
mustInclude('supabase/source-run-submissions.sql', sourceRunSchema, 'fork_source_step_id TEXT', 'source-run schema must store exact fork step id')
mustInclude('supabase/source-run-submissions.sql', sourceRunSchema, 'prompt_family_id TEXT', 'source-run schema must store prompt family identity')
mustInclude('supabase/source-run-submissions.sql', sourceRunSchema, 'fork_depth >= 0 AND fork_depth < 10', 'source-run schema must enforce fork depth capacity')
mustInclude('supabase/source-run-submissions.sql', sourceRunSchema, 'fork_branch_index >= 0 AND fork_branch_index < 10', 'source-run schema must enforce fork branch capacity')

const baseSchema = read('supabase/schema.sql')
mustInclude('supabase/schema.sql', baseSchema, 'fork_source_project_id TEXT', 'base prompt schema must store public fork source project id')
mustInclude('supabase/schema.sql', baseSchema, 'idx_prompts_prompt_family', 'base prompt schema must index prompt families')

const projectForkSchema = read('supabase/project-forks.sql')
mustInclude('supabase/project-forks.sql', projectForkSchema, 'ALTER TABLE prompts', 'fork migration must alter prompts for public lineage')
mustInclude('supabase/project-forks.sql', projectForkSchema, 'fork_source_step_number INT', 'fork migration must store prompt fork step number')
mustInclude('supabase/project-forks.sql', projectForkSchema, 'fork_branch_index >= 0 AND fork_branch_index < 10', 'fork migration must enforce public branch capacity')

const adminDetail = read('src/app/admin/source-runs/[id]/page.tsx')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminDetail, 'Fork source', 'admin source-run detail must show structured fork source metadata')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminDetail, 'hideForkMetadata', 'admin source-run detail must avoid duplicating structured fork metadata in notes')

const adminDashboard = read('src/app/admin/page.tsx')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'projectForkSourceFromSubmissionFields', 'admin pending rows must identify forked source-run intakes')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Project fork guard passed.')
