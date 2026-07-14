'use client'

import Link from 'next/link'
import { Check, KeyRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AuthFormHeader,
  AuthNotice,
  AuthPageShell,
  PasswordField,
  SubmitButton,
} from '../AuthPageShell'
import { friendlyAuthError } from '@/lib/auth-errors'
import { authHref, safeAuthNextPath } from '@/lib/auth-redirects'
import { PATHFORGE_PASSWORD_MIN_LENGTH, pathForgePasswordChecks } from '@/lib/password-policy'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

const STEPS = [
  { label: 'Use a strong password', description: 'Long and unique is best' },
  { label: 'Remove old sessions', description: 'Other devices are signed out' },
  { label: 'Return to PathForge', description: 'Continue where you started' },
]

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const nextPath = safeAuthNextPath(searchParams.get('next'))
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const checks = pathForgePasswordChecks(password)
  const passwordReady = checks.every((check) => check.complete)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return
      setHasSession(Boolean(data.user && !userError))
      setChecking(false)
    })
    return () => { active = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!passwordReady) {
      setError('Choose a password that meets every requirement below.')
      return
    }
    if (password !== confirmation) {
      setError('The two passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(friendlyAuthError(updateError, 'PathForge could not update your password. Request a new reset link and try again.'))
      setLoading(false)
      return
    }

    // Keep the recovered browser signed in while invalidating other sessions.
    await supabase.auth.signOut({ scope: 'others' })
    setComplete(true)
    setLoading(false)
  }

  if (complete) {
    return (
      <div className="pf-auth">
        <div className="form-panel">
          <div className="success-card">
            <div className="success-icon"><KeyRound aria-hidden="true" /></div>
            <div className="eyebrow">Account secured</div>
            <h1>Password <span className="serif">updated.</span></h1>
            <p>Your new password is active and other signed-in devices have been removed.</p>
            <Link href={nextPath} className="btn-primary">Continue to PathForge</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title="Secure the account and"
      accent="continue."
      lead="Choose a new password, remove old sessions, and return to the page you were using."
      items={STEPS}
    >
      <div className="form-card">
        <AuthFormHeader
          eyebrow="New password"
          title="Choose something"
          accent="strong."
          copy="Use a password you do not use on another website."
        />

        {error && <AuthNotice kind="error">{error}</AuthNotice>}
        {checking && <AuthNotice kind="info">Verifying your reset link…</AuthNotice>}
        {!checking && !hasSession && (
          <AuthNotice kind="error">
            This reset link is invalid or expired. <Link href={authHref('/auth/forgot-password', nextPath)}>Request a new one.</Link>
          </AuthNotice>
        )}

        {hasSession && (
          <form onSubmit={handleSubmit}>
            <PasswordField
              id="new-password"
              name="password"
              label="New password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              minLength={PATHFORGE_PASSWORD_MIN_LENGTH}
              describedBy="new-password-help"
            />
            <div id="new-password-help" className="password-checks" aria-live="polite">
              {checks.map((check) => (
                <span key={check.label} className={check.complete ? 'complete' : ''}>
                  <i aria-hidden="true">{check.complete && <Check />}</i>
                  {check.label}
                </span>
              ))}
            </div>
            <PasswordField
              id="confirm-password"
              name="confirmation"
              label="Confirm password"
              placeholder="Type it again"
              autoComplete="new-password"
              value={confirmation}
              onChange={setConfirmation}
              minLength={PATHFORGE_PASSWORD_MIN_LENGTH}
            />
            <SubmitButton loading={loading} idle="Update password" pending="Updating…" />
          </form>
        )}

        <p className="form-foot"><Link href={authHref('/auth/login', nextPath)}>Return to login</Link></p>
      </div>
    </AuthPageShell>
  )
}
