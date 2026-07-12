import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import BuilderIdentity from '@/components/BuilderIdentity'
import PromptCard from '@/components/PromptCard'
import { getProfileByUsername, getProjectsByAuthor } from '@/lib/data'
import { getAuthenticatedUserId } from '@/lib/data/profiles'
import { derivePublicProfileInsights } from '@/lib/profile-presentation'
import { canonicalMetadata } from '@/lib/site-url'

type UserProfilePageProps = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return { title: 'Builder not found | PathForge' }

  const displayName = profile.display_name || profile.username
  const bio = profile.bio?.trim().replace(/\s+/g, ' ')
  return {
    title: `${displayName} (@${profile.username}) | PathForge`,
    description: bio || `Explore ${displayName}'s published AI build paths and forks on PathForge.`,
    ...canonicalMetadata(`/user/${profile.username}`),
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
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
  const hasPublishedWork = projects.length > 0

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <BuilderIdentity profile={profile} insights={insights} isOwner={isOwner} />

        <div className="mt-10 grid gap-12">
          {originalProjects.length > 0 && <section id="vault" aria-labelledby="vault-heading">
            <div className="mb-5 flex flex-col gap-2 border-b border-surface-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                  Public work
                </div>
                <h2 id="vault-heading" className="mt-1 text-2xl font-black tracking-[-0.025em] text-surface-900">
                  Published paths
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Working projects with their prompts, results, and build history attached.</p>
              </div>
              <span className="text-sm font-medium tabular-nums text-surface-500">
                {originalProjects.length} {originalProjects.length === 1 ? 'path' : 'paths'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {originalProjects.map((project) => (
                <PromptCard key={project.id} prompt={project} />
              ))}
            </div>
          </section>}

          {insights.forks.length > 0 && <section id="forks" aria-labelledby="forks-heading">
            <div className="mb-5 flex flex-col gap-2 border-b border-surface-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
                  Branch history
                </div>
                <h2 id="forks-heading" className="mt-1 text-2xl font-black tracking-[-0.025em] text-surface-900">
                  Published forks
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">New directions that continue from a specific response in another build path.</p>
              </div>
              <span className="text-sm font-medium tabular-nums text-surface-500">
                {insights.forkCount} {insights.forkCount === 1 ? 'fork' : 'forks'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {insights.forks.map((project) => (
                <PromptCard key={project.id} prompt={project} />
              ))}
            </div>
          </section>}

          {!hasPublishedWork && (
            <ProfileEmptyState
              title={isOwner ? 'Your first public path will appear here.' : 'No public paths yet.'}
              body={isOwner
                ? 'Submit a captured AI run when it produces something worth sharing. Once approved, the project will become the first piece of your public builder portfolio.'
                : 'This builder has not published a PathForge project yet.'}
              action={isOwner ? { href: '/build', label: 'Share a build' } : undefined}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function ProfileEmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col gap-5 border border-dashed border-surface-300 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand-orange/25 bg-primary-50 text-brand-orange">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-black text-surface-900">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-surface-500">{body}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex min-h-11 shrink-0 items-center justify-center bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
