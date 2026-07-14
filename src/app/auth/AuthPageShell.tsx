'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Check, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

export type PathForgeOAuthProvider = 'github' | 'google'

let oauthSettingsPromise: Promise<PathForgeOAuthProvider[]> | null = null

function loadEnabledOAuthProviders() {
  if (oauthSettingsPromise) return oauthSettingsPromise

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return Promise.resolve([])

  oauthSettingsPromise = fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  })
    .then(async (response) => {
      if (!response.ok) return []
      const settings = await response.json() as {
        external?: Partial<Record<PathForgeOAuthProvider, boolean>>
      }
      return (['github', 'google'] as const).filter((provider) => settings.external?.[provider])
    })
    .catch(() => [])

  return oauthSettingsPromise
}

export function useEnabledOAuthProviders() {
  const [providers, setProviders] = useState<PathForgeOAuthProvider[]>([])

  useEffect(() => {
    let active = true
    void loadEnabledOAuthProviders().then((enabled) => {
      if (active) setProviders(enabled)
    })
    return () => {
      active = false
    }
  }, [])

  return providers
}

type BrandItem = {
  label: string
  description?: string
}

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

export function AuthPageShell({
  eyebrow,
  title,
  accent,
  lead,
  items,
  children,
}: {
  eyebrow: string
  title: string
  accent: string
  lead: string
  items: BrandItem[]
  children: ReactNode
}) {
  return (
    <div className="pf-auth">
      <aside className="brand-panel">
        <Link href="/" className="brand-logo">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/logo.png" alt="" width={100} height={32} loading="eager" />
          </span>
          <span>PathForge</span>
        </Link>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title} <span className="serif">{accent}</span></h2>
        <p className="lead">{lead}</p>
        <div className="flow">
          {items.map((item, index) => (
            <div key={item.label} className="flow-item">
              <div className="flow-num">{index + 1}</div>
              <div className="flow-rule" />
              <div className="flow-text">
                <b>{item.label}</b>
                {item.description && <span className="desc">{item.description}</span>}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div className="form-panel">{children}</div>
    </div>
  )
}

export function AuthFormHeader({
  eyebrow,
  title,
  accent,
  copy,
}: {
  eyebrow: string
  title: string
  accent: string
  copy: string
}) {
  return (
    <div className="form-head">
      <Link href="/" className="mobile-logo">
        <span className="brand-mark" aria-hidden="true">
          <Image src="/logo.png" alt="" width={88} height={28} loading="eager" />
        </span>
        <span>PathForge</span>
      </Link>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title} <span className="serif">{accent}</span></h1>
      <p>{copy}</p>
    </div>
  )
}

export function AuthNotice({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  return (
    <div className={`auth-notice auth-notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="auth-notice-mark" aria-hidden="true">
        {kind === 'success' ? <Check /> : kind === 'error' ? '!' : 'i'}
      </span>
      <span>{children}</span>
    </div>
  )
}

export function OAuthButtons({
  providers,
  pending,
  disabled = false,
  onOAuth,
}: {
  providers: PathForgeOAuthProvider[]
  pending: PathForgeOAuthProvider | null
  disabled?: boolean
  onOAuth: (provider: PathForgeOAuthProvider) => void
}) {
  return (
    <div className="oauth-list">
      {providers.includes('github') && (
        <button type="button" className="btn-oauth" onClick={() => onOAuth('github')} disabled={disabled || pending !== null}>
          <GitHubIcon />
          {pending === 'github' ? 'Connecting…' : 'Continue with GitHub'}
        </button>
      )}
      {providers.includes('google') && (
        <button type="button" className="btn-oauth" onClick={() => onOAuth('google')} disabled={disabled || pending !== null}>
          <GoogleIcon />
          {pending === 'google' ? 'Connecting…' : 'Continue with Google'}
        </button>
      )}
    </div>
  )
}

export function PasswordField({
  id,
  name,
  label = 'Password',
  placeholder,
  autoComplete,
  value,
  onChange,
  minLength,
  describedBy,
}: {
  id: string
  name: string
  label?: string
  placeholder: string
  autoComplete: string
  value?: string
  onChange?: (value: string) => void
  minLength?: number
  describedBy?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        required
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-describedby={describedBy}
      />
    </div>
  )
}

export function SubmitButton({ loading, idle, pending }: { loading: boolean; idle: string; pending: string }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary">
      {loading ? (
        <>
          <svg className="spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {pending}
        </>
      ) : (
        <>
          {idle}
          <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true">
            <path d="M5 12H19M13 6L19 12L13 18" />
          </svg>
        </>
      )}
    </button>
  )
}
