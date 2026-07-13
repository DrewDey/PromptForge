export const PATHFORGE_PASSWORD_MIN_LENGTH = 10

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
