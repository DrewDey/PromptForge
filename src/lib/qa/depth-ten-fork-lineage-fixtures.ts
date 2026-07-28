import {
  buildProjectForkLineageTruth,
  type ProjectForkContinuationStep,
  type ProjectForkLineageCandidateNode,
  type ProjectForkLineageIntegrityKind,
  type ProjectForkLineageTruth,
} from '@/lib/project-forks'

export type DepthTenFixtureFamily = 'prepared' | 'community'
export type DepthTenFixtureIntegrityKind = ProjectForkLineageIntegrityKind
export type DepthTenFixtureInvalidCase =
  | 'stale-depth'
  | 'family-mismatch'
  | 'edge-mismatch'

export type DepthTenFixtureProject = {
  defaultRunId?: string
  selectedRunId?: string
}

export type DepthTenFixtureTruth = ProjectForkLineageTruth<DepthTenFixtureProject> & {
  family: DepthTenFixtureFamily
  invalidCase?: DepthTenFixtureInvalidCase
}

export const DEPTH_TEN_FIXTURE_ROUTE = '/qa/fork-lineage-depth-10-fixture'
export const DEPTH_TEN_FIXTURE_LEVEL_COUNT = 10
export const DEPTH_TEN_FIXTURE_EDGE_COUNT = 9

export const DEPTH_TEN_FIXTURE_ARTIFACTS = [
  ['public/artifacts/airlock-zero-blackout-shift-claude-sonnet-5-max.html', '7af1f063c94b567a2e72d7a5c85a9d28aab65b7e77b6d391d3713ec466e3452c'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-10.html', '11cca990f198047304a4fb802e6345ac1bd735ea7cb3e37455c7886996a7637e'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-5.html', '80b261205590d1ebd80c111e826810110750d9322f3db97199c13cc1e2f726bf'],
  ['public/artifacts/airlock-zero-claude-sonnet-5-max-step-7.html', '05e963aba2029733bd2cabb94e74f5d2868ea97e7eda01ec3ca7d662e026667e'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-2.html', '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-3.html', 'b390710493d8bc2797a1fe211b112ae5d3d8a1f610438f2ebed5aa153028fa35'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-4.html', '4f6c5c78ad5a2e40b79b88a4f49229472ccec57b407ee37e3bc33f9a7f9bbd69'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-5.html', '5406a6eadf52fd1b07334adfb60fdf913ffa3b08b57d31edb417fe51124880a2'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-6.html', 'c9a1131ffb7c2bd8da4133f9ad986f30c5b3e02904f4921f8bec9aebab5eeabc'],
  ['public/artifacts/airlock-zero-gemini-35-flash-step-7.html', 'b330778cc944ef0f6681dddfdd982a606c1db7c9a9aab1fdbc9041a44b9eedac'],
] as const

const providers = ['OpenAI', 'Anthropic', null, 'Google'] as const

function fixtureRunId(family: DepthTenFixtureFamily, displayLevel: number) {
  if (family === 'prepared' && displayLevel === 4) return 'qa-prepared-run-B'
  if (family === 'prepared' && displayLevel === 10) return 'qa-prepared-current-run-B'
  return `qa-${family}-run-level-${displayLevel}`
}

function fixtureModelVariantId(family: DepthTenFixtureFamily, displayLevel: number) {
  if (family === 'prepared' && displayLevel === 4) return 'qa-prepared-model-run-B'
  if (family === 'prepared' && displayLevel === 10) return 'qa-prepared-current-model-run-B'
  return `qa-${family}-model-level-${displayLevel}`
}

function fixtureLocalStepId(
  family: DepthTenFixtureFamily,
  displayLevel: number,
  sourceRunId = fixtureRunId(family, displayLevel),
) {
  if (family === 'prepared' && displayLevel === 4) {
    return '00000000-0000-4000-8000-000000000004'
  }
  return `${sourceRunId}:step:first`
}

function fixtureEvidenceStepId(
  family: DepthTenFixtureFamily,
  displayLevel: number,
  sourceRunId = fixtureRunId(family, displayLevel),
) {
  if (family === 'prepared' && displayLevel === 4) {
    return `qa-prepared-project-level-4:${sourceRunId}:step:1`
  }
  return fixtureLocalStepId(family, displayLevel, sourceRunId)
}

function fixturePromptFamilyId(family: DepthTenFixtureFamily) {
  return `qa-${family}-project-level-1:${fixtureEvidenceStepId(family, 1)}`
}

function fixtureStep(
  family: DepthTenFixtureFamily,
  displayLevel: number,
): ProjectForkContinuationStep {
  const sourceRunId = fixtureRunId(family, displayLevel)
  const sourceModelVariantId = fixtureModelVariantId(family, displayLevel)
  const localStepId = fixtureLocalStepId(family, displayLevel, sourceRunId)
  const evidenceStepId = fixtureEvidenceStepId(family, displayLevel, sourceRunId)
  const [artifactPath, artifactSha256] = DEPTH_TEN_FIXTURE_ARTIFACTS[displayLevel - 1]
  return {
    id: localStepId,
    stepNumber: displayLevel,
    promptTitle: `Level ${displayLevel} exact prompt`,
    promptText: `Continue the ${family} lineage at level ${displayLevel}.`,
    responseText: `Exact response for ${family} level ${displayLevel}.`,
    responsePackageId: localStepId,
    sourceModelVariantId,
    sourceRunId,
    artifactPath,
    artifactSha256,
    artifactVersions: [{
      id: `qa-${family}-artifact-level-${displayLevel}`,
      artifactPath,
      artifactTitle: `${family === 'prepared' ? 'Prepared' : 'Community'} level ${displayLevel} artifact`,
      artifactSha256,
      sourceModelVariantId,
      sourceRunId,
      sourceStepId: evidenceStepId,
      sourceStepNumber: displayLevel,
      isDefault: true,
    }],
  }
}

function fixtureCandidate(
  family: DepthTenFixtureFamily,
  displayLevel: number,
): ProjectForkLineageCandidateNode<DepthTenFixtureProject> {
  const projectId = `qa-${family}-project-level-${displayLevel}`
  const sourceRunId = fixtureRunId(family, displayLevel)
  const sourceModelVariantId = fixtureModelVariantId(family, displayLevel)
  const step = fixtureStep(family, displayLevel)
  const parentLevel = displayLevel - 1
  const parentStep = parentLevel > 0 ? fixtureStep(family, parentLevel) : null
  const [parentArtifactPath, parentArtifactSha256] = parentLevel > 0
    ? DEPTH_TEN_FIXTURE_ARTIFACTS[parentLevel - 1]
    : [undefined, undefined]

  return {
    projectId,
    title: `${family === 'prepared' ? 'Prepared' : 'Community'} level ${displayLevel}`,
    project: {
      defaultRunId: family === 'prepared' && displayLevel === 4
        ? 'qa-prepared-run-A'
        : family === 'prepared' && displayLevel === 10
          ? 'qa-prepared-current-run-A'
          : undefined,
      selectedRunId: family === 'prepared' && (displayLevel === 4 || displayLevel === 10)
        ? sourceRunId
        : undefined,
    },
    presentation: {
      href: `${DEPTH_TEN_FIXTURE_ROUTE}?family=${family}${family === 'prepared' && displayLevel === 4 ? '&run=qa-prepared-run-B' : ''}#level-${displayLevel}`,
      modelLabel: sourceModelVariantId,
      providerName: family === 'prepared' && displayLevel === 4
        ? 'Anthropic'
        : family === 'prepared' && displayLevel === 10
          ? 'Google'
          : providers[(displayLevel - 1) % providers.length],
      localSteps: [step],
    },
    promptFamilyId: fixturePromptFamilyId(family),
    forkSource: displayLevel === 1 || !parentStep
      ? null
      : {
          sourceProjectId: `qa-${family}-project-level-${parentLevel}`,
          sourceProjectTitle: `${family === 'prepared' ? 'Prepared' : 'Community'} level ${parentLevel}`,
          sourceModelVariantId: fixtureModelVariantId(family, parentLevel),
          sourceRunId: fixtureRunId(family, parentLevel),
          sourceStepId: fixtureEvidenceStepId(family, parentLevel),
          sourceStepNumber: parentLevel,
          sourceArtifactPath: parentArtifactPath,
          sourceArtifactSha256: parentArtifactSha256,
          parentForkId: `qa-${family}-project-level-${parentLevel}`,
          depth: displayLevel - 2,
          branchIndex: 0,
          promptFamilyId: fixturePromptFamilyId(family),
        },
  }
}

function completeCandidates(family: DepthTenFixtureFamily) {
  return Array.from(
    { length: DEPTH_TEN_FIXTURE_LEVEL_COUNT },
    (_, index) => fixtureCandidate(family, index + 1),
  )
}

function fixtureTruth(
  family: DepthTenFixtureFamily,
  nodes: ProjectForkLineageCandidateNode<DepthTenFixtureProject>[],
  currentProjectId: string,
  integrity: {
    kind: DepthTenFixtureIntegrityKind
    affectedProjectId?: string
  } = { kind: 'complete' },
  invalidCase?: DepthTenFixtureInvalidCase,
): DepthTenFixtureTruth {
  return {
    ...buildProjectForkLineageTruth({
      nodes,
      currentProjectId,
      readSource: 'test-fixture',
      integrity,
    }),
    family,
    invalidCase,
  }
}

export function buildDepthTenForkLineageFixture(
  family: DepthTenFixtureFamily,
  integrityKind: DepthTenFixtureIntegrityKind = 'complete',
  invalidCase: DepthTenFixtureInvalidCase = 'stale-depth',
): DepthTenFixtureTruth {
  const nodes = completeCandidates(family)

  if (integrityKind === 'complete') {
    return fixtureTruth(family, nodes, nodes.at(-1)?.projectId ?? '')
  }

  if (integrityKind === 'missing-parent') {
    const suffix = nodes.slice(4)
    return fixtureTruth(
      family,
      suffix,
      suffix.at(-1)?.projectId ?? '',
      { kind: 'missing-parent', affectedProjectId: nodes[3].projectId },
    )
  }

  if (integrityKind === 'cycle') {
    const cycleNodes = nodes.slice(0, 7)
    cycleNodes[6] = { ...cycleNodes[6], projectId: cycleNodes[3].projectId }
    return fixtureTruth(family, cycleNodes, cycleNodes[3].projectId)
  }

  if (integrityKind === 'truncated') {
    const overDepth = {
      ...fixtureCandidate(family, 10),
      projectId: `qa-${family}-project-level-11-invalid`,
      title: `${family} observed stored depth 9`,
      forkSource: {
        ...fixtureCandidate(family, 10).forkSource!,
        sourceProjectId: nodes[9].projectId,
        depth: 9,
      },
    }
    return fixtureTruth(
      family,
      [...nodes, overDepth],
      overDepth.projectId,
      { kind: 'truncated', affectedProjectId: overDepth.projectId },
    )
  }

  if (integrityKind === 'unavailable') {
    const prefix = nodes.slice(0, 4)
    return fixtureTruth(
      family,
      prefix,
      prefix.at(-1)?.projectId ?? '',
      { kind: 'unavailable', affectedProjectId: nodes[4].projectId },
    )
  }

  const invalidNodes = nodes.map((node) => ({
    ...node,
    forkSource: node.forkSource ? { ...node.forkSource } : null,
  }))
  const affectedIndex = 6
  const affected = invalidNodes[affectedIndex]
  if (invalidCase === 'stale-depth') {
    affected.forkSource!.depth = 9
  } else if (invalidCase === 'family-mismatch') {
    affected.forkSource!.promptFamilyId = `qa-${family}-wrong-family`
  } else {
    affected.forkSource!.sourceStepId = `qa-${family}-stale-evidence-step`
  }
  return fixtureTruth(
    family,
    invalidNodes,
    nodes.at(-1)?.projectId ?? '',
    { kind: 'invalid', affectedProjectId: affected.projectId },
    invalidCase,
  )
}

export const depthTenForkLineageFixtures = (
  ['prepared', 'community'] as const
).flatMap((family) => [
  ...(['complete', 'missing-parent', 'cycle', 'truncated', 'unavailable'] as const)
    .map((integrity) => buildDepthTenForkLineageFixture(family, integrity)),
  ...(['stale-depth', 'family-mismatch', 'edge-mismatch'] as const)
    .map((invalidCase) => buildDepthTenForkLineageFixture(family, 'invalid', invalidCase)),
])
