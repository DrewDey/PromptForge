import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS,
  EXPECTED_MODEL_VARIANT_MANIFESTS,
} from './project-model-variant-cohort-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRegistryPath = 'src/lib/project-model-variants.ts'
const failures = []

const PROVIDERS = new Map([
  ['openai', {
    serviceLabel: 'ChatGPT',
    sourceHost: /(^|\.)chatgpt\.com$/i,
    publicSource: /^https:\/\/chatgpt\.com\/(?:share|s)\//,
  }],
  ['anthropic', {
    serviceLabel: 'Claude',
    sourceHost: /(^|\.)claude\.ai$/i,
    publicSource: /^https:\/\/claude\.ai\/share\//,
  }],
  ['google', {
    serviceLabel: 'Gemini',
    sourceHost: /(^|\.)share\.gemini\.google$/i,
    publicSource: /^https:\/\/share\.gemini\.google\//,
  }],
])
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const SOURCE_RUN_ID_PATTERN = /^(?:[0-9a-f]{16}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonBlank(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeRepoPath(value, prefix) {
  return (
    isNonBlank(value) &&
    value.startsWith(prefix) &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'))
  } catch (error) {
    fail(`${relativePath}: ${error.message}`)
    return null
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`
  }
  return JSON.stringify(value)
}

function sameJson(left, right) {
  return stableJson(left) === stableJson(right)
}

function sameStringSet(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  )
}

function packageArtifactPath(entry) {
  if (typeof entry === 'string') return entry
  return isObject(entry) ? (entry.path ?? entry.artifact_path ?? null) : null
}

function validateMetrics(metrics, label, { final = false } = {}) {
  assert(isObject(metrics), `${label}: metrics must be an object`)
  if (!isObject(metrics)) return null

  assert(
    Number.isFinite(metrics.qualityScore) &&
      metrics.qualityScore >= 0 &&
      metrics.qualityScore <= 100,
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
  const checks = metrics.functionalChecks
  if (isObject(checks)) {
    assert(
      Number.isInteger(checks.passed) &&
        Number.isInteger(checks.total) &&
        checks.total >= 8 &&
        checks.passed >= 0 &&
        checks.passed <= checks.total,
      `${label}: functionalChecks must contain valid passed/total integers with at least eight checks`,
    )
  }

  if (final) {
    assert(metrics.qualityScore >= 90, `${label}: verified final qualityScore must be at least 90`)
    assert(metrics.artifactReady === true, `${label}: verified final artifact must be ready`)
    assert(metrics.hardGatesPassed === true, `${label}: verified final artifact must pass hard gates`)
    assert(checks?.passed === checks?.total, `${label}: verified final must pass every functional check`)
    assert(metrics.consoleErrorCount === 0, `${label}: verified final must have zero console errors`)
    assert(metrics.horizontalOverflowPx === 0, `${label}: verified final must have zero horizontal overflow`)

    if (metrics.purposeChecks !== undefined) {
      assert(isObject(metrics.purposeChecks), `${label}: purposeChecks must be an object when present`)
      assert(
        Number.isInteger(metrics.purposeChecks?.passed) &&
          Number.isInteger(metrics.purposeChecks?.total) &&
          metrics.purposeChecks.total > 0 &&
          metrics.purposeChecks.passed === metrics.purposeChecks.total,
        `${label}: verified final must pass every purpose-specific check`,
      )
    }
  }

  return checks?.total ?? null
}

function parseRuntimeActiveRegistrations() {
  let source = ''
  try {
    source = readFileSync(path.join(root, runtimeRegistryPath), 'utf8')
  } catch (error) {
    fail(`${runtimeRegistryPath}: ${error.message}`)
    return { importsByBinding: new Map(), activeBindings: [] }
  }

  const importsByBinding = new Map()
  const importPattern = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\.\/\.\.\/seed-runs\/model-variants\/([^'"]+\.json)['"]/g
  for (const match of source.matchAll(importPattern)) {
    importsByBinding.set(match[1], match[2])
  }

  const activeMatch = source.match(
    /const ACTIVE_ADDITIONAL_VARIANT_SETS = \[([\s\S]*?)\]\s+as unknown as RawProjectModelVariantSet\[\]/,
  )
  if (!activeMatch) {
    fail(`${runtimeRegistryPath}: cannot locate ACTIVE_ADDITIONAL_VARIANT_SETS`)
    return { importsByBinding, activeBindings: [] }
  }

  const activeBody = activeMatch[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim()
  if (!activeBody) return { importsByBinding, activeBindings: [] }

  const activeBindings = activeBody.split(',').map((value) => value.trim()).filter(Boolean)
  for (const binding of activeBindings) {
    assert(
      /^[A-Za-z_$][\w$]*$/.test(binding),
      `${runtimeRegistryPath}: active registration ${JSON.stringify(binding)} must be a direct imported manifest binding`,
    )
  }
  assert(
    new Set(activeBindings).size === activeBindings.length,
    `${runtimeRegistryPath}: ACTIVE_ADDITIONAL_VARIANT_SETS contains a duplicate registration`,
  )
  return { importsByBinding, activeBindings }
}

function validateRuntimeRegistrationParity() {
  assert(
    Array.isArray(ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS),
    'ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS must be an array',
  )
  assert(
    new Set(ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS).size ===
      ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS.length,
    'ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS contains a duplicate filename',
  )

  const launchFiles = new Set(EXPECTED_MODEL_VARIANT_MANIFESTS)
  for (const fileName of ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS) {
    assert(
      /^[a-z0-9][a-z0-9-]*\.json$/.test(fileName),
      `active model-variant manifest ${JSON.stringify(fileName)} must be a flat kebab-case JSON filename`,
    )
    assert(!launchFiles.has(fileName), `${fileName}: active manifest must not duplicate the immutable launch registry`)
  }

  const { importsByBinding, activeBindings } = parseRuntimeActiveRegistrations()
  const runtimeFiles = []
  for (const binding of activeBindings) {
    const fileName = importsByBinding.get(binding)
    assert(
      isNonBlank(fileName),
      `${runtimeRegistryPath}: active binding ${binding} must import a model-variant manifest`,
    )
    if (fileName) runtimeFiles.push(fileName)
  }

  assert(
    sameStringSet(runtimeFiles, ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS),
    `${runtimeRegistryPath}: runtime active registrations must exactly match ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS`,
  )

  for (const fileName of ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS) {
    const bindings = [...importsByBinding.entries()]
      .filter(([, importedFile]) => importedFile === fileName)
      .map(([binding]) => binding)
    assert(bindings.length === 1, `${runtimeRegistryPath}: ${fileName} must have exactly one default JSON import`)
    if (bindings.length === 1) {
      assert(
        activeBindings.includes(bindings[0]),
        `${runtimeRegistryPath}: ${fileName} is configured active but not registered at runtime`,
      )
    }
  }
}

function collectImmutableOwnership() {
  const ownership = {
    projects: new Set(),
    routes: new Set(),
    sourceRuns: new Set(),
    packages: new Set(),
    artifacts: new Set(),
  }
  for (const fileName of EXPECTED_MODEL_VARIANT_MANIFESTS) {
    const manifest = readJson(`seed-runs/model-variants/${fileName}`)
    if (!isObject(manifest)) continue
    ownership.projects.add(manifest.canonicalProjectId)
    ownership.routes.add(manifest.canonicalRoute)
    for (const variant of Array.isArray(manifest.variants) ? manifest.variants : []) {
      ownership.sourceRuns.add(variant.sourceRunId)
      ownership.packages.add(variant.packageFile)
      for (const artifactPath of Array.isArray(variant.artifactVersionPaths)
        ? variant.artifactVersionPaths
        : []) {
        ownership.artifacts.add(artifactPath)
      }
    }
  }
  return ownership
}

function validateArtifactVersion({ artifactPath, note, label }) {
  assert(isSafeRepoPath(artifactPath, 'public/artifacts/'), `${label}: invalid artifact path`)
  if (!isSafeRepoPath(artifactPath, 'public/artifacts/')) return null
  const absolutePath = path.join(root, artifactPath)
  assert(existsSync(absolutePath), `${label}: missing ${artifactPath}`)
  if (!existsSync(absolutePath)) return null

  const bytes = readFileSync(absolutePath)
  const hash = sha256(bytes)
  const lines = bytes.toString('utf8').split(/\n/).length
  assert(isObject(note), `${label}: every artifact needs one structured version note`)
  if (isObject(note)) {
    assert(note.path === artifactPath, `${label}: artifact note path mismatch`)
    assert(SHA256_PATTERN.test(note.sha256 ?? ''), `${label}: artifact note needs lowercase SHA-256`)
    assert(note.sha256 === hash, `${label}: artifact note SHA-256 does not match file bytes`)
    assert(note.bytes === bytes.length, `${label}: artifact note byte count does not match file bytes`)
    assert(note.lines === lines, `${label}: artifact note line count does not match file bytes`)
    assert(isNonBlank(note.disposition), `${label}: artifact disposition must be nonblank`)
  }
  return { hash, bytes }
}

function validateSourceRunPackage({ manifest, variant, label }) {
  assert(
    isSafeRepoPath(variant.packageFile, 'model-variants/'),
    `${label}: packageFile must stay under seed-runs/model-variants`,
  )
  if (!isSafeRepoPath(variant.packageFile, 'model-variants/')) return
  const packagePath = `seed-runs/${variant.packageFile}`
  const absolutePackagePath = path.join(root, packagePath)
  assert(existsSync(absolutePackagePath), `${label}: missing ${packagePath}`)
  if (!existsSync(absolutePackagePath)) return

  const packageBytes = readFileSync(absolutePackagePath)
  assert(SHA256_PATTERN.test(variant.packageSha256 ?? ''), `${label}: packageSha256 must be lowercase SHA-256`)
  assert(sha256(packageBytes) === variant.packageSha256, `${label}: packageSha256 does not match file bytes`)
  const sourcePackage = readJson(packagePath)
  if (!isObject(sourcePackage)) return
  const artifactVersionPaths = Array.isArray(variant.artifactVersionPaths)
    ? variant.artifactVersionPaths
    : []

  const provider = PROVIDERS.get(variant.providerKey)
  const packageSourceRunId =
    sourcePackage.source_run_id ??
    sourcePackage.source_run_submission_id ??
    sourcePackage.pathforge_pending_id
  assert(packageSourceRunId === variant.sourceRunId, `${packagePath}: source-run identity mismatch`)
  assert(sourcePackage.provider === variant.serviceLabel, `${packagePath}: provider mismatch`)
  assert(sourcePackage.model === variant.modelLabel, `${packagePath}: model label mismatch`)
  assert(sourcePackage.model_settings === variant.modelSettings, `${packagePath}: model settings mismatch`)
  assert(sourcePackage.run_finished_at === variant.capturedAt, `${packagePath}: capture timestamp mismatch`)
  assert(sourcePackage.status === 'published_model_variant', `${packagePath}: status must be published_model_variant`)
  assert(sourcePackage.submission === null, `${packagePath}: model-cohort package submission must be null`)
  try {
    const sourceUrl = new URL(sourcePackage.source_url)
    assert(sourceUrl.protocol === 'https:', `${packagePath}: source URL must use HTTPS`)
    assert(provider?.sourceHost.test(sourceUrl.hostname), `${packagePath}: source URL host does not match ${variant.providerKey}`)
    const isPublicShare = provider?.publicSource.test(sourceUrl.href) === true
    if (!isPublicShare) {
      const access = sourcePackage.source_access
      const ownerSessionFallback =
        variant.providerKey === 'anthropic' &&
        /^https:\/\/claude\.ai\/chat\/[0-9a-f-]+$/i.test(sourceUrl.href) &&
        isObject(access) &&
        access.mode === 'authenticated_owner_session' &&
        access.public_share_unavailable === true &&
        isNonBlank(access.note)
      assert(
        ownerSessionFallback,
        `${packagePath}: non-public source requires an explicit Claude owner-session fallback`,
      )
    }
  } catch {
    fail(`${packagePath}: source_url must be a valid provider URL with declared access state`)
  }

  assert(sourcePackage.prompt_count === variant.promptCount, `${packagePath}: prompt_count mismatch`)
  assert(sourcePackage.repair_prompt_count === variant.repairPromptCount, `${packagePath}: repair_prompt_count mismatch`)
  assert(
    Array.isArray(sourcePackage.steps) && sourcePackage.steps.length === variant.promptCount,
    `${packagePath}: steps must exactly match promptCount`,
  )

  const steps = Array.isArray(sourcePackage.steps) ? sourcePackage.steps : []
  const stepArtifactPaths = []
  for (const [index, step] of steps.entries()) {
    const stepLabel = `${packagePath} step ${index + 1}`
    assert(isObject(step), `${stepLabel}: step must be an object`)
    if (!isObject(step)) continue
    assert(step.step_number === index + 1, `${stepLabel}: step_number must be sequential`)
    assert(isNonBlank(step.prompt_exact), `${stepLabel}: prompt_exact must be nonblank`)
    assert(isNonBlank(step.response_exact), `${stepLabel}: response_exact must be nonblank verbatim evidence`)
    if (index === 0) {
      assert(
        step.prompt_exact === manifest.contract.openingPromptExact,
        `${stepLabel}: opening prompt must match the manifest byte-for-byte`,
      )
    } else {
      assert(
        isNonBlank(step.continuation_reason),
        `${stepLabel}: every continuation needs a nonblank continuation_reason`,
      )
    }

    const response = String(step.response_exact ?? '').toLowerCase()
    for (const placeholder of [
      'exact response is preserved in the source session',
      'exact response and code are preserved in the source session',
      'see source link for the exact response',
      'response omitted',
    ]) {
      assert(!response.includes(placeholder), `${stepLabel}: response_exact contains a summary placeholder`)
    }

    if (isNonBlank(step.artifact_version_path)) {
      const artifactPath = step.artifact_version_path
      stepArtifactPaths.push(artifactPath)
      assert(
        Array.isArray(step.generated_files) && step.generated_files.includes(artifactPath),
        `${stepLabel}: generated_files must include artifact_version_path`,
      )
      assert(SHA256_PATTERN.test(step.artifact_sha256 ?? ''), `${stepLabel}: real artifact needs artifact_sha256`)
      if (isSafeRepoPath(artifactPath, 'public/artifacts/') && existsSync(path.join(root, artifactPath))) {
        assert(
          step.artifact_sha256 === sha256(readFileSync(path.join(root, artifactPath))),
          `${stepLabel}: artifact_sha256 does not match file bytes`,
        )
      }
    }
  }

  assert(
    steps[0]?.prompt_exact === manifest.contract.openingPromptExact,
    `${packagePath}: first prompt drifted from the exact comparison contract`,
  )
  assert(
    sameStringSet(stepArtifactPaths, artifactVersionPaths),
    `${packagePath}: step artifacts must exactly match artifactVersionPaths`,
  )
  assert(stepArtifactPaths[0] === variant.firstArtifactPath, `${packagePath}: first real artifact mismatch`)
  assert(
    steps.at(-1)?.artifact_version_path === variant.finalArtifactPath ||
      steps.at(-1)?.generated_files?.includes(variant.finalArtifactPath),
    `${packagePath}: final prompt must produce the final artifact`,
  )

  const packageArtifactVersions = Array.isArray(sourcePackage.artifact_versions)
    ? sourcePackage.artifact_versions.map(packageArtifactPath).filter(isNonBlank)
    : []
  assert(
    sameStringSet(packageArtifactVersions, artifactVersionPaths),
    `${packagePath}: artifact_versions must exactly match the manifest`,
  )
  assert(sourcePackage.final_artifact_path === variant.finalArtifactPath, `${packagePath}: final_artifact_path mismatch`)

  const artifactNotes = Array.isArray(sourcePackage.artifact_version_notes)
    ? sourcePackage.artifact_version_notes
    : []
  assert(
    artifactNotes.length === artifactVersionPaths.length,
    `${packagePath}: artifact_version_notes must cover every real artifact`,
  )
  const notesByPath = new Map(
    artifactNotes.filter(isObject).map((note) => [note.path, note]),
  )
  let finalArtifact = null
  for (const artifactPath of artifactVersionPaths) {
    const artifact = validateArtifactVersion({
      artifactPath,
      note: notesByPath.get(artifactPath),
      label: `${packagePath} ${artifactPath}`,
    })
    if (artifactPath === variant.finalArtifactPath) finalArtifact = artifact
  }
  assert(SHA256_PATTERN.test(sourcePackage.artifact_sha256 ?? ''), `${packagePath}: artifact_sha256 must be lowercase SHA-256`)
  if (finalArtifact) {
    assert(sourcePackage.artifact_sha256 === finalArtifact.hash, `${packagePath}: final artifact SHA-256 mismatch`)
    const finalHtml = finalArtifact.bytes.toString('utf8')
    assert(finalArtifact.bytes.length >= 1000, `${packagePath}: final artifact is suspiciously small`)
    assert(/<!doctype\s+html/i.test(finalHtml), `${packagePath}: final artifact must be a complete HTML document`)
    assert(/<meta\b[^>]*name=["']viewport["']/i.test(finalHtml), `${packagePath}: final artifact needs a mobile viewport`)
  }

  const verification = sourcePackage.verification_evidence
  assert(isObject(verification), `${packagePath}: verification_evidence is required`)
  if (isObject(verification)) {
    assert(verification.schema_version === 1, `${packagePath}: verification schema must be 1`)
    assert(Number.isFinite(Date.parse(verification.verified_at)), `${packagePath}: verified_at must be valid`)
    assert(
      sameJson(verification.first_pass_metrics, variant.firstPassMetrics),
      `${packagePath}: first-pass metrics must match the manifest exactly`,
    )
    assert(
      sameJson(verification.final_metrics, variant.finalMetrics),
      `${packagePath}: final metrics must match the manifest exactly`,
    )
  }

  const provenance = sourcePackage.operator_provenance
  assert(isObject(provenance), `${packagePath}: operator_provenance is required`)
  if (isObject(provenance)) {
    assert(
      provenance.kind === variant.operatorKind.replaceAll('-', '_'),
      `${packagePath}: operator provenance kind mismatch`,
    )
    assert(provenance.label === variant.operatorLabel, `${packagePath}: operator provenance label mismatch`)
    assert(provenance.canonical_project_id === manifest.canonicalProjectId, `${packagePath}: provenance project mismatch`)
    assert(provenance.canonical_route === manifest.canonicalRoute, `${packagePath}: provenance route mismatch`)
    assert(provenance.comparison_contract_version === manifest.contract.version, `${packagePath}: contract version mismatch`)
    assert(provenance.comparison_contract_sha256 === manifest.contract.sha256, `${packagePath}: contract SHA-256 mismatch`)
    assert(provenance.opening_prompt_sha256 === manifest.contract.openingPromptSha256, `${packagePath}: opening-prompt SHA-256 mismatch`)
    assert(provenance.ordinary_fork === false, `${packagePath}: model-cohort run cannot be an ordinary fork`)
  }

  const basis = sourcePackage.comparison_basis
  assert(isObject(basis), `${packagePath}: comparison_basis is required`)
  if (isObject(basis)) {
    assert(
      basis.opening_prompt_exact === manifest.contract.openingPromptExact,
      `${packagePath}: comparison opening prompt drifted`,
    )
    assert(
      sameJson(basis.acceptance_criteria, manifest.contract.acceptanceCriteria),
      `${packagePath}: comparison acceptance criteria drifted`,
    )
    assert(
      basis.adaptive_repair_policy === manifest.contract.adaptiveRepairPolicy,
      `${packagePath}: comparison repair policy drifted`,
    )
    const independence = String(basis.independence_note ?? '').toLowerCase()
    assert(
      independence.includes('fresh session') &&
        independence.includes('not shown') &&
        independence.includes('another provider'),
      `${packagePath}: comparison needs an uncontaminated fresh-session note`,
    )
  }
}

function validateActiveManifest(fileName, ownership, activeOwnership) {
  const manifestPath = `seed-runs/model-variants/${fileName}`
  const manifest = readJson(manifestPath)
  if (!isObject(manifest)) return

  assert(manifest.schemaVersion === 1, `${manifestPath}: schemaVersion must be 1`)
  assert(manifest.originMode === 'model-cohort', `${manifestPath}: active additions must declare originMode model-cohort`)
  assert(isNonBlank(manifest.canonicalProjectId), `${manifestPath}: canonicalProjectId is required`)
  assert(isNonBlank(manifest.canonicalRoute) && manifest.canonicalRoute.startsWith('/'), `${manifestPath}: canonicalRoute is invalid`)
  assert(isNonBlank(manifest.title), `${manifestPath}: title is required`)
  assert(isNonBlank(manifest.defaultSourceRunId), `${manifestPath}: defaultSourceRunId is required`)
  assert(!ownership.projects.has(manifest.canonicalProjectId), `${manifestPath}: canonical project collides with the launch cohort`)
  assert(!ownership.routes.has(manifest.canonicalRoute), `${manifestPath}: canonical route collides with the launch cohort`)
  assert(!activeOwnership.projects.has(manifest.canonicalProjectId), `${manifestPath}: duplicate active canonical project`)
  assert(!activeOwnership.routes.has(manifest.canonicalRoute), `${manifestPath}: duplicate active canonical route`)
  activeOwnership.projects.add(manifest.canonicalProjectId)
  activeOwnership.routes.add(manifest.canonicalRoute)

  const contract = manifest.contract
  assert(isObject(contract), `${manifestPath}: contract is required`)
  if (!isObject(contract)) return
  assert(isNonBlank(contract.version), `${manifestPath}: contract version is required`)
  assert(isNonBlank(contract.openingPromptExact), `${manifestPath}: exact opening prompt is required`)
  assert(
    Array.isArray(contract.acceptanceCriteria) &&
      contract.acceptanceCriteria.length >= 1 &&
      contract.acceptanceCriteria.every(isNonBlank),
    `${manifestPath}: acceptanceCriteria must contain nonblank requirements`,
  )
  assert(isNonBlank(contract.adaptiveRepairPolicy), `${manifestPath}: adaptiveRepairPolicy is required`)
  assert(SHA256_PATTERN.test(contract.openingPromptSha256 ?? ''), `${manifestPath}: openingPromptSha256 is invalid`)
  assert(
    sha256(contract.openingPromptExact ?? '') === contract.openingPromptSha256,
    `${manifestPath}: openingPromptSha256 does not match the exact prompt`,
  )
  const contractPayload = {
    version: contract.version,
    openingPromptExact: contract.openingPromptExact,
    acceptanceCriteria: contract.acceptanceCriteria,
    adaptiveRepairPolicy: contract.adaptiveRepairPolicy,
  }
  assert(SHA256_PATTERN.test(contract.sha256 ?? ''), `${manifestPath}: contract SHA-256 is invalid`)
  assert(
    sha256(JSON.stringify(contractPayload)) === contract.sha256,
    `${manifestPath}: contract SHA-256 does not match the exact contract`,
  )

  assert(Array.isArray(manifest.variants) && manifest.variants.length >= 3, `${manifestPath}: variants must contain all three providers`)
  const variants = Array.isArray(manifest.variants) ? manifest.variants : []
  const providerCounts = new Map([...PROVIDERS.keys()].map((providerKey) => [providerKey, 0]))
  const currentProviderCounts = new Map([...PROVIDERS.keys()].map((providerKey) => [providerKey, 0]))
  let defaultCount = 0
  const finalCheckTotals = new Set()
  const localSourceRunIds = new Set()
  const localPackageFiles = new Set()
  const localArtifactPaths = new Set()

  for (const [index, variant] of variants.entries()) {
    const label = `${manifestPath} variant ${index + 1}`
    assert(isObject(variant), `${label}: variant must be an object`)
    if (!isObject(variant)) continue
    assert(SOURCE_RUN_ID_PATTERN.test(variant.sourceRunId ?? ''), `${label}: sourceRunId is invalid`)
    assert(PROVIDERS.has(variant.providerKey), `${label}: providerKey is invalid`)
    const provider = PROVIDERS.get(variant.providerKey)
    assert(variant.serviceLabel === provider?.serviceLabel, `${label}: serviceLabel does not match providerKey`)
    assert(isNonBlank(variant.modelLabel), `${label}: modelLabel is required`)
    assert(isNonBlank(variant.modelSettings), `${label}: modelSettings is required`)
    assert(
      ['pathforge-labs-manual', 'pathforge-labs-automation'].includes(variant.operatorKind),
      `${label}: model-cohort runs must be developer-operated`,
    )
    assert(isNonBlank(variant.operatorLabel), `${label}: operatorLabel is required`)
    assert(variant.runRole === 'comparison-run', `${label}: model-cohort runs must be comparison-run`)
    assert(variant.qualityStatus === 'verified', `${label}: model-cohort runs must be verified`)
    assert(typeof variant.isCurrent === 'boolean', `${label}: isCurrent must be boolean`)
    assert(Number.isFinite(Date.parse(variant.capturedAt)), `${label}: capturedAt must be valid`)
    assert(Number.isInteger(variant.promptCount) && variant.promptCount >= 1, `${label}: promptCount must be a positive integer`)
    assert(
      Number.isInteger(variant.repairPromptCount) &&
        variant.repairPromptCount >= 0 &&
        variant.repairPromptCount < variant.promptCount,
      `${label}: repairPromptCount must be between zero and promptCount minus one`,
    )

    if (PROVIDERS.has(variant.providerKey)) {
      providerCounts.set(variant.providerKey, providerCounts.get(variant.providerKey) + 1)
      if (variant.isCurrent) {
        currentProviderCounts.set(
          variant.providerKey,
          currentProviderCounts.get(variant.providerKey) + 1,
        )
      }
    }
    if (variant.sourceRunId === manifest.defaultSourceRunId) defaultCount += 1

    assert(!ownership.sourceRuns.has(variant.sourceRunId), `${label}: source run collides with the launch cohort`)
    assert(!activeOwnership.sourceRuns.has(variant.sourceRunId), `${label}: source run is reused by an active manifest`)
    assert(!localSourceRunIds.has(variant.sourceRunId), `${label}: duplicate sourceRunId`)
    localSourceRunIds.add(variant.sourceRunId)
    activeOwnership.sourceRuns.add(variant.sourceRunId)

    assert(!ownership.packages.has(variant.packageFile), `${label}: package collides with the launch cohort`)
    assert(!activeOwnership.packages.has(variant.packageFile), `${label}: package is reused by an active manifest`)
    assert(!localPackageFiles.has(variant.packageFile), `${label}: duplicate packageFile`)
    localPackageFiles.add(variant.packageFile)
    activeOwnership.packages.add(variant.packageFile)

    assert(
      Array.isArray(variant.artifactVersionPaths) &&
        variant.artifactVersionPaths.length >= 1 &&
        variant.artifactVersionPaths.every((value) => isSafeRepoPath(value, 'public/artifacts/')) &&
        new Set(variant.artifactVersionPaths).size === variant.artifactVersionPaths.length,
      `${label}: artifactVersionPaths must contain unique public artifacts`,
    )
    assert(variant.artifactVersionPaths?.includes(variant.firstArtifactPath), `${label}: firstArtifactPath is not preserved`)
    assert(variant.artifactVersionPaths?.includes(variant.finalArtifactPath), `${label}: finalArtifactPath is not preserved`)
    for (const artifactPath of Array.isArray(variant.artifactVersionPaths)
      ? variant.artifactVersionPaths
      : []) {
      assert(!ownership.artifacts.has(artifactPath), `${label}: artifact collides with the launch cohort`)
      assert(!activeOwnership.artifacts.has(artifactPath), `${label}: artifact is reused by an active manifest`)
      assert(!localArtifactPaths.has(artifactPath), `${label}: duplicate artifact path`)
      localArtifactPaths.add(artifactPath)
      activeOwnership.artifacts.add(artifactPath)
    }

    validateMetrics(variant.firstPassMetrics, `${label}.firstPassMetrics`)
    const finalTotal = validateMetrics(variant.finalMetrics, `${label}.finalMetrics`, { final: true })
    if (Number.isInteger(finalTotal)) finalCheckTotals.add(finalTotal)
    validateSourceRunPackage({ manifest, variant, label })
  }

  assert(
    providerCounts.size === PROVIDERS.size &&
      [...PROVIDERS.keys()].every((providerKey) => providerCounts.get(providerKey) >= 1),
    `${manifestPath}: provider coverage must include OpenAI, Anthropic, and Google`,
  )
  for (const providerKey of PROVIDERS.keys()) {
    assert(
      currentProviderCounts.get(providerKey) === 1,
      `${manifestPath}: provider ${providerKey} must have exactly one current verified run`,
    )
    const providerHistory = variants
      .filter((variant) => isObject(variant) && variant.providerKey === providerKey)
      .sort((left, right) => (
        Date.parse(left.capturedAt) - Date.parse(right.capturedAt) ||
        left.sourceRunId.localeCompare(right.sourceRunId)
      ))
    for (const [index, variant] of providerHistory.entries()) {
      const expectedPredecessor = index === 0 ? undefined : providerHistory[index - 1].sourceRunId
      assert(
        variant.supersedesSourceRunId === expectedPredecessor,
        `${manifestPath}: ${variant.sourceRunId} must supersede the immediately prior ${providerKey} run`,
      )
    }
    assert(
      providerHistory.at(-1)?.isCurrent === true,
      `${manifestPath}: only the newest ${providerKey} run may be current`,
    )
  }
  assert(defaultCount === 1, `${manifestPath}: defaultSourceRunId must match exactly one variant`)
  const defaultVariant = variants.find(
    (variant) => isObject(variant) && variant.sourceRunId === manifest.defaultSourceRunId,
  )
  assert(defaultVariant?.isCurrent === true, `${manifestPath}: default run must be current`)
  assert(defaultVariant?.qualityStatus === 'verified', `${manifestPath}: default run must be verified`)
  assert(finalCheckTotals.size === 1, `${manifestPath}: every run must use the same final verification denominator`)
}

validateRuntimeRegistrationParity()

const immutableOwnership = collectImmutableOwnership()
const activeOwnership = {
  projects: new Set(),
  routes: new Set(),
  sourceRuns: new Set(),
  packages: new Set(),
  artifacts: new Set(),
}
for (const fileName of ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS) {
  validateActiveManifest(fileName, immutableOwnership, activeOwnership)
}

if (failures.length > 0) {
  console.error('Active post-launch model-variant guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Active post-launch model-variant guard passed (${ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS.length} active manifests).`,
)
