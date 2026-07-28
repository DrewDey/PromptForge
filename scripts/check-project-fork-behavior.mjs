import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

const source = readFileSync('src/lib/project-forks.ts', 'utf8')
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
})

if (diagnostics?.length) {
  const messages = diagnostics.map((diagnostic) => diagnostic.messageText).join('\n')
  throw new Error(`Unable to transpile project-forks.ts:\n${messages}`)
}

const transpiledModule = { exports: {} }
const sandbox = {
  exports: transpiledModule.exports,
  module: transpiledModule,
  require(specifier) {
    if (specifier === './types') return {}
    throw new Error(`Unexpected require from project-forks.ts: ${specifier}`)
  },
  URL,
  URLSearchParams,
  Set,
  Number,
  Math,
  String,
  Array,
  Promise,
}

new Script(outputText, { filename: 'project-forks.transpiled.cjs' }).runInNewContext(sandbox)

const {
  PROJECT_FORK_MAX_DEPTH,
  PROJECT_FORK_MAX_LEVELS,
  PROJECT_FORK_MAX_STORED_DEPTH,
  PROJECT_FORK_MAX_WIDTH,
  buildCommunityProjectForkHref,
  buildProjectForkHref,
  buildProjectResponseForkHref,
  communityProjectContinuationSteps,
  createProjectForkDraftContract,
  filterProjectForkNetworkBySourceRun,
  groupProjectForkNetworkBySourceStep,
  normalizeProjectForkSource,
  parseProjectForkSearchParams,
  projectForkSourceFromSubmissionFields,
  projectForkSourceToSubmissionFields,
  resolveProjectForkTrail,
  resolveProjectForkPoint,
  serializeProjectForkSourceForNotes,
} = transpiledModule.exports

const sourceRunPresentationSource = readFileSync(
  'src/lib/source-run-presentation.ts',
  'utf8',
)
const {
  outputText: sourceRunPresentationOutput,
  diagnostics: sourceRunPresentationDiagnostics,
} = ts.transpileModule(sourceRunPresentationSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
})

if (sourceRunPresentationDiagnostics?.length) {
  const messages = sourceRunPresentationDiagnostics
    .map((diagnostic) => diagnostic.messageText)
    .join('\n')
  throw new Error(`Unable to transpile source-run-presentation.ts:\n${messages}`)
}

const sourceRunPresentationModule = { exports: {} }
new Script(sourceRunPresentationOutput, {
  filename: 'source-run-presentation.transpiled.cjs',
}).runInNewContext({
  exports: sourceRunPresentationModule.exports,
  module: sourceRunPresentationModule,
  require(specifier) {
    if (specifier === './source-run-package') return {}
    throw new Error(`Unexpected require from source-run-presentation.ts: ${specifier}`)
  },
  Set,
  Array,
  String,
})

const {
  sourceRunDefaultStepNumber,
  sourceRunDisplayArtifactFiles,
} = sourceRunPresentationModule.exports

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

const hpLegacyPackage = JSON.parse(
  readFileSync('seed-runs/hp-10bii-financial-calculator-claude-opus-48.json', 'utf8'),
)
const hpPreparedArtifactPath =
  'public/artifacts/hp-10bii-financial-calculator-claude-opus-48.html'
const hpStepOneArtifacts = sourceRunDisplayArtifactFiles(
  hpLegacyPackage,
  hpLegacyPackage.steps[0],
  hpPreparedArtifactPath,
)
const hpStepTwoArtifacts = sourceRunDisplayArtifactFiles(
  hpLegacyPackage,
  hpLegacyPackage.steps[1],
  hpPreparedArtifactPath,
)
assert(
  sourceRunDefaultStepNumber(hpLegacyPackage, hpPreparedArtifactPath) === 2,
  'a legacy package without final_artifact_path must resolve its prepared canonical artifact to the containing step',
)
assert(
  hpStepOneArtifacts.length === 1 &&
    hpStepOneArtifacts[0].endsWith('-initial.html'),
  'a legacy package must preserve the genuine initial artifact on its non-default step',
)
assert(
  hpStepTwoArtifacts.length === 1 &&
    hpStepTwoArtifacts[0] === hpPreparedArtifactPath,
  'a legacy package default step must expose exactly the prepared canonical artifact',
)

const sourceSteps = [
  {
    id: 'source-step-1',
    stepNumber: 1,
    promptTitle: 'First prompt',
    promptText: 'Prompt 1 text',
    responseText: 'Response 1 text',
    responsePackageId: 'source-step-1',
  },
  {
    id: 'source-step-2',
    stepNumber: 2,
    promptTitle: 'Second prompt',
    promptText: 'Prompt 2 text',
    responseText: 'Response 2 text',
    responsePackageId: 'source-step-2',
  },
  {
    id: 'source-step-3',
    stepNumber: 3,
    promptTitle: 'Third prompt',
    promptText: 'Prompt 3 text',
    responseText: 'Response 3 text',
    responsePackageId: 'source-step-3',
  },
]

const forks = [
  {
    id: 'fork-by-step-id',
    title: 'Fork from response 2',
    createdAt: '2026-06-05T00:00:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceStepId: 'source-step-2',
      sourceStepNumber: 2,
      depth: 1,
      branchIndex: 0,
      promptFamilyId: 'source-project:source-step-2',
    },
    continuationSteps: [{
      id: 'fork-step-3',
      stepNumber: 3,
      promptTitle: 'Fork prompt 3',
      promptText: 'Fork prompt 3 text',
      responseText: 'Fork response 3 text',
      responsePackageId: 'fork-step-3',
      artifactVersions: [{
        id: 'fork-step-3-artifact-1',
        artifactPath: '/artifacts/airlock-zero/fork-step-3.html',
        artifactTitle: 'Airlock Zero fork final',
        isDefault: true,
      }],
    }],
  },
  {
    id: 'fork-by-step-number',
    title: 'Fork from response 1',
    createdAt: '2026-06-05T00:01:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceStepNumber: 1,
      depth: 1,
      branchIndex: 1,
      promptFamilyId: 'source-project:source-step-1',
    },
  },
  {
    id: 'fork-unmatched',
    title: 'Fork with stale metadata',
    createdAt: '2026-06-05T00:02:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceStepId: 'missing-step',
      // A matching number must never rescue a stale exact id. This is the
      // collision shape that previously attached a branch to the wrong run.
      sourceStepNumber: 2,
      depth: 1,
      branchIndex: 2,
      promptFamilyId: 'source-project:missing-step',
    },
  },
]

const grouping = groupProjectForkNetworkBySourceStep(sourceSteps, forks)
assert(grouping.rows.length === 3, 'network grouping should keep one row per source response')
assert(grouping.rows[0].forks.map((fork) => fork.id).join(',') === 'fork-by-step-number', 'step-number fork should map to response 1')
assert(grouping.rows[1].forks.map((fork) => fork.id).join(',') === 'fork-by-step-id', 'step-id fork should map to response 2')
assert(grouping.rows[1].forks[0]?.continuationSteps?.[0]?.artifactVersions?.[0]?.artifactPath === '/artifacts/airlock-zero/fork-step-3.html', 'network grouping must preserve the exact child artifact selected for inline display')
assert(grouping.rows[2].forks.length === 0, 'response 3 should remain an empty branch lane')
assert(grouping.unmatchedForks.map((fork) => fork.id).join(',') === 'fork-unmatched', 'stale fork metadata should remain unmatched instead of being hidden')

const staleExactForkPoint = resolveProjectForkPoint(sourceSteps, {
  sourceStepId: 'stale-step-id',
  sourceStepNumber: 2,
})
assert(staleExactForkPoint === null, 'a stale exact step id must be rejected instead of falling back to a matching step number')

const missingExactContract = createProjectForkDraftContract({
  source: {
    sourceProjectId: 'source-project',
    sourceStepId: 'stale-step-id',
    sourceStepNumber: 2,
    depth: 1,
    branchIndex: 0,
  },
  sourceSteps,
})
assert(missingExactContract.forkPointStep === null, 'draft contract must preserve a missing exact fork point for review instead of silently retargeting it')
assert(missingExactContract.promptFamilyId === undefined, 'draft contract must not derive a prompt family from a different response when the exact id is stale')

const contract = createProjectForkDraftContract({
  source: {
    sourceProjectId: 'source-project',
    sourceStepId: 'source-step-2',
    sourceStepNumber: 2,
    depth: 1,
    branchIndex: 1,
  },
  sourceSteps,
})
assert(contract.forkPointStep?.id === 'source-step-2', 'fork contract should resolve the exact step id as the fork point')
assert(contract.sharedStepIds.join(',') === 'source-step-1,source-step-2', 'fork contract should include shared history through the fork point')
assert(contract.originalContinuationStepIds.join(',') === 'source-step-3', 'fork contract should mute original continuation after the fork point')
assert(contract.promptFamilyId === 'source-project:source-step-2', 'fork contract should derive a stable prompt family id')

const observedOverdepth = normalizeProjectForkSource({
  sourceProjectId: 'source-project',
  depth: PROJECT_FORK_MAX_STORED_DEPTH + 1,
  branchIndex: PROJECT_FORK_MAX_WIDTH + 50,
})
assert(
  observedOverdepth.depth === PROJECT_FORK_MAX_STORED_DEPTH + 1,
  'legacy over-depth evidence must preserve its observed stored depth instead of clamping into a valid level',
)
assert(
  observedOverdepth.branchIndex === PROJECT_FORK_MAX_WIDTH + 50,
  'legacy over-width evidence must preserve its observed branch index instead of clamping into a valid lane',
)

const observedNegativeDepth = projectForkSourceFromSubmissionFields({
  fork_source_project_id: 'legacy-negative-depth-source',
  fork_depth: -1,
  fork_branch_index: 0,
})
assert(
  observedNegativeDepth?.depth === -1,
  'legacy negative stored depth must remain explicit evidence instead of normalizing into a green level-1 fork',
)

const href = buildProjectForkHref({
  sourceProjectId: 'source-project',
  sourceProjectTitle: 'Source Project',
  sourceStepId: 'source-step-2',
  sourceStepNumber: 2,
  parentForkId: 'parent-project',
  depth: 2,
  branchIndex: 3,
  promptFamilyId: 'source-project:source-step-2',
})
assert(href.startsWith('/prompt/new?'), 'global fork href should preserve the queue-only source-run intake')
assert(href.includes('fork=source-project'), 'fork href should include source project id')
assert(href.includes('forkStep=source-step-2'), 'fork href should include exact response step id')
assert(href.includes('forkStepNumber=2'), 'fork href should include response step number')
assert(href.includes('parentFork=parent-project'), 'fork href should include immediate parent project id')
assert(href.includes('promptFamily=source-project%3Asource-step-2'), 'fork href should include prompt family identity')

const communityHref = buildCommunityProjectForkHref({
  sourceProjectId: 'community-source-project',
  sourceProjectTitle: 'Community Source Project',
  sourceStepId: 'community-source-step-2',
  sourceStepNumber: 2,
})
assert(communityHref.startsWith('/build?'), 'community project forks should target the invitation-only project bundle flow')
assert(communityHref.includes('fork=community-source-project'), 'community fork href should preserve its source project id')
assert(communityHref.includes('forkStep=community-source-step-2'), 'community fork href should preserve its exact source response')

const responseHref = buildProjectResponseForkHref({
  sourceProjectId: 'source-project',
  sourceProjectTitle: 'Source Project',
  sourceStepId: 'source-step-1',
  sourceStepNumber: 1,
})
assert(responseHref?.includes('fork=source-project'), 'response fork href should include source project id')
assert(responseHref?.includes('forkStep=source-step-1'), 'response fork href should include exact response step id')
assert(responseHref?.includes('forkStepNumber=1'), 'response fork href should include exact response step number')
assert(responseHref?.includes('promptFamily=source-project%3Asource-step-1'), 'response fork href should derive a response prompt family id')
assert(!responseHref?.includes('parentFork='), 'root response fork href should not claim an immediate parent fork')
assert(responseHref?.startsWith('/prompt/new?'), 'global response forks should preserve the queue-only source-run intake')

const communityResponseHref = buildProjectResponseForkHref({
  sourceProjectId: 'community-source-project',
  sourceProjectTitle: 'Community Source Project',
  sourceStepId: 'community-source-step-2',
  sourceStepNumber: 2,
  destination: '/build',
})
assert(communityResponseHref?.startsWith('/build?'), 'community response forks should enter the invitation-only project bundle flow')
assert(communityResponseHref?.includes('forkStep=community-source-step-2'), 'community response forks should preserve the exact source response')
assert(!communityResponseHref?.includes('forkDepth='), 'a root community fork must persist stored depth 0 for public level 2')

const communityDescendantHref = buildProjectResponseForkHref({
  sourceProjectId: 'community-level-2-project',
  sourceProjectTitle: 'Community Level 2 Project',
  sourceStepId: 'community-level-2-step-1',
  sourceStepNumber: 1,
  currentForkSource: {
    sourceProjectId: 'community-root-project',
    sourceStepId: 'community-root-step-1',
    sourceStepNumber: 1,
    depth: 0,
    branchIndex: 0,
    promptFamilyId: 'community-root-project:community-root-step-1',
  },
  destination: '/build',
})
assert(
  communityDescendantHref?.includes('forkDepth=1'),
  'a community descendant fork must advance from stored depth 0 to stored depth 1 (public level 3)',
)

const communityLevelTenHref = buildProjectResponseForkHref({
  sourceProjectId: 'community-level-9-project',
  sourceStepId: 'community-level-9-step-1',
  sourceStepNumber: 1,
  currentForkSource: {
    sourceProjectId: 'community-level-8-project',
    depth: PROJECT_FORK_MAX_STORED_DEPTH - 1,
    branchIndex: 0,
  },
  destination: '/build',
})
assert(
  communityLevelTenHref?.includes(`forkDepth=${PROJECT_FORK_MAX_STORED_DEPTH}`),
  'a community level-9 project must still be able to create the terminal stored-depth-8 fork at public level 10',
)

const publishedCommunityChildFixture = {
  parentForkPoint: 2,
  childSteps: [{
    id: 'community-child-step-1',
    stepNumber: 1,
    promptTitle: 'Child continuation',
    promptText: 'Continue from the parent response.',
    responseText: 'Child response',
    responsePackageId: 'community-child-response-1',
  }],
}
const communityChildLocalSteps = communityProjectContinuationSteps(
  publishedCommunityChildFixture.childSteps,
)
assert(
  communityChildLocalSteps.length === 1 &&
    communityChildLocalSteps[0].stepNumber === 1 &&
    publishedCommunityChildFixture.parentForkPoint > communityChildLocalSteps[0].stepNumber,
  'community child steps must remain visible when a parent fork point has a higher step number',
)

const nestedResponseHref = buildProjectResponseForkHref({
  sourceProjectId: 'current-fork-project',
  sourceProjectTitle: 'Current Fork Project',
  sourceStepId: 'current-step-3',
  sourceStepNumber: 3,
  currentForkSource: {
    sourceProjectId: 'root-project',
    sourceStepId: 'root-step-2',
    sourceStepNumber: 2,
    depth: 1,
    branchIndex: 0,
    promptFamilyId: 'root-project:root-step-2',
  },
})
assert(nestedResponseHref?.includes('fork=current-fork-project'), 'nested response fork href should start from the current fork project')
assert(nestedResponseHref?.includes('parentFork=current-fork-project'), 'nested response fork href should preserve the immediate parent fork id')
assert(nestedResponseHref?.includes('forkDepth=2'), 'nested response fork href should advance fork depth')
assert(nestedResponseHref?.includes('promptFamily=root-project%3Aroot-step-2'), 'nested response fork href should preserve the inherited prompt family id')

const maxedResponseHref = buildProjectResponseForkHref({
  sourceProjectId: 'maxed-fork-project',
  sourceStepId: 'maxed-step-1',
  sourceStepNumber: 1,
  currentForkSource: {
    sourceProjectId: 'root-project',
    depth: PROJECT_FORK_MAX_STORED_DEPTH,
    branchIndex: 0,
  },
})
assert(maxedResponseHref === null, 'a stored-depth-8 terminal fork at public level 10 must not create another generation')
assert(PROJECT_FORK_MAX_LEVELS === 10, 'fork behavior must retain exactly ten total public levels')
assert(PROJECT_FORK_MAX_DEPTH === PROJECT_FORK_MAX_LEVELS, 'the legacy max-depth export must remain a display-level compatibility alias')

const artifactSha256 = 'a'.repeat(64)
const variantAwareHref = buildProjectResponseForkHref({
  sourceProjectId: 'source-project',
  sourceProjectTitle: 'Source Project',
  sourceModelVariantId: 'variant-gpt-56-sol-max',
  sourceRunId: 'run-gpt-56-sol-max',
  sourceStepId: 'run-gpt-56-sol-max:step:2',
  sourceStepNumber: 2,
  sourceArtifactPath: 'public/artifacts/airlock-zero/gpt-56-sol-max-step-2.html',
  sourceArtifactSha256: artifactSha256,
})
assert(variantAwareHref?.includes('forkVariant=variant-gpt-56-sol-max'), 'variant-aware fork href should preserve the exact source model variant')
assert(variantAwareHref?.includes('forkRun=run-gpt-56-sol-max'), 'variant-aware fork href should preserve the exact source run')
assert(variantAwareHref?.includes('forkArtifact=public%2Fartifacts%2Fairlock-zero%2Fgpt-56-sol-max-step-2.html'), 'variant-aware fork href should preserve the exact source artifact path')
assert(variantAwareHref?.includes(`forkArtifactSha256=${artifactSha256}`), 'variant-aware fork href should preserve the exact source artifact digest')

const parsedVariantAwareHref = parseProjectForkSearchParams(
  new URL(`https://pathforge.test${variantAwareHref}`).searchParams,
)
assert(parsedVariantAwareHref?.sourceModelVariantId === 'variant-gpt-56-sol-max', 'fork URL parsing should round-trip the exact source model variant')
assert(parsedVariantAwareHref?.sourceRunId === 'run-gpt-56-sol-max', 'fork URL parsing should round-trip the exact source run')
assert(parsedVariantAwareHref?.sourceArtifactPath === 'public/artifacts/airlock-zero/gpt-56-sol-max-step-2.html', 'fork URL parsing should round-trip the exact source artifact path')
assert(parsedVariantAwareHref?.sourceArtifactSha256 === artifactSha256, 'fork URL parsing should round-trip the exact source artifact digest')

const fields = projectForkSourceToSubmissionFields({
  sourceProjectId: 'source-project',
  sourceProjectTitle: 'Source Project',
  sourceModelVariantId: 'variant-gpt-56-sol-max',
  sourceRunId: 'run-gpt-56-sol-max',
  sourceStepId: 'source-step-2',
  sourceStepNumber: 2,
  sourceArtifactPath: 'public/artifacts/airlock-zero/gpt-56-sol-max-step-2.html',
  sourceArtifactSha256: artifactSha256,
  parentForkId: 'parent-project',
  depth: 2,
  branchIndex: 3,
  promptFamilyId: 'source-project:source-step-2',
})
const roundTrip = projectForkSourceFromSubmissionFields(fields)
assert(roundTrip?.sourceProjectId === 'source-project', 'stored fork fields should round-trip source project id')
assert(roundTrip?.parentForkId === 'parent-project', 'stored fork fields should round-trip immediate parent id')
assert(roundTrip?.promptFamilyId === 'source-project:source-step-2', 'stored fork fields should round-trip prompt family id')
assert(roundTrip?.sourceModelVariantId === 'variant-gpt-56-sol-max', 'stored fork fields should round-trip exact source model variant id')
assert(roundTrip?.sourceRunId === 'run-gpt-56-sol-max', 'stored fork fields should round-trip exact source run id')
assert(roundTrip?.sourceArtifactPath === 'public/artifacts/airlock-zero/gpt-56-sol-max-step-2.html', 'stored fork fields should round-trip exact source artifact path')
assert(roundTrip?.sourceArtifactSha256 === artifactSha256, 'stored fork fields should round-trip exact source artifact digest')

const serializedVariantAwareNotes = serializeProjectForkSourceForNotes(roundTrip)
assert(serializedVariantAwareNotes.includes('Fork source run: run-gpt-56-sol-max'), 'review notes should retain the exact source run id')
assert(serializedVariantAwareNotes.includes('Fork source model variant: variant-gpt-56-sol-max'), 'review notes should retain the exact source model variant id')
assert(serializedVariantAwareNotes.includes('Fork source artifact: public/artifacts/airlock-zero/gpt-56-sol-max-step-2.html'), 'review notes should retain the exact source artifact path')
assert(serializedVariantAwareNotes.includes(`Fork source artifact SHA-256: ${artifactSha256}`), 'review notes should retain the exact source artifact digest')

const runIsolatedForks = [
  {
    id: 'run-a-branch',
    title: 'Run A branch',
    createdAt: '2026-07-11T00:00:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceRunId: 'run-a',
      sourceStepId: 'shared-step-id',
      sourceStepNumber: 2,
      depth: 1,
      branchIndex: 0,
    },
  },
  {
    id: 'run-b-branch',
    title: 'Run B branch',
    createdAt: '2026-07-11T00:01:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceRunId: 'run-b',
      sourceStepId: 'shared-step-id',
      sourceStepNumber: 2,
      depth: 1,
      branchIndex: 0,
    },
  },
  {
    id: 'legacy-branch',
    title: 'Legacy branch without run identity',
    createdAt: '2026-07-11T00:02:00.000Z',
    forkSource: {
      sourceProjectId: 'source-project',
      sourceStepId: 'shared-step-id',
      sourceStepNumber: 2,
      depth: 1,
      branchIndex: 0,
    },
  },
]
assert(filterProjectForkNetworkBySourceRun(runIsolatedForks, 'run-a').map((fork) => fork.id).join(',') === 'run-a-branch', 'model run A must never receive branches from run B or legacy runless rows')
assert(filterProjectForkNetworkBySourceRun(runIsolatedForks, ' run-b ').map((fork) => fork.id).join(',') === 'run-b-branch', 'source-run filter should normalize the requested run id before exact matching')
assert(filterProjectForkNetworkBySourceRun(runIsolatedForks).length === 3, 'generic canonical pages without a run selector should retain every approved branch')
assert(filterProjectForkNetworkBySourceRun(runIsolatedForks, '   ').length === 3, 'blank source-run selectors should behave like omitted selectors')

const collisionSteps = [{
  id: 'shared-step-id',
  stepNumber: 2,
  promptTitle: 'Same numbered response in every model run',
  promptText: 'Prompt text',
  responseText: 'Response text',
  responsePackageId: 'shared-step-id',
}]
const isolatedGrouping = groupProjectForkNetworkBySourceStep(
  collisionSteps,
  filterProjectForkNetworkBySourceRun(runIsolatedForks, 'run-a'),
)
assert(isolatedGrouping.rows[0].forks.map((fork) => fork.id).join(',') === 'run-a-branch', 'render grouping must attach only the branch belonging to the selected model run even when step ids collide')

const rootProject = {
  id: 'root-project',
  title: 'Original calculator path',
}
const firstForkProject = {
  id: 'first-fork-project',
  title: 'First fork path',
  fork_source_project_id: rootProject.id,
  fork_source_project_title: rootProject.title,
  fork_source_step_id: 'root-step-2',
  fork_source_step_number: 2,
  fork_parent_submission_id: null,
  prompt_family_id: 'root-project:root-step-2',
  fork_depth: 1,
  fork_branch_index: 0,
}
const secondForkProject = {
  id: 'second-fork-project',
  title: 'Second fork path',
  fork_source_project_id: firstForkProject.id,
  fork_source_project_title: firstForkProject.title,
  fork_source_step_id: 'first-fork-step-1',
  fork_source_step_number: 1,
  fork_parent_submission_id: firstForkProject.id,
  prompt_family_id: 'root-project:root-step-2',
  fork_depth: 2,
  fork_branch_index: 0,
}
const projectFixtures = {
  [rootProject.id]: rootProject,
  [firstForkProject.id]: firstForkProject,
  [secondForkProject.id]: secondForkProject,
}
const forkTrail = await resolveProjectForkTrail(secondForkProject, (projectId) => projectFixtures[projectId] ?? null)
assert(forkTrail.nodes.map((node) => node.id).join(',') === 'root-project,first-fork-project,second-fork-project', 'fork trail should preserve root-to-current ancestry order')
assert(forkTrail.immediateSourceProject?.id === 'first-fork-project', 'fork trail should expose the immediate parent project for inherited-path rendering')
assert(forkTrail.nodes[1].forkSource?.sourceStepNumber === 2, 'fork trail should keep the response number for the first fork hop')
assert(forkTrail.nodes[2].forkSource?.sourceStepNumber === 1, 'fork trail should keep the response number for the current fork hop')
assert(forkTrail.nodes[2].isCurrent === true, 'fork trail should mark the current project node')
assert(forkTrail.cycleDetected === false, 'normal fork trails should not report cycles')
assert(forkTrail.truncated === false, 'normal fork trails should not report truncation')

const missingParentFork = {
  id: 'missing-parent-fork',
  title: 'Fork with unavailable source',
  fork_source_project_id: 'deleted-source-project',
  fork_source_project_title: 'Deleted source path',
  fork_source_step_number: 3,
  fork_depth: 1,
  fork_branch_index: 0,
}
const missingTrail = await resolveProjectForkTrail(missingParentFork, () => null)
assert(missingTrail.nodes.map((node) => node.id).join(',') === 'deleted-source-project,missing-parent-fork', 'fork trail should keep a visible placeholder when a parent source is missing')
assert(missingTrail.nodes[0].isMissingSource === true, 'missing parent placeholder should be marked as unavailable')
assert(missingTrail.missingSourceProjectId === 'deleted-source-project', 'missing parent id should be preserved for diagnostics')

const cycleA = {
  id: 'cycle-a',
  title: 'Cycle A',
  fork_source_project_id: 'cycle-b',
  fork_source_project_title: 'Cycle B',
  fork_source_step_number: 1,
}
const cycleB = {
  id: 'cycle-b',
  title: 'Cycle B',
  fork_source_project_id: 'cycle-a',
  fork_source_project_title: 'Cycle A',
  fork_source_step_number: 1,
}
const cycleProjects = {
  [cycleA.id]: cycleA,
  [cycleB.id]: cycleB,
}
const cycleTrail = await resolveProjectForkTrail(cycleA, (projectId) => cycleProjects[projectId] ?? null)
assert(cycleTrail.cycleDetected === true, 'fork trail should detect cycle-shaped lineage instead of looping')
assert(cycleTrail.nodes.map((node) => node.id).join(',') === 'cycle-b,cycle-a', 'cycle guard should keep the readable non-repeating trail')

const deepRoot = {
  id: 'deep-root',
  title: 'Deep root',
}
const deepOne = {
  id: 'deep-one',
  title: 'Deep one',
  fork_source_project_id: deepRoot.id,
  fork_source_project_title: deepRoot.title,
  fork_source_step_number: 1,
}
const deepTwo = {
  id: 'deep-two',
  title: 'Deep two',
  fork_source_project_id: deepOne.id,
  fork_source_project_title: deepOne.title,
  fork_source_step_number: 1,
}
const deepThree = {
  id: 'deep-three',
  title: 'Deep three',
  fork_source_project_id: deepTwo.id,
  fork_source_project_title: deepTwo.title,
  fork_source_step_number: 1,
}
const deepProjects = {
  [deepRoot.id]: deepRoot,
  [deepOne.id]: deepOne,
  [deepTwo.id]: deepTwo,
  [deepThree.id]: deepThree,
}
const truncatedTrail = await resolveProjectForkTrail(deepThree, (projectId) => deepProjects[projectId] ?? null, 2)
assert(truncatedTrail.nodes.map((node) => node.id).join(',') === 'deep-one,deep-two,deep-three', 'bounded fork trail should keep the closest readable ancestry when truncated')
assert(truncatedTrail.truncated === true, 'bounded fork trail should report when older ancestry is intentionally truncated')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Project fork behavior guard passed.')
