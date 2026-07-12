import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowUp, Bookmark, GitFork, Layers3, Plus } from 'lucide-react'
import BuilderIdentity from '@/components/BuilderIdentity'
import PromptCard from '@/components/PromptCard'
import { getProfileByUsername, getProjectsByAuthor } from '@/lib/data'
import { getAuthenticatedUserId } from '@/lib/data/profiles'
import { derivePublicProfileInsights } from '@/lib/profile-presentation'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) notFound()

  const [projects, authenticatedUserId] = await Promise.all([
    getProjectsByAuthor(profile.id, profile.username),
    getAuthenticatedUserId(),
  ])
  const insights = derivePublicProfileInsights(projects)
  const isOwner = authenticatedUserId === profile.id
  const forkIds = new Set(insights.forks.map((project) => project.id))
  const originalProjects = projects.filter((project) => !forkIds.has(project.id))

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <BuilderIdentity profile={profile} insights={insights} isOwner={isOwner} />

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Public builder statistics">
          <StatTile
            icon={<Layers3 className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Published paths"
            value={insights.publishedCount}
            accent
          />
          <StatTile
            icon={<GitFork className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Published forks"
            value={insights.forkCount}
          />
          <StatTile
            icon={<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Upvotes received"
            value={insights.totalUpvotes}
          />
          <StatTile
            icon={<Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Saves received"
            value={insights.totalSavesReceived}
          />
        </section>

        <div className="mt-10 grid gap-10">
          <section id="vault" aria-labelledby="vault-heading">
            <div className="mb-5 flex flex-col gap-2 border-b border-surface-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                  Public work
                </div>
                <h2 id="vault-heading" className="mt-1 text-2xl font-black tracking-[-0.025em] text-surface-900">
                  Original paths
                </h2>
              </div>
              <span className="text-sm font-medium tabular-nums text-surface-500">
                {originalProjects.length} {originalProjects.length === 1 ? 'path' : 'paths'}
              </span>
            </div>

            {originalProjects.length === 0 ? (
              <ProfileEmptyState
                isOwner={isOwner}
                title={isOwner ? 'No original paths published yet.' : 'No original paths yet.'}
                body={isOwner
                  ? 'Submit an original captured AI run. Approved branches still appear separately below.'
                  : 'This builder may have public branches below, but no original path is published yet.'}
                action={isOwner ? { href: '/build', label: 'Build your first path' } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {originalProjects.map((project) => (
                  <PromptCard key={project.id} prompt={project} />
                ))}
              </div>
            )}
          </section>

          <section id="forks" aria-labelledby="forks-heading">
            <div className="mb-5 flex flex-col gap-2 border-b border-surface-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
                  Branch history
                </div>
                <h2 id="forks-heading" className="mt-1 text-2xl font-black tracking-[-0.025em] text-surface-900">
                  Published forks
                </h2>
              </div>
              <span className="text-sm font-medium tabular-nums text-surface-500">
                {insights.forkCount} {insights.forkCount === 1 ? 'fork' : 'forks'}
              </span>
            </div>

            {insights.forks.length === 0 ? (
              <ProfileEmptyState
                isOwner={isOwner}
                icon="fork"
                title={isOwner ? 'You have not published a fork yet.' : 'No published forks yet.'}
                body={isOwner
                  ? 'Fork an exact response from a public path, submit the continued source run, and the approved branch will appear here.'
                  : 'This builder has not published a branch from another PathForge project.'}
                action={isOwner ? { href: '/paths', label: 'Find a path to fork' } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {insights.forks.map((project) => (
                  <PromptCard key={project.id} prompt={project} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function StatTile({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="border border-surface-200 bg-white p-4 transition-colors hover:border-surface-300">
      <div className="flex items-center gap-1.5 text-surface-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-black tabular-nums ${accent ? 'text-brand-orange' : 'text-surface-900'}`}>
        {value}
      </p>
    </div>
  )
}

function ProfileEmptyState({
  isOwner,
  title,
  body,
  icon = 'path',
  action,
}: {
  isOwner: boolean
  title: string
  body: string
  icon?: 'path' | 'fork'
  action?: { href: string; label: string }
}) {
  return (
    <div className="border border-dashed border-surface-300 bg-white px-5 py-9 text-center sm:px-8">
      <div className={[
        'mx-auto flex h-11 w-11 items-center justify-center border',
        icon === 'fork'
          ? 'border-[#07551f]/25 bg-[#effdf3] text-[#07551f]'
          : 'border-brand-orange/25 bg-primary-50 text-brand-orange',
      ].join(' ')}>
        {icon === 'fork'
          ? <GitFork className="h-5 w-5" aria-hidden="true" />
          : <Plus className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="mt-4 text-base font-black text-surface-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-surface-500">{body}</p>
      {isOwner && action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-11 items-center bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
