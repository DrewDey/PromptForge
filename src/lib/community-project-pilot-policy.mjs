/**
 * A repair replaces private quarantined bytes and returns the same submission
 * to manual review. Active admitted members may complete a requested repair
 * while operational gates are temporarily paused, but loss of admission or an
 * unverifiable status must fail closed.
 */
export function canSubmitCommunityProjectRepair(status) {
  return status === 'eligible' || status === 'temporarily_paused'
}
