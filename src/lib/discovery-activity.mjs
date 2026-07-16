export const ACTIVE_PROJECT_EXPLANATION =
  'Active requires at least two verified model runs, two approved forks, or one of each. The score adds 2 points per verified run (maximum 6), 2 per approved fork (maximum 6), plus 1 each for any vote, any save, and at least 4 combined votes and saves (maximum 3). Verified run and approved fork dates break ties; votes and saves alone never qualify a project.'

function nonNegativeInteger(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function timestamp(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
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
 * @param {{ isActive: boolean, activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ isActive: boolean, activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareActiveDiscoveryItems(left, right) {
  return (
    Number(right.isActive) - Number(left.isActive) ||
    right.activityScore - left.activityScore ||
    right.modelRunCount - left.modelRunCount ||
    right.forkCount - left.forkCount ||
    stableActivityTieBreak(left, right)
  )
}

/**
 * @param {{ activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareForkDiscoveryItems(left, right) {
  return (
    right.forkCount - left.forkCount ||
    right.modelRunCount - left.modelRunCount ||
    right.activityScore - left.activityScore ||
    stableActivityTieBreak(left, right)
  )
}

/**
 * @param {{ activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} left
 * @param {{ activityScore: number, modelRunCount: number, forkCount: number, latestActivityAt: string | null, createdAt: string, title: string, id: string }} right
 */
export function compareModelRunDiscoveryItems(left, right) {
  return (
    right.modelRunCount - left.modelRunCount ||
    right.forkCount - left.forkCount ||
    right.activityScore - left.activityScore ||
    stableActivityTieBreak(left, right)
  )
}
