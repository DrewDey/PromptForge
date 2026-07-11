import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import {
  EXPECTED_MODEL_VARIANT_LAUNCH_SOURCE_RUN_IDS,
  EXPECTED_MODEL_VARIANT_MANIFESTS,
} from './project-model-variant-cohort-config.mjs'
import { assertManifestAppendLineage } from './project-model-variant-lineage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const LAUNCH_SNAPSHOT_PATH = 'seed-runs/model-variants/2026-07-10-launch-snapshot.json'

const PROVIDER_KEYS = ['openai', 'anthropic', 'google']
const PROVIDER_SERVICE_LABELS = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  google: 'Gemini',
}
const PRESERVABLE_INTERMEDIATE_FINDINGS = new Set([
  'missing mobile viewport',
  'dynamic HTML sink',
  'inline event handler',
  'modal API',
  'deprecated clipboard API',
  'negative letter spacing',
])
const SOURCE_RUN_ID_PATTERN = /^(?:[0-9a-f]{16}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
  } catch (error) {
    fail(`${relativePath}: ${error.message}`)
    return null
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonBlank(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function sorted(values) {
  return [...values].sort()
}

function safeRepoPath(value, prefix) {
  return (
    typeof value === 'string' &&
    value.startsWith(prefix) &&
    !value.includes('..') &&
    !path.isAbsolute(value)
  )
}

function artifactPathFromStep(step) {
  return isObject(step) && typeof step.artifact_version_path === 'string'
    ? step.artifact_version_path
    : null
}

function validateArtifact(artifactPath, label, { enforceHardGates = true } = {}) {
  if (!safeRepoPath(artifactPath, 'public/artifacts/')) {
    fail(`${label}: artifact path must stay under public/artifacts/`)
    return null
  }
  const absolutePath = path.join(root, artifactPath)
  if (!existsSync(absolutePath)) {
    fail(`${label}: missing ${artifactPath}`)
    return null
  }

  const bytes = readFileSync(absolutePath)
  const html = bytes.toString('utf8')
  assert(bytes.length >= 1000, `${label}: artifact is suspiciously small`)
  assert(/<!doctype\s+html/i.test(html), `${label}: artifact must be a complete HTML document`)
  const hardGateFindings = []
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) {
    hardGateFindings.push('missing mobile viewport')
    if (enforceHardGates) fail(`${label}: artifact must declare a mobile viewport`)
  }

  const forbidden = [
    [/https?:\/\//i, 'remote URL'],
    [/<script\b[^>]*\bsrc\s*=/i, 'external script'],
    [/<link\b[^>]*\bhref\s*=/i, 'external linked resource'],
    [/@import\s/i, 'CSS import'],
    [/\bfetch\s*\(/i, 'fetch call'],
    [/\bXMLHttpRequest\b/i, 'XMLHttpRequest'],
    [/\bWebSocket\b/i, 'WebSocket'],
    [/\bEventSource\b/i, 'EventSource'],
    [/\bsendBeacon\s*\(/i, 'sendBeacon'],
    [/\beval\s*\(/i, 'eval'],
    [/\bnew\s+Function\s*\(/i, 'new Function'],
    [/\bdocument\.write\s*\(/i, 'document.write'],
    [/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/i, 'dynamic HTML sink'],
    [/<[^>]+\son[a-z]+\s*=/i, 'inline event handler'],
    [/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/i, 'modal API'],
    [/\bdocument\.execCommand\b/i, 'deprecated clipboard API'],
    [/\bjavascript\s*:/i, 'javascript URL'],
    [/letter-spacing\s*:\s*-/i, 'negative letter spacing'],
  ]
  for (const [pattern, name] of forbidden) {
    if (!pattern.test(html)) continue
    hardGateFindings.push(name)
    if (enforceHardGates) fail(`${label}: artifact contains forbidden ${name}`)
  }

  let scriptCount = 0
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1])) continue
    if (/type=["'](?:application\/json|application\/ld\+json)["']/i.test(match[1])) continue
    scriptCount += 1
    try {
      new Script(match[2], { filename: `${artifactPath}#script-${scriptCount}` })
    } catch (error) {
      hardGateFindings.push(`inline script ${scriptCount} parse error`)
      if (enforceHardGates) {
        fail(`${label}: inline script ${scriptCount} does not parse: ${error.message}`)
      }
    }
  }
  assert(scriptCount >= 1, `${label}: artifact must contain runnable inline JavaScript`)
  return {
    bytes,
    html,
    hash: sha256(bytes),
    lines: html.split(/\n/).length,
    hardGateFindings,
  }
}

function validateMetrics(metrics, label) {
  assert(isObject(metrics), `${label}: metrics must be an object`)
  if (!isObject(metrics)) return null
  assert(
    Number.isFinite(metrics.qualityScore) && metrics.qualityScore >= 0 && metrics.qualityScore <= 100,
    `${label}: qualityScore must be between 0 and 100`,
  )
  assert(typeof metrics.artifactReady === 'boolean', `${label}: artifactReady must be boolean`)
  assert(typeof metrics.hardGatesPassed === 'boolean', `${label}: hardGatesPassed must be boolean`)
  assert(
    Number.isInteger(metrics.consoleErrorCount) && metrics.consoleErrorCount >= 0,
    `${label}: consoleErrorCount must be a non-negative integer`,
  )
  assert(
    Number.isInteger(metrics.horizontalOverflowPx) && metrics.horizontalOverflowPx >= 0,
    `${label}: horizontalOverflowPx must be a non-negative integer`,
  )
  assert(
    Array.isArray(metrics.notes) && metrics.notes.length > 0 && metrics.notes.every(isNonBlank),
    `${label}: notes must contain nonblank verification evidence`,
  )
  assert(isObject(metrics.functionalChecks), `${label}: functionalChecks must be an object`)
  if (isObject(metrics.functionalChecks)) {
    assert(
      Number.isInteger(metrics.functionalChecks.passed) &&
        Number.isInteger(metrics.functionalChecks.total) &&
        metrics.functionalChecks.total >= 10 &&
        metrics.functionalChecks.passed >= 0 &&
        metrics.functionalChecks.passed <= metrics.functionalChecks.total,
      `${label}: functionalChecks must contain valid passed/total integers with at least ten checks`,
    )
  }
  return metrics.functionalChecks?.total
}

function validatePackage({ manifest, variant, packageFile, historical, label }) {
  if (!safeRepoPath(packageFile, 'seed-runs/')) {
    fail(`${label}: package path must stay under seed-runs/`)
    return
  }
  const absolutePath = path.join(root, packageFile)
  if (!existsSync(absolutePath)) {
    fail(`${label}: missing package ${packageFile}`)
    return
  }
  const raw = readFileSync(absolutePath)
  assert(sha256(raw) === variant.packageSha256, `${label}: package SHA-256 mismatch`)
  const sourcePackage = readJson(packageFile)
  if (!isObject(sourcePackage)) return

  let verificationSidecar = null
  let verificationSidecarRecord = null
  if (variant.verificationEvidenceFile !== undefined) {
    const sidecarFile = `seed-runs/${variant.verificationEvidenceFile}`
    assert(
      safeRepoPath(sidecarFile, 'seed-runs/model-variants/'),
      `${label}: verification sidecar must stay under seed-runs/model-variants/`,
    )
    verificationSidecar = readJson(sidecarFile)
    assert(isObject(verificationSidecar), `${label}: verification sidecar must be an object`)
    if (isObject(verificationSidecar)) {
      assert(verificationSidecar.schemaVersion === 1, `${label}: verification sidecar schema must be 1`)
      assert(
        verificationSidecar.canonicalProjectId === manifest.canonicalProjectId,
        `${label}: verification sidecar project mismatch`,
      )
      assert(
        Number.isFinite(Date.parse(verificationSidecar.verifiedAt)),
        `${label}: verification sidecar needs a valid timestamp`,
      )
      assert(Array.isArray(verificationSidecar.records), `${label}: verification sidecar records must be an array`)
      const matchingRecords = (Array.isArray(verificationSidecar.records)
        ? verificationSidecar.records
        : []).filter(
        (record) => record?.sourceRunId === variant.sourceRunId,
      )
      assert(matchingRecords.length === 1, `${label}: verification sidecar needs one matching record`)
      verificationSidecarRecord = matchingRecords[0] ?? null
    }
    if (isObject(verificationSidecarRecord)) {
      assert(
        verificationSidecarRecord.sourcePackageFile === packageFile,
        `${label}: verification sidecar package path mismatch`,
      )
      assert(
        verificationSidecarRecord.sourcePackageSha256 === variant.packageSha256 &&
          verificationSidecarRecord.sourcePackageSha256 === sha256(raw),
        `${label}: verification sidecar must bind the immutable package hash`,
      )
      assert(
        verificationSidecarRecord.immutableLegacyPackage === true,
        `${label}: sidecar is reserved for an immutable legacy package`,
      )
      assert(
        verificationSidecarRecord.submissionState === (
          historical
            ? 'historical_original_source_run'
            : 'not_applicable_model_variant'
        ),
        `${label}: sidecar must explicitly preserve the run's submission role`,
      )
      assert(
        JSON.stringify(verificationSidecarRecord.firstPassMetrics) ===
          JSON.stringify(variant.firstPassMetrics),
        `${label}: sidecar first-pass metrics must match the release manifest`,
      )
      assert(
        JSON.stringify(verificationSidecarRecord.finalMetrics) ===
          JSON.stringify(variant.finalMetrics),
        `${label}: sidecar final metrics must match the release manifest`,
      )
    }
  }

  const packageSourceRunId =
    sourcePackage.source_run_id ??
    sourcePackage.pathforge_pending_id ??
    sourcePackage.source_run_submission_id
  assert(packageSourceRunId === variant.sourceRunId, `${label}: package source_run_id mismatch`)
  assert(sourcePackage.provider === variant.serviceLabel, `${label}: package provider mismatch`)
  assert(sourcePackage.model === variant.modelLabel, `${label}: package model mismatch`)
  assert(sourcePackage.model_settings === variant.modelSettings, `${label}: package settings mismatch`)
  assert(isNonBlank(sourcePackage.source_url) && sourcePackage.source_url.startsWith('https://'), `${label}: package needs HTTPS source URL`)
  const validShareUrl =
    (variant.providerKey === 'openai' && /^https:\/\/chatgpt\.com\/share\//.test(sourcePackage.source_url)) ||
    (variant.providerKey === 'anthropic' && /^https:\/\/claude\.ai\/share\//.test(sourcePackage.source_url)) ||
    (variant.providerKey === 'google' && /^https:\/\/share\.gemini\.google\//.test(sourcePackage.source_url))
  assert(validShareUrl, `${label}: every visible model run needs a public provider share URL`)
  assert(sourcePackage.run_finished_at === variant.capturedAt, `${label}: package capture time mismatch`)
  assert(Array.isArray(sourcePackage.steps) && sourcePackage.steps.length === variant.promptCount, `${label}: package prompt count mismatch`)
  assert(sourcePackage.prompt_count === variant.promptCount, `${label}: package prompt_count mismatch`)
  assert((sourcePackage.repair_prompt_count ?? 0) === variant.repairPromptCount, `${label}: package repair_prompt_count mismatch`)
  assert(sourcePackage.steps?.[0]?.prompt_exact === manifest.contract.openingPromptExact, `${label}: opening prompt drifted`)
  for (const forbiddenField of [
    'project_id',
    'prompt_id',
    'prompt_family_id',
    'fork_source',
    'fork_source_project_id',
  ]) {
    assert(!Object.hasOwn(sourcePackage, forbiddenField), `${label}: ${forbiddenField} would duplicate project or fork identity`)
  }

  for (const [index, step] of (sourcePackage.steps ?? []).entries()) {
    assert(step.step_number === index + 1, `${label}: step numbers must be sequential`)
    assert(typeof step.prompt_exact === 'string' && step.prompt_exact.length > 0, `${label}: step ${index + 1} needs exact prompt text`)
    assert(typeof step.response_exact === 'string' && step.response_exact.length > 0, `${label}: step ${index + 1} needs verbatim response text`)
    const response = String(step.response_exact ?? '').toLocaleLowerCase()
    for (const placeholder of [
      'exact response is preserved in the source session',
      'exact response and code are preserved in the source session',
      'see source link for the exact response',
      'response omitted',
    ]) {
      assert(!response.includes(placeholder), `${label}: step ${index + 1} contains a response placeholder`)
    }
    const artifactPath = artifactPathFromStep(step)
    if (artifactPath) {
      assert(step.generated_files?.includes(artifactPath), `${label}: step ${index + 1} artifact must appear in generated_files`)
      validateArtifact(
        artifactPath,
        `${label} step ${index + 1}`,
        { enforceHardGates: artifactPath === variant.finalArtifactPath },
      )
    }
    if (index > 0) {
      assert(isNonBlank(step.continuation_reason), `${label}: continuation step ${index + 1} needs a concrete reason`)
    }
  }

  assert(sourcePackage.final_artifact_path === variant.finalArtifactPath, `${label}: package final artifact mismatch`)
  const firstPackageArtifactPath = (sourcePackage.steps ?? [])
    .map(artifactPathFromStep)
    .find(Boolean)
  assert(firstPackageArtifactPath === variant.firstArtifactPath, `${label}: first real artifact mismatch`)
  const finalStep = sourcePackage.steps?.at(-1)
  const finalArtifact = validateArtifact(variant.finalArtifactPath, `${label} final`)
  const finalStepHasEquivalentArtifact = Boolean(
    finalArtifact &&
    finalStep?.generated_files?.some((generatedFile) => (
      safeRepoPath(generatedFile, 'public/artifacts/') &&
      existsSync(path.join(root, generatedFile)) &&
      sha256(readFileSync(path.join(root, generatedFile))) === finalArtifact.hash
    )),
  )
  assert(
    artifactPathFromStep(finalStep) === variant.finalArtifactPath ||
      finalStep?.generated_files?.includes(variant.finalArtifactPath) ||
      finalStepHasEquivalentArtifact,
    `${label}: final prompt must map to the default artifact`,
  )
  assert(
    JSON.stringify(sorted(sourcePackage.artifact_versions ?? [])) ===
      JSON.stringify(sorted(variant.artifactVersionPaths)),
    `${label}: artifact version set mismatch`,
  )
  if (finalArtifact) {
    assert(sourcePackage.artifact_sha256 === finalArtifact.hash, `${label}: final artifact hash mismatch`)
  }

  const artifactVersionNotes = isObject(verificationSidecarRecord)
    ? verificationSidecarRecord.artifactVersionNotes
    : sourcePackage.artifact_version_notes
  if (!historical || isObject(verificationSidecarRecord)) {
    assert(
      Array.isArray(artifactVersionNotes) &&
        artifactVersionNotes.length === variant.artifactVersionPaths.length,
      `${label}: artifact_version_notes must cover every real artifact`,
    )
  }
  const notesByPath = new Map(
    (Array.isArray(artifactVersionNotes) ? artifactVersionNotes : [])
      .map((note) => [note.path, note]),
  )
  for (const artifactPath of variant.artifactVersionPaths) {
    const artifact = validateArtifact(
      artifactPath,
      `${label} version`,
      { enforceHardGates: artifactPath === variant.finalArtifactPath },
    )
    const note = notesByPath.get(artifactPath)
    if (!historical || isObject(verificationSidecarRecord)) {
      assert(isObject(note), `${label}: missing artifact note for ${artifactPath}`)
    }
    if (artifact && isObject(note)) {
      assert(note.sha256 === artifact.hash, `${label}: artifact note hash mismatch for ${artifactPath}`)
      assert(note.bytes === artifact.bytes.length, `${label}: artifact note byte count mismatch for ${artifactPath}`)
      assert(note.lines === artifact.lines, `${label}: artifact note line count mismatch for ${artifactPath}`)
      assert(isNonBlank(note.disposition), `${label}: artifact note disposition is blank`)
    }
    if (artifact?.hardGateFindings.length > 0) {
      assert(
        artifact.hardGateFindings.every((finding) => (
          PRESERVABLE_INTERMEDIATE_FINDINGS.has(finding)
        )),
        `${label}: preserved intermediate contains a non-servable network, execution, or parse defect`,
      )
      assert(
        artifactPath !== variant.finalArtifactPath &&
          variant.repairPromptCount > 0 &&
          variant.firstPassMetrics?.hardGatesPassed === false,
        `${label}: preserved hard-gate defect requires a repair prompt and failed first-pass metrics`,
      )
    }
  }

  const verificationEvidence = isObject(verificationSidecarRecord)
    ? {
        schema_version: verificationSidecar.schemaVersion,
        verified_at: verificationSidecar.verifiedAt,
        first_pass_metrics: verificationSidecarRecord.firstPassMetrics,
        final_metrics: verificationSidecarRecord.finalMetrics,
      }
    : sourcePackage.verification_evidence
  assert(isObject(verificationEvidence), `${label}: structured verification_evidence is required`)
  if (isObject(verificationEvidence)) {
    assert(verificationEvidence.schema_version === 1, `${label}: verification evidence schema must be 1`)
    assert(
      Number.isFinite(Date.parse(verificationEvidence.verified_at)),
      `${label}: verification evidence needs a valid timestamp`,
    )
    assert(
      JSON.stringify(verificationEvidence.first_pass_metrics) ===
        JSON.stringify(variant.firstPassMetrics),
      `${label}: first-pass metrics must come from structured verification evidence`,
    )
    assert(
      JSON.stringify(verificationEvidence.final_metrics) ===
        JSON.stringify(variant.finalMetrics),
      `${label}: final metrics must come from structured verification evidence`,
    )
  }

  if (!historical) {
    assert(sourcePackage.status === 'published_model_variant', `${label}: comparison package status must be published_model_variant`)
    assert(
      sourcePackage.submission === null ||
        (sourcePackage.submission === undefined && isObject(verificationSidecarRecord)),
      `${label}: comparison package must not masquerade as a user submission`,
    )
    const basis = sourcePackage.comparison_basis
    assert(isObject(basis), `${label}: comparison_basis is required`)
    if (isObject(basis)) {
      assert(basis.opening_prompt_exact === manifest.contract.openingPromptExact, `${label}: comparison opening prompt mismatch`)
      assert(
        JSON.stringify(basis.acceptance_criteria) === JSON.stringify(manifest.contract.acceptanceCriteria),
        `${label}: comparison acceptance criteria mismatch`,
      )
      assert(basis.adaptive_repair_policy === manifest.contract.adaptiveRepairPolicy, `${label}: comparison repair policy mismatch`)
      const independenceNote = String(basis.independence_note ?? '').toLocaleLowerCase()
      assert(
        independenceNote.includes('fresh session') &&
          independenceNote.includes('not shown') &&
          independenceNote.includes('another provider'),
        `${label}: comparison needs a concrete uncontaminated-session note`,
      )
    }
    const provenance = sourcePackage.operator_provenance
    assert(isObject(provenance), `${label}: operator_provenance is required`)
    if (isObject(provenance)) {
      assert(provenance.kind === 'pathforge_labs_manual', `${label}: comparison operator kind must be manual Labs`)
      assert(provenance.ordinary_fork === false, `${label}: comparison must not be an ordinary fork`)
      assert(provenance.canonical_project_id === manifest.canonicalProjectId, `${label}: provenance project mismatch`)
      assert(provenance.canonical_route === manifest.canonicalRoute, `${label}: provenance route mismatch`)
      assert(provenance.comparison_contract_version === manifest.contract.version, `${label}: provenance contract version mismatch`)
      assert(provenance.comparison_contract_sha256 === manifest.contract.sha256, `${label}: provenance contract hash mismatch`)
      assert(provenance.opening_prompt_sha256 === manifest.contract.openingPromptSha256, `${label}: provenance prompt hash mismatch`)
    }
  }
}

const curated = readJson('seed-runs/curation/2026-07-10-accepted-projects.json')
assert(curated?.acceptedCount === 8 && curated?.projects?.length === 8, 'curated launch cohort must contain exactly eight projects')
const curatedByProjectId = new Map((curated?.projects ?? []).map((project) => [project.projectId, project]))
const launchSnapshot = readJson(LAUNCH_SNAPSHOT_PATH)
assert(launchSnapshot?.schemaVersion === 1, `${LAUNCH_SNAPSHOT_PATH}: schemaVersion must be 1`)
assert(
  Array.isArray(launchSnapshot?.canonicalProjects) &&
    launchSnapshot.canonicalProjects.length === EXPECTED_MODEL_VARIANT_MANIFESTS.length,
  `${LAUNCH_SNAPSHOT_PATH}: must preserve one entry for every launch project`,
)
const launchSnapshotByManifest = new Map(
  (launchSnapshot?.canonicalProjects ?? []).map((entry) => [entry.manifestFile, entry]),
)
assert(
  Object.keys(EXPECTED_MODEL_VARIANT_LAUNCH_SOURCE_RUN_IDS).length ===
    EXPECTED_MODEL_VARIANT_MANIFESTS.length,
  'launch source-run anchor must cover exactly the eight configured manifests',
)
const launchSourceRunIds = new Set()

const runtimeRegistry = readFileSync(path.join(root, 'src/lib/project-model-variants.ts'), 'utf8')
const rawVariantSetBindings = runtimeRegistry.match(
  /const RAW_VARIANT_SETS = \[([\s\S]*?)\]\s+as unknown as RawProjectModelVariantSet\[\]/,
)?.[1] ?? ''
const routeHelper = readFileSync(path.join(root, 'src/components/PreparedModelVariantSourceRunPage.tsx'), 'utf8')
for (const token of [
  'getPublishedProjectModelVariants',
  'reconcileProjectModelVariantSet',
  'resolveProjectModelVariant(',
  'resolveProjectModelVariantComparison(',
  'redirect(resolvedRoute)',
]) {
  assert(routeHelper.includes(token), `shared model-variant route helper must contain ${token}`)
}

const projectIds = new Set()
const routes = new Set()
const sourceRunIds = new Set()
const packageFiles = new Set()
const artifactOwners = new Map()

for (const manifestFile of EXPECTED_MODEL_VARIANT_MANIFESTS) {
  const relativePath = `seed-runs/model-variants/${manifestFile}`
  const manifest = readJson(relativePath)
  const importMatch = runtimeRegistry.match(
    new RegExp(
      `import\\s+([A-Za-z_$][\\w$]*)\\s+from\\s+['"]\\.\\.\\/\\.\\.\\/${escapeRegExp(relativePath)}['"]`,
    ),
  )
  assert(importMatch, `runtime registry must import ${relativePath}`)
  if (importMatch) {
    assert(
      new RegExp(`\\b${escapeRegExp(importMatch[1])}\\b`).test(rawVariantSetBindings),
      `runtime registry must register ${relativePath} in RAW_VARIANT_SETS`,
    )
  }
  if (!isObject(manifest)) continue

  const launchEntry = launchSnapshotByManifest.get(manifestFile)
  const anchoredSourceRunIds = EXPECTED_MODEL_VARIANT_LAUNCH_SOURCE_RUN_IDS[manifestFile]
  assert(isObject(launchEntry), `${LAUNCH_SNAPSHOT_PATH}: missing ${manifestFile}`)
  assert(Array.isArray(anchoredSourceRunIds), `launch source-run anchor is missing ${manifestFile}`)
  if (isObject(launchEntry)) {
    assert(
      launchEntry.canonicalProjectId === manifest.canonicalProjectId,
      `${LAUNCH_SNAPSHOT_PATH}: ${manifestFile} project mismatch`,
    )
    assert(
      Array.isArray(launchEntry.sourceRunIds) &&
        launchEntry.sourceRunIds.length === 3 &&
        new Set(launchEntry.sourceRunIds).size === 3,
      `${LAUNCH_SNAPSHOT_PATH}: ${manifestFile} needs exactly three unique launch runs`,
    )
    assert(
      JSON.stringify(launchEntry.sourceRunIds) === JSON.stringify(anchoredSourceRunIds),
      `${LAUNCH_SNAPSHOT_PATH}: ${manifestFile} must match the immutable source-run anchor`,
    )
    for (const sourceRunId of launchEntry.sourceRunIds ?? []) {
      assert(
        manifest.variants?.some((variant) => variant.sourceRunId === sourceRunId),
        `${relativePath}: launch run ${sourceRunId} must remain inspectable`,
      )
      assert(
        !launchSourceRunIds.has(sourceRunId),
        `${LAUNCH_SNAPSHOT_PATH}: launch run ${sourceRunId} is reused`,
      )
      launchSourceRunIds.add(sourceRunId)
    }
  }

  const curatedProject = curatedByProjectId.get(manifest.canonicalProjectId)
  assert(curatedProject, `${relativePath}: project is not in the accepted launch cohort`)
  if (!curatedProject) continue
  assert(manifest.schemaVersion === 1, `${relativePath}: schemaVersion must be 1`)
  assert(manifest.canonicalRoute === curatedProject.href, `${relativePath}: canonical route mismatch`)
  assert(manifest.title === curatedProject.title, `${relativePath}: title mismatch`)
  assert(!projectIds.has(manifest.canonicalProjectId), `${relativePath}: duplicate canonical project`)
  assert(!routes.has(manifest.canonicalRoute), `${relativePath}: duplicate canonical route`)
  projectIds.add(manifest.canonicalProjectId)
  routes.add(manifest.canonicalRoute)

  const contract = manifest.contract
  assert(isObject(contract), `${relativePath}: contract is required`)
  if (!isObject(contract)) continue
  assert(contract.openingPromptExact === curatedProject.prompts[0], `${relativePath}: opening prompt must match the historical package byte-for-byte`)
  assert(contract.openingPromptSha256 === sha256(contract.openingPromptExact), `${relativePath}: opening prompt hash mismatch`)
  assert(
    Array.isArray(contract.acceptanceCriteria) &&
      contract.acceptanceCriteria.length >= 10 &&
      contract.acceptanceCriteria.every(isNonBlank) &&
      new Set(contract.acceptanceCriteria).size === contract.acceptanceCriteria.length,
    `${relativePath}: acceptance criteria need at least ten unique checks`,
  )
  assert(isNonBlank(contract.adaptiveRepairPolicy), `${relativePath}: adaptive repair policy is required`)
  const contractPayload = {
    version: contract.version,
    openingPromptExact: contract.openingPromptExact,
    acceptanceCriteria: contract.acceptanceCriteria,
    adaptiveRepairPolicy: contract.adaptiveRepairPolicy,
  }
  assert(contract.sha256 === sha256(JSON.stringify(contractPayload)), `${relativePath}: contract hash mismatch`)

  const variants = manifest.variants
  assert(Array.isArray(variants) && variants.length >= 3, `${relativePath}: at least three provider variants are required`)
  if (!Array.isArray(variants)) continue
  const providerCounts = new Map(PROVIDER_KEYS.map((key) => [key, 0]))
  const currentProviderCounts = new Map(PROVIDER_KEYS.map((key) => [key, 0]))
  const baselines = []
  const comparisons = []
  const functionalTotals = new Set()

  for (const [index, variant] of variants.entries()) {
    const label = `${relativePath} variants[${index}]`
    assert(isObject(variant), `${label}: variant must be an object`)
    if (!isObject(variant)) continue
    assert(SOURCE_RUN_ID_PATTERN.test(variant.sourceRunId ?? ''), `${label}: invalid sourceRunId`)
    assert(PROVIDER_KEYS.includes(variant.providerKey), `${label}: invalid providerKey`)
    assert(
      variant.serviceLabel === PROVIDER_SERVICE_LABELS[variant.providerKey],
      `${label}: provider service label mismatch`,
    )
    assert(typeof variant.isCurrent === 'boolean', `${label}: isCurrent must be boolean`)
    providerCounts.set(variant.providerKey, (providerCounts.get(variant.providerKey) ?? 0) + 1)
    if (variant.isCurrent) {
      currentProviderCounts.set(
        variant.providerKey,
        (currentProviderCounts.get(variant.providerKey) ?? 0) + 1,
      )
    }
    assert(!sourceRunIds.has(variant.sourceRunId), `${label}: source run is reused across projects`)
    sourceRunIds.add(variant.sourceRunId)

    const packageFile = `seed-runs/${variant.packageFile}`
    assert(!packageFiles.has(packageFile), `${label}: package is reused across projects`)
    packageFiles.add(packageFile)
    assert(Array.isArray(variant.artifactVersionPaths) && variant.artifactVersionPaths.length > 0, `${label}: artifact versions are required`)
    assert(variant.artifactVersionPaths?.includes(variant.firstArtifactPath), `${label}: first artifact must be selectable`)
    assert(variant.artifactVersionPaths?.includes(variant.finalArtifactPath), `${label}: final artifact must be selectable`)
    for (const artifactPath of variant.artifactVersionPaths ?? []) {
      const owner = artifactOwners.get(artifactPath)
      assert(!owner || owner === variant.sourceRunId, `${label}: artifact is reused by another model run`)
      artifactOwners.set(artifactPath, variant.sourceRunId)
    }

    const firstTotal = validateMetrics(variant.firstPassMetrics, `${label} firstPassMetrics`)
    const finalTotal = validateMetrics(variant.finalMetrics, `${label} finalMetrics`)
    if (Number.isInteger(firstTotal)) functionalTotals.add(firstTotal)
    if (Number.isInteger(finalTotal)) functionalTotals.add(finalTotal)
    if (variant.runRole === 'historical-baseline') {
      baselines.push(variant)
      assert(variant.isCurrent === false, `${label}: historical baseline cannot be current`)
    }
    if (variant.runRole === 'comparison-run') {
      comparisons.push(variant)
    }
    if (variant.qualityStatus === 'known-issue') {
      assert(variant.runRole === 'historical-baseline', `${label}: known issues are historical-only`)
      assert(variant.finalMetrics?.artifactReady === true, `${label}: historical artifact must remain mountable`)
      assert(variant.finalMetrics?.hardGatesPassed === false, `${label}: known issue must remain visible in hard-gate metrics`)
      assert(
        variant.finalMetrics?.functionalChecks?.passed < variant.finalMetrics?.functionalChecks?.total,
        `${label}: known issue must remain visible in functional metrics`,
      )
    } else {
      assert(variant.finalMetrics?.qualityScore >= 90, `${label}: final quality must meet the A+ bar`)
      assert(variant.finalMetrics?.artifactReady === true, `${label}: final artifact must be ready`)
      assert(variant.finalMetrics?.hardGatesPassed === true, `${label}: final hard gates must pass`)
      assert(
        variant.finalMetrics?.functionalChecks?.passed === variant.finalMetrics?.functionalChecks?.total,
        `${label}: every final functional check must pass`,
      )
      assert(variant.finalMetrics?.consoleErrorCount === 0, `${label}: final artifact must have zero console errors`)
      assert(variant.finalMetrics?.horizontalOverflowPx === 0, `${label}: final artifact must have zero horizontal overflow`)
    }
    validatePackage({
      manifest,
      variant,
      packageFile,
      historical: variant.runRole === 'historical-baseline',
      label,
    })
  }

  for (const providerKey of PROVIDER_KEYS) {
    assert((providerCounts.get(providerKey) ?? 0) >= 1, `${relativePath}: requires at least one ${providerKey} run`)
    assert((currentProviderCounts.get(providerKey) ?? 0) <= 1, `${relativePath}: allows at most one current ${providerKey} run`)
  }
  if (isObject(launchEntry)) {
    try {
      assertManifestAppendLineage({
        variants,
        launchSourceRunIds: launchEntry.sourceRunIds,
        label: relativePath,
      })
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }
  assert(baselines.length === 1, `${relativePath}: requires one historical baseline`)
  assert(comparisons.length >= 2, `${relativePath}: requires at least two comparison runs`)
  if (baselines[0]) {
    assert(baselines[0].sourceRunId === curatedProject.sourceRunId, `${relativePath}: historical source run mismatch`)
    assert(baselines[0].operatorKind === 'original-author', `${relativePath}: historical operator must be original author`)
  }
  assert(functionalTotals.size === 1, `${relativePath}: every provider must use the same functional-check denominator`)
  const defaultVariant = variants.find((variant) => variant.sourceRunId === manifest.defaultSourceRunId)
  assert(defaultVariant?.runRole === 'comparison-run', `${relativePath}: default must be a comparison run`)
  assert(defaultVariant?.qualityStatus === 'verified', `${relativePath}: default must be verified`)
  assert(defaultVariant?.isCurrent === true, `${relativePath}: default must be current`)

  const routeFile = `src/app${manifest.canonicalRoute}/page.tsx`
  assert(existsSync(path.join(root, routeFile)), `${relativePath}: missing route ${routeFile}`)
  if (existsSync(path.join(root, routeFile))) {
    const routeSource = readFileSync(path.join(root, routeFile), 'utf8')
    assert(routeSource.includes('PreparedModelVariantSourceRunPage'), `${routeFile}: must use shared model-variant wrapper`)
    assert(routeSource.includes('searchParams'), `${routeFile}: must pass run/compare query state`)
  }
}

assert(projectIds.size === 8, 'model-variant release must cover exactly eight canonical projects')
assert(launchSourceRunIds.size === 24, 'launch snapshot must contain exactly 24 unique source runs')
for (const sourceRunId of launchSourceRunIds) {
  assert(sourceRunIds.has(sourceRunId), `model-variant history dropped launch run ${sourceRunId}`)
}
assert(sourceRunIds.size >= 24, 'model-variant release must preserve at least the 24 launch source runs')

if (failures.length > 0) {
  console.error('Project model-variant cohort guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Project model-variant cohort guard passed for eight projects and 24 runs.')
