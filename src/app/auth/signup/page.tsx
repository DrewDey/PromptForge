'use client'

import Link from 'next/link'
import { Check, Mail } from 'lucide-react'
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
import { PATHFORGE_PASSWORD_MIN_LENGTH, pathForgePasswordChecks } from '@/lib/password-policy'
import { isPathForgeReservedProfileHandle } from '@/lib/profile-handles'
import { createClient } from '@/lib/supabase/client'
import { trackActivationEvent } from '@/lib/activation/track'
import '../auth.css'

const PERKS = [
  { label: 'Keep your build paths', description: 'Resume work without losing context' },
  { label: 'Share the full process', description: 'Prompts, responses, artifacts, and forks' },
  { label: 'Build a useful record', description: 'Your profile improves with every project' },
]

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')
  const [password, setPassword] = useState('')
  const [oauthPending, setOauthPending] = useState<'github' | 'google' | null>(null)
  const enabledOAuthProviders = useEnabledOAuthProviders()
  const nextPath = safeAuthNextPath(searchParams.get('next'))
  const checks = pathForgePasswordChecks(password)
  const passwordReady = checks.every((check) => check.complete)

  async function handleOAuth(provider: 'github' | 'google') {
    setError('')
    setOauthPending(provider)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authCallbackUrl(window.location.origin, nextPath, 'oauth') },
    })
    if (oauthError) {
      setError(friendlyAuthError(oauthError, 'PathForge could not start account creation. Try again.'))
      setOauthPending(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      setError('Use 3 to 30 letters, numbers, or underscores for your handle.')
      setLoading(false)
      return
    }
    if (isPathForgeReservedProfileHandle(username)) {
      setError('That handle is reserved for an existing PathForge builder profile.')
      setLoading(false)
      return
    }
    if (!passwordReady) {
      setError('Choose a password that meets every requirement below.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: conflicts, error: availabilityError } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', escapeLikePattern(username))
      .limit(3)

    if (availabilityError) {
      setError('PathForge could not verify that handle. Try again.')
      setLoading(false)
      return
    }
    if ((conflicts ?? []).some((profile) => profile.username?.toLowerCase() === username.toLowerCase())) {
      setError('That handle is already in use. Choose another one.')
      setLoading(false)
      return
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(window.location.origin, nextPath, 'signup'),
        data: { username, display_name: username },
      },
    })

    if (signupError) {
      setError(friendlyAuthError(signupError, 'PathForge could not create your account. Try again.'))
      setLoading(false)
      return
    }

    const isNewIdentity = !data.user?.identities || data.user.identities.length > 0
    if (isNewIdentity) {
      await trackActivationEvent({
        eventName: 'account_created',
        surface: 'signup',
        action: 'email',
        path: '/auth/signup',
      })
    }

    if (!data.session) {
      setSuccessEmail(email)
      setLoading(false)
      return
    }

    router.replace(nextPath)
    router.refresh()
  }

  if (successEmail) {
    return (
      <div className="pf-auth">
        <div className="form-panel">
          <div className="success-card">
            <div className="success-icon"><Mail aria-hidden="true" /></div>
            <div className="eyebrow">One last step</div>
            <h1>Check your <span className="serif">email.</span></h1>
            <p>
              If <strong>{successEmail}</strong> can create an account, a confirmation link is on its way. The link returns you to the PathForge page you started from.
            </p>
            <p className="success-help">It may take a minute. Check spam before requesting another account.</p>
            <p className="form-foot"><Link href={authHref('/auth/login', nextPath)}>Return to login</Link></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthPageShell
      eyebrow="Join the forge"
      title="Turn experiments into a"
      accent="body of work."
      lead="PathForge keeps the useful part of AI building visible: what you asked, what changed, and what finally worked."
      items={PERKS}
    >
      <div className="form-card">
        <AuthFormHeader
          eyebrow="Create account"
          title="Start your"
          accent="forge."
          copy="Create a public builder identity and a private workspace for unfinished work."
        />

        {error && <AuthNotice kind="error">{error}</AuthNotice>}

        {enabledOAuthProviders.length > 0 && (
          <>
            <OAuthButtons providers={enabledOAuthProviders} pending={oauthPending} disabled={loading} onOAuth={handleOAuth} />
            <p className="oauth-note">Social sign-up is quickest. You will choose your PathForge handle next.</p>
          </>
        )}
        <div className="oauth-divider">{enabledOAuthProviders.length > 0 ? 'or sign up with email' : 'sign up with email'}</div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="signup-username">Public handle</label>
            <input
              id="signup-username"
              type="text"
              name="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Choose a handle"
              aria-describedby="signup-handle-help"
            />
            <p id="signup-handle-help" className="field-help">Your public URL will use this. Letters, numbers, and underscores only.</p>
          </div>
          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" type="email" name="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" />
          </div>
          <PasswordField
            id="signup-password"
            name="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            minLength={PATHFORGE_PASSWORD_MIN_LENGTH}
            describedBy="signup-password-help"
          />
          <div id="signup-password-help" className="password-checks" aria-live="polite">
            {checks.map((check) => (
              <span key={check.label} className={check.complete ? 'complete' : ''}>
                <i aria-hidden="true">{check.complete && <Check />}</i>
                {check.label}
              </span>
            ))}
          </div>
          <SubmitButton loading={loading} idle="Create account" pending="Creating account…" />
        </form>

        <p className="privacy-note">Your email and unfinished submissions stay private. Only the profile and projects you publish become public.</p>
        <p className="form-foot">Already have an account? <Link href={authHref('/auth/login', nextPath)}>Log in</Link></p>
      </div>
    </AuthPageShell>
  )
}
