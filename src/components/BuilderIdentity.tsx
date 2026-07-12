import Link from 'next/link'
import { Calendar, CheckCircle2, Edit3, ExternalLink, GitFork, Layers3 } from 'lucide-react'
import {
  getProfileProvenance,
  profileAvatarClasses,
  profileMonogram,
  type PublicProfileInsights,
} from '@/lib/profile-presentation'
import type { Profile } from '@/lib/types'

function joinedLabel(createdAt: string) {
  const timestamp = new Date(createdAt)
  if (Number.isNaN(timestamp.getTime())) return null
  return timestamp.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function BuilderIdentity({
  profile,
  insights,
  isOwner,
}: {
  profile: Profile
  insights: PublicProfileInsights
  isOwner: boolean
}) {
  const displayName = profile.display_name || profile.username
  const provenance = getProfileProvenance(profile)
  const joined = joinedLabel(profile.created_at)

  return (
    <section className="border border-surface-200 bg-white" aria-labelledby="builder-profile-name">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center border border-black/10 sm:h-20 sm:w-20 ${profileAvatarClasses(profile.username)}`}
              aria-label={`${displayName} profile monogram`}
            >
              <span className="text-xl font-black tracking-[-0.04em] sm:text-2xl">
                {profileMonogram(profile)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1
                    id="builder-profile-name"
                    className="text-3xl font-black leading-none tracking-[-0.035em] text-surface-900 sm:text-4xl"
                  >
                    {displayName}
                  </h1>
                  <p className="mt-2 font-mono text-xs text-surface-500">@{profile.username}</p>
                </div>

                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/settings/profile"
                      className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit profile
                    </Link>
                    <Link
                      href="/my-forge"
                      className="inline-flex min-h-10 items-center gap-2 bg-surface-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                    >
                      My Forge
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>

              {provenance && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={[
                    'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em]',
                    provenance.tone === 'team'
                      ? 'border-brand-orange/30 bg-primary-50 text-brand-orange-dark'
                      : 'border-brand-blue/30 bg-accent-50 text-brand-blue-dark',
                  ].join(' ')}>
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {provenance.label}
                  </span>
                  <span className="text-xs leading-5 text-surface-500">{provenance.description}</span>
                </div>
              )}

              {profile.bio ? (
                <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-surface-700">
                  {profile.bio}
                </p>
              ) : provenance ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-surface-600">
                  This profile’s focus is derived from its published, reviewed PathForge work. No personal biography has been inferred or invented.
                </p>
              ) : (
                isOwner && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-500">
                    Add a short bio so visitors understand the kind of paths you build.
                  </p>
                )
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-surface-500">
                {joined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Joined {joined}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {insights.publishedCount} published {insights.publishedCount === 1 ? 'path' : 'paths'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
                  {insights.forkCount} published {insights.forkCount === 1 ? 'fork' : 'forks'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="border-t border-surface-200 bg-surface-50 p-5 lg:border-l lg:border-t-0 sm:p-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">
            Build focus
          </div>

          {insights.categoryFocus.length > 0 || insights.modelFocus.length > 0 ? (
            <div className="mt-4 space-y-5">
              {insights.categoryFocus.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-surface-900">Domains</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insights.categoryFocus.map((focus) => (
                      <span key={focus.label} className="border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-700">
                        {focus.label}
                        {focus.count > 1 && <span className="ml-1 text-surface-400">×{focus.count}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {insights.modelFocus.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-surface-900">Models used</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insights.modelFocus.map((focus) => (
                      <span key={focus.label} className="border border-surface-200 bg-white px-2.5 py-1.5 text-xs text-surface-700">
                        {focus.label}
                        {focus.count > 1 && <span className="ml-1 text-surface-400">×{focus.count}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-surface-500">
              Focus appears after this builder publishes a path.
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
