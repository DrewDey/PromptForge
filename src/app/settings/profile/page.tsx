import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Eye, LockKeyhole } from 'lucide-react'
import ProfileSettingsForm, { type ProfileSettingsSummary } from '@/components/ProfileSettingsForm'
import { safeAuthNextPath } from '@/lib/auth-redirects'
import { getAuthenticatedProfile } from '@/lib/data/profiles'
import { getPublicProjectsByAuthor } from '@/lib/data/public-profiles'
import { derivePublicProfileInsights } from '@/lib/profile-presentation'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Edit Profile | PathForge',
  description: 'Update your public PathForge builder identity.',
  robots: { index: false, follow: false },
  ...canonicalMetadata('/settings/profile'),
}

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const welcome = query.welcome === '1'
  const continueHref = welcome
    ? safeAuthNextPath(typeof query.next === 'string' ? query.next : null, '/my-forge')
    : null
  const { user, profile } = await getAuthenticatedProfile()

  if (!user) redirect('/auth/login?next=%2Fsettings%2Fprofile')

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-surface-200 bg-white p-7 text-center">
          <LockKeyhole className="mx-auto h-8 w-8 text-brand-orange" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black text-surface-900">Your profile is still being prepared.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-surface-600">
            Your account is signed in, but PathForge could not find its public profile record. Try again shortly before submitting a build.
          </p>
          <Link href="/" className="mt-6 inline-flex bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange">
            Return home
          </Link>
        </div>
      </div>
    )
  }

  const profileUsername = profile.username?.trim() || ''
  const projects = await getPublicProjectsByAuthor(profile.id, profileUsername || undefined)
  const insights = derivePublicProfileInsights(projects)
  const summary: ProfileSettingsSummary = {
    originalCount: insights.originalCount,
    forkCount: insights.forkCount,
    distinctModelCount: insights.distinctModelCount,
    verifiedModelRunCount: insights.verifiedModelRunCount,
    categoryLabels: insights.categoryFocus.map((focus) => focus.label),
    modelLabels: insights.modelFocus.map((focus) => focus.label),
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {welcome && (
          <div className="mb-7 border border-orange-200 bg-orange-50 px-5 py-4 text-sm leading-6 text-surface-700">
            <strong className="text-surface-900">Your account is ready.</strong>{' '}
            Choose the public name and handle people will see on your PathForge work, then continue to the page you started from.
          </div>
        )}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/my-forge" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-orange">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              My Forge
            </Link>
            <div className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
              Profile settings
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.035em] text-surface-900">Your public builder identity.</h1>
          </div>
          {profileUsername && (
            <Link
              href={`/user/${profileUsername}`}
              className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 hover:border-surface-900"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Open saved profile
            </Link>
          )}
        </div>

        <ProfileSettingsForm profile={profile} summary={summary} continueHref={continueHref} />
      </div>
    </div>
  )
}
