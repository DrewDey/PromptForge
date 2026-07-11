import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const acceptedManifestPath = path.join(
  root,
  'seed-runs/curation/2026-07-10-accepted-projects.json',
)
const acceptedManifest = JSON.parse(readFileSync(acceptedManifestPath, 'utf8'))

const ADAPTIVE_REPAIR_POLICY =
  'Preserve and score the first real artifact. Continue only when verification proves a concrete defect or a source-capture failure; use the same source session and model; name the observed defect in ordinary language; preserve every real artifact version; stop as soon as the artifact passes; prefer no more than three total prompts and go beyond three only for a documented concrete lane reason such as a verification-proven regression, truncation, or mechanical capture failure.'

const COMMON_CRITERIA = [
  'Produce one complete self-contained HTML file that is immediately usable in a browser.',
  'Operate offline with no external APIs, hosted generation, CDNs, remote fonts, scripts, stylesheets, or fragile dependencies.',
  'Avoid unsafe HTML sinks, eval-like execution, inline event handlers, modal dialogs, and deprecated clipboard handling.',
  'Avoid page-level horizontal overflow at 390 by 844 and at desktop width.',
  'Keep essential controls visible, keyboard or touch reachable, and truthful about their current state.',
  'Preserve exact prompt, response, source, and artifact-version evidence for the run.',
]

const SPECS = [
  {
    manifestFile: 'booking-flow-handoff-simulator.json',
    canonicalSourceRunId: '08c8b725-4228-4b24-a6e6-5d7fcf78457c',
    version: 'booking-flow-handoff-simulator-v1',
    defaultProviderKey: 'openai',
    baselineKnownIssue: true,
    baselineKnownIssueOverflowPx: 0,
    comparisonPackageFiles: [
      'model-variants/booking-flow-handoff-simulator-chatgpt-gpt56-luna-source-run.json',
      'model-variants/booking-flow-handoff-simulator-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Let the user model booking intake questions, service slots, confirmations, branch conditions, and failure handoffs.',
      'Run realistic booking scenarios and clearly distinguish sent, skipped, interrupted, and failed steps.',
      'Evaluate the simulated transcript against a visible implementation or compliance checklist.',
      'Provide truthful copy and download controls for an implementation-ready handoff receipt.',
    ],
  },
  {
    manifestFile: 'first-principles-claim-ladder-game.json',
    canonicalSourceRunId: '3216db0c-fd3a-48f0-af70-58b47f34068c',
    version: 'first-principles-claim-ladder-game-v1',
    defaultProviderKey: 'anthropic',
    baselineKnownIssue: true,
    baselineKnownIssueOverflowPx: 114,
    comparisonPackageFiles: [
      'model-variants/first-principles-claim-ladder-game-claude-fable-5-high-source-run.json',
      'model-variants/first-principles-claim-ladder-game-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Provide distinct claim, assumption, evidence, and experiment cards in one understandable ladder workflow.',
      'Let the user move or classify cards and run a visible holds-versus-collapses reasoning check.',
      'Produce a meaningful reasoning score or assessment tied to the current ladder state.',
      'Provide a copyable or downloadable reasoning receipt that includes the experiment or next test.',
    ],
  },
  {
    manifestFile: 'tiny-festival-set-time-clash-game.json',
    canonicalSourceRunId: '4d02e29c-ff98-4c73-82ca-942430632443',
    version: 'tiny-festival-set-time-clash-game-v1',
    defaultProviderKey: 'openai',
    comparisonPackageFiles: [
      'model-variants/tiny-festival-set-time-clash-game-chatgpt-gpt56-luna-source-run.json',
      'model-variants/tiny-festival-set-time-clash-game-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Present overlapping festival set choices as a playable multi-slot route decision.',
      'Make energy, walking distance, friend loyalty, and must-see tradeoffs visibly affect the route.',
      'Provide a clear completed state with a meaningful score or route assessment.',
      'Provide a truthful copy or download export of the final festival route.',
    ],
  },
  {
    manifestFile: 'rental-walkthrough-red-flag-scorecard.json',
    canonicalSourceRunId: '3137def2-964d-49a8-ad22-3b776870e3fe',
    version: 'rental-walkthrough-red-flag-scorecard-v1',
    defaultProviderKey: 'anthropic',
    comparisonPackageFiles: [
      'model-variants/rental-walkthrough-red-flag-scorecard-claude-fable-5-high-source-run.json',
      'model-variants/rental-walkthrough-red-flag-scorecard-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Support room-by-room scoring with hazards, lease-risk clues, severity, and evidence or photo-note fields.',
      'Keep the overall rental assessment synchronized with the current room findings.',
      'Provide useful local save or restore behavior without uploading private inspection data.',
      'Provide a clean copyable or downloadable inspection brief suitable for a real rental decision.',
    ],
  },
  {
    manifestFile: 'gym-mirror-progress-shot-consistency-studio.json',
    canonicalSourceRunId: '0eea38da-ead0-44e0-b50c-ddc6840cb033',
    version: 'gym-mirror-progress-shot-consistency-studio-v1',
    defaultProviderKey: 'openai',
    comparisonPackageFiles: [
      'model-variants/gym-mirror-progress-shot-consistency-studio-chatgpt-gpt56-luna-source-run.json',
      'model-variants/gym-mirror-progress-shot-consistency-studio-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Provide repeatable pose, angle, lighting, background, distance, and timing setup controls without requiring image upload.',
      'Include privacy crop checks and useful retake warnings before a session is accepted.',
      'Calculate a meaningful comparability score from the selected setup and preserve a usable session history.',
      'Provide a copyable shoot receipt that makes the next progress-photo session repeatable.',
    ],
  },
  {
    manifestFile: 'security-cam-anomaly-timeline-game.json',
    canonicalSourceRunId: '2f2bfc9f-019a-4ff3-b51f-3270a7ea9eab',
    version: 'security-cam-anomaly-timeline-game-v1',
    defaultProviderKey: 'anthropic',
    comparisonPackageFiles: [
      'model-variants/security-cam-anomaly-timeline-game-claude-fable-5-high-source-run.json',
      'model-variants/security-cam-anomaly-timeline-game-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Present timestamped security-camera cards with enough odd details to support a real deduction game.',
      'Let the player mark anomalies and arrange the events into a coherent timeline using accessible controls.',
      'Provide useful scoring or sequence feedback plus hints and a deliberate answer-reveal state.',
      'Provide a replay, reset, or report workflow that makes the completed case inspectable.',
    ],
  },
  {
    manifestFile: 't-shirt-print-alignment-press-game.json',
    canonicalSourceRunId: '94e76d4a-a6e4-4fd1-9de6-9b84ff21483e',
    version: 't-shirt-print-alignment-press-game-v1',
    defaultProviderKey: 'anthropic',
    baselineKnownIssue: true,
    baselineKnownIssueOverflowPx: 0,
    comparisonPackageFiles: [
      'model-variants/t-shirt-print-alignment-press-game-claude-fable-5-high-source-run.json',
      'model-variants/t-shirt-print-alignment-press-game-gemini-31-pro-source-run.json',
    ],
    projectCriteria: [
      'Provide a recognizable shirt mockup with movable text and icon blocks rather than a static form only.',
      'Score or flag print-safe margins, alignment, overlap, and readability from the current layout.',
      'Make placement usable with pointer and narrow-screen controls without trapping the design off canvas.',
      'Provide a truthful copyable or downloadable order-ready production specification.',
    ],
  },
]

const PROVIDERS = {
  ChatGPT: { providerKey: 'openai', serviceLabel: 'ChatGPT' },
  Claude: { providerKey: 'anthropic', serviceLabel: 'Claude' },
  Gemini: { providerKey: 'google', serviceLabel: 'Gemini' },
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function writeJson(relativePath, value) {
  writeFileSync(path.join(root, relativePath), jsonText(value))
}

function commitJsonWrites(pendingWrites) {
  const stagedWrites = pendingWrites.map((pendingWrite, index) => {
    const absolutePath = path.join(root, pendingWrite.path)
    return {
      ...pendingWrite,
      absolutePath,
      tempPath: `${pendingWrite.path}.pathforge-stage-${process.pid}-${index}`,
      absoluteTempPath: `${absolutePath}.pathforge-stage-${process.pid}-${index}`,
      original: existsSync(absolutePath) ? readFileSync(absolutePath) : null,
      committed: false,
    }
  })

  try {
    for (const stagedWrite of stagedWrites) {
      writeJson(stagedWrite.tempPath, stagedWrite.value)
    }
    for (const stagedWrite of stagedWrites) {
      renameSync(stagedWrite.absoluteTempPath, stagedWrite.absolutePath)
      stagedWrite.committed = true
    }
  } catch (error) {
    for (const stagedWrite of [...stagedWrites].reverse()) {
      if (!stagedWrite.committed) continue
      if (stagedWrite.original === null) rmSync(stagedWrite.absolutePath, { force: true })
      else writeFileSync(stagedWrite.absolutePath, stagedWrite.original)
    }
    throw error
  } finally {
    for (const stagedWrite of stagedWrites) {
      rmSync(stagedWrite.absoluteTempPath, { force: true })
    }
  }
}

function artifactNote(artifactPath, disposition) {
  const bytes = readFileSync(path.join(root, artifactPath))
  return {
    path: artifactPath,
    sha256: sha256(bytes),
    bytes: bytes.length,
    lines: bytes.toString('utf8').split(/\n/).length,
    disposition,
  }
}

function firstArtifactPath(sourcePackage) {
  const stepArtifact = sourcePackage.steps.find((step) => step.artifact_version_path)
    ?.artifact_version_path
  return stepArtifact ?? sourcePackage.artifact_versions?.[0] ?? sourcePackage.final_artifact_path
}

function sourceRunId(sourcePackage) {
  return (
    sourcePackage.source_run_id ??
    sourcePackage.pathforge_pending_id ??
    sourcePackage.source_run_submission_id
  )
}

function normalizeComparisonPackage(packageFile, sourcePackage, project, contract) {
  const repoPath = `seed-runs/${packageFile}`
  if (sourcePackage.steps?.[0]?.prompt_exact !== contract.openingPromptExact) {
    throw new Error(`${repoPath} does not preserve the invariant opening prompt.`)
  }
  if (!sourcePackage.source_url?.startsWith('https://')) {
    throw new Error(`${repoPath} is missing a public HTTPS source URL.`)
  }
  if (!sourcePackage.final_artifact_path || !existsSync(path.join(root, sourcePackage.final_artifact_path))) {
    throw new Error(`${repoPath} is missing its final artifact.`)
  }

  sourcePackage.source_run_id ||= sha256(sourcePackage.source_url).slice(0, 16)
  sourcePackage.prompt_count = sourcePackage.steps.length
  sourcePackage.repair_prompt_count ??= Math.max(0, sourcePackage.steps.length - 1)
  sourcePackage.artifact_versions ||= sourcePackage.steps
    .map((step) => step.artifact_version_path)
    .filter(Boolean)
  sourcePackage.artifact_versions = [...new Set([
    ...sourcePackage.artifact_versions,
    sourcePackage.final_artifact_path,
  ])]
  sourcePackage.artifact_sha256 = sha256(
    readFileSync(path.join(root, sourcePackage.final_artifact_path)),
  )
  const existingArtifactNotes = new Map(
    (sourcePackage.artifact_version_notes ?? [])
      .filter((note) => note && typeof note === 'object' && typeof note.path === 'string')
      .map((note) => [note.path, note]),
  )
  sourcePackage.artifact_version_notes = sourcePackage.artifact_versions.map((artifactPath) =>
    artifactNote(
      artifactPath,
      existingArtifactNotes.get(artifactPath)?.disposition ??
        (
          artifactPath === sourcePackage.final_artifact_path
            ? 'Final verified artifact selected for this model run.'
            : 'Earlier real artifact preserved from the same source session.'
        ),
    ),
  )
  sourcePackage.comparison_basis = {
    opening_prompt_exact: contract.openingPromptExact,
    acceptance_criteria: contract.acceptanceCriteria,
    adaptive_repair_policy: contract.adaptiveRepairPolicy,
    independence_note: `${sourcePackage.provider} received the invariant brief in a fresh session and was not shown the historical implementation, screenshots, source code, or another provider's output.`,
  }
  sourcePackage.operator_provenance = {
    kind: 'pathforge_labs_manual',
    label: 'PathForge Labs · Developer-operated',
    canonical_project_id: project.projectId,
    canonical_route: project.href,
    comparison_contract_version: contract.version,
    comparison_contract_sha256: contract.sha256,
    opening_prompt_sha256: contract.openingPromptSha256,
    ordinary_fork: false,
  }
  sourcePackage.status = 'published_model_variant'
  sourcePackage.submission = null
  return sourcePackage
}

function validEvidenceMetrics(value, total) {
  return (
    value &&
    Number.isFinite(value.qualityScore) &&
    value.qualityScore >= 0 &&
    value.qualityScore <= 100 &&
    typeof value.artifactReady === 'boolean' &&
    typeof value.hardGatesPassed === 'boolean' &&
    Number.isInteger(value.functionalChecks?.passed) &&
    value.functionalChecks?.total === total &&
    value.functionalChecks.passed >= 0 &&
    value.functionalChecks.passed <= total &&
    Number.isInteger(value.consoleErrorCount) &&
    value.consoleErrorCount >= 0 &&
    Number.isInteger(value.horizontalOverflowPx) &&
    value.horizontalOverflowPx >= 0 &&
    Array.isArray(value.notes) &&
    value.notes.length > 0 &&
    value.notes.every((note) => typeof note === 'string' && note.trim())
  )
}

function variantFromPackage({
  packageFile,
  sourcePackage,
  project,
  contract,
  historical,
  baselineKnownIssue = false,
  baselineKnownIssueOverflowPx = 0,
  packageContent,
}) {
  const provider = PROVIDERS[sourcePackage.provider]
  if (!provider) throw new Error(`Unsupported provider in seed-runs/${packageFile}.`)
  if (!sourcePackage.model || !sourcePackage.model_settings) {
    throw new Error(`seed-runs/${packageFile} is missing model provenance.`)
  }
  const promptCount = sourcePackage.steps.length
  const repairPromptCount = sourcePackage.repair_prompt_count ?? Math.max(0, promptCount - 1)
  const total = contract.acceptanceCriteria.length
  const verificationEvidence = sourcePackage.verification_evidence
  if (
    !verificationEvidence ||
    verificationEvidence.schema_version !== 1 ||
    !Number.isFinite(Date.parse(verificationEvidence.verified_at)) ||
    !validEvidenceMetrics(verificationEvidence.first_pass_metrics, total) ||
    !validEvidenceMetrics(verificationEvidence.final_metrics, total)
  ) {
    throw new Error(
      `seed-runs/${packageFile} needs source-backed verification_evidence before release.`,
    )
  }
  const finalEvidence = verificationEvidence.final_metrics
  if (historical && baselineKnownIssue) {
    if (
      finalEvidence.qualityScore < 0 ||
      finalEvidence.qualityScore >= 90 ||
      finalEvidence.artifactReady !== true ||
      finalEvidence.hardGatesPassed !== false ||
      finalEvidence.functionalChecks?.total !== total ||
      finalEvidence.functionalChecks?.passed >= total ||
      finalEvidence.consoleErrorCount !== 0 ||
      finalEvidence.horizontalOverflowPx !== baselineKnownIssueOverflowPx
    ) {
      throw new Error(`seed-runs/${packageFile} does not preserve its measured historical issue.`)
    }
  } else if (
      finalEvidence.qualityScore < 90 ||
      finalEvidence.artifactReady !== true ||
      finalEvidence.hardGatesPassed !== true ||
      finalEvidence.functionalChecks?.total !== total ||
      finalEvidence.functionalChecks?.passed !== total ||
      finalEvidence.consoleErrorCount !== 0 ||
      finalEvidence.horizontalOverflowPx !== 0 ||
      !validEvidenceMetrics(finalEvidence, total)
  ) {
    throw new Error(`seed-runs/${packageFile} does not contain passing final verification evidence.`)
  }
  const firstEvidence = verificationEvidence.first_pass_metrics
  if (
    repairPromptCount > 0 &&
    firstEvidence.hardGatesPassed === true &&
    firstEvidence.functionalChecks?.passed === total
  ) {
    throw new Error(`seed-runs/${packageFile} has repair prompts without a measured first-pass defect.`)
  }

  return {
    sourceRunId: sourceRunId(sourcePackage),
    providerKey: provider.providerKey,
    serviceLabel: provider.serviceLabel,
    modelLabel: sourcePackage.model,
    modelSettings:
      typeof sourcePackage.model_settings === 'string'
        ? sourcePackage.model_settings
        : JSON.stringify(sourcePackage.model_settings),
    operatorKind: historical ? 'original-author' : 'pathforge-labs-manual',
    operatorLabel: historical
      ? `Original source run · ${project.authorDisplayName}`
      : 'PathForge Labs · Developer-operated',
    runRole: historical ? 'historical-baseline' : 'comparison-run',
    qualityStatus: historical && baselineKnownIssue ? 'known-issue' : 'verified',
    isCurrent: !historical,
    capturedAt: sourcePackage.run_finished_at,
    promptCount,
    repairPromptCount,
    packageFile,
    packageSha256: sha256(
      packageContent ?? readFileSync(path.join(root, 'seed-runs', packageFile)),
    ),
    firstArtifactPath: firstArtifactPath(sourcePackage),
    finalArtifactPath: sourcePackage.final_artifact_path,
    artifactVersionPaths: sourcePackage.artifact_versions,
    firstPassMetrics: firstEvidence,
    finalMetrics: finalEvidence,
  }
}

function assertLaunchBuilderCanWrite(spec) {
  const project = acceptedManifest.projects.find(
    (entry) => entry.sourceRunId === spec.canonicalSourceRunId,
  )
  if (!project) throw new Error(`Missing curated project ${spec.canonicalSourceRunId}.`)

  const baselinePackage = readJson(project.packageFile)
  const comparisonPackages = spec.comparisonPackageFiles.map((packageFile) =>
    readJson(`seed-runs/${packageFile}`),
  )
  const outputPath = `seed-runs/model-variants/${spec.manifestFile}`
  if (!existsSync(path.join(root, outputPath))) return

  const existingManifest = readJson(outputPath)
  const generatedSourceRunIds = new Set([
    sourceRunId(baselinePackage),
    ...comparisonPackages.map((sourcePackage) => (
      sourceRunId(sourcePackage) ?? sha256(sourcePackage.source_url).slice(0, 16)
    )),
  ])
  const appendedHistory = (existingManifest.variants ?? []).filter(
    (variant) => !generatedSourceRunIds.has(variant.sourceRunId),
  )
  if (appendedHistory.length > 0) {
    throw new Error(
      `${outputPath} contains appended model history. This launch builder will not overwrite it; use the append-only release workflow.`,
    )
  }
}

// Preflight the entire launch cohort before normalizing any package or writing
// any manifest. A later appended-history conflict must leave every file intact.
for (const spec of SPECS) assertLaunchBuilderCanWrite(spec)

const pendingPackageWrites = []
const pendingManifestWrites = []

for (const spec of SPECS) {
  const project = acceptedManifest.projects.find(
    (entry) => entry.sourceRunId === spec.canonicalSourceRunId,
  )
  if (!project) throw new Error(`Missing curated project ${spec.canonicalSourceRunId}.`)

  const acceptanceCriteria = [...spec.projectCriteria, ...COMMON_CRITERIA]
  const contractPayload = {
    version: spec.version,
    openingPromptExact: project.prompts[0],
    acceptanceCriteria,
    adaptiveRepairPolicy: ADAPTIVE_REPAIR_POLICY,
  }
  const contract = {
    ...contractPayload,
    sha256: sha256(JSON.stringify(contractPayload)),
    openingPromptSha256: sha256(project.prompts[0]),
  }

  const baselinePackageFile = project.packageFile.replace(/^seed-runs\//, '')
  const baselinePackage = readJson(project.packageFile)
  const rawComparisonPackages = spec.comparisonPackageFiles.map((packageFile) => ({
    packageFile,
    sourcePackage: readJson(`seed-runs/${packageFile}`),
  }))
  const outputPath = `seed-runs/model-variants/${spec.manifestFile}`
  const comparisonPackages = rawComparisonPackages.map(({ packageFile, sourcePackage }) => {
    const normalizedPackage = normalizeComparisonPackage(
      packageFile,
      sourcePackage,
      project,
      contract,
    )
    return {
      packageFile,
      sourcePackage: normalizedPackage,
      packageContent: jsonText(normalizedPackage),
    }
  })
  const variants = [
    variantFromPackage({
      packageFile: baselinePackageFile,
      sourcePackage: baselinePackage,
      project,
      contract,
      historical: true,
      baselineKnownIssue: spec.baselineKnownIssue,
      baselineKnownIssueOverflowPx: spec.baselineKnownIssueOverflowPx,
    }),
    ...comparisonPackages.map(({ packageFile, sourcePackage, packageContent }) =>
      variantFromPackage({
        packageFile,
        sourcePackage,
        project,
        contract,
        historical: false,
        packageContent,
      }),
    ),
  ]
  const defaultVariant = variants.find(
    (variant) => variant.providerKey === spec.defaultProviderKey && variant.runRole === 'comparison-run',
  )
  if (!defaultVariant) throw new Error(`${project.title} has no configured default comparison run.`)

  pendingPackageWrites.push(
    ...comparisonPackages.map(({ packageFile, sourcePackage }) => ({
      path: `seed-runs/${packageFile}`,
      value: sourcePackage,
    })),
  )
  pendingManifestWrites.push({
    path: outputPath,
    value: {
      schemaVersion: 1,
      canonicalProjectId: project.projectId,
      canonicalRoute: project.href,
      title: project.title,
      defaultSourceRunId: defaultVariant.sourceRunId,
      contract,
      variants,
    },
  })
}

// Validation above is deliberately side-effect free. Commit the checked
// packages first and their manifests last only after the whole cohort passes.
const pendingWrites = [...pendingPackageWrites, ...pendingManifestWrites]
if (new Set(pendingWrites.map((pendingWrite) => pendingWrite.path)).size !== pendingWrites.length) {
  throw new Error('Launch builder planned duplicate output paths.')
}
commitJsonWrites(pendingWrites)

console.log(`Built ${SPECS.length} project model-variant manifests.`)
