import rawProjection from './prepared-project-model-identities.json'

export type PreparedProjectModelIdentity = {
  sourceRunPackageFile: string
  provider: string
  model: string
  setting: string
  exactness: 'exact' | 'version-unexposed' | 'model-unexposed'
  publicLabel: string
}

type PreparedProjectModelIdentityProjection = {
  schemaVersion: 1
  projectCount: number
  projects: Record<string, PreparedProjectModelIdentity>
}

const projection = rawProjection as PreparedProjectModelIdentityProjection

if (
  projection.schemaVersion !== 1 ||
  projection.projectCount !== Object.keys(projection.projects).length
) {
  throw new Error('Prepared-project model identity projection is invalid.')
}

export function getPreparedProjectModelIdentity(projectId: string) {
  return projection.projects[projectId] ?? null
}
