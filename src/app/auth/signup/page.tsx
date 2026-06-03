'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
  return next
}

const PERKS = [
  'Showcase your full build process',
  'Step-by-step prompts and results',
  'Join a community of AI builders',
]

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.33-1.73-1.33-1.73-1.09-.73.08-.71.08-.71 1.2.08 1.83 1.21 1.83 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.21.96-.26 1.98-.39 3-.4 1.02.01 2.04.14 3 .4 2.29-1.53 3.3-1.21 3.3-1.21.66 1.64.24 2.86.12 3.16.77.83 1.24 1.88 1.24 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.09.81 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.22.68.83.56C20.56 21.88 24 17.48 24 12.29 24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [oauthPending, setOauthPending] = useState<'github' | 'google' | null>(null)
  const nextPath = safeNextPath(searchParams.get('next'))
  const loginHref = `/auth/login?next=${encodeURIComponent(nextPath)}`

  const passwordLongEnough = password.length >= 8

  async function handleOAuth(provider: 'github' | 'google') {
    setError('')
    setOauthPending(provider)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    })
    if (error) {
      setError(error.message)
      setOauthPending(null)
    }
    // on success the browser redirects to the provider; nothing else runs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
          data: {
            username: formData.get('username') as string,
            display_name: formData.get('username') as string,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // If email confirmation is required, session will be null
      if (!data.session) {
        setSuccess(true)
        setLoading(false)
        return
      }

      router.push(nextPath)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="pf-auth">
        <main className="form-panel">
          <div className="success-card">
            <div className="success-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1>
              Check your <span className="serif">email.</span>
            </h1>
            <p>We sent you a confirmation link. Click it to activate your account.</p>
            <p className="form-foot">
              <Link href={loginHref}>Go to login</Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="pf-auth">
      {/* Brand panel — desktop only */}
      <aside className="brand-panel">
        <Link href="/" className="brand-logo">
          <Image src="/logo.png" alt="PathForge" width={32} height={32} />
          PathForge
        </Link>
        <div className="eyebrow">Join the forge</div>
        <h2>
          Share what you <span className="serif">built.</span>
        </h2>
        <p className="lead">
          Show your process, inspire others, and get recognized for your AI projects.
        </p>
        <div className="flow">
          {PERKS.map((text, i) => (
            <div key={i} className="flow-item">
              <div className="flow-num">{i + 1}</div>
              <div className="flow-rule" />
              <div className="flow-text">
                <b>{text}</b>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <main className="form-panel">
        <div className="form-card">
          <div className="form-head">
            <Link href="/" className="mobile-logo">
              <Image src="/logo.png" alt="PathForge" width={28} height={28} />
              PathForge
            </Link>
            <div className="eyebrow">Create account</div>
            <h1>
              Create your <span className="serif">account.</span>
            </h1>
            <p>Start sharing your AI projects.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="oauth-list">
            <button type="button" className="btn-oauth" onClick={() => handleOAuth('github')} disabled={oauthPending !== null}>
              <GitHubIcon />
              {oauthPending === 'github' ? 'Connecting…' : 'Continue with GitHub'}
            </button>
            <button type="button" className="btn-oauth" onClick={() => handleOAuth('google')} disabled={oauthPending !== null}>
              <GoogleIcon />
              {oauthPending === 'google' ? 'Connecting…' : 'Continue with Google'}
            </button>
          </div>

          <div className="oauth-divider">or sign up with email</div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                required
                placeholder="Choose a username"
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="pw-hint">
                <div className={`pw-box ${passwordLongEnough ? 'ok' : ''}`}>
                  {passwordLongEnough && (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="square" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={passwordLongEnough ? 'ok' : ''}>At least 8 characters</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <svg className="spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
                    <path d="M5 12H19M13 6L19 12L13 18" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="form-foot">
            Already have an account? <Link href={loginHref}>Log in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
