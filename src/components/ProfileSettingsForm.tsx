'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle2,
  Circle,
  Cpu,
  Eye,
  GitFork,
  Layers3,
  LockKeyhole,
  Save,
} from 'lucide-react'
import { updateProfile, type ProfileUpdateState } from '@/lib/profile-actions'
import { profileAvatarClasses, profileMonogram } from '@/lib/profile-visuals'
import type { Profile } from '@/lib/types'

const initialState: ProfileUpdateState = { success: false }
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeBio(value: string) {
  return value.trim().replace(/\r\n?/g, '\n')
}

export type ProfileSettingsSummary = {
  originalCount: number
  forkCount: number
  distinctModelCount: number
  verifiedModelRunCount: number
  categoryLabels: string[]
  modelLabels: string[]
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-2 text-xs font-medium text-red-700">{message}</p>
}

function ReadinessItem({ complete, children }: { complete: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-surface-600">
      {complete
        ? <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
        : <Circle className="h-3.5 w-3.5 text-surface-300" aria-hidden="true" />}
      <span className={complete ? 'text-surface-800' : ''}>{children}</span>
    </li>
  )
}

export default function ProfileSettingsForm({
  profile,
  summary,
}: {
  profile: Profile
  summary: ProfileSettingsSummary
}) {
  const router = useRouter()
  const savedUsername = profile.username?.trim() || ''
  const [displayName, setDisplayName] = useState(profile.display_name?.trim() || savedUsername)
  const [username, setUsername] = useState(savedUsername)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [savedIdentity, setSavedIdentity] = useState(() => ({
    displayName: normalizeSingleLine(profile.display_name || savedUsername),
    username: normalizeSingleLine(savedUsername),
    bio: normalizeBio(profile.bio ?? ''),
  }))
  const [state, formAction, pending] = useActionState(updateProfile, initialState)
  const currentIdentity = {
    displayName: normalizeSingleLine(displayName),
    username: normalizeSingleLine(username),
    bio: normalizeBio(bio),
  }
  const submittedIdentityRef = useRef(savedIdentity)

  function submitProfile(formData: FormData) {
    const formValue = (key: string) => {
      const value = formData.get(key)
      return typeof value === 'string' ? value : ''
    }
    submittedIdentityRef.current = {
      displayName: normalizeSingleLine(formValue('display_name')),
      username: normalizeSingleLine(formValue('username')),
      bio: normalizeBio(formValue('bio')),
    }
    formAction(formData)
  }

  useEffect(() => {
    if (!state.success) return
    const saved = submittedIdentityRef.current
    setDisplayName(saved.displayName)
    setUsername(saved.username)
    setBio(saved.bio)
    setSavedIdentity(saved)
    router.refresh()
  }, [router, state])

  const displayNameError = state.fieldErrors?.displayName
  const usernameError = state.fieldErrors?.username
  const bioError = state.fieldErrors?.bio
  const hasUnsavedChanges = (
    currentIdentity.displayName !== savedIdentity.displayName ||
    currentIdentity.username !== savedIdentity.username ||
    currentIdentity.bio !== savedIdentity.bio
  )
  const handleIsReady = USERNAME_PATTERN.test(username.trim())
  const readiness = [
    { complete: displayName.trim().length >= 2, label: 'A recognizable display name' },
    { complete: handleIsReady, label: 'A valid public handle' },
    { complete: bio.trim().length > 0, label: 'A factual builder bio' },
    { complete: summary.originalCount + summary.forkCount > 0, label: 'At least one published project' },
  ]
  const readinessCount = readiness.filter((item) => item.complete).length
  const savedProfileHref = savedUsername ? `/user/${savedUsername}` : null
  const profileHref = state.profileHref ?? savedProfileHref
  const previewDisplayName = displayName.trim() || 'Your display name'
  const previewUsername = username.trim() || 'your_handle'
  const publicRecord = [
    summary.originalCount > 0 ? { icon: Layers3, value: summary.originalCount, label: summary.originalCount === 1 ? 'path' : 'paths' } : null,
    summary.forkCount > 0 ? { icon: GitFork, value: summary.forkCount, label: summary.forkCount === 1 ? 'fork' : 'forks' } : null,
    summary.distinctModelCount > 0 ? { icon: Cpu, value: summary.distinctModelCount, label: summary.distinctModelCount === 1 ? 'model' : 'models' } : null,
  ].filter((item): item is { icon: typeof Layers3; value: number; label: string } => Boolean(item))

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
      <form action={submitProfile} className="border border-surface-200 bg-white">
        <div className="border-b border-surface-200 p-5 sm:p-6">
          <h2 className="text-xl font-black text-surface-900">Public identity</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
            These fields appear on your public builder profile. Pending submissions, saved paths, and review notes stay private.
          </p>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <label htmlFor="profile-display-name" className="block text-xs font-bold uppercase tracking-[0.12em] text-surface-600">
              Display name
            </label>
            <input
              id="profile-display-name"
              name="display_name"
              required
              minLength={2}
              maxLength={60}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={Boolean(displayNameError)}
              aria-describedby={displayNameError ? 'profile-display-name-error' : undefined}
              autoComplete="name"
              className="mt-2 w-full border border-surface-300 bg-white px-3 py-3 text-sm text-surface-900 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
            />
            <FieldError id="profile-display-name-error" message={displayNameError} />
          </div>

          <div>
            <label htmlFor="profile-username" className="block text-xs font-bold uppercase tracking-[0.12em] text-surface-600">
              Handle
            </label>
            <div className="mt-2 flex items-stretch">
              <span className="hidden items-center border border-r-0 border-surface-300 bg-surface-50 px-3 font-mono text-xs text-surface-500 sm:inline-flex">
                pathforge.app/user/
              </span>
              <span className="inline-flex items-center border border-r-0 border-surface-300 bg-surface-50 px-3 font-mono text-xs text-surface-500 sm:hidden">
                @
              </span>
              <input
                id="profile-username"
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={usernameError ? 'profile-username-error' : 'profile-username-help'}
                autoComplete="username"
                className="min-w-0 flex-1 border border-surface-300 bg-white px-3 py-3 font-mono text-sm text-surface-900 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
              />
            </div>
            <p id="profile-username-help" className="mt-2 text-xs leading-5 text-surface-500">
              Letters, numbers, and underscores only. Changing this also changes your public profile URL.
            </p>
            <FieldError id="profile-username-error" message={usernameError} />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor="profile-bio" className="block text-xs font-bold uppercase tracking-[0.12em] text-surface-600">
                Bio
              </label>
              <span className="text-[11px] tabular-nums text-surface-400">{Math.max(0, 280 - bio.length)} remaining</span>
            </div>
            <textarea
              id="profile-bio"
              name="bio"
              maxLength={280}
              rows={5}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              aria-invalid={Boolean(bioError)}
              aria-describedby={bioError ? 'profile-bio-error' : 'profile-bio-help'}
              className="mt-2 w-full resize-y border border-surface-300 bg-white px-3 py-3 text-sm leading-6 text-surface-900 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
              placeholder="What do you build, explore, or help other people accomplish with AI?"
            />
            <p id="profile-bio-help" className="mt-2 text-xs leading-5 text-surface-500">
              Keep it factual. PathForge derives model and domain focus from published work automatically.
            </p>
            <FieldError id="profile-bio-error" message={bioError} />
          </div>

          {state.message && (
            <div
              role={state.success ? 'status' : 'alert'}
              className={[
                'flex items-start gap-2 border px-3 py-2.5 text-sm font-medium',
                state.success
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-700',
              ].join(' ')}
            >
              {state.success && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>{state.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-surface-200 pt-5">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {pending ? 'Saving…' : 'Save profile'}
            </button>
            {profileHref ? (
              <Link
                href={profileHref}
                className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Open saved profile
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2 border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm font-medium text-surface-400">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Save a handle to open profile
              </span>
            )}
          </div>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section className="overflow-hidden border border-surface-200 bg-white shadow-[0_14px_40px_rgba(24,24,27,0.05)]" aria-labelledby="profile-preview-heading">
          <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-5 py-3">
            <div>
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-brand-orange">Live preview</div>
              <h2 id="profile-preview-heading" className="mt-0.5 text-sm font-black text-surface-900">How your identity reads</h2>
            </div>
            <span className={`text-[10px] font-medium ${hasUnsavedChanges ? 'text-amber-700' : 'text-emerald-700'}`}>
              {hasUnsavedChanges ? 'Unsaved changes' : 'Saved profile'}
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center border border-black/10 ${profileAvatarClasses(previewUsername)}`}>
                <span className="text-lg font-black">{profileMonogram({ display_name: previewDisplayName, username: previewUsername })}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-black tracking-[-0.025em] text-surface-900">{previewDisplayName}</div>
                <div className="mt-1 truncate font-mono text-[11px] text-surface-500">@{previewUsername}</div>
              </div>
            </div>

            <p className={`mt-4 whitespace-pre-line text-sm leading-6 ${bio.trim() ? 'text-surface-700' : 'italic text-surface-400'}`}>
              {bio.trim() || 'Add a factual sentence about the kinds of projects you build.'}
            </p>

            {publicRecord.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-surface-100 pt-4">
                {publicRecord.map(({ icon: Icon, value, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-surface-500">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <strong className="font-black text-surface-800">{value}</strong> {label}
                  </span>
                ))}
              </div>
            )}

            {(summary.categoryLabels.length > 0 || summary.modelLabels.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {summary.categoryLabels.slice(0, 2).map((label) => (
                  <span key={label} className="border border-surface-200 bg-surface-50 px-2 py-1 text-[10px] text-surface-600">{label}</span>
                ))}
                {summary.modelLabels.slice(0, 2).map((label) => (
                  <span key={label} className="border border-brand-blue/20 bg-accent-50 px-2 py-1 text-[10px] text-brand-blue-dark">{label}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border border-surface-200 bg-surface-50 p-5" aria-labelledby="profile-readiness-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-surface-500">Profile readiness</div>
              <h2 id="profile-readiness-heading" className="mt-1 text-base font-black text-surface-900">{readinessCount} of {readiness.length} signals ready</h2>
            </div>
            <span className={`flex h-9 w-9 items-center justify-center ${readinessCount === readiness.length ? 'bg-emerald-700 text-white' : 'bg-white text-surface-400'}`}>
              {readinessCount === readiness.length
                ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                : <Layers3 className="h-4 w-4" aria-hidden="true" />}
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {readiness.map((item) => (
              <ReadinessItem key={item.label} complete={item.complete}>{item.label}</ReadinessItem>
            ))}
          </ul>
          <div className="mt-5 flex items-start gap-2 border-t border-surface-200 pt-4 text-[11px] leading-5 text-surface-500">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Saved paths, submissions, and review notes never appear in this public preview.
          </div>
        </section>
      </aside>
    </div>
  )
}
