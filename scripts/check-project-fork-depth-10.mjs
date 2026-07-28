#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Script } from 'node:vm'
import ts from 'typescript'

const failures = []
const assert = (condition, message) => {
  if (!condition) failures.push(message)
}

function loadTypeScriptModule(path, resolveImport = null) {
  const source = readFileSync(path, 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  })
  if (diagnostics?.length) {
    throw new Error(diagnostics.map((diagnostic) => diagnostic.messageText).join('\n'))
  }
  const loaded = { exports: {} }
  new Script(outputText, { filename: `${path}.transpiled.cjs` }).runInNewContext({
    exports: loaded.exports,
    module: loaded,
    require(specifier) {
      if (resolveImport) return resolveImport(specifier)
      throw new Error(`Unexpected import ${specifier} from ${path}`)
    },
    Array,
    Object,
    String,
    Set,
    Map,
  })
  return loaded.exports
}

const fixturePath = 'src/lib/qa/depth-ten-fork-lineage-fixtures.ts'
const fixtureSource = readFileSync(fixturePath, 'utf8')
const projectForks = loadTypeScriptModule('src/lib/project-forks.ts')
const fixture = loadTypeScriptModule(fixturePath, (specifier) => {
  if (specifier === '@/lib/project-forks') return projectForks
  throw new Error(`Unexpected import ${specifier} from ${fixturePath}`)
})
const {
  DEPTH_TEN_FIXTURE_LEVEL_COUNT,
  DEPTH_TEN_FIXTURE_EDGE_COUNT,
  DEPTH_TEN_FIXTURE_ARTIFACTS,
  PREPARED_ELIGIBLE_PROVENANCE,
  buildDepthTenForkLineageFixture,
  buildEligiblePreparedParentFixture,
  depthTenForkLineageFixtures,
} = fixture

assert(DEPTH_TEN_FIXTURE_LEVEL_COUNT === 10, 'depth-10 fixture must contain exactly ten displayed levels')
assert(DEPTH_TEN_FIXTURE_EDGE_COUNT === 9, 'depth-10 fixture must contain exactly nine response-to-prompt edges')
assert(
  !/GENERATION_COUNT\s*=\s*11|length:\s*11|nodeCount\s*!==\s*11|0\.\.10|root plus ten|ten descendants/i.test(fixtureSource),
  'depth-10 fixture must not retain the superseded eleven-node contract',
)

for (const family of ['prepared', 'community']) {
  const truth = buildDepthTenForkLineageFixture(family, 'complete')
  assert(truth.generations.length === 10, `${family}: complete lineage must contain ten nodes`)
  assert(
    truth.generations.map((node) => node.displayLevel).join(',') === '1,2,3,4,5,6,7,8,9,10',
    `${family}: display levels must be ordered 1 through 10`,
  )
  assert(
    truth.generations.map((node) => node.incomingEdge?.storedDepth ?? 'root').join(',') === 'root,0,1,2,3,4,5,6,7,8',
    `${family}: root and fork stored depths must map to root,0..8`,
  )
  assert(truth.eligibility.allowed === false, `${family}: level-10 lineage must deny another fork`)
  assert(truth.eligibility.reason === 'max-depth', `${family}: level-10 denial must report max-depth`)

  for (let index = 1; index < truth.generations.length; index += 1) {
    const parent = truth.generations[index - 1]
    const child = truth.generations[index]
    assert(
      child.incomingEdge?.sourceResponse.localResponsePackageId ===
        parent.presentation.localSteps[0].responsePackageId,
      `${family}: edge ${parent.displayLevel}-${child.displayLevel} must start at the exact parent response`,
    )
    assert(
      child.incomingEdge?.targetPrompt.stepId === child.presentation.localSteps[0].id,
      `${family}: edge ${parent.displayLevel}-${child.displayLevel} must end at the exact child prompt`,
    )
    assert(child.incomingEdge?.promptFamilyId === truth.generations[1].incomingEdge?.promptFamilyId, `${family}: edge ${index} must preserve the exact family`)
    assert(child.incomingEdge?.storedDepth === child.displayLevel - 2, `${family}: level ${child.displayLevel} has the wrong stored depth`)
  }

  for (const node of truth.generations) {
    assert(node.projectId.includes(`qa-${family}-project-level-${node.displayLevel}`), `${family}: level ${node.displayLevel} lost exact project identity`)
    const expectedResponsePackage = family === 'prepared' && node.displayLevel === 4
      ? '00000000-0000-4000-8000-000000000004'
      : family === 'prepared' && node.displayLevel === 10
        ? 'qa-prepared-current-run-B:step:first'
        : `qa-${family}-run-level-${node.displayLevel}:step:first`
    assert(
      node.presentation.localSteps[0].responsePackageId === expectedResponsePackage,
      `${family}: level ${node.displayLevel} lost exact run/response identity`,
    )
    assert(
      DEPTH_TEN_FIXTURE_ARTIFACTS.some(
        ([artifactPath]) => artifactPath === node.presentation.localSteps[0].artifactPath,
      ),
      `${family}: level ${node.displayLevel} lost real-corpus artifact identity`,
    )
    assert(
      /^[0-9a-f]{64}$/.test(node.presentation.localSteps[0].artifactSha256),
      `${family}: level ${node.displayLevel} lost exact artifact SHA-256`,
    )
  }
  assert(
    new Set(truth.generations.map((node) => node.presentation.providerName)).size === 4 &&
      truth.generations.some((node) => node.presentation.providerName === null),
    `${family}: fixture must mix verified per-level providers with unverified lanes`,
  )
  if (family === 'prepared') {
    const nonDefaultParent = truth.generations[3]
    const publishedEdge = truth.generations[4].incomingEdge
    assert(
      nonDefaultParent.project?.defaultRunId === 'qa-prepared-run-A' &&
        nonDefaultParent.project?.selectedRunId === 'qa-prepared-run-B' &&
        nonDefaultParent.presentation.href?.includes('run=qa-prepared-run-B') &&
        nonDefaultParent.presentation.modelLabel === 'qa-prepared-model-run-B' &&
        nonDefaultParent.presentation.providerName === 'Anthropic',
      'prepared fixture must select non-default run B without losing default run A context',
    )
    assert(
      publishedEdge?.sourceResponse.runId === 'qa-prepared-run-B' &&
        publishedEdge.sourceResponse.modelVariantId === 'qa-prepared-model-run-B' &&
        publishedEdge.sourceResponse.artifactPath === nonDefaultParent.presentation.localSteps[0].artifactPath &&
        publishedEdge.sourceResponse.artifactSha256 === nonDefaultParent.presentation.localSteps[0].artifactSha256,
      'prepared child edge must preserve run-B model and artifact provenance',
    )
    assert(
      publishedEdge?.sourceResponse.stepId ===
        'qa-prepared-project-level-4:qa-prepared-run-B:step:1',
      'prepared publication fixture must preserve its persisted semantic evidence step ID',
    )
    assert(
      publishedEdge?.sourceResponse.responsePackageId ===
        'qa-prepared-project-level-4:qa-prepared-run-B:step:1',
      'prepared publication fixture must preserve its canonical persisted response package',
    )
    assert(
      publishedEdge?.sourceResponse.localStepId ===
        '00000000-0000-4000-8000-000000000004' &&
        publishedEdge.sourceResponse.localResponsePackageId ===
        '00000000-0000-4000-8000-000000000004',
      'prepared publication fixture must preserve its distinct local UUID step and response anchor',
    )
    const current = truth.generations[9]
    assert(
      current.project?.defaultRunId === 'qa-prepared-current-run-A' &&
        current.project?.selectedRunId === 'qa-prepared-current-run-B' &&
        current.presentation.modelLabel === 'qa-prepared-current-model-run-B' &&
        current.presentation.providerName === 'Google' &&
        current.presentation.localSteps[0].sourceRunId === 'qa-prepared-current-run-B',
      'prepared current lane must present active run B rather than project default run A',
    )
  }
}

for (const integrity of ['missing-parent', 'cycle', 'truncated', 'unavailable']) {
  for (const family of ['prepared', 'community']) {
    const truth = buildDepthTenForkLineageFixture(family, integrity)
    assert(
      truth.generations.length > 0 &&
        (integrity === 'truncated'
          ? truth.generations.length === 10
          : truth.generations.length < 10),
      `${family}/${integrity}: broken lineage must retain bounded truthful generations`,
    )
    assert(truth.integrity.kind === integrity, `${family}/${integrity}: integrity kind drifted`)
    assert(truth.integrity.affectedProjectId, `${family}/${integrity}: affected project identity must remain explicit`)
    assert(truth.eligibility.allowed === false, `${family}/${integrity}: broken lineage must fail closed`)
    assert(truth.eligibility.reason === integrity, `${family}/${integrity}: denial reason must match integrity`)
  }
}

for (const family of ['prepared', 'community']) {
  const suffix = buildDepthTenForkLineageFixture(family, 'missing-parent')
  assert(
    suffix.generations[0]?.displayLevel > 1 && suffix.generations[0]?.forkSource,
    `${family}: missing-parent fixture must retain a truthful known suffix above level 1`,
  )
  const truncated = buildDepthTenForkLineageFixture(family, 'truncated')
  assert(
    truncated.generations.length === 10 &&
      truncated.generations.every((generation) => generation.forkSource?.depth !== 9),
    `${family}: observed stored depth 9 must never become a valid rendered generation`,
  )
  assert(
    truncated.integrity.issues.some(
      (issue) => issue.kind === 'truncated' && issue.observed === 11,
    ),
    `${family}: over-depth evidence must remain explicit in integrity issues`,
  )
  const invalidFixtures = depthTenForkLineageFixtures.filter(
    (truth) => truth.family === family && Boolean(truth.invalidCase),
  )
  assert(invalidFixtures.length === 3, `${family}: invalid fixtures must cover stale depth, family mismatch, and edge mismatch`)
  assert(
    invalidFixtures.find((truth) => truth.invalidCase === 'stale-depth')
      ?.integrity.issues.some(
        (issue) => issue.kind === 'stale-stored-depth' && issue.observed === 9,
      ),
    `${family}: legacy stored depth 9 must be preserved as invalid evidence`,
  )
  assert(
    invalidFixtures.some(
      (truth) => truth.invalidCase === 'family-mismatch' &&
        truth.integrity.issues.some((issue) => issue.kind === 'family-mismatch'),
    ),
    `${family}: mismatched family identity must be preserved as invalid evidence`,
  )
  assert(
    invalidFixtures.some(
      (truth) => truth.invalidCase === 'edge-mismatch' &&
        truth.integrity.issues.some((issue) => issue.kind === 'source-step-mismatch'),
    ),
    `${family}: mismatched response endpoint must be preserved as invalid evidence`,
  )
  for (const truth of invalidFixtures) {
    assert(truth.eligibility.allowed === false, `${family}/${truth.invalidCase}: invalid truth must fail closed`)
    assert(truth.eligibility.reason === 'invalid', `${family}/${truth.invalidCase}: invalid denial reason drifted`)
  }
}

assert(depthTenForkLineageFixtures.length === 16, 'fixture corpus must cover two families, all integrity kinds, and three invalid identity cases')

for (const kind of ['model-present', 'source-run-only']) {
  const truth = buildEligiblePreparedParentFixture(kind)
  const provenance = kind === 'model-present'
    ? PREPARED_ELIGIBLE_PROVENANCE.modelPresent
    : PREPARED_ELIGIBLE_PROVENANCE.sourceRunOnly
  const current = truth.generations.at(-1)
  const finalStep = current?.presentation.localSteps.at(-1)
  const artifact = finalStep?.artifactVersions?.at(-1)
  assert(truth.integrity.kind === 'complete', `${kind}: eligible lineage must remain complete`)
  assert(truth.eligibility.allowed === true, `${kind}: below-max prepared child must be eligible`)
  assert(truth.eligibility.nextStoredDepth === 1, `${kind}: next stored depth must be 1`)
  assert(current?.displayLevel === 2, `${kind}: selected child must render at level 2`)
  assert(finalStep?.id === provenance.localStepId, `${kind}: local step identity drifted`)
  assert(
    finalStep?.responsePackageId === provenance.localResponsePackageId,
    `${kind}: local response package identity drifted`,
  )
  assert(artifact?.sourceRunId === provenance.runId, `${kind}: authoritative run identity drifted`)
  assert(artifact?.sourceStepId === provenance.stepId, `${kind}: authoritative step identity drifted`)
  assert(artifact?.sourceStepNumber === provenance.stepNumber, `${kind}: authoritative step number drifted`)
  assert(artifact?.sourceArtifactPath === provenance.artifactPath, `${kind}: authoritative artifact path drifted`)
  assert(artifact?.artifactSha256 === provenance.artifactSha256, `${kind}: authoritative artifact SHA drifted`)
  assert(
    kind === 'model-present'
      ? artifact?.sourceModelVariantId === provenance.modelVariantId
      : artifact?.sourceModelVariantId === undefined,
    `${kind}: optional model-variant projection drifted`,
  )
}
const incompleteEligible = buildEligiblePreparedParentFixture('incomplete')
assert(
  incompleteEligible.integrity.kind === 'complete' &&
    incompleteEligible.eligibility.allowed === true &&
    !incompleteEligible.generations.at(-1)?.presentation.localSteps.at(-1)
      ?.artifactVersions?.at(-1)?.artifactSha256,
  'incomplete fixture must isolate presentation provenance denial from lineage eligibility',
)

const routePath = 'src/app/qa/fork-lineage-depth-10-fixture/page.tsx'
const routeSource = readFileSync(routePath, 'utf8')
const clientPath = 'src/app/qa/fork-lineage-depth-10-fixture/DepthTenForkLineageFixtureClient.tsx'
const clientSource = readFileSync(clientPath, 'utf8')
const buildPathSource = readFileSync('src/components/ProjectForkBuildPath.tsx', 'utf8')
const workspaceSource = readFileSync('src/components/ProjectForkGenerationWorkspace.tsx', 'utf8')
const actionRoundTripSql = readFileSync(
  'test-fixtures/project-fork-lineage/runtime-action-roundtrip.sql',
  'utf8',
)
assert(
  routeSource.includes("process.env.VERCEL_ENV === 'production'") &&
    routeSource.includes('notFound()'),
  'depth-10 QA route must be unavailable in production',
)
assert(
  clientSource.includes("import ProjectForkBuildPath from '@/components/ProjectForkBuildPath'") &&
    clientSource.includes('<ProjectForkBuildPath') &&
    clientSource.includes('lineage={lineage}') &&
    !clientSource.includes('data-fork-generation-workspace') &&
    !clientSource.includes('data-fork-generation-connector'),
  'depth-10 QA route must feed fixtures to the real production renderer without a parallel mini-renderer',
)
assert(
  buildPathSource.includes('<ProjectForkGenerationWorkspace') &&
    buildPathSource.includes('lineage={props.lineage}'),
  'ProjectForkBuildPath lineage mode must delegate to the shared production workspace',
)
assert(
  buildPathSource.includes('authoritativeFinalArtifact.sourceStepId') &&
    buildPathSource.includes('authoritativeFinalArtifact.sourceStepNumber') &&
    buildPathSource.includes('authoritativeFinalArtifact.sourceArtifactPath') &&
    buildPathSource.includes('authoritativeFinalArtifact.artifactSha256') &&
    !/sourceStepId:\s*finalStep\.responsePackageId/.test(buildPathSource),
  'prepared parent action must use authoritative artifact provenance and never the local response package',
)
for (const provenance of [
  PREPARED_ELIGIBLE_PROVENANCE.modelPresent,
  PREPARED_ELIGIBLE_PROVENANCE.sourceRunOnly,
]) {
  for (const value of [
    provenance.currentProjectId,
    provenance.runId,
    provenance.stepId,
    String(provenance.stepNumber),
    provenance.artifactPath,
    provenance.artifactSha256,
    provenance.promptFamilyId,
    provenance.modelVariantId,
  ].filter(Boolean)) {
    assert(
      actionRoundTripSql.includes(value),
      `PostgreSQL round-trip must use the browser-emitted provenance literal ${value}`,
    )
  }
  assert(
    !actionRoundTripSql.includes(provenance.localResponsePackageId),
    `${provenance.localResponsePackageId} must remain DOM-only and never enter persistence proof`,
  )
}
for (const hook of [
  'data-testid="fork-lineage"',
  'data-fork-generation-workspace',
  'data-fork-generation-connector',
  'data-parent-response-id',
  'data-parent-response-package-id',
  'data-parent-local-step-id',
  'data-parent-response-anchor-id',
  'data-child-prompt-id',
  'data-stored-depth',
  'data-branch-index',
  'data-prompt-family-id',
  'data-fork-eligibility',
  'ResizeObserver',
  'IntersectionObserver',
  'prefers-reduced-motion: reduce',
]) {
  assert(workspaceSource.includes(hook), `production workspace must include ${hook}`)
}
assert(
  workspaceSource.includes('data-display-level={generation.displayLevel}') &&
    workspaceSource.includes('data-generation-index={generation.generationIndex}'),
  'production workspace must preserve distinct display-level and generation-index semantics',
)
assert(
  workspaceSource.includes('min-h-11') && workspaceSource.includes('min-w-11'),
  'production workspace controls must preserve 44px touch targets',
)
assert(
  !/GENERATION_COUNT\s*=\s*11|length:\s*11|nodeCount\s*!==\s*11|0\.\.10|root plus ten|ten descendants/i.test(
    `${clientSource}\n${workspaceSource}`,
  ),
  'QA and production lineage renderers must not retain the superseded eleven-node contract',
)

const preparedPageSource = readFileSync('src/components/PreparedSourceRunPage.tsx', 'utf8')
const sourceRunSource = readFileSync('src/components/SourceRunShowcase.tsx', 'utf8')
const genericPageSource = readFileSync('src/app/prompt/[id]/page.tsx', 'utf8')
const communityPageSource = readFileSync('src/components/CommunityProjectPage.tsx', 'utf8')
const communityPanelSource = readFileSync('src/components/ProjectCommunityPanel.tsx', 'utf8')
const explorerSource = readFileSync('src/components/ProjectForkNetworkExplorer.tsx', 'utf8')
assert(
  preparedPageSource.includes('getProjectForkLineageTruth(project.id') &&
    preparedPageSource.includes('currentSourceRunId') &&
    preparedPageSource.includes('lineageTruth'),
  'prepared child adapter must load authoritative truth with the active source run',
)
assert(
  sourceRunSource.includes('lineage={forkContext.lineage}') &&
    sourceRunSource.includes('lineage={activeForkContext.fork.lineageTruth}'),
  'prepared direct and parent-selected presentations must pass authoritative truth',
)
assert(
  genericPageSource.includes('getProjectForkLineageTruth(prompt.id)') &&
    genericPageSource.includes('data-generic-project-fork-eligibility') &&
    genericPageSource.includes('data-generic-project-fork-action') &&
    genericPageSource.includes('lineageTruth={lineageTruth}'),
  'ordinary generic route must gate every top action and reuse truth in its community panel',
)
assert(
  communityPageSource.includes('data-community-fork-eligibility') &&
    communityPageSource.includes('data-community-fork-action') &&
    communityPageSource.includes('lineageTruth={lineageTruth}') &&
    communityPanelSource.includes('lineage={lineageTruth}'),
  'tagged community wrapper and embedded panel must share fail-closed truth',
)
assert(
  explorerSource.includes('lineage={selectedFork.lineageTruth}'),
  'parent explorer must render the selected child authoritative truth',
)

for (const [artifactPath, expectedSha] of DEPTH_TEN_FIXTURE_ARTIFACTS) {
  const actualSha = createHash('sha256').update(readFileSync(artifactPath)).digest('hex')
  assert(actualSha === expectedSha, `${artifactPath}: fixture artifact SHA-256 drifted`)
}

if (failures.length > 0) {
  console.error(`Depth-10 project-fork verification failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Depth-10 project-fork fixture verification passed.')
console.log('Verified: 10 levels, 9 exact edges, prepared/community families, all integrity denials, terminal stored depth 8.')
