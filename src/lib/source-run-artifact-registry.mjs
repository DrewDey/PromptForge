/**
 * Resolve one artifact package by its complete public viewer identity.
 *
 * Path-only fallback can silently select an artifact from another generation,
 * while id-only fallback can select stale bytes after an artifact version
 * changes. Conflicting packages therefore fail closed.
 *
 * @template {{
 *   id: string,
 *   artifactPath: string,
 *   stepId: string,
 *   stepNumber: number,
 *   artifactSha256?: string
 * }} T
 * @param {T[]} packages
 * @param {string} artifactPath
 * @param {string} artifactId
 * @returns {T | undefined}
 */
export function resolveExactArtifactPackage(packages, artifactPath, artifactId) {
  const idMatches = packages.filter((pkg) => pkg.id === artifactId)
  if (
    idMatches.length === 0 ||
    idMatches.some((pkg) => pkg.artifactPath !== artifactPath)
  ) {
    return undefined
  }

  const candidate = idMatches[0]
  const hasConflictingEvidence = idMatches.some((pkg) => (
    pkg.stepId !== candidate.stepId ||
    pkg.stepNumber !== candidate.stepNumber ||
    pkg.artifactSha256 !== candidate.artifactSha256
  ))
  return hasConflictingEvidence ? undefined : candidate
}
