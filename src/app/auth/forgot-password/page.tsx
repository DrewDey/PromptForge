'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AuthFormHeader,
  AuthNotice,
  AuthPageShell,
  SubmitButton,
} from '../AuthPageShell'
import { friendlyAuthError } from '@/lib/auth-errors'
import { authCallbackUrl, authHref, safeAuthNextPath } from '@/lib/auth-redirects'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

const STEPS = [
  { label: 'Request a link', description: 'Use the email on your account' },
  { label: 'Open it once', description: 'Reset links expire for your protection' },
  { label: 'Choose a new password', description: 'Other signed-in devices are removed' },
]

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const nextPath = safeAuthNextPath(searchParams.get('next'))
  const linkError = searchParams.get('error') === 'auth'
    ? 'That reset link is invalid or expired. Request a fresh link below.'
    : ''
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const resetDestination = authHref('/auth/reset-password', nextPath)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authCallbackUrl(window.location.origin, resetDestination, 'recovery'),
    })

    if (resetError) {
      setError(friendlyAuthError(resetError, 'PathForge could not send a reset email. Try again.'))
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="pf-auth">
        <main className="form-panel">
          <div className="success-card">
            <div className="success-icon"><Mail aria-hidden="true" /></div>
            <div className="eyebrow">Reset requested</div>
            <h1>Check your <span className="serif">email.</span></h1>
            <p>If an account exists for <strong>{email.trim()}</strong>, a password reset link is on its way.</p>
            <p className="success-help">The message may take a minute. The link expires and should only be used once.</p>
            <div className="success-actions">
              <button type="button" className="btn-secondary" onClick={() => setSent(false)}>Try another email</button>
              <Link href={authHref('/auth/login', nextPath)} className="btn-primary">Return to login</Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title="Get back to your"
      accent="work."
      lead="Password recovery returns you to the PathForge page you were trying to use."
      items={STEPS}
    >
      <div className="form-card">
        <AuthFormHeader
          eyebrow="Reset password"
          title="Find your"
          accent="account."
          copy="Enter your email and we will send a secure reset link if an account exists."
        />
        {(error || linkError) && <AuthNotice kind="error">{error || linkError}</AuthNotice>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="recovery-email">Email</label>
            <input
              id="recovery-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <SubmitButton loading={loading} idle="Send reset link" pending="Sending…" />
        </form>
        <p className="privacy-note">For privacy, PathForge shows the same confirmation whether or not that email has an account.</p>
        <p className="form-foot"><Link href={authHref('/auth/login', nextPath)}>Back to login</Link></p>
      </div>
    </AuthPageShell>
  )
}
