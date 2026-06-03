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

const FLOW = [
  { label: 'Prompt', desc: 'Start with an idea' },
  { label: 'Result', desc: 'See what AI produced' },
  { label: 'Iterate', desc: 'Refine and improve' },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nextPath = safeNextPath(searchParams.get('next'))
  const signupHref = `/auth/signup?next=${encodeURIComponent(nextPath)}`

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  return (
    <div className="pf-auth">
      {/* Brand panel — desktop only */}
      <aside className="brand-panel">
        <Link href="/" className="brand-logo">
          <Image src="/logo.png" alt="PathForge" width={32} height={32} />
          PathForge
        </Link>
        <div className="eyebrow">The library</div>
        <h2>
          See what others <span className="serif">built.</span>
        </h2>
        <p className="lead">
          Explore real projects with step-by-step prompts and results. Learn from the community, then share your own.
        </p>
        <div className="flow">
          {FLOW.map((step, i) => (
            <div key={i} className="flow-item">
              <div className="flow-num">{i + 1}</div>
              <div className="flow-rule" />
              <div className="flow-text">
                <b>{step.label}</b>
                <span className="desc">{step.desc}</span>
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
            <div className="eyebrow">Log in</div>
            <h1>
              Welcome <span className="serif">back.</span>
            </h1>
            <p>Log in to pick up where the community left off.</p>
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
                placeholder="Your password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <svg className="spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in…
                </>
              ) : (
                <>
                  Log in
                  <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
                    <path d="M5 12H19M13 6L19 12L13 18" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="form-foot">
            Don&apos;t have an account? <Link href={signupHref}>Sign up</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
