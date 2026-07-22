export const ACTIVE_PROJECT_EXPLANATION =
  'Active requires at least two artifact-verified model runs, two approved forks, or one of each. The score adds 2 points per artifact-verified run (maximum 6), 2 per approved fork (maximum 6), plus 1 each for any vote, any save, and at least 4 combined votes and saves (maximum 3). Artifact-verified run and approved fork dates break ties; votes and saves alone never qualify a project.'

function nonNegativeInteger(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function timestamp(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Counts distinct verified model labels for one canonical project. Repeated
 * runs from the same model stay one model so the multi-model sort cannot be
 * inflated by reruns.
 *
 * @param {string[]} modelLabels
 */
export function countDistinctVerifiedModels(modelLabels) {
  return new Set(modelLabels
    .map((label) => label.trim().toLowerCase())
    .filter(Boolean)).size
}

/**
 * A model-run selector is longitudinal: two captures from the same public
 * model remain two selectable results when their source-run identities differ.
 *
 * @template {{ sourceRunId: string }} T
 * @param {T[]} modelVariants
 * @returns {T[]}
 */
export function retainDistinctRecordedModelRuns(modelVariants) {
  const runsBySourceRunId = new Map()

  for (const variant of modelVariants) {
    const sourceRunId = variant.sourceRunId.trim()
    if (!sourceRunId) {
      throw new Error('Recorded model runs require a source-run identity.')
    }
    if (runsBySourceRunId.has(sourceRunId)) {
      throw new Error(`Duplicate recorded source-run identity: ${sourceRunId}`)
    }
    runsBySourceRunId.set(sourceRunId, variant)
  }

  return [...runsBySourceRunId.values()]
}

/**
 * The configured family default owns canonical prompt/artifact/link metadata.
 * Refuse ambiguous or missing defaults instead of silently using sort order.
 *
 * @template {{ isCanonicalDefault: boolean }} T
 * @param {T[]} modelVariants
 * @returns {T}
 */
export function requireCanonicalDefaultModelRun(modelVariants) {
  const canonicalDefaults = modelVariants.filter((variant) => variant.isCanonicalDefault)
  if (canonicalDefaults.length !== 1) {
    throw new Error(
      `Discovery projects require exactly one canonical default model run; found ${canonicalDefaults.length}.`,
    )
  }

  return canonicalDefaults[0]
}

/**
 * Keeps the public recorded-family total separate from the artifact-verified
 * run count that powers Active and ranking. Known-issue history remains a
 * recorded result, but cannot increase activity.
 *
 * @param {unknown[]} modelVariants
 * @param {unknown[]} verifiedVariantSummary
 */
export function deriveDiscoveryRunCounts(modelVariants, verifiedVariantSummary) {
  const modelRunCount = Array.isArray(modelVariants) ? modelVariants.length : 0
  const verifiedModelRunCount = Array.isArray(verifiedVariantSummary)
    ? verifiedVariantSummary.length
    : 0

  if (modelRunCount < 1) {
    throw new Error('Discovery projects must expose at least one recorded model run.')
  }
  if (verifiedModelRunCount > modelRunCount) {
    throw new Error('Artifact-verified model runs cannot exceed recorded model runs.')
  }

  return { modelRunCount, verifiedModelRunCount }
}

/**
 * Durable activity and cheap engagement are deliberately separate. A project
 * cannot earn Active from votes or saves alone, and every signal is capped so
 * one large count cannot dominate the library.
 *
 * @param {{
 *   modelRunCount: number
 *   forkCount: number
 *   voteCount: number
 *   bookmarkCount: number
 * }} input
 */
export function calculateDiscoveryActivity(input) {
  const modelRunCount = nonNegativeInteger(input.modelRunCount)
  const forkCount = nonNegativeInteger(input.forkCount)
  const voteCount = nonNegativeInteger(input.voteCount)
  const bookmarkCount = nonNegativeInteger(input.bookmarkCount)

  const modelRunPoints = Math.min(modelRunCount, 3) * 2
  const forkPoints = Math.min(forkCount, 3) * 2
  const communityPoints =
    (voteCount > 0 ? 1 : 0) +
    (bookmarkCount > 0 ? 1 : 0) +
    (voteCount + bookmarkCount >= 4 ? 1 : 0)
  const score = modelRunPoints + forkPoints + communityPoints
  const hasDurableDepth =
    modelRunCount >= 2 ||
    forkCount >= 2 ||
    (modelRunCount >= 1 && forkCount >= 1)

  return {
    score,
    isActive: hasDurableDepth && score >= 4,
    modelRunPoints,
    forkPoints,
    communityPoints,
  }
}

/**
 * @param {{ latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
function stableActivityTieBreak(left, right) {
  return (
    timestamp(right.latestActivityAt) - timestamp(left.latestActivityAt) ||
    timestamp(right.createdAt) - timestamp(left.createdAt) ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  )
}

/**
 * @param {{ isActive: boolean, activityScore: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ isActive: boolean, activityScore: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareActiveDiscoveryItems(left, right) {
  return (
    Number(right.isActive) - Number(left.isActive) ||
    right.activityScore - left.activityScore ||
    right.verifiedModelRunCount - left.verifiedModelRunCount ||
    right.forkCount - left.forkCount ||
    stableActivityTieBreak(left, right)
  )
}

/**
 * @param {{ activityScore: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ activityScore: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareForkDiscoveryItems(left, right) {
  return (
    right.forkCount - left.forkCount ||
    right.verifiedModelRunCount - left.verifiedModelRunCount ||
    right.activityScore - left.activityScore ||
    stableActivityTieBreak(left, right)
  )
}

/**
 * @param {{ activityScore: number, verifiedModelCount: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ activityScore: number, verifiedModelCount: number, verifiedModelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareMultiModelDiscoveryItems(left, right) {
  return (
    right.verifiedModelCount - left.verifiedModelCount ||
    right.verifiedModelRunCount - left.verifiedModelRunCount ||
    right.forkCount - left.forkCount ||
    right.activityScore - left.activityScore ||
    stableActivityTieBreak(left, right)
  )
}
