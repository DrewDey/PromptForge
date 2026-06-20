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
  PROJECT_FORK_MAX_WIDTH,
  buildProjectForkHref,
  buildProjectResponseForkHref,
  createProjectForkDraftContract,
  groupProjectForkNetworkBySourceStep,
  normalizeProjectForkSource,
  projectForkSourceFromSubmissionFields,
  projectForkSourceToSubmissionFields,
  resolveProjectForkTrail,
} = transpiledModule.exports

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

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
      sourceStepNumber: 99,
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
assert(grouping.rows[2].forks.length === 0, 'response 3 should remain an empty branch lane')
assert(grouping.unmatchedForks.map((fork) => fork.id).join(',') === 'fork-unmatched', 'stale fork metadata should remain unmatched instead of being hidden')

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

const clamped = normalizeProjectForkSource({
  sourceProjectId: 'source-project',
  depth: PROJECT_FORK_MAX_DEPTH + 50,
  branchIndex: PROJECT_FORK_MAX_WIDTH + 50,
})
assert(clamped.depth === PROJECT_FORK_MAX_DEPTH - 1, 'fork depth should clamp to the supported maximum index')
assert(clamped.branchIndex === PROJECT_FORK_MAX_WIDTH - 1, 'fork branch should clamp to the supported maximum index')

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
assert(href.startsWith('/build?'), 'fork href should target the build flow')
assert(href.includes('fork=source-project'), 'fork href should include source project id')
assert(href.includes('forkStep=source-step-2'), 'fork href should include exact response step id')
assert(href.includes('forkStepNumber=2'), 'fork href should include response step number')
assert(href.includes('parentFork=parent-project'), 'fork href should include immediate parent project id')
assert(href.includes('promptFamily=source-project%3Asource-step-2'), 'fork href should include prompt family identity')

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
    depth: PROJECT_FORK_MAX_DEPTH - 1,
    branchIndex: 0,
  },
})
assert(maxedResponseHref === null, 'response fork href should stop at the max-depth boundary')

const fields = projectForkSourceToSubmissionFields({
  sourceProjectId: 'source-project',
  sourceProjectTitle: 'Source Project',
  sourceStepId: 'source-step-2',
  sourceStepNumber: 2,
  parentForkId: 'parent-project',
  depth: 2,
  branchIndex: 3,
  promptFamilyId: 'source-project:source-step-2',
})
const roundTrip = projectForkSourceFromSubmissionFields(fields)
assert(roundTrip?.sourceProjectId === 'source-project', 'stored fork fields should round-trip source project id')
assert(roundTrip?.parentForkId === 'parent-project', 'stored fork fields should round-trip immediate parent id')
assert(roundTrip?.promptFamilyId === 'source-project:source-step-2', 'stored fork fields should round-trip prompt family id')

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
