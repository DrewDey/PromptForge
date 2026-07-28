import 'server-only'

import { PREPARED_SHOWCASE_PROJECTS } from './prepared-showcase-projects'
import { getProjectModelVariantArtifactPublicationEntries } from './project-model-variants'
import {
  findSourceRunPackageFileById,
  loadSourceRunPackage,
} from './source-run-package'

let artifactProjectMap: Map<string, ReadonlySet<string>> | null = null

function normalizedArtifactPath(value?: string | null) {
  if (!value) return null
  const normalized = value.startsWith('/artifacts/')
    ? `public${value}`
    : value
  if (!normalized.startsWith('public/artifacts/')) return null
  if (normalized.includes('..') || normalized.includes('\\')) return null
  return normalized
}

function buildArtifactProjectMap() {
  const mutable = new Map<string, Set<string>>()
  const attach = (path: string | null, projectId: string) => {
    if (!path) return
    const existing = mutable.get(path) ?? new Set<string>()
    existing.add(projectId)
    mutable.set(path, existing)
  }

  for (const project of PREPARED_SHOWCASE_PROJECTS) {
    attach(normalizedArtifactPath(project.artifactPath), project.id)
    // Legacy prepared packages may predate canonical top-level source_run_id
    // even though the owning prepared project pins the exact package file.
    // Their historical artifacts are rendered by the shared lineage workspace,
    // so publish them through the same approved-project gate as newer indexed
    // packages instead of exposing controls that deterministically 404.
    const packageFile = project.sourceRunPackageFile
      ?? findSourceRunPackageFileById(project.sourceRunId)
    if (!packageFile) continue
    const sourceRun = loadSourceRunPackage(packageFile)
    attach(normalizedArtifactPath(sourceRun.final_artifact_path), project.id)
    for (const step of sourceRun.steps) {
      attach(normalizedArtifactPath(step.artifact_version_path), project.id)
      for (const generatedFile of step.generated_files ?? []) {
        attach(normalizedArtifactPath(generatedFile), project.id)
      }
    }
  }

  for (const entry of getProjectModelVariantArtifactPublicationEntries()) {
    attach(normalizedArtifactPath(entry.artifactPath), entry.projectId)
  }

  // This non-indexed route exists only for the repository's local browser
  // lineage guard. Production still fails closed because its fixture project
  // has no approved database row.
  attach('public/artifacts/fork-lineage-grandchild-fixture.html', 'cf151b15-2b30-4eef-90d1-15654e74bac1')

  return new Map([...mutable].map(([path, ids]) => [path, ids as ReadonlySet<string>]))
}

export function preparedProjectIdsForArtifact(artifactPath: string) {
  artifactProjectMap ??= buildArtifactProjectMap()
  return artifactProjectMap.get(artifactPath) ?? new Set<string>()
}
