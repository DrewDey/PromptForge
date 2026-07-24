/**
 * A repair replaces private quarantined bytes and returns the same submission
 * to manual review. Active admitted members may complete a requested repair
 * while operational gates are temporarily paused, but loss of admission or an
 * unverifiable status must fail closed.
 */
export function canSubmitCommunityProjectRepair(status) {
  return status === 'eligible' || status === 'temporarily_paused'
}

const COMMUNITY_PROJECT_SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCommunityProjectSubmissionId(value) {
  return typeof value === 'string' && COMMUNITY_PROJECT_SUBMISSION_ID_PATTERN.test(value)
}

/**
 * Resolve the private repair target before any owner-row lookup. Invalid
 * identifiers fail closed, and signed-out requests never touch owner data.
 */
export async function resolveCommunityProjectRepair({
  requestedRepairId,
  signedIn,
  readSubmission,
}) {
  if (requestedRepairId !== null && !isCommunityProjectSubmissionId(requestedRepairId)) {
    return {
      kind: 'invalid',
      repairId: null,
      submission: null,
    }
  }

  if (!requestedRepairId || !signedIn) {
    return {
      kind: requestedRepairId ? 'signed_out' : 'absent',
      repairId: requestedRepairId,
      submission: null,
    }
  }

  return {
    kind: 'resolved',
    repairId: requestedRepairId,
    submission: await readSubmission(requestedRepairId),
  }
}
