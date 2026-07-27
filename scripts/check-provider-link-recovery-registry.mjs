#!/usr/bin/env node

import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'

const FEATURED_PROJECTS_PATH = 'src/lib/featured-projects.ts'
const PREPARED_PROJECTS_PATH = 'src/lib/prepared-showcase-projects.ts'
const PENDING_PROJECTS_PATH = 'src/lib/pending-source-run-showcases.ts'
const AIRLOCK_PROJECTS_PATH = 'src/lib/airlock-zero-projects.ts'
const CHECKED_PROJECTS_PATH = 'scripts/check-source-run-showcases.mjs'
const CURATED_MANIFEST_PATH = 'seed-runs/curation/2026-07-10-accepted-projects.json'
const RECOVERED_MANIFEST_PATH =
  'seed-runs/curation/2026-07-16-recovered-approved-source-runs.json'
const VERIFICATION_MANIFEST_PATH =
  'seed-runs/curation/2026-07-26-provider-share-verifications.v1.json'
const AUDIT_REGISTRY_PATH =
  'seed-runs/curation/2026-07-26-provider-link-recovery-registry.v1.json'
const PUBLIC_REGISTRY_PATH = 'src/lib/provider-public-share-registry.v1.json'
const PUBLIC_REGISTRY_MODULE_PATH = 'src/lib/provider-public-share-registry.ts'

const EXPECTED_PREPARED_PROJECT_COUNT = 174
const EXPECTED_ORIGINAL_CONVERSATION_COUNT = 173
const EXPECTED_PROVIDER_COUNTS = {
  chatgpt: 73,
  claude: 35,
  gemini: 57,
  openrouter: 9,
}
const POMODORO_PROJECT_ID = '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40'
const SNAKE_PROJECT_ID = '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f901'
const SNAKE_SOURCE_RUN_ID = '6a122064-6094-832a-9228-e239ce31e79b'
const WEEKEND_PARENT_SOURCE_RUN_ID = 'f4f0e2df-58c9-4def-bb1c-7785a3989ec9'
const WEEKEND_FORK_SOURCE_RUN_ID = '80b083bb-4f94-4411-b071-a5da731d3e2d'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const ACCESS_STATES = new Set(['public_exact', 'public_partial'])
const TRANSCRIPT_SCOPES = new Set([
  'full_provider_conversation',
  'selected_published_path',
  'shared_branch_path',
  'prefix_only',
])
const MODEL_PROOF_STATES = new Set([
  'exact_shown_publicly',
  'model_family_shown_publicly',
  'pathforge_recorded_not_public',
  'builder_reported',
  'not_confirmed',
])
const VERIFICATION_ENTRY_FIELDS = new Set([
  'project_id',
  'public_share_url',
  'provider_key',
  'consent_obtained_at',
  'anonymous_access_verified_at',
  'access_state',
  'transcript_scope',
  'model_proof_status',
  'verification_scope',
  'verification_note',
])
const UNAVAILABLE_EVIDENCE_FIELDS = new Set([
  'project_id',
  'provider_key',
  'unavailable_status',
  'checked_at',
  'verification_scope',
  'verification_note',
])
const PRIVATE_PROVIDER_PATHS = [
  /^https:\/\/chatgpt\.com\/c\//,
  /^https:\/\/claude\.ai\/chat\//,
  /^https:\/\/gemini\.google\.com\/app\//,
  /^https:\/\/openrouter\.ai\/chat(?:\?|\/)/,
]

function read(path) {
  return readFileSync(path, 'utf8')
}

function readJson(path) {
  return JSON.parse(read(path))
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)))
}

function normalizeProvider(value) {
  const provider = String(value ?? '').trim().toLowerCase()
  if (provider === 'chatgpt' || provider === 'openai') return 'chatgpt'
  if (provider === 'claude' || provider === 'anthropic') return 'claude'
  if (provider === 'gemini' || provider === 'google') return 'gemini'
  if (provider === 'openrouter') return 'openrouter'
  throw new Error(`Unsupported provider ${JSON.stringify(value)}.`)
}

function providerFromUrl(value) {
  const parsed = new URL(value)
  if (parsed.hostname === 'chatgpt.com') return 'chatgpt'
  if (parsed.hostname === 'claude.ai') return 'claude'
  if (
    parsed.hostname === 'gemini.google.com' ||
    parsed.hostname === 'share.gemini.google' ||
    parsed.hostname === 'g.co'
  ) {
    return 'gemini'
  }
  if (parsed.hostname === 'openrouter.ai') return 'openrouter'
  throw new Error(`Unsupported provider URL ${value}.`)
}

function originalLocatorKind(value) {
  if (PRIVATE_PROVIDER_PATHS.some((pattern) => pattern.test(value))) {
    return 'private_provider_conversation'
  }
  return 'preexisting_public_candidate'
}

function assertIsoTimestamp(value, label) {
  if (typeof value !== 'string' || !RFC3339_PATTERN.test(value)) {
    throw new Error(`${label} must be an RFC3339 UTC timestamp.`)
  }
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`${label} is not a valid timestamp.`)
  if (timestamp > Date.now() + 60_000) throw new Error(`${label} cannot be future-dated.`)
  return timestamp
}

function assertPublicShareUrl(value, providerKey, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a nonblank URL.`)
  }
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${label} is not a valid URL.`)
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `${label} must use HTTPS without credentials, a port, query string, or fragment.`,
    )
  }

  const allowed = {
    chatgpt:
      parsed.hostname === 'chatgpt.com' &&
      /^\/share\/[A-Za-z0-9-]+\/?$/.test(parsed.pathname),
    claude:
      parsed.hostname === 'claude.ai' &&
      /^\/share\/[A-Za-z0-9-]+\/?$/.test(parsed.pathname),
    gemini:
      (
        parsed.hostname === 'share.gemini.google' &&
        /^\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)
      ) ||
      (
        parsed.hostname === 'gemini.google.com' &&
        /^\/share\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)
      ) ||
      (
        parsed.hostname === 'g.co' &&
        /^\/gemini\/share\/[A-Za-z0-9_-]+\/?$/.test(parsed.pathname)
      ),
    // OpenRouter has no allowlisted anonymous public-conversation share path
    // in the recovered catalog. Room URLs remain private evidence only.
    openrouter: false,
  }[providerKey]

  if (!allowed) throw new Error(`${label} is not an allowlisted ${providerKey} public share.`)
}

function assertNoDuplicateJsonKeys(path, source) {
  const jsonSource = ts.parseJsonText(path, source)
  const failures = []

  function visit(node, pointer) {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = new Set()
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue
        const key = property.name.text
        if (keys.has(key)) failures.push(`${pointer}/${key}`)
        keys.add(key)
        visit(property.initializer, `${pointer}/${key}`)
      }
      return
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => visit(element, `${pointer}/${index}`))
    }
  }

  visit(jsonSource.statements[0]?.expression, '')
  if (failures.length > 0) {
    throw new Error(`${path} repeats JSON object keys at ${failures.join(', ')}.`)
  }
}

function stringConstants(sourcePath, inherited = new Map()) {
  const source = read(sourcePath)
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const values = new Map(inherited)
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      const value = literalString(declaration.initializer, values)
      if (value !== null) values.set(declaration.name.text, value)
    }
  }
  return { file, values }
}

function literalString(node, values) {
  if (!node) return null
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (ts.isIdentifier(node)) return values.get(node.text) ?? null
  return null
}

function objectProperties(object) {
  const properties = new Map()
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = property.name.text
    properties.set(name, property.initializer)
  }
  return properties
}

function projectObjects(sourcePath, inheritedValues) {
  const { file, values } = stringConstants(sourcePath, inheritedValues)
  const projects = []

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      const declarationName = declaration.name.text
      if (
        !declarationName.endsWith('_SHOWCASE_PROJECT') ||
        declarationName === 'PREPARED_SHOWCASE_PROJECTS'
      ) {
        continue
      }

      let object = declaration.initializer
      if (ts.isCallExpression(object)) object = object.arguments[0]
      if (!ts.isObjectLiteralExpression(object)) continue
      const properties = objectProperties(object)
      const projectId = literalString(
        properties.get('id') ?? properties.get('projectId'),
        values,
      )
      const sourceRunId = literalString(properties.get('sourceRunId'), values)
      const href = literalString(properties.get('href'), values)
      const title = literalString(properties.get('title'), values)
      const sourceUrl = literalString(properties.get('sourceUrl'), values)
      const modelUsed = literalString(properties.get('modelUsed'), values)
      if (!projectId || !sourceRunId || !href || !title || !sourceUrl || !modelUsed) {
        throw new Error(
          `${sourcePath}: could not resolve catalog identity for ${declarationName}.`,
        )
      }
      projects.push({
        projectId,
        sourceRunId,
        href,
        title,
        sourceUrl,
        modelUsed,
        declarationName,
        catalogSourcePath: sourcePath,
      })
    }
  }

  return projects
}

function checkedProjectPackages(featuredIds) {
  const mappings = new Map()
  const add = (projectId, packagePath, source) => {
    if (!projectId || !packagePath) {
      throw new Error(`${source}: missing project or package identity.`)
    }
    const normalized = packagePath.startsWith('seed-runs/')
      ? packagePath
      : `seed-runs/${packagePath}`
    const existing = mappings.get(projectId)
    if (existing && existing !== normalized) {
      throw new Error(`${source}: project ${projectId} maps to two packages.`)
    }
    mappings.set(projectId, normalized)
  }

  const sourceRegistry = read(CHECKED_PROJECTS_PATH)
  const start = sourceRegistry.indexOf('const sourceRunProjects = [')
  const end = sourceRegistry.indexOf("const curatedManifestPath = '")
  if (start === -1 || end <= start) {
    throw new Error(`${CHECKED_PROJECTS_PATH}: could not isolate the prepared registry.`)
  }
  const literalRegistry = sourceRegistry.slice(start, end)
  for (const block of literalRegistry.split(/\n\s*\},\s*\n\s*\{/)) {
    const projectConstant = block.match(/projectId:\s*'([A-Z][A-Z0-9_]*)'/)?.[1]
    const packagePath = block.match(/packagePath:\s*'([^']+\.json)'/)?.[1]
    if (!projectConstant || !packagePath) continue
    const projectId = featuredIds.get(projectConstant)
    if (!projectId) {
      throw new Error(
        `${CHECKED_PROJECTS_PATH}: unresolved project constant ${projectConstant}.`,
      )
    }
    add(projectId, packagePath, CHECKED_PROJECTS_PATH)
  }

  for (const project of readJson(CURATED_MANIFEST_PATH).projects ?? []) {
    add(project.projectId, project.packageFile, CURATED_MANIFEST_PATH)
  }
  for (const project of readJson(RECOVERED_MANIFEST_PATH).projects ?? []) {
    add(project.projectId, project.sourceRunPackageFile, RECOVERED_MANIFEST_PATH)
  }
  return mappings
}

function loadPreparedCatalog() {
  const { values: featuredIds } = stringConstants(FEATURED_PROJECTS_PATH)
  const directProjects = [
    ...projectObjects(AIRLOCK_PROJECTS_PATH, featuredIds),
    ...projectObjects(PREPARED_PROJECTS_PATH, featuredIds),
    ...projectObjects(PENDING_PROJECTS_PATH, featuredIds),
  ]
  const curatedProjects = (readJson(CURATED_MANIFEST_PATH).projects ?? []).map(
    (project) => ({
      projectId: project.projectId,
      sourceRunId: project.sourceRunId,
      href: project.href,
      title: project.title,
      sourceUrl: project.sourceUrl,
      modelUsed: project.modelUsed,
      declarationName: null,
      catalogSourcePath: CURATED_MANIFEST_PATH,
    }),
  )
  const recoveredProjects = (readJson(RECOVERED_MANIFEST_PATH).projects ?? []).map(
    (project) => ({
      projectId: project.projectId,
      sourceRunId: project.sourceRunId,
      href: project.href,
      title: project.title,
      sourceUrl: project.sourceUrl,
      modelUsed: project.modelUsed,
      declarationName: null,
      catalogSourcePath: RECOVERED_MANIFEST_PATH,
    }),
  )
  const projects = [...directProjects, ...curatedProjects, ...recoveredProjects]
  const packagePaths = checkedProjectPackages(featuredIds)

  if (projects.length !== EXPECTED_PREPARED_PROJECT_COUNT) {
    throw new Error(
      `Prepared catalog must contain ${EXPECTED_PREPARED_PROJECT_COUNT} projects; found ${projects.length}.`,
    )
  }

  const projectIds = new Set()
  const sourceRunIds = new Set()
  const hrefs = new Set()
  const providerCounts = {
    chatgpt: 0,
    claude: 0,
    gemini: 0,
    openrouter: 0,
  }

  for (const project of projects) {
    if (!UUID_PATTERN.test(project.projectId)) {
      throw new Error(`${project.title}: invalid project id ${project.projectId}.`)
    }
    if (!UUID_PATTERN.test(project.sourceRunId)) {
      throw new Error(`${project.title}: invalid source-run id ${project.sourceRunId}.`)
    }
    for (const [label, value, values] of [
      ['project id', project.projectId, projectIds],
      ['source-run id', project.sourceRunId, sourceRunIds],
      ['href', project.href, hrefs],
    ]) {
      if (values.has(value)) throw new Error(`Prepared catalog repeats ${label} ${value}.`)
      values.add(value)
    }

    const packagePath = packagePaths.get(project.projectId) ?? null
    if (!packagePath && project.projectId !== POMODORO_PROJECT_ID) {
      throw new Error(`${project.title}: missing checked source-run package.`)
    }
    if (packagePath && !existsSync(packagePath)) {
      throw new Error(`${project.title}: missing package ${packagePath}.`)
    }

    let packageProvider = null
    if (packagePath) {
      const sourcePackage = readJson(packagePath)
      if (sourcePackage.source_url !== project.sourceUrl) {
        throw new Error(
          `${packagePath}: source_url does not match the prepared catalog locator.`,
        )
      }
      packageProvider = normalizeProvider(sourcePackage.provider)
      const packageAliases = [
        sourcePackage.source_run_id,
        sourcePackage.source_run_submission_id,
        sourcePackage.pathforge_pending_id,
      ].filter((value) => typeof value === 'string' && value.length > 0)
      if (
        packageAliases.length > 0 &&
        !packageAliases.includes(project.sourceRunId) &&
        !(
          project.projectId === SNAKE_PROJECT_ID &&
          project.sourceRunId === SNAKE_SOURCE_RUN_ID
        )
      ) {
        throw new Error(
          `${packagePath}: package aliases do not preserve prepared source-run ${project.sourceRunId}.`,
        )
      }
    }

    const urlProvider = providerFromUrl(project.sourceUrl)
    if (packageProvider && packageProvider !== urlProvider) {
      throw new Error(`${project.title}: package provider conflicts with source URL.`)
    }
    project.providerKey = packageProvider ?? urlProvider
    project.packagePath = packagePath
    project.originalLocatorEvidencePath =
      packagePath ?? 'src/lib/prepared-showcase-projects.ts'
    project.originalLocatorEvidenceField =
      packagePath
        ? '/source_url'
        : 'POMODORO_TIMER_SHOWCASE_PROJECT.sourceUrl'
    project.originalLocatorSha256 = sha256(project.sourceUrl)
    project.conversationKey =
      `sha256:${sha256(`${project.providerKey}\n${project.sourceUrl}`)}`
    project.originalLocatorKind = originalLocatorKind(project.sourceUrl)
    providerCounts[project.providerKey] += 1
  }

  if (!isDeepStrictEqual(providerCounts, EXPECTED_PROVIDER_COUNTS)) {
    throw new Error(
      `Provider counts changed: ${JSON.stringify(providerCounts)}.`,
    )
  }
  const originalLocators = new Set(projects.map((project) => project.sourceUrl))
  if (originalLocators.size !== EXPECTED_ORIGINAL_CONVERSATION_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ORIGINAL_CONVERSATION_COUNT} original conversations; found ${originalLocators.size}.`,
    )
  }

  const duplicateLocatorGroups = Map.groupBy(projects, (project) => project.sourceUrl)
  const duplicates = [...duplicateLocatorGroups.values()]
    .filter((group) => group.length > 1)
  if (
    duplicates.length !== 1 ||
    !isDeepStrictEqual(
      duplicates[0].map((project) => project.sourceRunId).sort(),
      [WEEKEND_PARENT_SOURCE_RUN_ID, WEEKEND_FORK_SOURCE_RUN_ID].sort(),
    )
  ) {
    throw new Error('Only the Weekend parent/fork may share an original locator.')
  }

  return projects
}

function loadVerificationManifest(catalogBySourceRunId) {
  const source = read(VERIFICATION_MANIFEST_PATH)
  assertNoDuplicateJsonKeys(VERIFICATION_MANIFEST_PATH, source)
  for (const privatePath of [
    'https://chatgpt.com/c/',
    'https://claude.ai/chat/',
    'https://gemini.google.com/app/',
    'https://openrouter.ai/chat',
  ]) {
    if (source.includes(privatePath)) {
      throw new Error(
        `${VERIFICATION_MANIFEST_PATH}: private locator ${privatePath} cannot be copied into the verification manifest.`,
      )
    }
  }
  const manifest = JSON.parse(source)
  const topLevelFields = Object.keys(manifest).sort()
  const expectedTopLevelFields = [
    'entries_by_source_run_id',
    'generated_at',
    'manifest_version',
    'registry_version',
    'unavailable_evidence_by_source_run_id',
  ]
  if (!isDeepStrictEqual(topLevelFields, expectedTopLevelFields)) {
    throw new Error(`${VERIFICATION_MANIFEST_PATH}: unexpected top-level fields.`)
  }
  if (manifest.manifest_version !== 1) {
    throw new Error(`${VERIFICATION_MANIFEST_PATH}: unsupported manifest_version.`)
  }
  if (
    typeof manifest.registry_version !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(manifest.registry_version)
  ) {
    throw new Error(`${VERIFICATION_MANIFEST_PATH}: invalid registry_version.`)
  }
  const generatedAt = assertIsoTimestamp(
    manifest.generated_at,
    `${VERIFICATION_MANIFEST_PATH} generated_at`,
  )
  const entries = manifest.entries_by_source_run_id
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    throw new Error(`${VERIFICATION_MANIFEST_PATH}: entries must be an object.`)
  }
  const unavailableEvidence = manifest.unavailable_evidence_by_source_run_id
  if (
    !unavailableEvidence ||
    typeof unavailableEvidence !== 'object' ||
    Array.isArray(unavailableEvidence)
  ) {
    throw new Error(
      `${VERIFICATION_MANIFEST_PATH}: unavailable evidence must be an object.`,
    )
  }

  const publicUrls = new Map()
  for (const [sourceRunId, entry] of Object.entries(entries)) {
    const label = `${VERIFICATION_MANIFEST_PATH} ${sourceRunId}`
    const unexpectedFields = Object.keys(entry).filter(
      (field) => !VERIFICATION_ENTRY_FIELDS.has(field),
    )
    const missingFields = [...VERIFICATION_ENTRY_FIELDS].filter(
      (field) => !Object.hasOwn(entry, field),
    )
    if (unexpectedFields.length > 0 || missingFields.length > 0) {
      throw new Error(
        `${label}: field contract mismatch (unexpected ${unexpectedFields.join(', ') || 'none'}; ` +
          `missing ${missingFields.join(', ') || 'none'}).`,
      )
    }
    const project = catalogBySourceRunId.get(sourceRunId)
    if (!project) throw new Error(`${label}: source-run is not in the prepared catalog.`)
    if (entry.project_id !== project.projectId) {
      throw new Error(`${label}: project/source-run identity mismatch.`)
    }
    if (entry.provider_key !== project.providerKey) {
      throw new Error(`${label}: provider does not match catalog evidence.`)
    }
    assertPublicShareUrl(entry.public_share_url, entry.provider_key, `${label} URL`)
    const consentAt = assertIsoTimestamp(entry.consent_obtained_at, `${label} consent`)
    const verifiedAt = assertIsoTimestamp(
      entry.anonymous_access_verified_at,
      `${label} anonymous verification`,
    )
    if (verifiedAt < consentAt) {
      throw new Error(`${label}: anonymous verification predates recorded consent.`)
    }
    if (verifiedAt > generatedAt) {
      throw new Error(`${label}: anonymous verification postdates the registry build.`)
    }
    if (!ACCESS_STATES.has(entry.access_state)) {
      throw new Error(`${label}: invalid access_state.`)
    }
    if (!TRANSCRIPT_SCOPES.has(entry.transcript_scope)) {
      throw new Error(`${label}: invalid transcript_scope.`)
    }
    if (
      (entry.access_state === 'public_exact') !==
      (entry.transcript_scope === 'full_provider_conversation')
    ) {
      throw new Error(
        `${label}: public_exact must mean the full provider conversation, and partial scopes must fail closed.`,
      )
    }
    if (!MODEL_PROOF_STATES.has(entry.model_proof_status)) {
      throw new Error(`${label}: invalid model_proof_status.`)
    }
    if (
      !Array.isArray(entry.verification_scope) ||
      !entry.verification_scope.includes('anonymous_logged_out') ||
      !entry.verification_scope.includes('transcript_content_match')
    ) {
      throw new Error(`${label}: verification_scope must prove logged-out content matching.`)
    }
    if (typeof entry.verification_note !== 'string' || entry.verification_note.trim().length === 0) {
      throw new Error(`${label}: verification_note is required.`)
    }

    const existing = publicUrls.get(entry.public_share_url)
    if (existing && existing.conversationKey !== project.conversationKey) {
      throw new Error(
        `${label}: public URL is reused across different original conversations.`,
      )
    }
    publicUrls.set(entry.public_share_url, project)
  }

  for (const [sourceRunId, evidence] of Object.entries(unavailableEvidence)) {
    const label = `${VERIFICATION_MANIFEST_PATH} unavailable ${sourceRunId}`
    const project = catalogBySourceRunId.get(sourceRunId)
    if (!project) throw new Error(`${label}: source-run is not in the prepared catalog.`)
    if (Object.hasOwn(entries, sourceRunId)) {
      throw new Error(`${label}: source-run cannot be both verified and unavailable.`)
    }
    const unexpectedFields = Object.keys(evidence).filter(
      (field) => !UNAVAILABLE_EVIDENCE_FIELDS.has(field),
    )
    const missingFields = [...UNAVAILABLE_EVIDENCE_FIELDS].filter(
      (field) => !Object.hasOwn(evidence, field),
    )
    if (unexpectedFields.length > 0 || missingFields.length > 0) {
      throw new Error(`${label}: unavailable evidence field contract mismatch.`)
    }
    if (
      evidence.project_id !== project.projectId ||
      evidence.provider_key !== project.providerKey
    ) {
      throw new Error(`${label}: catalog identity mismatch.`)
    }
    if (
      evidence.unavailable_status !==
      'public_share_rejected_private_locator_exposure'
    ) {
      throw new Error(`${label}: unsupported unavailable_status.`)
    }
    const checkedAt = assertIsoTimestamp(evidence.checked_at, `${label} checked_at`)
    if (checkedAt > generatedAt) {
      throw new Error(`${label}: unavailable evidence postdates the registry build.`)
    }
    if (
      !Array.isArray(evidence.verification_scope) ||
      !evidence.verification_scope.includes('anonymous_logged_out')
    ) {
      throw new Error(`${label}: anonymous verification scope is required.`)
    }
    if (
      typeof evidence.verification_note !== 'string' ||
      evidence.verification_note.trim().length === 0
    ) {
      throw new Error(`${label}: verification_note is required.`)
    }
  }

  const byConversation = Map.groupBy(
    Object.entries(entries),
    ([sourceRunId]) => catalogBySourceRunId.get(sourceRunId).conversationKey,
  )
  for (const group of byConversation.values()) {
    const urls = new Set(group.map(([, entry]) => entry.public_share_url))
    if (urls.size > 1) {
      throw new Error('One original conversation maps to multiple verified public shares.')
    }
  }

  return manifest
}

function expectedPublicRegistry(verificationManifest) {
  return {
    schema_version: 1,
    registry_version: verificationManifest.registry_version,
    generated_at: verificationManifest.generated_at,
    entries_by_source_run_id: sortedObject(
      Object.entries(verificationManifest.entries_by_source_run_id).map(
        ([sourceRunId, entry]) => [
          sourceRunId,
          {
            ...(entry.project_id ? { project_id: entry.project_id } : {}),
            public_share_url: entry.public_share_url,
            provider_key: entry.provider_key,
            consent_obtained_at: entry.consent_obtained_at,
            anonymous_access_verified_at: entry.anonymous_access_verified_at,
            access_state: entry.access_state,
          },
        ],
      ),
    ),
  }
}

function expectedAuditRegistry(catalog, verificationManifest) {
  const verificationEntries = verificationManifest.entries_by_source_run_id
  const unavailableEvidence =
    verificationManifest.unavailable_evidence_by_source_run_id
  const fingerprintInput = catalog
    .map((project) => [
      project.sourceRunId,
      project.projectId,
      project.providerKey,
      project.originalLocatorSha256,
    ].join('|'))
    .sort()
    .join('\n')
  const verifiedCount = Object.keys(verificationEntries).length
  const providerCoverage = Object.fromEntries(
    Object.keys(EXPECTED_PROVIDER_COUNTS).map((providerKey) => [
      providerKey,
      {
        catalog_projects: catalog.filter((project) => project.providerKey === providerKey).length,
        verified_public_projects: catalog.filter(
          (project) =>
            project.providerKey === providerKey &&
            Object.hasOwn(verificationEntries, project.sourceRunId),
        ).length,
      },
    ]),
  )

  const entries = catalog.map((project) => {
    const verification = verificationEntries[project.sourceRunId] ?? null
    const checkedUnavailable = unavailableEvidence[project.sourceRunId] ?? null
    const publicExact = verification?.access_state === 'public_exact'
    const unavailableStatus =
      checkedUnavailable?.unavailable_status ??
      (project.providerKey === 'openrouter'
        ? 'provider_public_share_path_not_established'
        : project.originalLocatorKind === 'preexisting_public_candidate'
          ? 'anonymous_verification_not_completed'
          : 'recovery_not_completed')
    const unavailableNote =
      checkedUnavailable?.verification_note ??
      (project.providerKey === 'openrouter'
        ? 'No allowlisted anonymous OpenRouter public-conversation share path has been established for this registry.'
        : project.originalLocatorKind === 'preexisting_public_candidate'
          ? 'The catalog locator appears share-shaped, but anonymous identity and transcript matching were not completed for this registry version.'
          : 'No anonymously content-matched public share was admitted in this registry version.')
    return [
      project.sourceRunId,
      {
        source_run_id: project.sourceRunId,
        project_id: project.projectId,
        project_title: project.title,
        provider_key: project.providerKey,
        original_locator_evidence: {
          source_path: project.originalLocatorEvidencePath,
          source_field: project.originalLocatorEvidenceField,
          locator_sha256: `sha256:${project.originalLocatorSha256}`,
          locator_kind: project.originalLocatorKind,
          conversation_key: project.conversationKey,
        },
        public_url_status: verification ? 'verified_public' : 'unavailable',
        verified_public_url: verification?.public_share_url ?? null,
        unavailable_status: verification ? null : unavailableStatus,
        verification_timestamp:
          verification?.anonymous_access_verified_at ??
          checkedUnavailable?.checked_at ??
          verificationManifest.generated_at,
        verification_scope:
          verification?.verification_scope ??
          checkedUnavailable?.verification_scope ??
          ['catalog_identity'],
        access_state: verification?.access_state ?? 'unconfirmed',
        transcript_completeness:
          verification
            ? (publicExact ? 'complete' : 'partial')
            : 'not-confirmed',
        transcript_scope: verification?.transcript_scope ?? 'not_confirmed',
        model_proof_status:
          verification?.model_proof_status ?? 'pathforge_recorded_not_public',
        verification_note:
          verification?.verification_note ??
          unavailableNote,
      },
    ]
  })

  return {
    manifest_version: 1,
    registry_version: verificationManifest.registry_version,
    generated_at: verificationManifest.generated_at,
    catalog_snapshot: {
      source_commit: '26c9f9d227e9f9dd754ad14c839b61279dcc2c77',
      prepared_project_count: EXPECTED_PREPARED_PROJECT_COUNT,
      source_run_count: EXPECTED_PREPARED_PROJECT_COUNT,
      original_conversation_count: EXPECTED_ORIGINAL_CONVERSATION_COUNT,
      verified_public_project_count: verifiedCount,
      unavailable_project_count: EXPECTED_PREPARED_PROJECT_COUNT - verifiedCount,
      checked_unavailable_project_count: Object.keys(unavailableEvidence).length,
      provider_coverage: providerCoverage,
      provider_limitations: {
        openrouter: {
          allowlisted_anonymous_public_share_path: null,
          status: 'not_established_for_registry',
        },
      },
      catalog_fingerprint_sha256: `sha256:${sha256(fingerprintInput)}`,
    },
    entries_by_source_run_id: sortedObject(entries),
  }
}

function assertAuditConsistency(audit, catalogBySourceRunId, verificationManifest) {
  const entries = audit.entries_by_source_run_id ?? {}
  if (Object.keys(entries).length !== EXPECTED_PREPARED_PROJECT_COUNT) {
    throw new Error(
      `${AUDIT_REGISTRY_PATH}: expected ${EXPECTED_PREPARED_PROJECT_COUNT} entries.`,
    )
  }
  const conversationPublicUrls = new Map()
  for (const [sourceRunId, entry] of Object.entries(entries)) {
    const project = catalogBySourceRunId.get(sourceRunId)
    if (!project || entry.source_run_id !== sourceRunId) {
      throw new Error(`${AUDIT_REGISTRY_PATH}: invalid source-run key ${sourceRunId}.`)
    }
    if (entry.project_id !== project.projectId) {
      throw new Error(`${AUDIT_REGISTRY_PATH}: project mismatch for ${sourceRunId}.`)
    }
    if (
      entry.original_locator_evidence?.locator_sha256 !==
        `sha256:${project.originalLocatorSha256}` ||
      entry.original_locator_evidence?.conversation_key !== project.conversationKey
    ) {
      throw new Error(`${AUDIT_REGISTRY_PATH}: original locator evidence drifted.`)
    }
    const verification =
      verificationManifest.entries_by_source_run_id[sourceRunId] ?? null
    if (verification) {
      if (
        entry.public_url_status !== 'verified_public' ||
        entry.verified_public_url !== verification.public_share_url ||
        entry.unavailable_status !== null
      ) {
        throw new Error(`${AUDIT_REGISTRY_PATH}: verified status mismatch.`)
      }
      const existing = conversationPublicUrls.get(project.conversationKey)
      if (existing && existing !== entry.verified_public_url) {
        throw new Error(`${AUDIT_REGISTRY_PATH}: duplicate conversation URL mismatch.`)
      }
      conversationPublicUrls.set(project.conversationKey, entry.verified_public_url)
    } else if (
      entry.public_url_status !== 'unavailable' ||
      entry.verified_public_url !== null ||
      ![
        'recovery_not_completed',
        'anonymous_verification_not_completed',
        'provider_public_share_path_not_established',
        'public_share_rejected_private_locator_exposure',
      ].includes(entry.unavailable_status)
    ) {
      throw new Error(`${AUDIT_REGISTRY_PATH}: unavailable status mismatch.`)
    }
  }
}

function assertPublicModuleContract() {
  const source = read(PUBLIC_REGISTRY_MODULE_PATH)
  for (const token of [
    "import registryData from './provider-public-share-registry.v1.json'",
    'export const PROVIDER_PUBLIC_SHARE_REGISTRY',
    'export type ProviderPublicShareRegistryEntry',
    'export function getProviderPublicShareRegistryEntry',
    'return PROVIDER_PUBLIC_SHARE_REGISTRY[sourceRunId] ?? null',
  ]) {
    if (!source.includes(token)) {
      throw new Error(`${PUBLIC_REGISTRY_MODULE_PATH}: missing ${token}.`)
    }
  }
  for (const forbidden of [
    'source_url',
    'sourceUrl',
    '/c/',
    '/chat/',
    '/app/',
    'openrouter.ai/chat',
    'original_locator',
    'originalLocator',
  ]) {
    if (source.includes(forbidden)) {
      throw new Error(
        `${PUBLIC_REGISTRY_MODULE_PATH}: public projection cannot reference ${forbidden}.`,
      )
    }
  }
}

let catalog
let verificationManifest
let expectedPublic
let expectedAudit
try {
  catalog = loadPreparedCatalog()
  const catalogBySourceRunId = new Map(
    catalog.map((project) => [project.sourceRunId, project]),
  )
  verificationManifest = loadVerificationManifest(catalogBySourceRunId)
  expectedPublic = expectedPublicRegistry(verificationManifest)
  expectedAudit = expectedAuditRegistry(catalog, verificationManifest)

  if (process.argv.includes('--write')) {
    writeFileSync(PUBLIC_REGISTRY_PATH, `${JSON.stringify(expectedPublic, null, 2)}\n`)
    writeFileSync(AUDIT_REGISTRY_PATH, `${JSON.stringify(expectedAudit, null, 2)}\n`)
    console.log(
      `Wrote ${Object.keys(expectedPublic.entries_by_source_run_id).length} verified public shares and ${catalog.length} catalog audit rows.`,
    )
    process.exit(0)
  }

  for (const path of [PUBLIC_REGISTRY_PATH, AUDIT_REGISTRY_PATH]) {
    const source = read(path)
    assertNoDuplicateJsonKeys(path, source)
  }
  const actualPublic = readJson(PUBLIC_REGISTRY_PATH)
  const actualAudit = readJson(AUDIT_REGISTRY_PATH)
  if (!isDeepStrictEqual(actualPublic, expectedPublic)) {
    throw new Error(
      `${PUBLIC_REGISTRY_PATH} is not the exact public-safe verification projection.`,
    )
  }
  if (!isDeepStrictEqual(actualAudit, expectedAudit)) {
    throw new Error(
      `${AUDIT_REGISTRY_PATH} does not match the prepared catalog and verification evidence.`,
    )
  }
  assertAuditConsistency(actualAudit, catalogBySourceRunId, verificationManifest)
  assertPublicModuleContract()
} catch (error) {
  console.error(`Provider-link recovery registry guard failed:\n- ${error.message}`)
  process.exit(1)
}

const verifiedCount = Object.keys(expectedPublic.entries_by_source_run_id).length
console.log(
  `Provider-link recovery registry guard passed: ${catalog.length} projects, ` +
    `${EXPECTED_ORIGINAL_CONVERSATION_COUNT} conversations, ${verifiedCount} verified public shares, ` +
    `${catalog.length - verifiedCount} unavailable in registry version ${verificationManifest.registry_version}.`,
)
