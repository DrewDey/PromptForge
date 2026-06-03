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

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const nextPath = safeNextPath(searchParams.get('next'))
  const loginHref = `/auth/login?next=${encodeURIComponent(nextPath)}`

  const passwordLongEnough = password.length >= 8

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
