#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

const source = readFileSync('src/lib/project-forks.ts', 'utf8')
const forkContractDocument = readFileSync('PATHFORGE_FORKS.md', 'utf8')
assert(
  forkContractDocument.includes('at most 10 total display levels') &&
    forkContractDocument.includes('valid fork depths are `0` through `8`') &&
    !forkContractDocument.includes('Depth and width are both capped at 10'),
  'PATHFORGE_FORKS.md must distinguish ten display levels from stored depth 0..8',
)
for (const [path, expectedSha256] of [
  [
    'supabase/migrations/20260712020049_my_forge_owner_state.sql',
    '84fdd40d543834d1f9997450a31ffa1f7727d3557356a84685240d1ff98cf10c',
  ],
  [
    'supabase/migrations/20260712033440_my_forge_unfinished_forks.sql',
    '0acd1e4c1fc2df07f879274598b40d75e10d50fefd81c0b5b9d6c869ba66c658',
  ],
]) {
  const actualSha256 = createHash('sha256')
    .update(readFileSync(path))
    .digest('hex')
  assert.equal(actualSha256, expectedSha256, `${path} must preserve deployed history`)
}
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
})
const diagnostics = transpiled.diagnostics ?? []
if (diagnostics.length > 0) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  }))
}

const loadedModule = { exports: {} }
new Script(`(function (exports, module, require) {
${transpiled.outputText}
})(module.exports, module, (specifier) => {
  throw new Error('Unexpected runtime import: ' + specifier)
});`).runInNewContext({ module: loadedModule })

const {
  PROJECT_FORK_MAX_LEVELS,
  PROJECT_FORK_MAX_STORED_DEPTH,
  buildProjectForkLineageTruth,
  chunkProjectForkLineageIds,
  markProjectForkNetworkLineageUnavailable,
  normalizeProjectForkSource,
  overlayProjectForkLineagePresentations,
  projectForkArtifactPathsEquivalent,
  resolveExactProjectForkModelVariantIdentity,
  selectProjectForkLocalSteps,
  selectProjectForkLineageTruth,
  unavailableProjectForkLineageTruth,
} = loadedModule.exports

const recoveredModelVariant = resolveExactProjectForkModelVariantIdentity({
  claimedModelVariantId: 'variant-from-authoritative-edge',
})
assert.equal(recoveredModelVariant.valid, true)
assert.equal(
  recoveredModelVariant.sourceModelVariantId,
  'variant-from-authoritative-edge',
  'an exact prepared run may recover its database-validated outgoing model identity',
)
const reconciledModelVariant = resolveExactProjectForkModelVariantIdentity({
  registeredModelVariantId: 'variant-reconciled',
  claimedModelVariantId: 'variant-reconciled',
})
assert.equal(reconciledModelVariant.valid, true)
assert.equal(
  reconciledModelVariant.sourceModelVariantId,
  'variant-reconciled',
  'matching reconciled and claimed model identities must remain valid',
)
const conflictingModelVariant = resolveExactProjectForkModelVariantIdentity({
  registeredModelVariantId: 'variant-reconciled',
  claimedModelVariantId: 'variant-conflict',
})
assert.equal(
  conflictingModelVariant.valid,
  false,
  'conflicting reconciled and claimed model identities must fail closed',
)
assert.equal(conflictingModelVariant.sourceModelVariantId, undefined)

const inheritedPreparedSteps = [
  { stepNumber: 1, id: 'inherited-1' },
  { stepNumber: 2, id: 'inherited-2' },
  { stepNumber: 3, id: 'continuation-3' },
  { stepNumber: 4, id: 'continuation-4' },
]
assert.deepEqual(
  Array.from(selectProjectForkLocalSteps(inheritedPreparedSteps, 2), (step) => step.id),
  ['continuation-3', 'continuation-4'],
)

function fixture(overrides = {}) {
  const nodes = []
  const rootId = 'project-1'
  const rootStepId = 'step-1'
  const family = `${rootId}:${rootStepId}`
  for (let index = 0; index < PROJECT_FORK_MAX_LEVELS; index += 1) {
    const projectId = `project-${index + 1}`
    const stepId = `step-${index + 1}`
    const artifactPath = `public/artifacts/project-${index + 1}.html`
    const artifactSha256 = String(index + 1).padStart(64, '0')
    nodes.push({
      projectId,
      title: `Project ${index + 1}`,
      project: { id: projectId },
      promptFamilyId: index === 0 ? null : family,
      presentation: {
        href: `/prompt/${projectId}`,
        providerName: `Provider ${index + 1}`,
        localSteps: [{
          id: stepId,
          stepNumber: 1,
          promptTitle: `Prompt ${index + 1}`,
          promptText: `Prompt text ${index + 1}`,
          responseText: `Response ${index + 1}`,
          responsePackageId: `response-${index + 1}`,
          artifactPath,
          artifactSha256,
          artifactVersions: [{
            id: `artifact-${index + 1}`,
            artifactPath,
            artifactTitle: `Artifact ${index + 1}`,
            artifactSha256,
            sourceRunId: `run-${index + 1}`,
            sourceStepId: stepId,
            sourceStepNumber: 1,
            isDefault: true,
          }],
        }],
      },
      forkSource: index === 0 ? null : normalizeProjectForkSource({
        sourceProjectId: `project-${index}`,
        sourceProjectTitle: `Project ${index}`,
        sourceRunId: `run-${index}`,
        sourceStepId: `step-${index}`,
        sourceStepNumber: 1,
        sourceArtifactPath: `public/artifacts/project-${index}.html`,
        sourceArtifactSha256: String(index).padStart(64, '0'),
        parentForkId: index === 1 ? undefined : `project-${index}`,
        promptFamilyId: family,
        depth: index - 1,
        branchIndex: index - 1,
      }),
    })
  }
  return {
    nodes,
    currentProjectId: nodes.at(-1).projectId,
    readSource: 'test-fixture',
    ...overrides,
  }
}

const valid = buildProjectForkLineageTruth(fixture())
assert.equal(valid.integrity.kind, 'complete')
assert.equal(valid.generations[0].presentation.localSteps[0].sourceModelVariantId, undefined)
assert.equal(
  valid.generations[1].incomingEdge.sourceResponse.modelVariantId,
  undefined,
)
assert.equal(valid.generations.length, 10)
assert.equal(
  JSON.stringify(valid.generations.map((node) => node.displayLevel)),
  JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
)
assert.equal(
  JSON.stringify(valid.generations.slice(1).map((node) => node.forkSource.depth)),
  JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8]),
)
assert.equal(valid.generations.at(-1).incomingEdge.sourceResponse.stepId, 'step-9')
assert.equal(valid.generations.at(-1).incomingEdge.sourceResponse.localStepId, 'step-9')
assert.equal(valid.generations.at(-1).incomingEdge.targetPrompt.stepId, 'step-10')
assert.equal(valid.generations[1].presentation.providerName, 'Provider 2')
assert.equal(valid.eligibility.allowed, false)
assert.equal(valid.eligibility.reason, 'max-depth')
assert.equal(valid.eligibility.currentStoredDepth, PROJECT_FORK_MAX_STORED_DEPTH)
assert.equal(valid.eligibility.nextStoredDepth, null)

const validModelVariantInput = fixture()
validModelVariantInput.nodes[0].presentation.localSteps[0].sourceModelVariantId =
  'variant-project-1'
validModelVariantInput.nodes[0].presentation.localSteps[0].sourceStepId = 'step-1'
validModelVariantInput.nodes[0].presentation.localSteps[0].sourceStepNumber = 1
validModelVariantInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceModelVariantId = 'variant-project-1'
validModelVariantInput.nodes[1].forkSource.sourceModelVariantId =
  'variant-project-1'
const validModelVariant = buildProjectForkLineageTruth(validModelVariantInput)
assert.equal(validModelVariant.integrity.kind, 'complete')
assert.equal(
  validModelVariant.generations[0].presentation.localSteps[0].sourceStepId,
  'step-1',
)
assert.equal(
  validModelVariant.generations[1].incomingEdge.sourceResponse.modelVariantId,
  'variant-project-1',
)

const nonexistentVariantInput = structuredClone(validModelVariantInput)
nonexistentVariantInput.nodes[1].forkSource.sourceModelVariantId =
  'variant-does-not-exist'
const nonexistentVariant = buildProjectForkLineageTruth(nonexistentVariantInput)
assert.equal(nonexistentVariant.integrity.kind, 'invalid')
assert.equal(nonexistentVariant.eligibility.allowed, false)
assert.equal(
  nonexistentVariant.generations[1].forkSource.sourceModelVariantId,
  'variant-does-not-exist',
)
assert(nonexistentVariant.integrity.issues.some((issue) => (
  issue.kind === 'source-model-variant-mismatch' &&
  issue.observed === 'variant-does-not-exist'
)))

const foreignVariantInput = structuredClone(validModelVariantInput)
foreignVariantInput.nodes[0].presentation.localSteps[0].sourceModelVariantId =
  'variant-foreign-project'
foreignVariantInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceModelVariantId = 'variant-foreign-project'
const foreignVariant = buildProjectForkLineageTruth(foreignVariantInput)
assert.equal(foreignVariant.integrity.kind, 'invalid')
assert(foreignVariant.integrity.issues.some((issue) => (
  issue.kind === 'source-model-variant-mismatch'
)))

const wrongVariantRunInput = structuredClone(validModelVariantInput)
wrongVariantRunInput.nodes[1].forkSource.sourceRunId = 'run-wrong'
const wrongVariantRun = buildProjectForkLineageTruth(wrongVariantRunInput)
assert.equal(wrongVariantRun.integrity.kind, 'invalid')
assert(wrongVariantRun.integrity.issues.some((issue) => (
  issue.kind === 'source-run-mismatch'
)))

const wrongVariantArtifactInput = structuredClone(validModelVariantInput)
wrongVariantArtifactInput.nodes[1].forkSource.sourceArtifactPath =
  'public/artifacts/wrong-variant.html'
const wrongVariantArtifact = buildProjectForkLineageTruth(wrongVariantArtifactInput)
assert.equal(wrongVariantArtifact.integrity.kind, 'invalid')
assert(wrongVariantArtifact.integrity.issues.some((issue) => (
  issue.kind === 'source-artifact-mismatch'
)))

const idMismatchInput = fixture()
idMismatchInput.nodes[1].forkSource.sourceStepId = 'wrong-step-id'
idMismatchInput.nodes[1].forkSource.promptFamilyId = 'project-1:wrong-step-id'
idMismatchInput.nodes[1].promptFamilyId = 'project-1:wrong-step-id'
for (const node of idMismatchInput.nodes.slice(2)) {
  node.forkSource.promptFamilyId = 'project-1:wrong-step-id'
  node.promptFamilyId = 'project-1:wrong-step-id'
}
const idMismatch = buildProjectForkLineageTruth(idMismatchInput)
assert.equal(idMismatch.integrity.kind, 'invalid')
assert.equal(idMismatch.eligibility.allowed, false)
assert(idMismatch.integrity.issues.some((issue) => issue.kind === 'source-step-mismatch'))
assert.equal(idMismatch.generations[1].incomingEdge, null)

const splitIdentityInput = fixture()
splitIdentityInput.nodes[0].presentation.localSteps[0].artifactVersions[0].sourceStepId =
  'published-evidence-step-1'
splitIdentityInput.nodes[1].forkSource.sourceStepId = 'published-evidence-step-1'
splitIdentityInput.nodes[1].forkSource.promptFamilyId =
  'project-1:published-evidence-step-1'
splitIdentityInput.nodes[1].promptFamilyId =
  'project-1:published-evidence-step-1'
for (const node of splitIdentityInput.nodes.slice(2)) {
  node.forkSource.promptFamilyId = 'project-1:published-evidence-step-1'
  node.promptFamilyId = 'project-1:published-evidence-step-1'
}
const splitIdentity = buildProjectForkLineageTruth(splitIdentityInput)
const splitEdge = splitIdentity.generations[1].incomingEdge
assert.equal(splitIdentity.integrity.kind, 'complete')
assert.equal(splitEdge.sourceResponse.stepId, 'published-evidence-step-1')
assert.equal(splitEdge.sourceResponse.responsePackageId, 'published-evidence-step-1')
assert.equal(splitEdge.sourceResponse.localStepId, 'step-1')
assert.equal(splitEdge.sourceResponse.localResponsePackageId, 'response-1')

const splitArtifactRouteInput = fixture()
splitArtifactRouteInput.nodes[0].title = 'Fable prepared variant'
splitArtifactRouteInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].artifactPath = '/artifacts/fable-run-b.html'
splitArtifactRouteInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceArtifactPath = 'public/artifacts/fable-run-b.html'
splitArtifactRouteInput.nodes[1].forkSource.sourceArtifactPath =
  'public/artifacts/fable-run-b.html'
const splitArtifactRoute = buildProjectForkLineageTruth(splitArtifactRouteInput)
assert.equal(splitArtifactRoute.integrity.kind, 'complete')
assert.equal(
  splitArtifactRoute.generations[1].incomingEdge
    .sourceResponse.artifactVersions[0].artifactPath,
  '/artifacts/fable-run-b.html',
)
assert.equal(
  splitArtifactRoute.generations[1].incomingEdge
    .sourceResponse.artifactVersions[0].sourceArtifactPath,
  'public/artifacts/fable-run-b.html',
)
assert(splitArtifactRoute.generations[1].incomingEdge)

const nearMatchArtifactInput = fixture()
nearMatchArtifactInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceArtifactPath = 'public/artifacts/project-1.html'
nearMatchArtifactInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].artifactPath = '/artifacts/project-1-copy.html'
const nearMatchArtifact = buildProjectForkLineageTruth(nearMatchArtifactInput)
assert.equal(nearMatchArtifact.integrity.kind, 'invalid')
assert(nearMatchArtifact.integrity.issues.some((issue) => (
  issue.kind === 'source-artifact-mismatch'
)))

assert.equal(
  projectForkArtifactPathsEquivalent(
    'public/artifacts/fable-run-b.html',
    '/artifacts/fable-run-b.html',
  ),
  true,
)
assert.equal(
  projectForkArtifactPathsEquivalent(
    'public/artifacts/fable-run-b.html',
    '/artifacts/fable-run-b-copy.html',
  ),
  false,
)
assert.equal(
  projectForkArtifactPathsEquivalent(
    'public/artifacts/fable-run-b.html',
    '/artifacts/../fable-run-b.html',
  ),
  false,
)

const cycleInput = fixture()
cycleInput.nodes[5].projectId = cycleInput.nodes[2].projectId
const cycle = buildProjectForkLineageTruth(cycleInput)
assert.equal(cycle.integrity.kind, 'cycle')
assert.equal(cycle.eligibility.reason, 'cycle')

const currentMismatch = buildProjectForkLineageTruth(fixture({
  currentProjectId: 'project-4',
}))
assert.equal(currentMismatch.integrity.kind, 'invalid')
assert(currentMismatch.integrity.issues.some((issue) => issue.kind === 'current-node-mismatch'))

const familyInput = fixture()
familyInput.nodes[4].forkSource.promptFamilyId = 'client-family'
const familyMismatch = buildProjectForkLineageTruth(familyInput)
assert.equal(familyMismatch.integrity.kind, 'invalid')
assert(familyMismatch.integrity.issues.some((issue) => issue.kind === 'family-mismatch'))

const widthInput = fixture()
widthInput.nodes[3].forkSource.branchIndex = 10
const widthMismatch = buildProjectForkLineageTruth(widthInput)
assert.equal(widthMismatch.generations[3].forkSource.branchIndex, 10)
assert(widthMismatch.integrity.issues.some((issue) => issue.kind === 'invalid-branch-index'))

const depthInput = fixture()
depthInput.nodes.at(-1).forkSource.depth = 9
const depthMismatch = buildProjectForkLineageTruth(depthInput)
assert.equal(depthMismatch.generations.length, 9)
assert.equal(depthMismatch.generations.at(-1).displayLevel, 9)
assert(!depthMismatch.generations.some((generation) => generation.displayLevel > 10))
assert(depthMismatch.integrity.issues.some((issue) => issue.kind === 'stale-stored-depth'))
assert(depthMismatch.integrity.issues.some((issue) => (
  issue.kind === 'stale-stored-depth' && issue.observed === 9
)))
assert(depthMismatch.integrity.issues.some((issue) => issue.kind === 'current-node-mismatch'))
assert.equal(depthMismatch.eligibility.allowed, false)

const negativeDepthInput = fixture()
negativeDepthInput.nodes[1].forkSource.depth = -1
const negativeDepthMismatch = buildProjectForkLineageTruth(negativeDepthInput)
assert.equal(negativeDepthMismatch.generations.length, 1)
assert.equal(negativeDepthMismatch.generations[0].displayLevel, 1)
assert(!negativeDepthMismatch.generations.some((generation) => (
  generation.forkSource && generation.displayLevel < 2
)))
assert(negativeDepthMismatch.integrity.issues.some((issue) => (
  issue.kind === 'stale-stored-depth' && issue.observed === -1
)))
assert.equal(negativeDepthMismatch.eligibility.allowed, false)

for (const [kind, reason] of [
  ['missing-parent', 'missing-parent'],
  ['cycle', 'cycle'],
  ['truncated', 'truncated'],
]) {
  const broken = buildProjectForkLineageTruth(fixture({
    integrity: {
      kind,
      affectedProjectId: 'project-2',
      issues: [{ kind, projectId: 'project-2' }],
    },
  }))
  assert.equal(broken.integrity.kind, kind)
  assert.equal(broken.eligibility.reason, reason)
  assert.equal(broken.eligibility.allowed, false)
}

const missingPrefixFixture = fixture()
missingPrefixFixture.nodes = missingPrefixFixture.nodes.slice(4, 7)
missingPrefixFixture.currentProjectId = missingPrefixFixture.nodes.at(-1).projectId
missingPrefixFixture.integrity = {
  kind: 'missing-parent',
  affectedProjectId: 'project-4',
  issues: [{ kind: 'missing-parent', projectId: 'project-4' }],
}
const missingPrefix = buildProjectForkLineageTruth(missingPrefixFixture)
assert.equal(missingPrefix.integrity.kind, 'missing-parent')
assert.equal(
  JSON.stringify(missingPrefix.generations.map((node) => node.displayLevel)),
  JSON.stringify([5, 6, 7]),
)
assert.equal(missingPrefix.generations[0].forkSource.depth, 3)
assert.equal(missingPrefix.eligibility.reason, 'missing-parent')

const cyclePrefixFixture = fixture()
cyclePrefixFixture.nodes = cyclePrefixFixture.nodes.slice(3, 6)
cyclePrefixFixture.currentProjectId = cyclePrefixFixture.nodes.at(-1).projectId
cyclePrefixFixture.integrity = {
  kind: 'cycle',
  affectedProjectId: 'project-3',
  issues: [{ kind: 'cycle', projectId: 'project-3' }],
}
const cyclePrefix = buildProjectForkLineageTruth(cyclePrefixFixture)
assert.equal(cyclePrefix.integrity.kind, 'cycle')
assert.equal(cyclePrefix.generations[0].displayLevel, 4)
assert.equal(cyclePrefix.eligibility.reason, 'cycle')

const unavailable = unavailableProjectForkLineageTruth('project-10')
assert.equal(unavailable.integrity.kind, 'unavailable')
assert.equal(unavailable.generations.length, 0)
assert.equal(unavailable.eligibility.reason, 'unavailable')
assert.equal(unavailable.eligibility.allowed, false)

const outageFallback = markProjectForkNetworkLineageUnavailable([{
  id: 'prepared-fallback-child',
  title: 'Inspectable fallback child',
  forkSource: normalizeProjectForkSource({
    sourceProjectId: 'source',
    depth: 0,
    branchIndex: 0,
  }),
  continuationSteps: [{
    id: 'fallback-step',
    stepNumber: 1,
    forkHref: '/build?fork=source',
  }],
}])
assert.equal(outageFallback[0].lineageTruth.integrity.kind, 'unavailable')
assert.equal(outageFallback[0].lineageTruth.eligibility.allowed, false)
assert.equal(outageFallback[0].continuationSteps[0].forkHref, null)

const sameIdDatabase = buildProjectForkLineageTruth(fixture({
  readSource: 'database-rpc',
}))
const sameIdCodeBacked = buildProjectForkLineageTruth(fixture({
  readSource: 'code-backed',
}))
assert.equal(selectProjectForkLineageTruth({
  databaseTruth: sameIdDatabase,
  codeBackedTruth: sameIdCodeBacked,
}).readSource, 'database-rpc')
assert.equal(selectProjectForkLineageTruth({
  databaseTruth: sameIdDatabase,
  codeBackedTruth: sameIdCodeBacked,
  codeBackedAuthority: true,
}).readSource, 'code-backed')

const legacyDatabasePresentationInput = fixture({ readSource: 'database-rpc' })
legacyDatabasePresentationInput.nodes =
  legacyDatabasePresentationInput.nodes.slice(0, 2)
legacyDatabasePresentationInput.currentProjectId = 'project-2'
for (const node of legacyDatabasePresentationInput.nodes) {
  node.presentation.localSteps = []
}
const exactPreparedPresentationInput = fixture({ readSource: 'code-backed' })
exactPreparedPresentationInput.nodes =
  exactPreparedPresentationInput.nodes.slice(0, 2)
exactPreparedPresentationInput.currentProjectId = 'project-2'
const exactPreparedPresentation = buildProjectForkLineageTruth(
  exactPreparedPresentationInput,
)
const unhydratedLegacyDatabase = buildProjectForkLineageTruth(
  legacyDatabasePresentationInput,
)
assert.equal(unhydratedLegacyDatabase.integrity.kind, 'invalid')
assert(unhydratedLegacyDatabase.integrity.issues.some((issue) => (
  issue.kind === 'source-step-mismatch'
)))
assert(unhydratedLegacyDatabase.integrity.issues.some((issue) => (
  issue.kind === 'invalid-target-prompt'
)))
const hydratedLegacyDatabase = buildProjectForkLineageTruth({
  ...legacyDatabasePresentationInput,
  nodes: overlayProjectForkLineagePresentations(
    legacyDatabasePresentationInput.nodes,
    exactPreparedPresentation,
  ),
})
assert.equal(hydratedLegacyDatabase.readSource, 'database-rpc')
assert.equal(hydratedLegacyDatabase.integrity.kind, 'complete')
assert.equal(hydratedLegacyDatabase.eligibility.reason, 'eligible')
assert.equal(
  hydratedLegacyDatabase.generations[1].incomingEdge.sourceResponse.stepId,
  'step-1',
)
assert.equal(
  hydratedLegacyDatabase.generations[1].incomingEdge.targetPrompt.stepId,
  'step-2',
)
const wrongPreparedPresentationInput = structuredClone(
  exactPreparedPresentationInput,
)
wrongPreparedPresentationInput.nodes[0].presentation.localSteps[0].id =
  'wrong-parent-response'
wrongPreparedPresentationInput.nodes[0]
  .presentation.localSteps[0].artifactVersions[0].sourceStepId =
  'wrong-parent-response'
const wrongPreparedPresentation = buildProjectForkLineageTruth(
  wrongPreparedPresentationInput,
)
const wrongHydratedLegacyDatabase = buildProjectForkLineageTruth({
  ...legacyDatabasePresentationInput,
  nodes: overlayProjectForkLineagePresentations(
    legacyDatabasePresentationInput.nodes,
    wrongPreparedPresentation,
  ),
})
assert.equal(wrongHydratedLegacyDatabase.integrity.kind, 'invalid')
assert(wrongHydratedLegacyDatabase.integrity.issues.some((issue) => (
  issue.kind === 'source-step-mismatch'
)))
const authoritativeInvalidLegacyDatabase = buildProjectForkLineageTruth({
  ...legacyDatabasePresentationInput,
  nodes: overlayProjectForkLineagePresentations(
    legacyDatabasePresentationInput.nodes,
    exactPreparedPresentation,
  ),
  integrity: {
    kind: 'invalid',
    affectedProjectId: 'project-2',
    issues: [],
  },
})
assert.equal(authoritativeInvalidLegacyDatabase.integrity.kind, 'invalid')
assert.equal(authoritativeInvalidLegacyDatabase.eligibility.reason, 'invalid')

const databaseRunBInput = fixture({ readSource: 'database-rpc' })
const localRunBInput = fixture({ readSource: 'code-backed' })
databaseRunBInput.nodes[1].forkSource.sourceArtifactPath =
  'public/artifacts/run-b.html'
localRunBInput.nodes[1].forkSource.sourceArtifactPath =
  'public/artifacts/run-b.html'
databaseRunBInput.nodes[0].presentation.localSteps[0].artifactVersions.push({
  ...databaseRunBInput.nodes[0].presentation.localSteps[0].artifactVersions[0],
  id: 'artifact-run-b',
  artifactPath: 'public/artifacts/run-b.html',
})
localRunBInput.nodes[0].presentation.href = '/prompt/project-1?run=run-b'
localRunBInput.nodes[0].presentation.modelLabel = 'Exact run B model'
localRunBInput.nodes[0].presentation.providerName = 'Exact run B provider'
localRunBInput.nodes[0].presentation.localSteps[0].responseText = 'Exact run B response'
localRunBInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].artifactPath = '/artifacts/run-b.html'
localRunBInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceArtifactPath = 'public/artifacts/run-b.html'
const hydratedDatabaseRunB = selectProjectForkLineageTruth({
  databaseTruth: buildProjectForkLineageTruth(databaseRunBInput),
  codeBackedTruth: buildProjectForkLineageTruth(localRunBInput),
})
assert.equal(hydratedDatabaseRunB.readSource, 'database-rpc')
assert.equal(hydratedDatabaseRunB.generations[1].forkSource.depth, 0)
assert.equal(
  hydratedDatabaseRunB.generations[1].forkSource.promptFamilyId,
  'project-1:step-1',
)
assert.equal(
  hydratedDatabaseRunB.generations[0].presentation.href,
  '/prompt/project-1?run=run-b',
)
assert.equal(
  hydratedDatabaseRunB.generations[0].presentation.modelLabel,
  'Exact run B model',
)
assert.equal(
  hydratedDatabaseRunB.generations[0].presentation.localSteps[0].responseText,
  'Exact run B response',
)
assert.equal(
  hydratedDatabaseRunB.generations[0].presentation.localSteps[0]
    .artifactVersions[0].artifactPath,
  '/artifacts/run-b.html',
)
assert.equal(hydratedDatabaseRunB.integrity.kind, 'complete')

const noEvidenceAliasFieldInput = fixture()
noEvidenceAliasFieldInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].artifactPath = '/artifacts/project-1.html'
delete noEvidenceAliasFieldInput.nodes[0].presentation.localSteps[0]
  .artifactVersions[0].sourceArtifactPath
const noEvidenceAliasField = buildProjectForkLineageTruth(noEvidenceAliasFieldInput)
assert.equal(noEvidenceAliasField.integrity.kind, 'complete')
assert(noEvidenceAliasField.generations[1].incomingEdge)

const absentDatabaseChild = selectProjectForkLineageTruth({
  databaseTruth: unavailableProjectForkLineageTruth('fallback-only-child', {
    observed: 'successful-rpc-no-public-project',
  }),
  codeBackedTruth: sameIdCodeBacked,
})
assert.equal(absentDatabaseChild.integrity.kind, 'unavailable')
assert.equal(absentDatabaseChild.eligibility.allowed, false)

assert.equal(
  JSON.stringify(chunkProjectForkLineageIds(
    Array.from({ length: 12 }, (_, index) => `child-${index + 1}`),
    10,
  ).map((batch) => batch.length)),
  JSON.stringify([10, 2]),
)

console.log('Project fork lineage pure contract check passed.')
