#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { loadCheckedDedicatedSourceRunRoutes } from './source-run-publication-registry.mjs'

const SHARED_TRUTH_PATH = 'src/lib/public-project-truth.ts'
const SOURCE_EVIDENCE_PATH = 'src/lib/public-source-evidence.ts'
const SOURCE_EVIDENCE_CORE_PATH = 'src/lib/public-source-evidence-core.mjs'
const PREPARED_PROJECTS_PATH = 'src/lib/prepared-showcase-projects.ts'
const PREPARED_PAGE_PATH = 'src/components/PreparedSourceRunPage.tsx'
const SOURCE_RUN_SHOWCASE_PATH = 'src/components/SourceRunShowcase.tsx'
const PUBLIC_TRUTH_SUMMARY_PATH = 'src/components/PublicTruthSummary.tsx'
const PROJECT_FORK_TYPES_PATH = 'src/lib/project-forks.ts'
const RECOVERED_PAGE_PATH = 'src/app/recovered-source-runs/[slug]/page.tsx'
const PROJECT_LINKS_PATH = 'src/lib/project-links.ts'
const PROFILE_TYPES_PATH = 'src/lib/types.ts'
const PUBLIC_DATA_PATH = 'src/lib/data.ts'
const PUBLIC_PROFILE_DATA_PATH = 'src/lib/data/public-profiles.ts'
const DISCOVERY_PATH = 'src/lib/path-discovery.ts'
const IDENTITY_PROJECTION_PATH = 'src/lib/prepared-project-model-identities.json'
const MODEL_VARIANT_MANIFEST_DIRECTORY = 'seed-runs/model-variants'

const SNAKE_CANONICAL_PROJECT_ID = '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f901'
const SNAKE_LEGACY_PROJECT_ID = 'snake-gpt55-pro-oneshot'
const SNAKE_ROUTE = '/snake-demo'

const PUBLIC_WORDING_PATHS = [
  'src/components/SourceRunShowcase.tsx',
  'src/components/PathForgeLabsModelRuns.tsx',
  'src/components/ProjectForkBuildPath.tsx',
  'src/components/PreparedSourceRunPage.tsx',
  'src/components/BuilderIdentity.tsx',
  'src/components/BuilderWorkCard.tsx',
  'src/components/discovery/InteractiveBuildPathCard.tsx',
  'src/components/home/HomeHero.tsx',
  'src/app/prompt/[id]/page.tsx',
  'src/app/my-forge/page.tsx',
]

const SOURCE_ACCESS_STATES = [
  'public_exact',
  'public_partial',
  'provider_private',
  'unconfirmed',
]

const failures = []

function fail(message) {
  failures.push(message)
}

function read(filePath) {
  if (!existsSync(filePath)) {
    fail(`${filePath}: missing required public-truth contract file`)
    return ''
  }
  return readFileSync(filePath, 'utf8')
}

function readJson(filePath) {
  const source = read(filePath)
  if (!source) return null
  try {
    return JSON.parse(source)
  } catch (error) {
    fail(`${filePath}: invalid JSON: ${error.message}`)
    return null
  }
}

function mustMatch(filePath, source, pattern, message) {
  if (source && !pattern.test(source)) fail(`${filePath}: ${message}`)
}

function mustNotMatch(filePath, source, pattern, message) {
  if (source && pattern.test(source)) fail(`${filePath}: ${message}`)
}

function packagePath(packageFile) {
  const normalized = String(packageFile ?? '')
    .replace(/\\/g, '/')
    .replace(/^seed-runs\//, '')
  if (
    !normalized ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null
  }
  return `seed-runs/${normalized}`
}

function sourceRunPackageId(sourcePackage) {
  return sourcePackage?.source_run_id ??
    sourcePackage?.source_run_submission_id ??
    sourcePackage?.pathforge_pending_id ??
    null
}

function checkSharedTruthContract() {
  const truth = read(SHARED_TRUTH_PATH)
  const evidenceWrapper = read(SOURCE_EVIDENCE_PATH)
  const evidenceCore = read(SOURCE_EVIDENCE_CORE_PATH)
  const combined = `${truth}\n${evidenceWrapper}\n${evidenceCore}`

  if (!evidenceCore.startsWith('// @ts-check\n')) {
    fail(`${SOURCE_EVIDENCE_CORE_PATH}: runtime evidence core must keep // @ts-check on the first line`)
  }

  mustMatch(
    SHARED_TRUTH_PATH,
    truth,
    /export\s+(?:function|const)\s+derivePublicProjectTruth\b/,
    'must export the shared derivePublicProjectTruth presenter',
  )
  mustMatch(
    SOURCE_EVIDENCE_PATH,
    evidenceWrapper,
    /export\s+function\s+resolvePublicSourceEvidence\b/,
    'must export the explicit source-evidence resolver',
  )
  mustMatch(
    SOURCE_EVIDENCE_PATH,
    evidenceWrapper,
    /resolvePublicSourceEvidenceCore\s*\(/,
    'typed application wrapper must delegate to the runtime evidence core',
  )

  for (const state of SOURCE_ACCESS_STATES) {
    mustMatch(
      `${SHARED_TRUTH_PATH} + ${SOURCE_EVIDENCE_PATH}`,
      combined,
      new RegExp(`['\"]${state}['\"]`),
      `must preserve the canonical ${state} source-access state`,
    )
  }
  mustMatch(
    `${SHARED_TRUTH_PATH} + ${SOURCE_EVIDENCE_PATH}`,
    combined,
    /Public access not confirmed/,
    'unconfirmed evidence must use the public label "Public access not confirmed"',
  )
  mustMatch(
    `${SHARED_TRUTH_PATH} + ${SOURCE_EVIDENCE_PATH}`,
    combined,
    /PathForge record only/,
    'unconfirmed evidence must disclose "PathForge record only"',
  )
  mustMatch(
    SHARED_TRUTH_PATH,
    truth,
    /resolvePublicSourceEvidence\s*\(/,
    'must resolve explicit evidence or its conservative unconfirmed fallback',
  )

  for (const label of [
    'Exact model shown publicly',
    'Model family shown publicly',
    'Exact model recorded by PathForge, not shown publicly',
    'Builder reported',
  ]) {
    mustMatch(
      `${SHARED_TRUTH_PATH} + ${SOURCE_EVIDENCE_PATH}`,
      combined,
      new RegExp(label),
      `must preserve the full model-proof label "${label}"`,
    )
  }

  // Public transcript access must come from the explicit evidence registry.
  // A recognized provider share URL can still be partial, empty, auth-walled,
  // or unable to expose the exact model/version claimed by stored metadata.
  for (const [pattern, label] of [
    [/chatgpt\\?\.com[\\/](?:share|s)/i, 'ChatGPT share URL pattern'],
    [/claude\\?\.ai[\\/]share/i, 'Claude share URL pattern'],
    [/share\\?\.gemini\\?\.google/i, 'Gemini share URL pattern'],
    [/\.hostname\b|new\s+URL\s*\(/, 'URL parser'],
  ]) {
    mustNotMatch(
      SHARED_TRUTH_PATH,
      truth,
      pattern,
      `must not promote public transcript access from a ${label}`,
    )
  }
  mustNotMatch(
    SOURCE_EVIDENCE_CORE_PATH,
    evidenceCore,
    /(?:startsWith|includes|match|test)\s*\([^\n]*(?:chatgpt|claude|gemini|sourceUrl|source_url)/i,
    'explicit evidence must not be derived from provider URL shape',
  )
  for (const fileName of readdirSync('scripts').filter((name) => name.endsWith('.mjs'))) {
    const scriptPath = path.posix.join('scripts', fileName)
    mustNotMatch(
      scriptPath,
      read(scriptPath),
      /(?:from\s+|import\s*\()['"]\.\.\/src\/lib\/public-source-evidence\.ts['"]\)?/,
      'Node guards must import the warning-free runtime evidence core instead of the TypeScript wrapper',
    )
  }

  mustMatch(
    SHARED_TRUTH_PATH,
    truth,
    /selectedRunPromptCount/,
    'must preserve the selected-run prompt count explicitly',
  )
  mustMatch(
    SHARED_TRUTH_PATH,
    truth,
    /familyRunCount/,
    'must preserve family/model-run totals separately from prompt counts',
  )
  mustNotMatch(
    SHARED_TRUTH_PATH,
    truth,
    /selectedRunPromptCount\s*:\s*[^,\n]*(?:variants?|familyRunCount)\.length/,
    'selected-run prompt count cannot be derived from family/model-run cardinality',
  )
}

async function checkCatalogEvidenceResolution() {
  if (!existsSync(SOURCE_EVIDENCE_PATH)) return { resolvedCount: 0, curatedCount: 0 }

  let resolvePublicSourceEvidence
  try {
    ;({ resolvePublicSourceEvidenceCore: resolvePublicSourceEvidence } = await import('../src/lib/public-source-evidence-core.mjs'))
  } catch (error) {
    fail(`${SOURCE_EVIDENCE_PATH}: could not load the source-evidence resolver: ${error.message}`)
    return { resolvedCount: 0, curatedCount: 0 }
  }

  if (typeof resolvePublicSourceEvidence !== 'function') {
    fail(`${SOURCE_EVIDENCE_PATH}: resolvePublicSourceEvidence must be callable`)
    return { resolvedCount: 0, curatedCount: 0 }
  }

  const projection = readJson(IDENTITY_PROJECTION_PATH)
  let resolvedCount = 0
  let curatedCount = 0
  for (const [projectId, identity] of Object.entries(projection?.projects ?? {})) {
    const sourcePackagePath = packagePath(identity.sourceRunPackageFile)
    if (!sourcePackagePath) {
      fail(`${IDENTITY_PROJECTION_PATH}: project ${projectId} has an invalid package path`)
      continue
    }
    const sourcePackage = readJson(sourcePackagePath)
    if (!sourcePackage) continue

    let truth
    try {
      truth = resolvePublicSourceEvidence({
        ...sourcePackage,
        pathforgeRecordChecked: true,
      })
    } catch (error) {
      fail(`${sourcePackagePath}: source-evidence resolution threw: ${error.message}`)
      continue
    }
    resolvedCount += 1
    if (!truth || !SOURCE_ACCESS_STATES.includes(truth.accessState)) {
      fail(`${sourcePackagePath}: must resolve to one canonical public source-access state`)
      continue
    }
    if (truth.curated) curatedCount += 1
    if (truth.accessState === 'unconfirmed') {
      if (
        truth.accessLabel !== 'Public access not confirmed' ||
        truth.hasPathForgeRecord !== true ||
        truth.recordLabel !== 'PathForge record only'
      ) {
        fail(`${sourcePackagePath}: unconfirmed fallback must disclose public access and PathForge-only record scope`)
      }
    } else if (!truth.curated) {
      fail(`${sourcePackagePath}: non-default source-access state requires explicit curated evidence`)
    }
    if (
      truth.accessState === 'public_partial' &&
      truth.providerLinkLabel !== 'Open partial public source'
    ) {
      fail(`${sourcePackagePath}: partial public evidence must use "Open partial public source"`)
    }

    // Re-resolve with only the URL. Provider URL form must never be enough to
    // inherit a curated public/private transcript classification.
    const urlOnlyTruth = resolvePublicSourceEvidence({
      source_url: sourcePackage.source_url,
    })
    if (
      urlOnlyTruth.accessState !== 'unconfirmed' ||
      urlOnlyTruth.hasPathForgeRecord !== false ||
      urlOnlyTruth.recordLabel !== null ||
      /checked PathForge record preserves/i.test(urlOnlyTruth.accessNote ?? '')
    ) {
      fail(`${sourcePackagePath}: URL-only evidence must remain unconfirmed and cannot claim a checked PathForge record`)
    }
  }

  if (resolvedCount !== 174) {
    fail(`${SOURCE_EVIDENCE_PATH}: expected evidence fallback resolution for 174 package-backed projects, found ${resolvedCount}`)
  }
  if (curatedCount < 3) {
    fail(`${SOURCE_EVIDENCE_PATH}: expected the three reproduced claim records to remain explicitly curated`)
  }
  return { resolvedCount, curatedCount }
}

function checkPreparedRouteCoverage() {
  const routeAudit = loadCheckedDedicatedSourceRunRoutes()
  for (const failure of routeAudit.failures) fail(failure)

  const routes = routeAudit.routes
  const uniqueHrefs = new Set(routes.values())
  if (routes.size !== 175) {
    fail(`${PROJECT_LINKS_PATH}: expected 175 checked prepared route IDs, found ${routes.size}`)
  }
  if (uniqueHrefs.size !== 174) {
    fail(`${PROJECT_LINKS_PATH}: expected 174 unique prepared hrefs, found ${uniqueHrefs.size}`)
  }

  const duplicateRoutes = new Map()
  for (const [projectId, href] of routes) {
    const owners = duplicateRoutes.get(href) ?? []
    owners.push(projectId)
    duplicateRoutes.set(href, owners)
  }
  const duplicates = [...duplicateRoutes]
    .filter(([, projectIds]) => projectIds.length > 1)
  if (
    duplicates.length !== 1 ||
    duplicates[0][0] !== SNAKE_ROUTE ||
    JSON.stringify([...duplicates[0][1]].sort()) !==
      JSON.stringify([SNAKE_CANONICAL_PROJECT_ID, SNAKE_LEGACY_PROJECT_ID].sort())
  ) {
    fail(`${PROJECT_LINKS_PATH}: only the explicit canonical/legacy Snake alias may share a public href`)
  }

  const projection = readJson(IDENTITY_PROJECTION_PATH)
  const projectedIds = new Set(Object.keys(projection?.projects ?? {}))
  if (projection?.projectCount !== 174 || projectedIds.size !== 174) {
    fail(`${IDENTITY_PROJECTION_PATH}: expected 174 checked package-backed projects`)
  }
  for (const projectId of projectedIds) {
    if (!routes.has(projectId)) {
      fail(`${IDENTITY_PROJECTION_PATH}: package-backed project ${projectId} has no checked public route`)
    }
  }

  const routeOnlyIds = [...routes.keys()].filter((projectId) => !projectedIds.has(projectId)).sort()
  const expectedRouteOnlyIds = [SNAKE_LEGACY_PROJECT_ID]
  if (JSON.stringify(routeOnlyIds) !== JSON.stringify(expectedRouteOnlyIds)) {
    fail(
      `${PROJECT_LINKS_PATH}: the legacy Snake alias must be the only route-only exemption; found ${routeOnlyIds.join(', ') || 'none'}`,
    )
  }
  if (routes.get(SNAKE_LEGACY_PROJECT_ID) !== SNAKE_ROUTE) {
    fail(`${PROJECT_LINKS_PATH}: legacy Snake alias must resolve to ${SNAKE_ROUTE}`)
  }

  const recoveredHrefs = new Set(
    (readJson('seed-runs/curation/2026-07-16-recovered-approved-source-runs.json')?.projects ?? [])
      .map((project) => project.href),
  )
  for (const [projectId, href] of routes) {
    const routePath = `src/app${href}/page.tsx`
    if (!existsSync(routePath)) {
      if (!recoveredHrefs.has(href)) {
        fail(`${PROJECT_LINKS_PATH}: ${projectId} (${href}) has neither a direct page nor a checked recovered-route rewrite`)
      }
      continue
    }
    const page = read(routePath)
    if (
      !page.includes('PreparedSourceRunPage') &&
      !page.includes('PreparedModelVariantSourceRunPage')
    ) {
      fail(`${routePath}: checked prepared route must flow through the shared prepared source-run page`)
    }
  }

  const recoveredPage = read(RECOVERED_PAGE_PATH)
  mustMatch(
    RECOVERED_PAGE_PATH,
    recoveredPage,
    /<PreparedSourceRunPage\b/,
    'rewritten recovered routes must flow through the shared prepared source-run page',
  )
  const preparedPage = read(PREPARED_PAGE_PATH)
  mustMatch(
    PREPARED_PAGE_PATH,
    preparedPage,
    /(?:import|require)[\s\S]{0,160}derivePublicProjectTruth[\s\S]{0,160}public-project-truth/,
    'must import the shared public-project truth presenter',
  )
  mustMatch(
    PREPARED_PAGE_PATH,
    preparedPage,
    /derivePublicProjectTruth\s*\(/,
    'must derive public truth for every prepared route',
  )
  for (const sourceRunAlias of [
    'source_run_id',
    'source_run_submission_id',
    'pathforge_pending_id',
  ]) {
    mustMatch(
      PREPARED_PAGE_PATH,
      preparedPage,
      new RegExp(
        `\\.\\.\\.\\(sourceRun\\.${sourceRunAlias} === undefined[\\s\\S]{0,80}\\{ ${sourceRunAlias}: sourceRun\\.${sourceRunAlias} \\}\\)`,
      ),
      `must conditionally retain checked package ${sourceRunAlias} so conflicting runtime identities fail closed`,
    )
  }
  mustMatch(
    PREPARED_PAGE_PATH,
    preparedPage,
    /showArtifactExplanation=\{!modelVariantSet\}/,
    'model-family pages must keep detailed known-issue copy in the run selector instead of duplicating it in the page summary',
  )

  const publicTruthSummary = read(PUBLIC_TRUTH_SUMMARY_PATH)
  mustMatch(
    PUBLIC_TRUTH_SUMMARY_PATH,
    publicTruthSummary,
    /showArtifactExplanation\s*&&\s*artifact\.explanation/,
    'shared page truth summary must support concise known-issue state when a run selector owns the explanation',
  )

  const forkTypes = read(PROJECT_FORK_TYPES_PATH)
  mustMatch(
    PROJECT_FORK_TYPES_PATH,
    forkTypes,
    /childSourceRunId\?:\s*string\s*\|\s*null/,
    'fork network items must carry checked child source-run identity when available',
  )
  const sourceRunShowcase = read(SOURCE_RUN_SHOWCASE_PATH)
  mustMatch(
    SOURCE_RUN_SHOWCASE_PATH,
    sourceRunShowcase,
    /sourceRunId:\s*activeForkContext\.fork\.childSourceRunId/,
    'parent fork previews must resolve curated child provider evidence by the checked child run identity',
  )
  mustMatch(
    SOURCE_RUN_SHOWCASE_PATH,
    sourceRunShowcase,
    /pathforgeRecordChecked:\s*Boolean\(activeForkContext\.fork\.childSourceRunId\)/,
    'unknown community fork previews must fail closed unless a checked child run identity exists',
  )

  return { routeCount: routes.size, hrefCount: uniqueHrefs.size, projectedCount: projectedIds.size }
}

function checkModelVariantPromptCounts() {
  const manifestFiles = readdirSync(MODEL_VARIANT_MANIFEST_DIRECTORY)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
  let familyCount = 0
  let runCount = 0

  for (const fileName of manifestFiles) {
    const manifestPath = path.posix.join(MODEL_VARIANT_MANIFEST_DIRECTORY, fileName)
    const manifest = readJson(manifestPath)
    if (!manifest?.canonicalProjectId || !Array.isArray(manifest.variants)) continue
    familyCount += 1
    runCount += manifest.variants.length

    const defaultVariants = manifest.variants.filter((variant) => (
      variant.sourceRunId === manifest.defaultSourceRunId
    ))
    if (defaultVariants.length !== 1) {
      fail(`${manifestPath}: canonical family must have exactly one configured default run`)
      continue
    }
    const defaultVariant = defaultVariants[0]
    const defaultPackagePath = packagePath(defaultVariant.packageFile)
    if (!defaultPackagePath) {
      fail(`${manifestPath}: default run ${defaultVariant.sourceRunId} has an invalid package path`)
      continue
    }
    const sourcePackage = readJson(defaultPackagePath)
    const stepCount = Array.isArray(sourcePackage?.steps) ? sourcePackage.steps.length : 0
    if (stepCount < 1) {
      fail(`${defaultPackagePath}: canonical default package must preserve at least one exact prompt/response step`)
    }
    if (defaultVariant.promptCount !== stepCount) {
      fail(
        `${manifestPath}: default run ${defaultVariant.sourceRunId} promptCount ${defaultVariant.promptCount} does not match package step count ${stepCount}`,
      )
    }
    if (sourcePackage?.prompt_count != null && sourcePackage.prompt_count !== stepCount) {
      fail(`${defaultPackagePath}: prompt_count must match exact package step count ${stepCount}`)
    }
    const packageRunId = sourceRunPackageId(sourcePackage)
    if (packageRunId && packageRunId !== defaultVariant.sourceRunId) {
      fail(`${defaultPackagePath}: source-run id does not match canonical default ${defaultVariant.sourceRunId}`)
    }
  }

  if (familyCount !== 9 || runCount !== 27) {
    fail(
      `${MODEL_VARIANT_MANIFEST_DIRECTORY}: expected 9 model families and 27 stored runs, found ${familyCount} families and ${runCount} runs`,
    )
  }
  return { familyCount, runCount }
}

function checkTrustedProvenanceAvailability() {
  const types = read(PROFILE_TYPES_PATH)
  for (const kind of ['member', 'pathforge_seed', 'pathforge_team']) {
    mustMatch(
      PROFILE_TYPES_PATH,
      types,
      new RegExp(`['\"]${kind}['\"]`),
      `profile provenance must preserve trusted ${kind} state`,
    )
  }

  const publicProfiles = read(PUBLIC_PROFILE_DATA_PATH)
  mustMatch(
    PUBLIC_PROFILE_DATA_PATH,
    publicProfiles,
    /provenance:profile_provenance\(kind\)/,
    'public profiles must read trusted profile provenance',
  )

  const publicData = read(PUBLIC_DATA_PATH)
  mustMatch(
    PUBLIC_DATA_PATH,
    publicData,
    /author:profiles!prompts_author_id_fkey\([^'"\n]*provenance:profile_provenance\(kind\)[^'"\n]*\)/,
    'public project/card reads must join trusted author provenance at first impression',
  )

  const discovery = read(DISCOVERY_PATH)
  mustMatch(
    DISCOVERY_PATH,
    discovery,
    /authorProvenanceKind/,
    'discovery items must preserve author provenance for public cards',
  )
  mustMatch(
    DISCOVERY_PATH,
    discovery,
    /prompt\.author\?\.provenance|prompt\.author\.provenance/,
    'discovery provenance must come from the trusted author profile relation',
  )
}

function checkPublicWording() {
  const bareSourceRun = /(?:>\s*Source run\s*<|(['"`])Source run\1)/
  const bareVerified = /(?:>\s*Verified\s*<|(['"`])Verified\1)/
  const rawForkCoordinates = /(?:\bDepth\s*\{|\bBranch\s*\{|\bDepth\s+0\b|\bBranch\s+0\b)/

  for (const filePath of PUBLIC_WORDING_PATHS) {
    const source = read(filePath)
    mustNotMatch(
      filePath,
      source,
      bareSourceRun,
      'must not expose bare "Source run" wording; use the canonical access label',
    )
    mustNotMatch(
      filePath,
      source,
      bareVerified,
      'must not expose bare "Verified" wording; qualify artifact/source/model truth',
    )
    mustNotMatch(
      filePath,
      source,
      rawForkCoordinates,
      'must not expose raw Depth 0/Branch 0 coordinates; use human lineage wording',
    )
  }

  const myForgeSource = read('src/app/my-forge/page.tsx')
  mustMatch(
    'src/app/my-forge/page.tsx',
    myForgeSource,
    /new artifact-verified \$\{saved\.unseenModelUpdateCount === 1 \? 'run is' : 'runs are'\}/,
    'My Forge model-update metrics must explicitly qualify artifact verification',
  )
  mustNotMatch(
    'src/app/my-forge/page.tsx',
    myForgeSource,
    /new verified \$\{saved\.unseenModelUpdateCount === 1 \? 'run is' : 'runs are'\}/,
    'My Forge must not use bare verified-run wording',
  )
}

// Keep the registries wired into the runtime. These assertions make accidental
// removal fail next to the new public-truth checks rather than silently shrinking
// the audited catalog.
function checkRegistryWiring() {
  const preparedProjects = read(PREPARED_PROJECTS_PATH)
  for (const registry of [
    '...AIRLOCK_ZERO_PREPARED_PROJECTS',
    '...PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    '...RECOVERED_SOURCE_RUN_SHOWCASE_PROJECTS',
  ]) {
    if (!preparedProjects.includes(registry)) {
      fail(`${PREPARED_PROJECTS_PATH}: missing ${registry} from the prepared catalog`)
    }
  }
}

checkRegistryWiring()
checkSharedTruthContract()
const evidenceStats = await checkCatalogEvidenceResolution()
const routeStats = checkPreparedRouteCoverage()
const variantStats = checkModelVariantPromptCounts()
checkTrustedProvenanceAvailability()
checkPublicWording()

if (failures.length > 0) {
  console.error('Public-project truth guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Public-project truth guard passed for ${routeStats.routeCount} route IDs ` +
    `(${routeStats.hrefCount} hrefs; ${routeStats.projectedCount} package-backed projects), ` +
    `${evidenceStats.resolvedCount} evidence resolutions (${evidenceStats.curatedCount} curated), ` +
    `${variantStats.familyCount} model families, and ${variantStats.runCount} stored runs.`,
)
console.log(
  'Explicit route exception preserved: legacy Snake aliases the canonical /snake-demo path.',
)
