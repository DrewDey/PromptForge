import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  Bookmark,
  Calendar,
  CheckCircle2,
  Cpu,
  Edit3,
  GitFork,
  Layers3,
} from 'lucide-react'
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
  const hasPublicRecord = insights.publishedCount > 0
  const publicRecord = [
    insights.originalCount > 0 ? { value: insights.originalCount, label: insights.originalCount === 1 ? 'Path' : 'Paths', icon: Layers3, href: '#vault' } : null,
    insights.forkCount > 0 ? { value: insights.forkCount, label: insights.forkCount === 1 ? 'Fork' : 'Forks', icon: GitFork, href: '#forks' } : null,
    insights.distinctModelCount > 0 ? { value: insights.distinctModelCount, label: insights.distinctModelCount === 1 ? 'Model' : 'Models', icon: Cpu, href: null } : null,
    insights.verifiedModelRunCount > 0 ? { value: insights.verifiedModelRunCount, label: insights.verifiedModelRunCount === 1 ? 'Artifact-verified run' : 'Artifact-verified runs', icon: CheckCircle2, href: null } : null,
  ].filter((item): item is { value: number; label: string; icon: typeof Layers3; href: string | null } => Boolean(item))
  const provenanceFallback = provenance?.tone === 'team'
    ? 'Official PathForge work and model comparisons, published with exact prompts, responses, and artifacts attached.'
    : provenance?.tone === 'source-run'
      ? 'Reviewed developer-operated source runs with exact prompts, responses, and artifacts attached.'
      : null

  return (
    <section className="relative overflow-hidden border border-surface-200 bg-white shadow-[0_14px_44px_rgba(24,24,27,0.05)]" aria-labelledby="builder-profile-name">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-orange via-brand-orange/35 to-brand-blue" aria-hidden="true" />
      <div className={hasPublicRecord ? 'grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]' : ''}>
        <div className="p-5 sm:p-7 lg:p-8">
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
                  <p className="mt-2 font-mono text-xs text-surface-500">@{profile.username || 'builder'}</p>
                </div>

                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/settings/profile"
                      className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 transition-colors hover:border-brand-orange-ink hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit profile
                    </Link>
                    <Link
                      href="/my-forge"
                      className="inline-flex min-h-10 items-center gap-2 bg-surface-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                    >
                      My Forge
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>

              {provenance && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={[
                    'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em]',
                    provenance.tone === 'team'
                      ? 'border-brand-orange/30 bg-primary-50 text-brand-orange-ink'
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
              ) : provenanceFallback ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-surface-600">
                  {provenanceFallback}
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
                {insights.totalUpvotes > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    {insights.totalUpvotes} {insights.totalUpvotes === 1 ? 'upvote' : 'upvotes'} received
                  </span>
                )}
                {insights.totalSavesReceived > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    {insights.totalSavesReceived} {insights.totalSavesReceived === 1 ? 'save' : 'saves'} received
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasPublicRecord && <aside className="border-t border-surface-200 bg-surface-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">Public record</div>

          <div className={`mt-4 grid border-l border-t border-surface-200 bg-white ${publicRecord.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {publicRecord.map(({ value, label, icon: Icon, href }) => {
              const metric = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xl font-black tabular-nums text-surface-900">{value}</strong>
                    <Icon className="h-3.5 w-3.5 text-surface-400" aria-hidden="true" />
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-surface-500">{label}</div>
                </>
              )
              return href ? (
                <Link
                  key={label}
                  href={href}
                  className="border-b border-r border-surface-200 p-3.5 transition-colors hover:bg-primary-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange-ink"
                  aria-label={`Jump to ${value} published ${label.toLowerCase()}`}
                >
                  {metric}
                </Link>
              ) : (
                <div key={label} className="border-b border-r border-surface-200 p-3.5">
                  {metric}
                </div>
              )
            })}
          </div>

          <div className="mt-5 space-y-5">
              {insights.categoryFocus.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-surface-500">Build focus</div>
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
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-surface-500">Models represented</div>
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
        </aside>}
      </div>
    </section>
  )
}
