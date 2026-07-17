import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RECOVERED_MANIFEST_PATH =
  'seed-runs/curation/2026-07-16-recovered-approved-source-runs.json'
export const EXPECTED_RECOVERED_PROJECT_COUNT = 98

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PUBLIC_ROUTE_PATTERN = /^\/[a-z0-9][a-z0-9-/]*$/

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

function referencedArtifactPaths(pkg) {
  const paths = new Set()
  const add = (value, { generatedFile = false } = {}) => {
    if (generatedFile && !String(value ?? '').startsWith('public/artifacts/')) return
    if (typeof value === 'string' && value.length > 0) paths.add(value)
  }

  add(pkg.final_artifact_path)
  for (const version of Array.isArray(pkg.artifact_versions) ? pkg.artifact_versions : []) {
    add(typeof version === 'string' ? version : version?.path ?? version?.artifact_path)
  }
  for (const step of Array.isArray(pkg.steps) ? pkg.steps : []) {
    add(step?.artifact_version_path)
    for (const generatedFile of Array.isArray(step?.generated_files) ? step.generated_files : []) {
      add(generatedFile, { generatedFile: true })
    }
  }

  return paths
}

function addCheckedRoute(routes, failures, projectId, href, label) {
  if (typeof projectId !== 'string' || projectId.length === 0) {
    failures.push(`${label}: missing project id`)
    return
  }
  if (!PUBLIC_ROUTE_PATTERN.test(href) || href.startsWith('/prompt/')) {
    failures.push(`${label}: invalid dedicated public route ${href}`)
    return
  }
  const existing = routes.get(projectId)
  if (existing && existing !== href) {
    failures.push(`${label}: project ${projectId} has conflicting routes ${existing} and ${href}`)
    return
  }
  routes.set(projectId, href)
}

export function loadRecoveredSourceRunManifest() {
  return readJson(RECOVERED_MANIFEST_PATH)
}

export function loadCheckedDedicatedSourceRunRoutes(manifest = loadRecoveredSourceRunManifest()) {
  const failures = []
  const routes = new Map()
  const featuredProjectIds = new Map()
  const featuredProjects = read('src/lib/featured-projects.ts')
  const projectLinks = read('src/lib/project-links.ts')
  const registryStart = projectLinks.indexOf('const PROJECT_ROUTE_OVERRIDES')
  const registryEnd = projectLinks.indexOf('export function getProjectRouteOverride')

  for (const match of featuredProjects.matchAll(
    /export const ([A-Z][A-Z0-9_]*)\s*=\s*(['"])([^'"]+)\2/g,
  )) {
    featuredProjectIds.set(match[1], match[3])
  }

  if (registryStart === -1 || registryEnd === -1 || registryEnd <= registryStart) {
    failures.push('src/lib/project-links.ts: could not resolve the centralized route registry')
    return { failures, routes }
  }
  const registry = projectLinks.slice(registryStart, registryEnd)

  if (
    !projectLinks.includes("import { RECOVERED_SOURCE_RUN_ROUTE_OVERRIDES } from './recovered-source-run-showcases'") ||
    !registry.includes('...RECOVERED_SOURCE_RUN_ROUTE_OVERRIDES')
  ) {
    failures.push(
      'src/lib/project-links.ts: recovered routes must feed the centralized project route registry',
    )
  }

  for (const project of Array.isArray(manifest.projects) ? manifest.projects : []) {
    addCheckedRoute(
      routes,
      failures,
      project?.projectId,
      project?.href,
      `${RECOVERED_MANIFEST_PATH}: recovered route`,
    )
  }

  for (const match of registry.matchAll(/\[([A-Z][A-Z0-9_]*)\]\s*:\s*(['"])(\/[^'"]+)\2/g)) {
    const projectId = featuredProjectIds.get(match[1])
    if (!projectId) {
      failures.push(`src/lib/project-links.ts: unresolved project id constant ${match[1]}`)
      continue
    }
    addCheckedRoute(routes, failures, projectId, match[3], 'src/lib/project-links.ts')
  }

  for (const match of registry.matchAll(/(['"])([^'"]+)\1\s*:\s*(['"])(\/[^'"]+)\3/g)) {
    addCheckedRoute(routes, failures, match[2], match[4], 'src/lib/project-links.ts')
  }

  return { failures, routes }
}

export function auditRecoveredSourceRunPublicationRegistry() {
  const failures = []
  let manifest
  try {
    manifest = loadRecoveredSourceRunManifest()
  } catch (error) {
    return {
      failures: [`${RECOVERED_MANIFEST_PATH}: ${error.message}`],
      stats: { projects: 0, packages: 0, artifacts: 0, artifactVersions: 0, routes: 0 },
      routes: new Map(),
    }
  }

  if (manifest.manifestVersion !== '1') {
    failures.push(`${RECOVERED_MANIFEST_PATH}: unsupported manifestVersion`)
  }
  if (
    manifest.approvedRecoveredCount !== EXPECTED_RECOVERED_PROJECT_COUNT ||
    !Array.isArray(manifest.projects) ||
    manifest.projects.length !== EXPECTED_RECOVERED_PROJECT_COUNT
  ) {
    failures.push(
      `${RECOVERED_MANIFEST_PATH}: expected ${EXPECTED_RECOVERED_PROJECT_COUNT} approved recovered projects`,
    )
  }

  const seenProjectIds = new Set()
  const seenSourceRunIds = new Set()
  const seenHrefs = new Set()
  const seenPackageFiles = new Set()
  const artifactPaths = new Set()
  let artifactVersionCount = 0

  for (const [index, project] of (Array.isArray(manifest.projects) ? manifest.projects : []).entries()) {
    const label = `${RECOVERED_MANIFEST_PATH} projects[${index}]`
    for (const [field, value, seen] of [
      ['projectId', project?.projectId, seenProjectIds],
      ['sourceRunId', project?.sourceRunId, seenSourceRunIds],
      ['href', project?.href, seenHrefs],
      ['sourceRunPackageFile', project?.sourceRunPackageFile, seenPackageFiles],
    ]) {
      if (typeof value !== 'string' || value.length === 0) {
        failures.push(`${label}: ${field} must be a nonblank string`)
      } else if (seen.has(value)) {
        failures.push(`${label}: duplicate ${field} ${value}`)
      } else {
        seen.add(value)
      }
    }

    if (!UUID_PATTERN.test(project?.projectId ?? '')) failures.push(`${label}: invalid projectId`)
    if (!UUID_PATTERN.test(project?.sourceRunId ?? '')) failures.push(`${label}: invalid sourceRunId`)
    if (
      !PUBLIC_ROUTE_PATTERN.test(project?.href ?? '') ||
      project.href.startsWith('/prompt/') ||
      project.href.startsWith('/recovered-source-runs/')
    ) {
      failures.push(`${label}: href must be a stable dedicated public route`)
    }
    if (
      typeof project?.sourceRunPackageFile !== 'string' ||
      !/^[a-z0-9][a-z0-9._-]*\.json$/.test(project.sourceRunPackageFile)
    ) {
      failures.push(`${label}: sourceRunPackageFile must be a seed-runs JSON basename`)
      continue
    }
    if (!/^\/artifacts\/[a-z0-9][a-z0-9._-]*\.html$/.test(project?.artifactPath ?? '')) {
      failures.push(`${label}: artifactPath must be a public artifact HTML path`)
    }

    const packagePath = `seed-runs/${project.sourceRunPackageFile}`
    if (!existsSync(path.join(root, packagePath))) {
      failures.push(`${label}: missing source-run package ${packagePath}`)
      continue
    }

    let pkg
    try {
      pkg = readJson(packagePath)
    } catch (error) {
      failures.push(`${packagePath}: ${error.message}`)
      continue
    }
    const packageSourceRunId =
      pkg.source_run_id ?? pkg.source_run_submission_id ?? pkg.pathforge_pending_id
    if (packageSourceRunId !== project.sourceRunId) {
      failures.push(`${packagePath}: immutable source-run id does not match the recovered manifest`)
    }
    const expectedFinalArtifact = `public${project.artifactPath}`
    if (pkg.final_artifact_path !== expectedFinalArtifact) {
      failures.push(`${packagePath}: final artifact does not match ${project.artifactPath}`)
    }

    const packageSteps = Array.isArray(pkg.steps) ? pkg.steps : []
    for (const [versionIndex, version] of (
      Array.isArray(pkg.artifact_versions) ? pkg.artifact_versions : []
    ).entries()) {
      const artifactPath = typeof version === 'string'
        ? version
        : version?.path ?? version?.artifact_path
      if (typeof artifactPath !== 'string' || artifactPath.length === 0) continue
      artifactVersionCount += 1

      const attachedSteps = packageSteps.filter((step) => (
        step?.artifact_version_path === artifactPath ||
        (Array.isArray(step?.generated_files) && step.generated_files.includes(artifactPath))
      ))
      if (attachedSteps.length === 0) {
        failures.push(
          `${packagePath}: artifact_versions[${versionIndex}] ${artifactPath} is not attached to any response step`,
        )
        continue
      }

      if (typeof version === 'object' && version !== null && version.step_number != null) {
        if (!Number.isInteger(version.step_number) || version.step_number < 1) {
          failures.push(
            `${packagePath}: artifact_versions[${versionIndex}] has invalid step_number ${version.step_number}`,
          )
          continue
        }
        if (!attachedSteps.some((step) => step?.step_number === version.step_number)) {
          failures.push(
            `${packagePath}: artifact_versions[${versionIndex}] ${artifactPath} is not attached to declared step ${version.step_number}`,
          )
        }
      }
    }

    const referencedPaths = referencedArtifactPaths(pkg)
    if (referencedPaths.size === 0) {
      failures.push(`${packagePath}: source-run package does not reference an artifact`)
    }
    for (const artifactPath of referencedPaths) {
      if (!/^public\/artifacts\/[a-z0-9][a-z0-9._/-]*\.html$/.test(artifactPath)) {
        failures.push(`${packagePath}: invalid referenced artifact path ${artifactPath}`)
        continue
      }
      artifactPaths.add(artifactPath)
      if (!existsSync(path.join(root, artifactPath))) {
        failures.push(`${packagePath}: missing referenced artifact ${artifactPath}`)
      }
    }
  }

  const routeAudit = loadCheckedDedicatedSourceRunRoutes(manifest)
  failures.push(...routeAudit.failures)
  for (const project of Array.isArray(manifest.projects) ? manifest.projects : []) {
    const checkedHref = routeAudit.routes.get(project.projectId)
    if (checkedHref !== project.href) {
      failures.push(
        `${RECOVERED_MANIFEST_PATH}: project ${project.projectId} can fall through to generic /prompt instead of ${project.href}`,
      )
    }
  }

  const nextConfig = read('next.config.ts')
  const recoveredRoute = read('src/app/recovered-source-runs/[slug]/page.tsx')
  const recoveredRegistry = read('src/lib/recovered-source-run-showcases.ts')
  const preparedRegistry = read('src/lib/prepared-showcase-projects.ts')
  for (const [file, content, text, message] of [
    ['next.config.ts', nextConfig, 'async rewrites()', 'must define recovered public rewrites'],
    ['next.config.ts', nextConfig, 'source: project.href', 'rewrites must preserve each manifest href'],
    ['next.config.ts', nextConfig, 'destination: `/recovered-source-runs/${project.href.slice(1)}`', 'rewrites must target the shared recovered route'],
    ['src/app/recovered-source-runs/[slug]/page.tsx', recoveredRoute, "from '@/components/PreparedSourceRunPage'", 'recovered routes must use PreparedSourceRunPage'],
    ['src/app/recovered-source-runs/[slug]/page.tsx', recoveredRoute, "import { preparedProjectIsPublic } from '@/lib/prepared-release-gates'", 'recovered routes must import the persisted publication release gate'],
    ['src/app/recovered-source-runs/[slug]/page.tsx', recoveredRoute, 'if (!await preparedProjectIsPublic(showcase.project.id)) notFound()', 'recovered routes must return notFound when persisted publication evidence is absent'],
    ['src/app/recovered-source-runs/[slug]/page.tsx', recoveredRoute, 'RECOVERED_SOURCE_RUN_SHOWCASES.map', 'recovered route must statically enumerate the registry'],
    ['src/app/recovered-source-runs/[slug]/page.tsx', recoveredRoute, 'loadSourceRunPackage(showcase.sourceRunPackageFile)', 'recovered route must load the checked package'],
    ['src/lib/recovered-source-run-showcases.ts', recoveredRegistry, 'manifest.projects.map', 'recovered registry must derive every project from the manifest'],
    ['src/lib/recovered-source-run-showcases.ts', recoveredRegistry, 'RECOVERED_SOURCE_RUN_ROUTE_OVERRIDES', 'recovered registry must export route overrides'],
    ['src/lib/prepared-showcase-projects.ts', preparedRegistry, '...RECOVERED_SOURCE_RUN_SHOWCASE_PROJECTS', 'prepared registry must include every recovered project'],
  ]) {
    if (!content.includes(text)) failures.push(`${file}: ${message}`)
  }

  return {
    failures,
    stats: {
      projects: seenProjectIds.size,
      packages: seenPackageFiles.size,
      artifacts: artifactPaths.size,
      artifactVersions: artifactVersionCount,
      routes: routeAudit.routes.size,
    },
    routes: routeAudit.routes,
  }
}
