#!/usr/bin/env node

import { createRequire } from 'node:module'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { isDeepStrictEqual } from 'node:util'
import ts from 'typescript'
import { loadCheckedDedicatedSourceRunRoutes } from './source-run-publication-registry.mjs'

const PROJECTION_PATH = 'src/lib/prepared-project-model-identities.json'
const FEATURED_PROJECTS_PATH = 'src/lib/featured-projects.ts'
const SOURCE_RUN_REGISTRY_PATH = 'scripts/check-source-run-showcases.mjs'
const CURATED_MANIFEST_PATH = 'seed-runs/curation/2026-07-10-accepted-projects.json'
const RECOVERED_MANIFEST_PATH = 'seed-runs/curation/2026-07-16-recovered-approved-source-runs.json'
const MINIMUM_PROJECT_COUNT = 170
const RUNTIME_PROJECTION_CONSUMERS = [
  'src/lib/path-discovery.ts',
  'src/lib/profile-presentation.ts',
  'src/app/my-forge/page.tsx',
  'src/components/ProjectCommunityPanel.tsx',
]

function read(path) {
  return readFileSync(path, 'utf8')
}

function readJson(path) {
  return JSON.parse(read(path))
}

function loadIdentityFormatter() {
  const buildDirectory = mkdtempSync(join(tmpdir(), 'pathforge-prepared-model-identity-'))

  try {
    for (const sourcePath of ['src/lib/models.ts', 'src/lib/public-model-labels.ts']) {
      const result = ts.transpileModule(read(sourcePath), {
        fileName: sourcePath,
        reportDiagnostics: true,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      })
      if (result.diagnostics?.length) {
        const messages = result.diagnostics
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
          .join('\n')
        throw new Error(`${sourcePath}: formatter compilation failed:\n${messages}`)
      }
      writeFileSync(
        join(buildDirectory, `${basename(sourcePath, '.ts')}.js`),
        result.outputText,
      )
    }

    const requireFromBuild = createRequire(join(buildDirectory, 'guard.cjs'))
    const formatter = requireFromBuild(join(buildDirectory, 'public-model-labels.js'))
    if (typeof formatter.getPublicModelIdentity !== 'function') {
      throw new Error('src/lib/public-model-labels.ts does not export getPublicModelIdentity')
    }
    return {
      getPublicModelIdentity: formatter.getPublicModelIdentity,
      cleanup: () => rmSync(buildDirectory, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(buildDirectory, { recursive: true, force: true })
    throw error
  }
}

function featuredProjectIds() {
  const ids = new Map()
  for (const match of read(FEATURED_PROJECTS_PATH).matchAll(
    /export const ([A-Z][A-Z0-9_]*)\s*=\s*(['"])([^'"]+)\2/g,
  )) {
    ids.set(match[1], match[3])
  }
  return ids
}

function checkedProjectPackages() {
  const mappings = new Map()
  const add = (projectId, sourceRunPackageFile, source) => {
    if (!projectId || !sourceRunPackageFile) {
      throw new Error(`${source}: missing project or package identity`)
    }
    const normalizedFile = sourceRunPackageFile.replace(/^seed-runs\//, '')
    const existing = mappings.get(projectId)
    if (existing && existing !== normalizedFile) {
      throw new Error(`${source}: project ${projectId} maps to both ${existing} and ${normalizedFile}`)
    }
    mappings.set(projectId, normalizedFile)
  }

  const constants = featuredProjectIds()
  const sourceRegistry = read(SOURCE_RUN_REGISTRY_PATH)
  const registryStart = sourceRegistry.indexOf('const sourceRunProjects = [')
  const registryEnd = sourceRegistry.indexOf("const curatedManifestPath = '")
  if (registryStart === -1 || registryEnd <= registryStart) {
    throw new Error(`${SOURCE_RUN_REGISTRY_PATH}: could not isolate the checked prepared-project registry`)
  }

  const literalRegistry = sourceRegistry.slice(registryStart, registryEnd)
  for (const block of literalRegistry.split(/\n\s*\},\s*\n\s*\{/)) {
    const projectConstant = block.match(/projectId:\s*'([A-Z][A-Z0-9_]*)'/)?.[1]
    const packagePath = block.match(/packagePath:\s*'([^']+\.json)'/)?.[1]
    if (!projectConstant || !packagePath) continue
    const projectId = constants.get(projectConstant)
    if (!projectId) {
      throw new Error(`${SOURCE_RUN_REGISTRY_PATH}: unresolved project constant ${projectConstant}`)
    }
    add(projectId, packagePath, SOURCE_RUN_REGISTRY_PATH)
  }

  const curated = readJson(CURATED_MANIFEST_PATH)
  for (const project of curated.projects ?? []) {
    add(project.projectId, project.packageFile, CURATED_MANIFEST_PATH)
  }

  const recovered = readJson(RECOVERED_MANIFEST_PATH)
  for (const project of recovered.projects ?? []) {
    add(project.projectId, project.sourceRunPackageFile, RECOVERED_MANIFEST_PATH)
  }

  return mappings
}

function expectedProjection() {
  const { getPublicModelIdentity, cleanup } = loadIdentityFormatter()
  const mappings = checkedProjectPackages()
  const routeAudit = loadCheckedDedicatedSourceRunRoutes()
  if (routeAudit.failures.length > 0) {
    throw new Error(routeAudit.failures.join('\n'))
  }
  if (mappings.size < MINIMUM_PROJECT_COUNT) {
    throw new Error(`prepared identity projection shrank to ${mappings.size} projects`)
  }

  try {
    const projects = {}
    for (const [projectId, sourceRunPackageFile] of [...mappings.entries()].sort()) {
      if (!routeAudit.routes.has(projectId)) {
        throw new Error(`${projectId}: checked package has no dedicated prepared-project route`)
      }
      const packagePath = `seed-runs/${sourceRunPackageFile}`
      if (!existsSync(packagePath)) throw new Error(`${packagePath}: source package is missing`)
      const sourcePackage = readJson(packagePath)
      const provider = sourcePackage.provider?.trim() ?? ''
      const model = (sourcePackage.model ?? sourcePackage.model_used)?.trim() ?? ''
      if (!provider || !model) {
        throw new Error(`${packagePath}: provider and model evidence are required`)
      }
      const identity = getPublicModelIdentity({
        provider,
        model,
        modelSettings: sourcePackage.model_settings,
      })
      if (!identity.label) throw new Error(`${packagePath}: canonical public model label is blank`)

      projects[projectId] = {
        sourceRunPackageFile,
        provider,
        model,
        setting: identity.setting,
        exactness: identity.exactness,
        publicLabel: identity.label,
      }
    }

    return {
      schemaVersion: 1,
      projectCount: Object.keys(projects).length,
      projects,
    }
  } finally {
    cleanup()
  }
}

function assertRuntimeProjectionConsumers() {
  for (const path of RUNTIME_PROJECTION_CONSUMERS) {
    const source = read(path)
    if (!source.includes('getPreparedProjectModelIdentity')) {
      throw new Error(`${path}: must use the checked prepared-project identity projection`)
    }
    if (source.includes('loadSourceRunPackage')) {
      throw new Error(`${path}: must not load full source-run packages for prepared model labels`)
    }
  }
}

let expected
try {
  expected = expectedProjection()
} catch (error) {
  console.error(`Prepared-project model identity guard failed:\n- ${error.message}`)
  process.exit(1)
}

if (process.argv.includes('--write')) {
  writeFileSync(PROJECTION_PATH, `${JSON.stringify(expected, null, 2)}\n`)
  console.log(`Wrote ${expected.projectCount} prepared-project model identities to ${PROJECTION_PATH}.`)
  process.exit(0)
}

let actual
try {
  actual = readJson(PROJECTION_PATH)
} catch (error) {
  console.error(`Prepared-project model identity guard failed:\n- ${PROJECTION_PATH}: ${error.message}`)
  process.exit(1)
}

if (!isDeepStrictEqual(actual, expected)) {
  console.error(
    `Prepared-project model identity guard failed:\n- ${PROJECTION_PATH} does not match checked prepared-project package evidence. Run node scripts/check-prepared-project-model-identities.mjs --write and review the diff.`,
  )
  process.exit(1)
}

try {
  assertRuntimeProjectionConsumers()
} catch (error) {
  console.error(`Prepared-project model identity guard failed:\n- ${error.message}`)
  process.exit(1)
}

console.log(`Prepared-project model identity guard passed for ${expected.projectCount} projects.`)
