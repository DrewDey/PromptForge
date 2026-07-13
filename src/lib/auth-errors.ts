type AuthErrorLike = {
  code?: string
  message?: string
}

export function friendlyAuthError(error: AuthErrorLike | null | undefined, fallback: string) {
  const code = error?.code?.toLowerCase() ?? ''
  const message = error?.message?.toLowerCase() ?? ''

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Email or password is incorrect.'
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Confirm your email before logging in. You can request a fresh confirmation link below.'
  }
  if (code.includes('over_') || message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts were made in a short time. Wait a few minutes and try again.'
  }
  if (code === 'weak_password' || message.includes('password should') || message.includes('weak password')) {
    return 'Choose a stronger password that meets every requirement below.'
  }
  if (code.includes('captcha') || message.includes('captcha')) {
    return 'The verification check expired. Refresh the page and try again.'
  }
  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'An account or handle already uses those details. Log in, reset your password, or choose another handle.'
  }
  if (message.includes('database error saving new user')) {
    return 'That handle may already be in use. Choose another handle and try again.'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'PathForge could not reach the account service. Check your connection and try again.'
  }

  return fallback
}
