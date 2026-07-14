export const PROFILE_HANDLE_PATTERN = /^[A-Za-z0-9_]{3,30}$/

export type ProfileIdentityInput = {
  displayName?: string | null
  username?: string | null
  bio?: string | null
}

export type ProfileIdentitySignal = {
  key: 'display-name' | 'handle' | 'bio'
  label: string
  complete: boolean
}

/**
 * Identity readiness only describes whether a public profile can introduce its
 * builder clearly. Published work is portfolio progress, not an identity
 * requirement, so the two surfaces cannot disagree about whether a profile is
 * ready simply because review has not published a project yet.
 */
export function deriveProfileIdentityReadiness(input: ProfileIdentityInput) {
  const signals: ProfileIdentitySignal[] = [
    {
      key: 'display-name',
      label: 'A recognizable display name',
      complete: (input.displayName?.trim().length ?? 0) >= 2,
    },
    {
      key: 'handle',
      label: 'A valid public handle',
      complete: PROFILE_HANDLE_PATTERN.test(input.username?.trim() ?? ''),
    },
    {
      key: 'bio',
      label: 'A factual builder bio',
      complete: Boolean(input.bio?.trim()),
    },
  ]
  const completeCount = signals.filter((signal) => signal.complete).length

  return {
    signals,
    completeCount,
    totalCount: signals.length,
    isComplete: completeCount === signals.length,
  }
}
