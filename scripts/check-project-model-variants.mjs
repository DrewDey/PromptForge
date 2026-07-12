import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { Script } from 'node:vm'

const MANIFEST_PATH = 'seed-runs/model-variants/calming-sleep-sound-mixer.json'
const CURATED_PROJECTS_PATH = 'seed-runs/curation/2026-07-10-accepted-projects.json'
const CANONICAL_PROJECT_ID = 'dc5e67c3-42d0-4823-ae23-586b7d3985cb'
const CANONICAL_ROUTE = '/calming-sleep-sound-mixer-demo'
const CANONICAL_TITLE = 'Calming Sleep-Sound Mixer'
const CANONICAL_OPENING_PROMPT = 'Build me a calming sleep-sound mixer I can save as one file and open in my browser. I want adjustable rain, fan, and brown-noise layers that are generated in the page instead of streamed, a few useful presets, and a sleep timer that fades out gently. It should feel reassuring and simple enough to use in the dark.'
const CANONICAL_OPENING_PROMPT_SHA256 = 'd662a84b6227a69891a41a71f94f429f1fcac921bfe004a94e39648e705384e1'
const CANONICAL_CONTRACT_SHA256 = '05549150158e48d0e849c6464ebbdd69dcef821e8b9e32911f72c36501b93089'
const PROVIDER_KEYS = ['openai', 'anthropic', 'google']
const PILOT_LAUNCH_SOURCE_RUN_IDS = [
  'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18',
  '5a9ad307-177d-4939-b3ed-cabecb236deb',
  '7d9524c0ede185b2',
]
const PROVIDER_SERVICE_LABELS = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  google: 'Gemini',
}
const PROVIDER_SOURCE_HOSTS = {
  openai: /(^|\.)chatgpt\.com$/i,
  anthropic: /(^|\.)claude\.ai$/i,
  google: /(^|\.)(?:gemini\.google\.com|share\.gemini\.google)$/i,
}
const PROVIDER_PUBLIC_SHARE_URLS = {
  openai: /^https:\/\/chatgpt\.com\/share\//,
  anthropic: /^https:\/\/claude\.ai\/share\//,
  google: /^https:\/\/share\.gemini\.google\//,
}
const SOURCE_RUN_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{16})$/i
const SHA256_PATTERN = /^[0-9a-f]{64}$/

const failures = []
const sourceCache = new Map()

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonBlankString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function readRequired(path) {
  if (sourceCache.has(path)) return sourceCache.get(path)
  if (!existsSync(path)) {
    fail(`${path}: missing required model-variant contract file`)
    sourceCache.set(path, '')
    return ''
  }
  const content = readFileSync(path, 'utf8')
  sourceCache.set(path, content)
  return content
}

function parseJson(path) {
  const content = readRequired(path)
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch (error) {
    fail(`${path}: invalid JSON: ${error.message}`)
    return null
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function mustInclude(path, needle, message) {
  const content = readRequired(path)
  if (content && !content.includes(needle)) fail(`${path}: ${message}`)
}

function mustNotInclude(path, needle, message) {
  const content = readRequired(path)
  if (content && content.includes(needle)) fail(`${path}: ${message}`)
}

function validTimestamp(value) {
  return isNonBlankString(value) && Number.isFinite(Date.parse(value))
}

function safeRepoPath(value, prefix) {
  return (
    isNonBlankString(value) &&
    value.startsWith(prefix) &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}

function uniqueStrings(values) {
  return Array.isArray(values) && values.every(isNonBlankString) && new Set(values).size === values.length
}

function normalizePackageArtifactVersion(entry) {
  if (typeof entry === 'string') return entry
  if (!isPlainObject(entry)) return null
  return entry.path ?? entry.artifact_path ?? null
}

function sortedUnique(values) {
  return [...new Set(values)].sort()
}

function sameStringSet(left, right) {
  return JSON.stringify(sortedUnique(left)) === JSON.stringify(sortedUnique(right))
}

function validateMetrics(metrics, label) {
  if (!isPlainObject(metrics)) {
    fail(`${label}: metrics must be an object`)
    return false
  }

  const required = [
    'qualityScore',
    'artifactReady',
    'hardGatesPassed',
    'functionalChecks',
    'consoleErrorCount',
    'horizontalOverflowPx',
    'notes',
  ]
  for (const field of required) {
    if (!Object.hasOwn(metrics, field)) fail(`${label}: missing ${field}`)
  }

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
    Array.isArray(metrics.notes) && metrics.notes.every(isNonBlankString),
    `${label}: notes must be an array of nonblank strings`,
  )

  const checks = metrics.functionalChecks
  assert(isPlainObject(checks), `${label}: functionalChecks must be an object`)
  if (isPlainObject(checks)) {
    assert(
      Number.isInteger(checks.passed) && Number.isInteger(checks.total) &&
        checks.total >= 8 && checks.passed >= 0 && checks.passed <= checks.total,
      `${label}: functionalChecks must contain valid passed/total integers with at least eight common checks`,
    )
  }

  return true
}

function metricHasObservableFailure(metrics) {
  if (!isPlainObject(metrics) || !isPlainObject(metrics.functionalChecks)) return true
  return (
    metrics.artifactReady !== true ||
    metrics.hardGatesPassed !== true ||
    metrics.functionalChecks.passed !== metrics.functionalChecks.total ||
    metrics.consoleErrorCount > 0 ||
    metrics.horizontalOverflowPx > 0
  )
}

function validateArtifact(path, label, { enforceFinalSafety = false } = {}) {
  if (!safeRepoPath(path, 'public/artifacts/')) {
    fail(`${label}: artifact path must be repo-relative under public/artifacts/`)
    return null
  }
  if (!existsSync(path)) {
    fail(`${label}: missing artifact file ${path}`)
    return null
  }

  const bytes = readFileSync(path)
  const html = bytes.toString('utf8')
  assert(bytes.length >= 1000, `${label}: artifact is suspiciously small (${bytes.length} bytes)`)
  assert(/<!doctype\s+html/i.test(html), `${label}: artifact must be a complete HTML document`)
  assert(/<meta\b[^>]*name=["']viewport["']/i.test(html), `${label}: artifact must declare a mobile viewport`)
  assert(/\b(?:AudioContext|webkitAudioContext)\b/.test(html), `${label}: artifact must generate sound with Web Audio`)
  for (const sound of ['rain', 'fan', 'brown']) {
    assert(new RegExp(`\\b${sound}\\b`, 'i').test(html), `${label}: artifact must implement ${sound}`)
  }
  assert(/\bpreset/i.test(html), `${label}: artifact must expose presets`)
  assert(/\btimer/i.test(html) && /\bfad(?:e|ing)/i.test(html), `${label}: artifact must implement a fading timer`)
  const alwaysForbiddenPatterns = [
    [/https?:\/\//i, 'remote URL'],
    [/<script\b[^>]*\bsrc\s*=/i, 'external script'],
    [/<link\b[^>]*\bhref\s*=/i, 'external linked resource'],
    [/@import\s/i, 'CSS import'],
    [/\bfetch\s*\(/i, 'fetch call'],
    [/\bXMLHttpRequest\b/i, 'XMLHttpRequest'],
    [/\bWebSocket\b/i, 'WebSocket'],
    [/\bEventSource\b/i, 'EventSource'],
    [/\bsendBeacon\s*\(/i, 'sendBeacon'],
    [/<(?:audio|video|iframe|object|embed)\b/i, 'embedded or prerecorded media'],
    [/\bnavigator\.mediaDevices\b/i, 'media-device access'],
    [/\beval\s*\(/i, 'eval'],
    [/\bnew\s+Function\s*\(/i, 'new Function'],
  ]
  const finalSafetyPatterns = [
    [/\bwindow\.open\s*\(/i, 'window.open'],
    [/\b(?:window\.)?alert\s*\(/i, 'alert dialog'],
    [/\b(?:window\.)?confirm\s*\(/i, 'confirm dialog'],
    [/\b(?:window\.)?prompt\s*\(/i, 'prompt dialog'],
    [/\bwindow\.print\s*\(/i, 'print dialog'],
    [/\bdocument\.write\s*\(/i, 'document.write'],
    [/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/i, 'dynamic HTML rendering'],
    [/<[^>]+\son[a-z]+\s*=/i, 'inline event handler'],
    [/\bjavascript\s*:/i, 'javascript URL'],
    [/\bdocument\.execCommand\b/i, 'document.execCommand'],
    [/letter-spacing\s*:\s*-/i, 'negative letter spacing'],
  ]
  for (const [pattern, name] of alwaysForbiddenPatterns) {
    if (pattern.test(html)) fail(`${label}: artifact contains forbidden ${name}`)
  }
  const safetyFindings = []
  for (const [pattern, name] of finalSafetyPatterns) {
    if (!pattern.test(html)) continue
    safetyFindings.push(name)
    if (enforceFinalSafety) fail(`${label}: final artifact contains forbidden ${name}`)
  }

  let scriptCount = 0
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(scriptPattern)) {
    const attributes = match[1]
    const source = match[2]
    if (/\bsrc\s*=/.test(attributes)) continue
    if (/type=["'](?:application\/json|application\/ld\+json)["']/i.test(attributes)) continue
    scriptCount += 1
    try {
      new Script(source, { filename: `${path}#script-${scriptCount}` })
    } catch (error) {
      fail(`${label}: inline script ${scriptCount} does not parse: ${error.message}`)
    }
  }
  assert(scriptCount >= 1, `${label}: artifact must contain runnable inline JavaScript`)

  return { bytes, html, sha256: sha256(bytes), safetyFindings }
}

function validateUiWiring() {
  mustInclude(
    'src/lib/project-model-variants.ts',
    "../../seed-runs/model-variants/calming-sleep-sound-mixer.json",
    'runtime registry must load the canonical model-variant manifest',
  )
  mustInclude('src/lib/project-model-variants.ts', 'loadSourceRunPackage', 'runtime registry must load exact source-run packages')
  mustInclude('src/lib/project-model-variants.ts', 'openingPromptExact', 'runtime registry must verify opening-prompt parity')
  mustInclude('src/lib/project-model-variants.ts', 'defaultCount !== 1', 'runtime registry must enforce one default run')
  mustInclude('src/lib/project-model-variants.ts', 'const ACTIVE_ADDITIONAL_VARIANT_SETS = [', 'post-launch cohorts must stay separate from the immutable launch registry')
  mustInclude('src/lib/project-model-variants.ts', 'const ALL_RAW_VARIANT_SETS = [', 'runtime registry must combine launch history with active additions')
  mustInclude('src/lib/project-model-variants.ts', 'variantSet.originMode === undefined', 'post-launch manifests must explicitly declare their origin')
  mustInclude('src/lib/project-model-variants.ts', 'resolveProjectModelVariantOriginMode(rawSet.originMode)', 'runtime registry must normalize legacy origin semantics')
  mustInclude('src/lib/project-model-variants.ts', 'assertProjectModelVariantOrigin({', 'runtime registry must validate origin-specific lineage')
  mustInclude('src/lib/project-model-variant-origin.mjs', "originMode === 'model-cohort'", 'model cohorts must have a dedicated origin contract')
  mustInclude('src/lib/project-model-variant-origin.mjs', 'cannot claim an original-author historical baseline', 'model cohorts must reject invented author history')
  mustInclude('scripts/project-model-variant-cohort-config.mjs', 'ACTIVE_ADDITIONAL_MODEL_VARIANT_MANIFESTS', 'post-launch manifest files must have a separate guarded registry')
  mustInclude('scripts/release-project-model-variants.mjs', 'ALL_MODEL_VARIANT_MANIFEST_PATHS', 'release tooling must accept every guarded post-launch manifest')
  mustInclude('scripts/check-project-model-variant-live-registry.mjs', 'ALL_MODEL_VARIANT_MANIFESTS', 'Vercel must verify post-launch manifests as well as the launch cohort')
  mustInclude('src/lib/project-model-variants.ts', 'resolveProjectModelVariant', 'runtime registry must resolve requested and default runs')
  mustInclude('src/lib/project-model-variants.ts', 'resolveProjectModelVariantComparison', 'runtime registry must resolve comparisons separately')

  const sharedRoute = 'src/components/PreparedModelVariantSourceRunPage.tsx'
  mustInclude(sharedRoute, 'getProjectModelVariantSet', 'shared route must load its variant set')
  mustInclude(sharedRoute, 'getPublishedProjectModelVariants', 'shared route must load published database records')
  mustInclude(sharedRoute, 'reconcileProjectModelVariantSet', 'shared route must reconcile database and release-manifest evidence')
  mustInclude(sharedRoute, 'resolveProjectModelVariant(', 'shared route must resolve the active run')
  mustInclude(sharedRoute, 'resolveProjectModelVariantComparison(', 'shared route must resolve the compare run')
  mustInclude(sharedRoute, 'sourceRunPackage={activeVariant.sourceRunPackage}', 'shared route must mount the active package')
  mustInclude(sharedRoute, 'modelVariantSet={variantSet}', 'shared route must render model-run controls')
  mustInclude(sharedRoute, 'compareModelVariant={compareVariant}', 'shared route must render comparison state')

  for (const route of [
    'calming-sleep-sound-mixer-demo',
    'booking-flow-handoff-simulator-demo',
    'first-principles-claim-ladder-game-demo',
    'tiny-festival-set-time-clash-game-demo',
    'rental-walkthrough-red-flag-scorecard-demo',
    'gym-mirror-progress-shot-consistency-studio-demo',
    'security-cam-anomaly-timeline-game-demo',
    't-shirt-print-alignment-press-game-demo',
  ]) {
    const routePath = `src/app/${route}/page.tsx`
    mustInclude(routePath, 'PreparedModelVariantSourceRunPage', 'canonical route must use the shared model-variant wrapper')
    mustInclude(routePath, 'searchParams', 'canonical route must pass run/compare query state')
  }

  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'Developer-operated reruns · same brief · not community forks', 'Labs UI must distinguish reruns from community forks')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'data-model-variant-selector', 'Labs UI must expose a stable selector marker')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'data-model-variant-menu', 'Labs UI must expose a compact model menu')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'data-model-variant-view', 'Labs UI must keep visible model-view actions')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'data-model-variant-compare', 'Labs UI must keep visible comparison actions')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', '<summary', 'Labs model selector must remain keyboard-operable with native details/summary')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', "key={`${activeVariant.sourceRunId}:${compareSourceRunId ?? ''}`}", 'Labs model selector must close its native menu after changing runs or comparisons')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'compareModelVariantRecords', 'Labs model selector must use the behavior-tested deterministic alphabetical collation')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'const orderedVariants = [...variantSet.variants].sort(compareModelVariantRecords)', 'Labs model selector must keep one fixed alphabetical order instead of promoting the active run')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'run.sourceRunId === variantSet.defaultSourceRunId', 'Labs model selector must link the default run directly to the canonical route')
  mustInclude('src/lib/model-variant-ui.mjs', 'Date.parse(right.capturedAt) - Date.parse(left.capturedAt)', 'same-label model history must sort newest-first without selection-based reordering')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'dateTime={variant.capturedAt}', 'same-label model history must expose a visible run date')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'conciseModelSettings', 'comparison cards must keep long historical settings compact')
  mustNotInclude('src/components/PathForgeLabsModelRuns.tsx', '...variantSet.variants.filter((variant) => variant.sourceRunId !== activeVariant.sourceRunId)', 'Labs model selector must not reorder by moving the active run first')
  mustNotInclude('src/components/PathForgeLabsModelRuns.tsx', 'finalMetrics.functionalChecks', 'Labs selector must not expose unexplained internal check counts')
  mustNotInclude('src/components/PathForgeLabsModelRuns.tsx', 'variant.promptCount', 'Labs selector must not expose prompt counts as selection metadata')
  mustNotInclude('src/components/PathForgeLabsModelRuns.tsx', 'grid grid-cols-3', 'Labs selector must not regress into a dashboard-style metric card')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', "new URLSearchParams({ run: run.sourceRunId })", 'Labs UI must use run query state')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', "params.set('compare', compare.sourceRunId)", 'Labs UI must use compare query state')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', "variant.qualityStatus === 'verified'", 'Labs UI must distinguish verified and known-issue runs')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'variantSet.defaultSourceRunId', 'Labs UI must label the resolved default run')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'variant.isCurrent', 'Labs UI must distinguish latest provider releases from preserved history')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'Viewing', 'Labs UI must distinguish the selected view from release currency')
  mustInclude('src/components/PathForgeLabsModelRuns.tsx', 'Same exact brief, two model runs', 'comparison UI must explain invariant prompt parity')

  mustInclude('src/components/PreparedSourceRunPage.tsx', 'const usesModelVariants = Boolean(modelVariantSet && activeModelVariant)', 'prepared model pages must distinguish exact model-run branch scope')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'usesModelVariants ? activeModelVariant?.sourceRunId : undefined', 'every model run must load only branches anchored to its exact source run')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'sourceModelVariantId={activeModelVariant?.databaseId}', 'new forks must retain the exact reconciled model-variant identity')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'const currentSourceRunId = activeModelVariant?.sourceRunId', 'prepared pages must derive the exact active source-run identity')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'sourceRunId={currentSourceRunId}', 'new forks must retain the exact active source-run identity')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'allowForks', 'every exact model run must expose response-level forking')
  mustInclude('src/components/PreparedSourceRunPage.tsx', '<ProjectEngagementBar projectId={project.id}', 'every model run must share canonical project engagement')
  mustInclude('src/components/PreparedSourceRunPage.tsx', '<ProjectCommunityPanel projectId={project.id} showForkLineage={false} />', 'every model run must share canonical discussion without duplicating its fork lineage')
  mustInclude('src/components/PreparedSourceRunPage.tsx', 'lg:flex-row lg:items-end lg:justify-between', 'model selector must use the compact title-row layout')
  mustNotInclude('src/components/PreparedSourceRunPage.tsx', 'ProjectCommunityPanel projectId={activeModelVariant', 'model runs must not create separate community identities')
  mustInclude('src/components/SourceRunShowcase.tsx', 'allowForks = true', 'shared showcase must accept explicit fork suppression')
  mustInclude('src/components/SourceRunShowcase.tsx', 'allowForks && projectId', 'shared showcase must suppress new-fork links for Labs reruns')

  mustInclude('src/lib/project-links.ts', CANONICAL_PROJECT_ID, 'canonical project must retain one route override')
  mustInclude('src/lib/project-links.ts', CANONICAL_ROUTE, 'canonical project route override must not change')

  mustInclude('src/lib/data/model-variants.ts', ".from('project_model_variants')", 'data layer must read model variants from their own table')
  mustInclude('src/lib/data/model-variants.ts', ".in('status', ['published', 'historical'])", 'public data reads must exclude draft/failed model variants')
  mustInclude('src/lib/data/model-variants.ts', 'SUPABASE_READ_TIMEOUT_MS', 'model-variant reads must retain a bounded timeout')
  mustInclude('src/lib/data/model-variants.ts', 'Promise<ProjectModelVariantPublicRecord[] | null>', 'local manifest fallback must be distinguishable from a configured empty database result')
  mustInclude('src/lib/data/model-variants.ts', 'isTransportFailure', 'checked manifest fallback must be limited to real transport failures')
  mustInclude('src/lib/data/model-variants.ts', 'Published model-variant evidence query failed', 'database permission or schema errors must fail closed as evidence errors')
  mustNotInclude('src/lib/data/model-variants.ts', 'readWithFallback', 'database evidence errors must not silently fall back to manifests')
  mustNotInclude('src/lib/data/model-variants.ts', 'Could not load published model variants', 'database contract errors must not be wrapped as transient read failures')
  mustInclude('src/lib/project-model-variants.ts', 'records.length === 0', 'configured empty database evidence must fail closed')
  mustInclude('src/lib/project-model-variants.ts', 'const providerHistory = variants', 'runtime manifests must preserve one chronological provider history')
  mustInclude('src/lib/project-model-variants.ts', 'must supersede the immediately prior', 'runtime manifests must reject skipped provider predecessors')
  mustInclude('src/lib/project-model-variants.ts', 'must finish after the', 'runtime manifests must reject backdated superseding runs')
  mustNotInclude('src/lib/project-model-variants.ts', 'record.is_default !== (variant.sourceRunId === variantSet.defaultSourceRunId)', 'a verified database default change must not be mistaken for immutable evidence drift')

  mustInclude('supabase/project-model-variants.sql', "provider_key IN ('openai', 'anthropic', 'google')", 'database provider set must match the manifest contract')
  mustInclude('supabase/project-model-variants.sql', 'idx_project_model_variants_current_provider', 'database must allow only one current published run per provider')
  mustInclude('supabase/project-model-variants.sql', 'WHERE is_current AND status = \'published\'', 'current-provider uniqueness must apply only to published rows')
  mustInclude('supabase/project-model-variants.sql', 'idx_project_model_variants_default', 'database must allow only one current default per project')
  mustInclude('supabase/project-model-variants.sql', 'AND quality_status = \'verified\'', 'database defaults must be verified')
  mustInclude('supabase/project-model-variants.sql', "quality_status = 'verified' OR run_role = 'historical_baseline'", 'known issues must be restricted to historical baselines')
  mustInclude('supabase/project-model-variants.sql', 'prevent_published_model_variant_evidence_update', 'published variant evidence must be immutable')
  mustInclude('supabase/project-model-variants.sql', 'publish_project_model_variant_release', 'model history releases must use one atomic database function')
  mustInclude('supabase/project-model-variants.sql', 'publish_project_model_variant_cohort', 'multi-project model releases must share one transaction')
  mustInclude('supabase/project-model-variants.sql', 'pg_advisory_xact_lock', 'model history releases must serialize per canonical project')
  mustInclude('supabase/project-model-variants.sql', 'Release payload omits an existing public model-variant row', 'atomic releases must preserve all existing public history')
  mustInclude('supabase/project-model-variants.sql', 'REVOKE INSERT, UPDATE, DELETE ON TABLE project_model_variants FROM anon, authenticated', 'direct authenticated table writes must not bypass the atomic release contract')
  mustInclude('supabase/project-model-variants.sql', 'valid_project_model_variant_artifact_paths', 'database writes must validate production artifact paths')
  mustInclude('supabase/project-model-variants.sql', 'valid_project_model_variant_metrics', 'database writes must validate immutable verification metrics')
  mustInclude('supabase/project-model-variants.sql', 'with at least eight checks', 'database metrics must retain one meaningful acceptance denominator')
  mustInclude('supabase/schema.sql', 'publish_project_model_variant_release', 'the full database schema must install the atomic model-variant release function')
  for (const sqlPath of ['supabase/project-model-variants.sql', 'supabase/schema.sql']) {
    mustInclude(sqlPath, 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER', 'service_role must release through the audited RPC instead of direct table writes')
    mustInclude(sqlPath, 'GRANT SELECT ON TABLE project_model_variants TO service_role;', 'service_role needs read-only preflight access to model variants')
    mustInclude(sqlPath, 'GRANT EXECUTE ON FUNCTION publish_project_model_variant_release(UUID, JSONB)\n  TO service_role;', 'single-project publication must be service-only')
    mustInclude(sqlPath, 'GRANT EXECUTE ON FUNCTION publish_project_model_variant_cohort(JSONB)\n  TO service_role;', 'cohort publication must be service-only')
    mustInclude(sqlPath, 'GRANT UPDATE (username, display_name, avatar_url, bio, updated_at)', 'profile owners must be limited to presentation fields')
    mustInclude(sqlPath, 'ON TABLE profiles TO authenticated;', 'authenticated profile updates must use the safe column grant')
    mustInclude(sqlPath, 'AND id <> target_variant_id;', 'default switching must clear the old row before setting the new row')
    mustInclude(sqlPath, 'AND NOT is_default;', 're-selecting the current default must be a no-op')
    mustInclude(sqlPath, 'retained_default_source_run_id', 'locked releases must preserve the database-selected default')
    mustInclude(sqlPath, 'Existing default has no current verified successor in the release payload.', 'default inheritance must fail closed when its provider has no valid successor')
    mustInclude(sqlPath, 'Release payload must request one current verified comparison as its default.', 'release callers must provide a valid checked default before database reconciliation')
  }
  mustInclude('src/lib/data/model-variants.ts', 'source_package_sha256, opening_prompt_sha256, comparison_contract_version, comparison_contract_sha256', 'public runtime reads must include immutable evidence hashes')
  mustInclude('src/lib/project-model-variants.ts', 'record.source_package_sha256 !== variant.packageSha256', 'runtime reconciliation must fail closed on package-hash drift')
  mustInclude('src/lib/project-model-variants.ts', 'expectedDatabaseModelSettings', 'runtime reconciliation must derive the exact structured model-settings record')
  mustInclude('src/lib/project-model-variants.ts', '!sameJson(record.model_settings, expectedDatabaseModelSettings(variant))', 'runtime reconciliation must fail closed on any structured model-settings drift')
  mustNotInclude('src/lib/project-model-variants.ts', 'normalizedManifestSettings.includes', 'runtime reconciliation must not accept partial model-settings records by substring')
  mustInclude('scripts/release-project-model-variants.mjs', ".rpc(\n    'publish_project_model_variant_cohort'", 'release tooling must call the atomic cohort function')
  mustInclude('scripts/release-project-model-variants.mjs', ".in('status', ['published', 'historical'])", 'release tooling must ignore retired or failed private rows when preserving public history')
  mustInclude('scripts/release-project-model-variants.mjs', 'RELEASE_SELECT', 'release idempotency must compare an explicit stable evidence projection')
  mustInclude('scripts/release-project-model-variants.mjs', '--emit-payload', 'checked initial releases must support an authenticated database-connector handoff')
  mustInclude('scripts/release-project-model-variants.mjs', 'verifyPublicSourceUrls', 'release tooling must confirm every visible source share is reachable')
  mustInclude('scripts/release-project-model-variants.mjs', 'history_appended', 'release tooling must support append-only future model history')
  mustInclude('scripts/release-project-model-variants.mjs', 'releasedByProject', 'release summaries must report the rows actually returned by the locked database transaction')
  mustInclude('scripts/release-project-model-variants.mjs', "['status', '--porcelain=v1', '--untracked-files=all']", 'database publication must be bound to a clean committed worktree')
  mustInclude('scripts/release-project-model-variants.mjs', 'assertReleaseCandidateUnchanged(releaseHead)', 'database publication must recheck the commit after slow release verification')
  mustInclude('scripts/release-project-model-variants.mjs', "EXPECTED_SUPABASE_PROJECT_REF = 'iccjwlwkaqnxifuxljla'", 'database publication must target the intended Supabase project')
  mustInclude('scripts/release-project-model-variants.mjs', 'preserveExistingReleaseDefault', 'idempotent release must preserve the operator-selected database default')
  mustNotInclude('scripts/release-project-model-variants.mjs', ".from('project_model_variants').insert", 'release tooling must not publish a provider set with non-atomic direct inserts')
  mustInclude('package.json', 'npm run check:model-variants && node scripts/check-project-model-variant-live-registry.mjs', 'Vercel builds must validate the local cohort before database-first publication')
  mustInclude('vercel.json', 'npm run build', 'Vercel must use the guarded npm build lifecycle')
  mustInclude('scripts/check-project-model-variant-live-registry.mjs', "process.env.VERCEL !== '1'", 'live registry verification must run only in the Vercel release environment')
  mustInclude('scripts/check-project-model-variant-live-registry.mjs', "EXPECTED_SUPABASE_PROJECT_REF = 'iccjwlwkaqnxifuxljla'", 'Vercel must verify the intended Supabase project')
  mustInclude('scripts/check-project-model-variant-live-registry.mjs', 'missing checked source run', 'Vercel must fail before build when database-first evidence is incomplete')
  mustInclude('scripts/check-project-model-variant-cohort.mjs', 'PRESERVABLE_INTERMEDIATE_FINDINGS', 'preserved intermediates must not retain network, arbitrary execution, or parse defects')
  const launchBuilder = readRequired('scripts/build-project-model-variant-manifests.mjs')
  const cohortPreflightIndex = launchBuilder.indexOf(
    'for (const spec of SPECS) assertLaunchBuilderCanWrite(spec)',
  )
  const cohortCommitIndex = launchBuilder.indexOf(
    'const pendingWrites = [...pendingPackageWrites, ...pendingManifestWrites]',
    Math.max(0, cohortPreflightIndex),
  )
  assert(
    cohortPreflightIndex >= 0 && cohortCommitIndex > cohortPreflightIndex,
    'scripts/build-project-model-variant-manifests.mjs: every manifest must pass append-history preflight before the cohort commit',
  )
  assert(
    (launchBuilder.match(/\bwriteJson\(/g) ?? []).length === 2,
    'scripts/build-project-model-variant-manifests.mjs: package and manifest writes must occur only through the deferred cohort commit',
  )
  mustInclude('scripts/build-project-model-variant-manifests.mjs', 'commitJsonWrites(pendingWrites)', 'launch builder must stage the validated cohort before replacing checked files')
  mustInclude('scripts/build-project-model-variant-manifests.mjs', 'renameSync(stagedWrite.absoluteTempPath, stagedWrite.absolutePath)', 'launch builder must atomically replace each staged file')
  mustNotInclude('supabase/project-model-variants.sql', 'INSERT INTO prompts', 'model variants must not create duplicate public projects')
}

validateUiWiring()

const manifest = parseJson(MANIFEST_PATH)
if (manifest) {
  assert(isPlainObject(manifest), `${MANIFEST_PATH}: top level must be an object`)
  if (isPlainObject(manifest)) {
    for (const field of [
      'schemaVersion',
      'canonicalProjectId',
      'canonicalRoute',
      'title',
      'defaultSourceRunId',
      'contract',
      'variants',
    ]) {
      if (!Object.hasOwn(manifest, field)) fail(`${MANIFEST_PATH}: missing required field ${field}`)
    }

    assert(manifest.schemaVersion === 1, `${MANIFEST_PATH}: schemaVersion must be 1`)
    assert(manifest.canonicalProjectId === CANONICAL_PROJECT_ID, `${MANIFEST_PATH}: canonicalProjectId must remain ${CANONICAL_PROJECT_ID}`)
    assert(manifest.canonicalRoute === CANONICAL_ROUTE, `${MANIFEST_PATH}: canonicalRoute must remain ${CANONICAL_ROUTE}`)
    assert(manifest.title === CANONICAL_TITLE, `${MANIFEST_PATH}: title must remain ${CANONICAL_TITLE}`)
    assert(SOURCE_RUN_ID_PATTERN.test(manifest.defaultSourceRunId ?? ''), `${MANIFEST_PATH}: defaultSourceRunId must be a stable source-run identifier`)

    const contract = manifest.contract
    assert(isPlainObject(contract), `${MANIFEST_PATH}: contract must be an object`)
    if (isPlainObject(contract)) {
      for (const field of [
        'version',
        'sha256',
        'openingPromptExact',
        'openingPromptSha256',
        'acceptanceCriteria',
        'adaptiveRepairPolicy',
      ]) {
        if (!Object.hasOwn(contract, field)) fail(`${MANIFEST_PATH}: contract missing ${field}`)
      }
      assert(isNonBlankString(contract.version), `${MANIFEST_PATH}: contract.version must be nonblank`)
      assert(contract.openingPromptExact === CANONICAL_OPENING_PROMPT, `${MANIFEST_PATH}: contract opening prompt must remain byte-for-byte invariant`)
      const openingHash = sha256(String(contract.openingPromptExact ?? ''))
      assert(openingHash === CANONICAL_OPENING_PROMPT_SHA256, `${MANIFEST_PATH}: computed opening prompt hash drifted`)
      assert(contract.openingPromptSha256 === openingHash, `${MANIFEST_PATH}: openingPromptSha256 does not match openingPromptExact`)
      assert(contract.openingPromptSha256 === CANONICAL_OPENING_PROMPT_SHA256, `${MANIFEST_PATH}: openingPromptSha256 must match the canonical pilot hash`)
      assert(
        Array.isArray(contract.acceptanceCriteria) && contract.acceptanceCriteria.length >= 8 &&
          contract.acceptanceCriteria.every(isNonBlankString) &&
          new Set(contract.acceptanceCriteria).size === contract.acceptanceCriteria.length,
        `${MANIFEST_PATH}: acceptanceCriteria must contain at least eight unique nonblank checks`,
      )
      assert(isNonBlankString(contract.adaptiveRepairPolicy), `${MANIFEST_PATH}: adaptiveRepairPolicy must be nonblank`)

      const contractHashPayload = JSON.stringify({
        version: contract.version,
        openingPromptExact: contract.openingPromptExact,
        acceptanceCriteria: contract.acceptanceCriteria,
        adaptiveRepairPolicy: contract.adaptiveRepairPolicy,
      })
      const contractHash = sha256(contractHashPayload)
      assert(contract.sha256 === contractHash, `${MANIFEST_PATH}: contract.sha256 does not match the canonical JSON payload`)
      assert(contractHash === CANONICAL_CONTRACT_SHA256, `${MANIFEST_PATH}: comparison contract content/order drifted from the approved pilot`)

      const criteriaText = Array.isArray(contract.acceptanceCriteria)
        ? contract.acceptanceCriteria.join('\n').toLowerCase()
        : ''
      for (const [pattern, label] of [
        [/one(?: complete)? self-contained html file|one[- ]file|single[- ]file/, 'one-file artifact'],
        [/offline|self-contained/, 'offline operation'],
        [/rain[\s\S]*fan[\s\S]*brown|brown[\s\S]*fan[\s\S]*rain/, 'three generated sound layers'],
        [/preset/, 'preset behavior'],
        [/timer[\s\S]*fad|fad[\s\S]*timer/, 'timer fade behavior'],
        [/390|mobile|responsive/, 'mobile verification'],
        [/reachable|accessib|keyboard|focus/, 'reachable controls'],
        [/external|remote|cdn|network/, 'offline dependency safety'],
      ]) {
        assert(pattern.test(criteriaText), `${MANIFEST_PATH}: acceptanceCriteria must cover ${label}`)
      }

      const repairText = String(contract.adaptiveRepairPolicy ?? '').toLowerCase()
      for (const [pattern, label] of [
        [/concrete|observed|measured/, 'concrete defects'],
        [/same (?:source )?session|same model/, 'same-session/model repair'],
        [/preserv/, 'artifact/evidence preservation'],
        [/stop|first.*pass|passes/, 'stop-on-pass behavior'],
        [/prompt|continuation|repair/, 'repair prompt accounting'],
      ]) {
        assert(pattern.test(repairText), `${MANIFEST_PATH}: adaptiveRepairPolicy must cover ${label}`)
      }
    }

    assert(Array.isArray(manifest.variants), `${MANIFEST_PATH}: variants must be an array`)
    const variants = Array.isArray(manifest.variants) ? manifest.variants : []
    assert(variants.length >= 3, `${MANIFEST_PATH}: pilot history must preserve at least three provider variants`)

    const providerCounts = new Map(PROVIDER_KEYS.map((key) => [key, 0]))
    const currentProviderCounts = new Map(PROVIDER_KEYS.map((key) => [key, 0]))
    const seenSourceRunIds = new Set()
    const seenPackageFiles = new Set()
    const seenArtifactPaths = new Map()
    const functionalTotals = new Set()
    const comparisonSourceRunIds = []
    let baseline = null
    let defaultVariant = null
    let historicalCount = 0
    let knownIssueCount = 0

    for (const [index, variant] of variants.entries()) {
      const label = `${MANIFEST_PATH} variants[${index}]`
      if (!isPlainObject(variant)) {
        fail(`${label}: variant must be an object`)
        continue
      }
      for (const field of [
        'sourceRunId',
        'providerKey',
        'serviceLabel',
        'modelLabel',
        'modelSettings',
        'operatorKind',
        'operatorLabel',
        'runRole',
        'qualityStatus',
        'isCurrent',
        'capturedAt',
        'promptCount',
        'repairPromptCount',
        'packageFile',
        'packageSha256',
        'firstArtifactPath',
        'finalArtifactPath',
        'artifactVersionPaths',
        'firstPassMetrics',
        'finalMetrics',
      ]) {
        if (!Object.hasOwn(variant, field)) fail(`${label}: missing required field ${field}`)
      }

      assert(SOURCE_RUN_ID_PATTERN.test(variant.sourceRunId ?? ''), `${label}: sourceRunId must be a stable UUID or provider run identifier`)
      if (seenSourceRunIds.has(variant.sourceRunId)) fail(`${label}: duplicate sourceRunId ${variant.sourceRunId}`)
      seenSourceRunIds.add(variant.sourceRunId)

      assert(PROVIDER_KEYS.includes(variant.providerKey), `${label}: invalid providerKey ${variant.providerKey}`)
      if (providerCounts.has(variant.providerKey)) providerCounts.set(variant.providerKey, providerCounts.get(variant.providerKey) + 1)
      assert(variant.serviceLabel === PROVIDER_SERVICE_LABELS[variant.providerKey], `${label}: serviceLabel must be ${PROVIDER_SERVICE_LABELS[variant.providerKey]}`)
      assert(isNonBlankString(variant.modelLabel), `${label}: modelLabel must be nonblank`)
      assert(isNonBlankString(variant.modelSettings), `${label}: modelSettings must be nonblank`)
      assert(
        ['original-author', 'pathforge-labs-manual', 'pathforge-labs-automation'].includes(variant.operatorKind),
        `${label}: invalid operatorKind`,
      )
      assert(isNonBlankString(variant.operatorLabel), `${label}: operatorLabel must be nonblank`)
      assert(['historical-baseline', 'comparison-run'].includes(variant.runRole), `${label}: invalid runRole`)
      assert(['verified', 'known-issue'].includes(variant.qualityStatus), `${label}: invalid qualityStatus`)
      assert(typeof variant.isCurrent === 'boolean', `${label}: isCurrent must be boolean`)
      if (variant.isCurrent && currentProviderCounts.has(variant.providerKey)) {
        currentProviderCounts.set(
          variant.providerKey,
          currentProviderCounts.get(variant.providerKey) + 1,
        )
      }
      assert(validTimestamp(variant.capturedAt), `${label}: capturedAt must be a valid timestamp`)
      assert(Number.isInteger(variant.promptCount) && variant.promptCount >= 1, `${label}: promptCount must be positive`)
      assert(
        Number.isInteger(variant.repairPromptCount) && variant.repairPromptCount >= 0 &&
          variant.repairPromptCount < variant.promptCount,
        `${label}: repairPromptCount must be non-negative and smaller than promptCount`,
      )
      assert(SHA256_PATTERN.test(variant.packageSha256 ?? ''), `${label}: packageSha256 must be lowercase SHA-256`)
      assert(uniqueStrings(variant.artifactVersionPaths), `${label}: artifactVersionPaths must be unique nonblank strings`)
      assert(
        Array.isArray(variant.artifactVersionPaths) &&
          variant.artifactVersionPaths.length >= 1 &&
          variant.artifactVersionPaths.length <= variant.promptCount,
        `${label}: artifact versions must preserve every real file without inventing transcript-only versions`,
      )
      if (Array.isArray(variant.artifactVersionPaths) && variant.artifactVersionPaths.length > 0) {
        assert(variant.artifactVersionPaths[0] === variant.firstArtifactPath, `${label}: firstArtifactPath must be the first preserved version`)
        assert(variant.artifactVersionPaths.at(-1) === variant.finalArtifactPath, `${label}: finalArtifactPath must be the last preserved version`)
      }
      if (variant.repairPromptCount === 0) {
        assert(variant.firstArtifactPath === variant.finalArtifactPath, `${label}: a one-shot run must use one first/final artifact`)
      } else {
        assert(variant.firstArtifactPath !== variant.finalArtifactPath, `${label}: a repaired run must preserve distinct first and final artifacts`)
      }

      validateMetrics(variant.firstPassMetrics, `${label}.firstPassMetrics`)
      validateMetrics(variant.finalMetrics, `${label}.finalMetrics`)
      if (isPlainObject(variant.firstPassMetrics?.functionalChecks)) functionalTotals.add(variant.firstPassMetrics.functionalChecks.total)
      if (isPlainObject(variant.finalMetrics?.functionalChecks)) functionalTotals.add(variant.finalMetrics.functionalChecks.total)
      if (Number.isFinite(variant.firstPassMetrics?.qualityScore) && Number.isFinite(variant.finalMetrics?.qualityScore)) {
        assert(variant.finalMetrics.qualityScore >= variant.firstPassMetrics.qualityScore, `${label}: final quality score must not regress`)
      }
      if (isPlainObject(variant.firstPassMetrics?.functionalChecks) && isPlainObject(variant.finalMetrics?.functionalChecks)) {
        assert(
          variant.finalMetrics.functionalChecks.passed >= variant.firstPassMetrics.functionalChecks.passed,
          `${label}: final functional checks must not regress`,
        )
      }

      if (variant.runRole === 'historical-baseline') {
        historicalCount += 1
        baseline = variant
        assert(variant.isCurrent === false, `${label}: historical baseline cannot be current`)
        assert(variant.providerKey === 'openai', `${label}: historical baseline must be the original OpenAI run`)
        assert(variant.operatorKind === 'original-author', `${label}: historical baseline must retain original-author provenance`)
        assert(variant.qualityStatus === 'known-issue', `${label}: historical baseline must disclose its known preset/master issue`)
        assert(variant.repairPromptCount === 0, `${label}: historical baseline must remain the immutable one-shot run`)
        assert(variant.sourceRunId !== manifest.defaultSourceRunId, `${label}: known-issue historical baseline must not be the default`)
        const firstComparableMetrics = { ...variant.firstPassMetrics, notes: [] }
        const finalComparableMetrics = { ...variant.finalMetrics, notes: [] }
        assert(
          JSON.stringify(firstComparableMetrics) === JSON.stringify(finalComparableMetrics),
          `${label}: unrepaired historical baseline must keep identical measured first/final metrics`,
        )
      } else {
        comparisonSourceRunIds.push(variant.sourceRunId)
        assert(variant.operatorKind !== 'original-author', `${label}: Labs comparison runs must use a Labs operator kind`)
        assert(variant.qualityStatus === 'verified', `${label}: Labs comparison runs must finish verified`)
      }

      if (variant.qualityStatus === 'known-issue') {
        knownIssueCount += 1
        assert(variant.runRole === 'historical-baseline', `${label}: known-issue status is reserved for historical baselines`)
        assert(metricHasObservableFailure(variant.finalMetrics), `${label}: known-issue metrics must expose a measurable remaining defect`)
        const issueNotes = Array.isArray(variant.finalMetrics?.notes) ? variant.finalMetrics.notes.join(' ').toLowerCase() : ''
        assert(issueNotes.includes('preset') && issueNotes.includes('master'), `${label}: known issue must name the preset/master mismatch`)
      } else if (variant.qualityStatus === 'verified') {
        assert(variant.finalMetrics?.artifactReady === true, `${label}: verified final artifact must be ready`)
        assert(variant.finalMetrics?.hardGatesPassed === true, `${label}: verified final artifact must pass hard gates`)
        assert(
          variant.finalMetrics?.functionalChecks?.passed === variant.finalMetrics?.functionalChecks?.total,
          `${label}: verified final artifact must pass every common functional check`,
        )
        assert(variant.finalMetrics?.consoleErrorCount === 0, `${label}: verified final artifact must have zero console errors`)
        assert(variant.finalMetrics?.horizontalOverflowPx === 0, `${label}: verified final artifact must have zero measured horizontal overflow`)
        assert(variant.finalMetrics?.qualityScore >= 90, `${label}: verified Labs variants must meet the A+ score floor of 90`)
        if (variant.repairPromptCount > 0) {
          assert(metricHasObservableFailure(variant.firstPassMetrics), `${label}: a repair prompt requires a recorded first-pass defect`)
        }
      }

      if (variant.sourceRunId === manifest.defaultSourceRunId) defaultVariant = variant

      for (const forbiddenField of ['projectId', 'promptId', 'href', 'route', 'promptFamilyId', 'forkSource']) {
        if (Object.hasOwn(variant, forbiddenField)) fail(`${label}: ${forbiddenField} would duplicate project/fork identity`)
      }

      assert(
        variant.runRole === 'historical-baseline'
          ? variant.packageFile === 'sleep-sound-mixer-chatgpt-56-luna-extra-high-source-run.json'
          : safeRepoPath(variant.packageFile, 'model-variants/'),
        `${label}: packageFile is outside the allowed baseline/Labs package locations`,
      )
      if (seenPackageFiles.has(variant.packageFile)) fail(`${label}: duplicate packageFile ${variant.packageFile}`)
      seenPackageFiles.add(variant.packageFile)

      const resolvedPackageFile = `seed-runs/${variant.packageFile}`
      const pkg = parseJson(resolvedPackageFile)
      if (!pkg || !isPlainObject(pkg)) continue
      const packageBytes = readFileSync(resolvedPackageFile)
      assert(sha256(packageBytes) === variant.packageSha256, `${label}: packageSha256 does not match ${resolvedPackageFile}`)
      assert(pkg.provider === variant.serviceLabel, `${resolvedPackageFile}: provider must match manifest serviceLabel`)
      assert(pkg.model === variant.modelLabel, `${resolvedPackageFile}: model must match manifest modelLabel`)
      assert(
        typeof pkg.model_settings === 'string' &&
          (pkg.model_settings === variant.modelSettings || pkg.model_settings.includes(variant.modelSettings)),
        `${resolvedPackageFile}: model_settings must preserve manifest modelSettings`,
      )
      assert(isNonBlankString(pkg.source_url), `${resolvedPackageFile}: source_url must be present`)
      if (isNonBlankString(pkg.source_url)) {
        try {
          const sourceUrl = new URL(pkg.source_url)
          assert(sourceUrl.protocol === 'https:', `${resolvedPackageFile}: source_url must use HTTPS`)
          assert(PROVIDER_SOURCE_HOSTS[variant.providerKey]?.test(sourceUrl.hostname), `${resolvedPackageFile}: source_url host does not match ${variant.providerKey}`)
          assert(PROVIDER_PUBLIC_SHARE_URLS[variant.providerKey]?.test(sourceUrl.href), `${resolvedPackageFile}: source_url must be a public provider share URL`)
        } catch {
          fail(`${resolvedPackageFile}: source_url must be a valid URL`)
        }
      }
      assert(validTimestamp(pkg.run_started_at), `${resolvedPackageFile}: run_started_at must be valid`)
      assert(validTimestamp(pkg.run_finished_at), `${resolvedPackageFile}: run_finished_at must be valid`)
      if (validTimestamp(pkg.run_started_at) && validTimestamp(pkg.run_finished_at)) {
        assert(Date.parse(pkg.run_finished_at) >= Date.parse(pkg.run_started_at), `${resolvedPackageFile}: run_finished_at precedes run_started_at`)
        assert(pkg.run_finished_at === variant.capturedAt, `${resolvedPackageFile}: capturedAt must equal run_finished_at`)
      }
      assert(pkg.prompt_count === variant.promptCount, `${resolvedPackageFile}: prompt_count must match manifest promptCount`)
      assert(Array.isArray(pkg.steps) && pkg.steps.length === variant.promptCount, `${resolvedPackageFile}: steps must match manifest promptCount`)
      const packageSourceRunId = pkg.source_run_id ?? pkg.source_run_submission_id ?? pkg.pathforge_pending_id
      assert(packageSourceRunId === variant.sourceRunId, `${resolvedPackageFile}: package source-run identity must match manifest sourceRunId`)
      assert(pkg.final_artifact_path === variant.finalArtifactPath, `${resolvedPackageFile}: final_artifact_path must match manifest finalArtifactPath`)
      assert(SHA256_PATTERN.test(pkg.artifact_sha256 ?? ''), `${resolvedPackageFile}: artifact_sha256 must be present and lowercase SHA-256`)

      const packageVersionPaths = Array.isArray(pkg.artifact_versions)
        ? pkg.artifact_versions.map(normalizePackageArtifactVersion).filter(isNonBlankString)
        : []
      assert(
        sameStringSet(packageVersionPaths, variant.artifactVersionPaths ?? []),
        `${resolvedPackageFile}: artifact_versions must exactly match manifest artifactVersionPaths`,
      )
      assert(
        (pkg.repair_prompt_count ?? 0) === variant.repairPromptCount,
        `${resolvedPackageFile}: repair_prompt_count must match the manifest`,
      )
      if (pkg.continuation_reasons !== undefined) {
        assert(
          Array.isArray(pkg.continuation_reasons) && pkg.continuation_reasons.length === variant.repairPromptCount &&
            pkg.continuation_reasons.every(isNonBlankString),
          `${resolvedPackageFile}: continuation_reasons must account for every repair prompt when present`,
        )
      }

      const steps = Array.isArray(pkg.steps) ? pkg.steps : []
      const stepArtifactPaths = []
      for (const [stepIndex, step] of steps.entries()) {
        const stepLabel = `${resolvedPackageFile} step ${stepIndex + 1}`
        assert(isPlainObject(step), `${stepLabel}: step must be an object`)
        if (!isPlainObject(step)) continue
        assert(step.step_number === stepIndex + 1, `${stepLabel}: step_number must be sequential`)
        assert(isNonBlankString(step.prompt_exact), `${stepLabel}: prompt_exact must be nonblank`)
        assert(isNonBlankString(step.response_exact), `${stepLabel}: response_exact must preserve exact visible text`)
        if (isNonBlankString(step.artifact_version_path)) {
          stepArtifactPaths.push(step.artifact_version_path)
          assert(
            Array.isArray(step.generated_files) && step.generated_files.includes(step.artifact_version_path),
            `${stepLabel}: generated_files must include its artifact_version_path`,
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
      }
      assert(
        sameStringSet(stepArtifactPaths, variant.artifactVersionPaths ?? []),
        `${resolvedPackageFile}: real step artifacts must match artifactVersionPaths`,
      )
      assert(steps[0]?.prompt_exact === CANONICAL_OPENING_PROMPT, `${resolvedPackageFile}: first prompt must match the invariant opener byte-for-byte`)
      assert(steps[0]?.artifact_version_path === variant.firstArtifactPath, `${resolvedPackageFile}: first prompt must map to firstArtifactPath`)
      assert(steps.at(-1)?.artifact_version_path === variant.finalArtifactPath, `${resolvedPackageFile}: final repair step must map to finalArtifactPath`)

      for (const forbiddenKey of ['project_id', 'prompt_id', 'prompt_family_id', 'fork_source', 'fork_source_project_id']) {
        assert(!Object.hasOwn(pkg, forbiddenKey), `${resolvedPackageFile}: ${forbiddenKey} would turn a Labs rerun into a duplicate project/fork`)
      }

      if (variant.runRole === 'comparison-run') {
        const provenance = pkg.operator_provenance
        assert(isPlainObject(provenance), `${resolvedPackageFile}: Labs package must include operator_provenance`)
        if (isPlainObject(provenance)) {
          assert(
            provenance.kind === variant.operatorKind.replaceAll('-', '_'),
            `${resolvedPackageFile}: operator provenance kind must match the manifest`,
          )
          assert(provenance.label === variant.operatorLabel, `${resolvedPackageFile}: operator provenance label must match the manifest`)
          assert(provenance.canonical_project_id === CANONICAL_PROJECT_ID, `${resolvedPackageFile}: provenance must link to the canonical project`)
          assert(provenance.canonical_route === CANONICAL_ROUTE, `${resolvedPackageFile}: provenance must preserve the canonical route`)
          assert(provenance.comparison_contract_version === contract?.version, `${resolvedPackageFile}: provenance contract version must match the manifest`)
          assert(provenance.comparison_contract_sha256 === CANONICAL_CONTRACT_SHA256, `${resolvedPackageFile}: provenance contract hash must match the approved pilot`)
          assert(provenance.opening_prompt_sha256 === CANONICAL_OPENING_PROMPT_SHA256, `${resolvedPackageFile}: provenance opening-prompt hash must match the approved pilot`)
          assert(provenance.ordinary_fork === false, `${resolvedPackageFile}: Labs reruns must explicitly disable ordinary-fork provenance`)
        }

        const comparisonBasis = pkg.comparison_basis
        assert(isPlainObject(comparisonBasis), `${resolvedPackageFile}: Labs package must include comparison_basis`)
        if (isPlainObject(comparisonBasis)) {
          assert(comparisonBasis.opening_prompt_exact === CANONICAL_OPENING_PROMPT, `${resolvedPackageFile}: comparison basis must preserve the exact opener`)
          assert(
            JSON.stringify(comparisonBasis.acceptance_criteria) === JSON.stringify(contract?.acceptanceCriteria),
            `${resolvedPackageFile}: comparison acceptance criteria must match the manifest exactly`,
          )
          assert(comparisonBasis.adaptive_repair_policy === contract?.adaptiveRepairPolicy, `${resolvedPackageFile}: adaptive repair policy must match the manifest exactly`)
          const independenceNote = String(comparisonBasis.independence_note ?? '').toLowerCase()
          assert(
            independenceNote.includes('fresh session') &&
              independenceNote.includes('not shown') &&
              independenceNote.includes('another provider'),
            `${resolvedPackageFile}: independence note must confirm a fresh uncontaminated provider run`,
          )
        }
      }

      const artifactVersionNotes = Array.isArray(pkg.artifact_version_notes)
        ? pkg.artifact_version_notes
        : []
      if (variant.runRole === 'comparison-run') {
        assert(
          artifactVersionNotes.length === variant.artifactVersionPaths.length,
          `${resolvedPackageFile}: every Labs artifact version must have a hash/size note`,
        )
      }
      const artifactNotesByPath = new Map(
        artifactVersionNotes
          .filter(isPlainObject)
          .map((note) => [note.path, note]),
      )

      for (const artifactPath of variant.artifactVersionPaths ?? []) {
        if (seenArtifactPaths.has(artifactPath)) {
          fail(`${label}: artifact ${artifactPath} is already owned by ${seenArtifactPaths.get(artifactPath)}`)
        } else {
          seenArtifactPaths.set(artifactPath, variant.sourceRunId)
        }
        const artifact = validateArtifact(
          artifactPath,
          `${label} ${artifactPath}`,
          { enforceFinalSafety: artifactPath === variant.finalArtifactPath },
        )
        const artifactNote = artifactNotesByPath.get(artifactPath)
        if (artifactNote && artifact) {
          assert(SHA256_PATTERN.test(artifactNote.sha256 ?? ''), `${resolvedPackageFile}: ${artifactPath} note must include SHA-256`)
          assert(artifactNote.sha256 === artifact.sha256, `${resolvedPackageFile}: ${artifactPath} version hash does not match file bytes`)
          assert(artifactNote.bytes === artifact.bytes.length, `${resolvedPackageFile}: ${artifactPath} byte count does not match file bytes`)
          assert(Number.isInteger(artifactNote.lines) && artifactNote.lines > 0, `${resolvedPackageFile}: ${artifactPath} line count must be positive`)
          assert(isNonBlankString(artifactNote.disposition), `${resolvedPackageFile}: ${artifactPath} disposition must be nonblank`)
        }
        if (artifact && artifactPath !== variant.finalArtifactPath && artifact.safetyFindings.length > 0) {
          assert(
            variant.firstPassMetrics?.hardGatesPassed === false,
            `${resolvedPackageFile}: preserved unsafe first-pass artifact requires hardGatesPassed=false`,
          )
          const recordedDefects = [
            ...(Array.isArray(variant.firstPassMetrics?.notes) ? variant.firstPassMetrics.notes : []),
            artifactNote?.disposition ?? '',
          ].join(' ').toLowerCase()
          for (const finding of artifact.safetyFindings) {
            const expectedTerm = finding === 'inline event handler' ? 'inline' : finding.toLowerCase()
            assert(recordedDefects.includes(expectedTerm), `${resolvedPackageFile}: ${artifactPath} must disclose preserved ${finding}`)
          }
        }
        if (artifact && artifactPath === variant.finalArtifactPath) {
          assert(artifact.sha256 === pkg.artifact_sha256, `${resolvedPackageFile}: artifact_sha256 does not match the final artifact bytes`)
        }
      }
    }

    for (const providerKey of PROVIDER_KEYS) {
      assert(providerCounts.get(providerKey) >= 1, `${MANIFEST_PATH}: provider set must preserve at least one ${providerKey} run`)
      assert(currentProviderCounts.get(providerKey) <= 1, `${MANIFEST_PATH}: provider set allows at most one current ${providerKey} run`)
    }
    for (const launchSourceRunId of PILOT_LAUNCH_SOURCE_RUN_IDS) {
      assert(seenSourceRunIds.has(launchSourceRunId), `${MANIFEST_PATH}: pilot launch run ${launchSourceRunId} must remain inspectable`)
    }
    assert(functionalTotals.size === 1, `${MANIFEST_PATH}: every first/final run must use the same functional-check denominator`)
    assert(historicalCount === 1, `${MANIFEST_PATH}: exactly one run must be the historical baseline`)
    assert(knownIssueCount === 1, `${MANIFEST_PATH}: exactly one disclosed known-issue run is expected`)
    assert(comparisonSourceRunIds.length >= 2, `${MANIFEST_PATH}: at least two runs must remain Labs comparisons`)
    assert(defaultVariant, `${MANIFEST_PATH}: defaultSourceRunId must match exactly one variant`)
    if (defaultVariant) {
      assert(defaultVariant.runRole === 'comparison-run', `${MANIFEST_PATH}: default must be a Labs comparison run`)
      assert(defaultVariant.isCurrent === true, `${MANIFEST_PATH}: default must be a current provider run`)
      assert(defaultVariant.qualityStatus === 'verified', `${MANIFEST_PATH}: default must be verified`)
      assert(defaultVariant.finalMetrics?.artifactReady === true, `${MANIFEST_PATH}: default final artifact must be ready`)
      assert(defaultVariant.finalMetrics?.hardGatesPassed === true, `${MANIFEST_PATH}: default final artifact must pass hard gates`)
    }

    const curated = parseJson(CURATED_PROJECTS_PATH)
    if (curated && Array.isArray(curated.projects)) {
      const canonicalRows = curated.projects.filter((project) => project.projectId === CANONICAL_PROJECT_ID)
      assert(canonicalRows.length === 1, `${CURATED_PROJECTS_PATH}: canonical project must appear exactly once`)
      if (canonicalRows[0] && baseline) {
        assert(canonicalRows[0].sourceRunId === baseline.sourceRunId, `${CURATED_PROJECTS_PATH}: canonical project must keep the historical baseline source run`)
        assert(canonicalRows[0].href === CANONICAL_ROUTE, `${CURATED_PROJECTS_PATH}: canonical project route must not change`)
      }
      for (const sourceRunId of comparisonSourceRunIds) {
        assert(
          !curated.projects.some((project) => project.sourceRunId === sourceRunId),
          `${CURATED_PROJECTS_PATH}: Labs comparison ${sourceRunId} must not become a duplicate public project`,
        )
      }
    }

    for (const registryPath of [
      'src/lib/curated-source-run-showcases.ts',
      'src/lib/pending-source-run-showcases.ts',
      'src/lib/featured-projects.ts',
      'src/lib/project-links.ts',
    ]) {
      const registry = readRequired(registryPath)
      for (const sourceRunId of comparisonSourceRunIds) {
        if (registry.includes(sourceRunId)) {
          fail(`${registryPath}: Labs comparison ${sourceRunId} must not be registered as a separate project/fork`)
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Project model-variant guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Project model-variant guard passed.')
