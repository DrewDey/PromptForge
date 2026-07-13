'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AuthFormHeader,
  AuthNotice,
  AuthPageShell,
  OAuthButtons,
  PasswordField,
  SubmitButton,
  useEnabledOAuthProviders,
} from '../AuthPageShell'
import { friendlyAuthError } from '@/lib/auth-errors'
import { authCallbackUrl, authHref, safeAuthNextPath } from '@/lib/auth-redirects'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

const FLOW = [
  { label: 'Explore', description: 'Find a proven build path' },
  { label: 'Fork', description: 'Continue from the useful step' },
  { label: 'Keep building', description: 'Save your work in My Forge' },
]

const STATUS_MESSAGES: Record<string, string> = {
  'password-updated': 'Your password was updated. Log in with the new password.',
  'signed-out': 'You have been logged out.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const [oauthPending, setOauthPending] = useState<'github' | 'google' | null>(null)
  const enabledOAuthProviders = useEnabledOAuthProviders()
  const nextPath = safeAuthNextPath(searchParams.get('next'))
  const statusMessage = STATUS_MESSAGES[searchParams.get('status') ?? '']
  const callbackError = searchParams.get('error') === 'auth'
    ? 'That sign-in link is invalid or expired. Try logging in again.'
    : ''

  async function handleOAuth(provider: 'github' | 'google') {
    setError('')
    setOauthPending(provider)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authCallbackUrl(window.location.origin, nextPath, 'oauth') },
    })
    if (oauthError) {
      setError(friendlyAuthError(oauthError, 'PathForge could not start that sign-in. Try again.'))
      setOauthPending(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: String(formData.get('password') ?? ''),
    })

    if (loginError) {
      const needsConfirmation = loginError.code === 'email_not_confirmed' || loginError.message.toLowerCase().includes('email not confirmed')
      setUnconfirmedEmail(needsConfirmation ? email : '')
      setResendStatus('')
      setError(friendlyAuthError(loginError, 'PathForge could not log you in. Try again.'))
      setLoading(false)
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  async function handleResendConfirmation() {
    if (!unconfirmedEmail || resending) return
    setResending(true)
    setResendStatus('')

    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: {
        emailRedirectTo: authCallbackUrl(window.location.origin, nextPath, 'signup'),
      },
    })

    if (resendError) {
      setError(friendlyAuthError(resendError, 'PathForge could not send another confirmation link. Try again shortly.'))
    } else {
      setError('')
      setResendStatus('If the account still needs confirmation, a fresh link is on its way.')
    }
    setResending(false)
  }

  return (
    <AuthPageShell
      eyebrow="Your workspace"
      title="Return to what you"
      accent="started."
      lead="Your saved paths, forks, submissions, and model updates stay together in My Forge."
      items={FLOW}
    >
      <div className="form-card">
        <AuthFormHeader
          eyebrow="Log in"
          title="Welcome"
          accent="back."
          copy="Continue building from the exact place you left off."
        />

        {(error || callbackError) && (
          <AuthNotice kind="error">
            {error || callbackError}
            {unconfirmedEmail && (
              <button type="button" className="auth-inline-action" onClick={handleResendConfirmation} disabled={resending}>
                {resending ? 'Sending…' : 'Resend confirmation'}
              </button>
            )}
          </AuthNotice>
        )}
        {resendStatus && <AuthNotice kind="success">{resendStatus}</AuthNotice>}
        {statusMessage && <AuthNotice kind="success">{statusMessage}</AuthNotice>}

        {enabledOAuthProviders.length > 0 && (
          <OAuthButtons providers={enabledOAuthProviders} pending={oauthPending} disabled={loading} onOAuth={handleOAuth} />
        )}
        <div className="oauth-divider">{enabledOAuthProviders.length > 0 ? 'or log in with email' : 'log in with email'}</div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" />
          </div>
          <PasswordField
            id="login-password"
            name="password"
            placeholder="Your password"
            autoComplete="current-password"
          />
          <div className="form-assist">
            <Link href={authHref('/auth/forgot-password', nextPath)}>Forgot your password?</Link>
          </div>
          <SubmitButton loading={loading} idle="Log in" pending="Logging in…" />
        </form>

        <p className="form-foot">
          New to PathForge? <Link href={authHref('/auth/signup', nextPath)}>Create an account</Link>
        </p>
      </div>
    </AuthPageShell>
  )
}
