'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Save } from 'lucide-react'
import { updateProfile, type ProfileUpdateState } from '@/lib/profile-actions'
import type { Profile } from '@/lib/types'

const initialState: ProfileUpdateState = { success: false }

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-2 text-xs font-medium text-red-700">{message}</p>
}

export default function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(updateProfile, initialState)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [router, state.success])

  const displayNameError = state.fieldErrors?.displayName
  const usernameError = state.fieldErrors?.username
  const bioError = state.fieldErrors?.bio

  return (
    <form action={formAction} className="border border-surface-200 bg-white">
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
            defaultValue={profile.display_name || profile.username}
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
            <span className="inline-flex items-center border border-r-0 border-surface-300 bg-surface-50 px-3 font-mono text-xs text-surface-500">
              pathforge.app/user/
            </span>
            <input
              id="profile-username"
              name="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              defaultValue={profile.username}
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
            <span className="text-[11px] text-surface-400">280 characters maximum</span>
          </div>
          <textarea
            id="profile-bio"
            name="bio"
            maxLength={280}
            rows={5}
            defaultValue={profile.bio ?? ''}
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
          <Link
            href={state.profileHref ?? `/user/${profile.username}`}
            className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            View public profile
          </Link>
        </div>
      </div>
    </form>
  )
}
