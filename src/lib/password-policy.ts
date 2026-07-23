// Keep this in lockstep with Supabase Auth's production minimum. A weaker
// browser-side rule only creates a failed signup after the user has finished
// the form, while a stronger one needlessly rejects a policy-valid password.
export const PATHFORGE_PASSWORD_MIN_LENGTH = 12

export function pathForgePasswordChecks(password: string) {
  return [
    { label: `${PATHFORGE_PASSWORD_MIN_LENGTH}+ characters`, complete: password.length >= PATHFORGE_PASSWORD_MIN_LENGTH },
    { label: 'A letter', complete: /[A-Za-z]/.test(password) },
    { label: 'A number', complete: /\d/.test(password) },
  ]
}
export function pathForgePasswordIsReady(password: string) {
  return pathForgePasswordChecks(password).every((check) => check.complete)
}
