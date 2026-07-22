import type { Profile } from './types'

export type PublicBuilderProvenanceKind = NonNullable<Profile['provenance']>['kind']

export function publicBuilderProvenanceLabel(
  kind: PublicBuilderProvenanceKind | null | undefined,
) {
  if (kind === 'pathforge_team') return 'PathForge team'
  if (kind === 'pathforge_seed') return 'PathForge-operated'
  return null
}
