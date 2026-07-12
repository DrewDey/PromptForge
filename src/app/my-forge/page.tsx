import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bookmark,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileWarning,
  FolderGit2,
  GitFork,
  Hammer,
  Layers3,
  RefreshCw,
  Settings,
  Sparkles,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { getMyForgeDashboard } from '@/lib/data/my-forge'
import { getProjectHref } from '@/lib/project-links'
import { canonicalMetadata } from '@/lib/site-url'
import type {
  MyForgeOwnedProject,
  MyForgeSavedProject,
  MyForgeSourceRun,
  MyForgeUnfinishedFork,
} from '@/lib/my-forge-types'
import { buildProjectForkHref } from '@/lib/project-forks'

export const metadata: Metadata = {
  title: 'My Forge | PathForge',
  description: 'Resume saved build paths, follow submissions through review, and manage your public PathForge work.',
  robots: { index: false, follow: false },
  ...canonicalMetadata('/my-forge'),
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

function projectHref(projectId: string, sourceRunId?: string | null) {
  const href = getProjectHref({ id: projectId })
  if (!sourceRunId) return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}run=${encodeURIComponent(sourceRunId)}#source-run-path`
}

function unfinishedForkHref(fork: MyForgeUnfinishedFork) {
  const { project, state } = fork
  return buildProjectForkHref({
    sourceProjectId: project.id,
    sourceProjectTitle: project.title,
    sourceModelVariantId: state.forkSourceModelVariantId || undefined,
    sourceRunId: state.forkSourceRunId || undefined,
    sourceStepId: state.forkSourceStepId || undefined,
    sourceStepNumber: state.forkSourceStepNumber || undefined,
    sourceArtifactPath: state.forkSourceArtifactPath || undefined,
    sourceArtifactSha256: state.forkSourceArtifactSha256 || undefined,
    parentForkId: state.forkParentSubmissionId || undefined,
    depth: state.forkDepth,
    branchIndex: state.forkBranchIndex,
    promptFamilyId: state.forkPromptFamilyId || undefined,
  })
}

const lifecyclePresentation: Record<
  MyForgeSourceRun['lifecycle'],
  { label: string; detail: string; className: string }
> = {
  received: {
    label: 'Received',
    detail: 'Safely queued for extraction.',
    className: 'border-brand-blue/25 bg-accent-50 text-brand-blue-dark',
  },
  extracting: {
    label: 'Extracting',
    detail: 'Building the review package from your source run.',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  in_review: {
    label: 'In review',
    detail: 'A reviewer is checking the path and artifact.',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  needs_repair: {
    label: 'Needs attention',
    detail: 'Continue the source run, fix the named issue, and resubmit it.',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  live: {
    label: 'Live',
    detail: 'Published to your public Vault.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  declined: {
    label: 'Declined',
    detail: 'Closed after review. The source record remains in your history.',
    className: 'border-surface-300 bg-surface-100 text-surface-700',
  },
  failed: {
    label: 'Could not process',
    detail: 'Open the entry for the next useful action.',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
}

function SubmissionStatusIcon({ lifecycle }: { lifecycle: MyForgeSourceRun['lifecycle'] }) {
  if (lifecycle === 'live') return <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
  if (lifecycle === 'needs_repair' || lifecycle === 'failed') {
    return <FileWarning className="h-3 w-3" aria-hidden="true" />
  }
  if (lifecycle === 'extracting') return <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
  return <Clock3 className="h-3 w-3" aria-hidden="true" />
}

function LoggedOutForge() {
  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid overflow-hidden border border-surface-200 bg-white lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-7 sm:p-10">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange">
              <FolderGit2 className="h-4 w-4" aria-hidden="true" />
              Private workspace
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.04em] text-surface-900 sm:text-5xl">
              Pick up every build where you left it.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-surface-600">
              My Forge keeps saved paths, exact artifact versions, model updates, review progress, and published work attached to your account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/login?next=%2Fmy-forge" className="inline-flex min-h-11 items-center gap-2 bg-brand-orange px-5 py-3 text-sm font-bold text-white hover:bg-brand-orange-dark">
                Log in to My Forge
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/auth/signup?next=%2Fmy-forge" className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 hover:border-brand-orange">
                Create account
              </Link>
            </div>
          </div>
          <aside className="border-t border-surface-200 bg-surface-900 p-7 text-white lg:border-l lg:border-t-0">
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-light">
              One durable home
            </div>
            <div className="mt-5 space-y-5">
              {[
                [Bookmark, 'Resume precisely', 'Return to the model run, response, and artifact version you selected.'],
                [Clock3, 'Follow review', 'See when a source run is received, under review, live, or needs repair.'],
                [Layers3, 'Grow your Vault', 'Keep approved paths and forks connected to a credible public builder profile.'],
              ].map(([Icon, title, body]) => (
                <div key={String(title)} className="grid grid-cols-[32px_1fr] gap-3">
                  <Icon className="mt-0.5 h-5 w-5 text-brand-orange-light" aria-hidden="true" />
                  <div>
                    <div className="text-sm font-bold">{String(title)}</div>
                    <p className="mt-1 text-xs leading-5 text-surface-300">{String(body)}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

function ProfilePrompt({ username }: { username: string | null }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border border-brand-orange/25 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-orange text-white">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-black text-surface-900">Finish your builder profile</h2>
          <p className="mt-1 text-xs leading-5 text-surface-600">
            A clear name, handle, and bio give future paths a credible public owner.
          </p>
        </div>
      </div>
      <Link href="/settings/profile" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-surface-900 px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange">
        {username ? 'Complete profile' : 'Choose your handle'}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

function SubmissionCard({ run }: { run: MyForgeSourceRun }) {
  const presentation = lifecyclePresentation[run.lifecycle]
  const detailHref = `/my-forge/builds/${run.id}`
  const repairHref = `/build?repair=${encodeURIComponent(run.id)}`
  const liveHref = run.extractedProject ? getProjectHref({ id: run.extractedProject.id }) : null

  return (
    <article className="border border-surface-200 bg-white p-4 transition-colors hover:border-surface-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${presentation.className}`}>
              <SubmissionStatusIcon lifecycle={run.lifecycle} />
              {presentation.label}
            </span>
            {run.resubmissionOfId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-surface-500">
                <Wrench className="h-3 w-3" aria-hidden="true" />
                Repair submission
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base font-black text-surface-900">{run.title}</h3>
          <p className="mt-1 text-xs leading-5 text-surface-500">
            {run.userStatusNote || presentation.detail}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-surface-400">
            <span>Updated {formatDate(run.updatedAt)}</span>
            {run.forkSourceProjectTitle && <span>Fork of {run.forkSourceProjectTitle}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {(run.lifecycle === 'needs_repair' || run.lifecycle === 'failed') && !run.repairSubmissionId && (
            <Link href={repairHref} className="inline-flex min-h-10 items-center gap-2 bg-surface-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-orange">
              Repair run
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {liveHref && (
            <Link href={liveHref} className="inline-flex min-h-10 items-center gap-2 bg-[#07551f] px-3 py-2 text-xs font-bold text-white hover:bg-[#053d16]">
              View live
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          <Link href={detailHref} className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange hover:text-brand-orange">
            Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function SavedPathCard({ saved }: { saved: MyForgeSavedProject }) {
  const resumeHref = projectHref(saved.project.id, saved.state?.selectedSourceRunId)
  return (
    <article className="border border-surface-200 bg-white p-4 transition-colors hover:border-brand-orange/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {saved.project.category && (
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-orange">
                {saved.project.category.name}
              </span>
            )}
            {saved.unseenModelUpdateCount > 0 && (
              <span className="inline-flex items-center gap-1 border border-brand-blue/25 bg-accent-50 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-brand-blue-dark">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {saved.unseenModelUpdateCount} new {saved.unseenModelUpdateCount === 1 ? 'model' : 'models'}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-black leading-snug text-surface-900">{saved.project.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-surface-500">{saved.project.description}</p>
        </div>
        <Bookmark className="h-4 w-4 shrink-0 fill-brand-orange text-brand-orange" aria-label="Saved" />
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-surface-100 pt-3">
        <div className="text-[10px] leading-5 text-surface-500">
          <div className="font-mono uppercase tracking-[0.1em]">
            {saved.state?.selectedStepNumber
              ? `Resume at response ${String(saved.state.selectedStepNumber).padStart(2, '0')}`
              : 'Open saved path'}
          </div>
          <div>{saved.project.modelUsed || 'Model details on path'}</div>
        </div>
        <Link href={resumeHref} className="inline-flex min-h-9 items-center gap-2 bg-surface-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-orange">
          {saved.state?.selectedStepNumber ? 'Resume' : 'Open'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function OwnedProjectCard({ project }: { project: MyForgeOwnedProject }) {
  const engagement = [
    project.voteCount > 0 ? `${project.voteCount} ${project.voteCount === 1 ? 'upvote' : 'upvotes'}` : null,
    project.bookmarkCount > 0 ? `${project.bookmarkCount} ${project.bookmarkCount === 1 ? 'save' : 'saves'}` : null,
  ].filter(Boolean)

  return (
    <Link
      href={getProjectHref({ id: project.id })}
      className="group flex min-h-44 flex-col border border-surface-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-orange/50 hover:shadow-[6px_6px_0_rgba(24,24,27,0.06)]"
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.12em]">
        <span className={project.isFork ? 'text-[#07551f]' : 'text-brand-orange'}>
          {project.isFork ? 'Published fork' : 'Published path'}
        </span>
        {project.category && <span className="text-surface-400">{project.category.name}</span>}
      </div>
      <h3 className="mt-3 text-base font-black leading-snug text-surface-900 group-hover:text-brand-orange">
        {project.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-surface-500">{project.description}</p>
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-surface-100 pt-4 text-[10px] text-surface-500">
        <div>
          {project.modelUsed && <div className="line-clamp-1">{project.modelUsed}</div>}
          {engagement.length > 0 && <div className="mt-1 text-surface-400">{engagement.join(' · ')}</div>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-bold text-surface-700 group-hover:text-brand-orange">
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

function UnfinishedForkCard({ fork }: { fork: MyForgeUnfinishedFork }) {
  const { project, state } = fork
  const href = unfinishedForkHref(fork)

  return (
    <article className="border border-[#07551f]/25 bg-[#effdf3] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-[#07551f]">
            <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
            Unfinished fork
          </div>
          <h3 className="mt-2 text-base font-black text-surface-900">{project.title}</h3>
          <p className="mt-1 text-xs leading-5 text-surface-600">
            {state.forkSourceStepNumber
              ? `Continue from response ${String(state.forkSourceStepNumber).padStart(2, '0')}${state.forkSourceModelVariantId ? ' with the exact model run and artifact attached' : ''}.`
              : 'Continue the branch you started from this public path.'}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-surface-500">
          {state.forkStartedAt ? formatDate(state.forkStartedAt) : 'Recent'}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#07551f]/15 pt-3">
        <span className="text-[10px] text-surface-500">{project.modelUsed || 'Source model attached on path'}</span>
        <Link href={href} className="inline-flex min-h-9 items-center gap-2 bg-[#07551f] px-3 py-2 text-xs font-bold text-white hover:bg-[#053d16]">
          Continue fork
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

type ForgeNextAction = {
  eyebrow: string
  title: string
  body: string
  href: string
  label: string
  icon: LucideIcon
  tone: 'repair' | 'fork' | 'resume' | 'review' | 'published' | 'discover'
}

const nextActionTone: Record<ForgeNextAction['tone'], { border: string; surface: string; icon: string }> = {
  repair: { border: 'border-rose-300', surface: 'bg-rose-50', icon: 'bg-rose-700 text-white' },
  fork: { border: 'border-[#07551f]/35', surface: 'bg-[#effdf3]', icon: 'bg-[#07551f] text-white' },
  resume: { border: 'border-brand-blue/30', surface: 'bg-accent-50', icon: 'bg-brand-blue text-white' },
  review: { border: 'border-amber-300', surface: 'bg-amber-50', icon: 'bg-amber-700 text-white' },
  published: { border: 'border-brand-orange/30', surface: 'bg-primary-50', icon: 'bg-brand-orange text-white' },
  discover: { border: 'border-surface-300', surface: 'bg-white', icon: 'bg-surface-900 text-white' },
}

function NextActionCard({ action }: { action: ForgeNextAction }) {
  const Icon = action.icon
  const tone = nextActionTone[action.tone]

  return (
    <section className={`mt-7 border ${tone.border} ${tone.surface}`} aria-labelledby="next-action-heading">
      <div className="grid gap-5 p-5 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <span className={`flex h-12 w-12 items-center justify-center ${tone.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-surface-500">{action.eyebrow}</div>
          <h2 id="next-action-heading" className="mt-1 text-xl font-black leading-tight text-surface-900 sm:text-2xl">{action.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">{action.body}</p>
        </div>
        <Link href={action.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange">
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export default async function MyForgePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const dashboard = await getMyForgeDashboard()
  if (!dashboard) return <LoggedOutForge />

  const { submitted } = await searchParams
  const activeRuns = dashboard.sourceRuns.filter((run) => (
    !['live', 'declined'].includes(run.lifecycle) && !run.repairSubmissionId
  ))
  const recentRuns = dashboard.sourceRuns.filter((run) => (
    ['live', 'declined'].includes(run.lifecycle) || Boolean(run.repairSubmissionId)
  )).slice(0, 4)
  const savedWithUpdates = dashboard.savedProjects.filter((saved) => saved.unseenModelUpdateCount > 0)
  const publicProfileHref = dashboard.profile.username ? `/user/${dashboard.profile.username}` : '/settings/profile'
  const repairRun = activeRuns.find((run) => run.lifecycle === 'needs_repair' || run.lifecycle === 'failed')
  const unfinishedFork = dashboard.unfinishedForks[0]
  const savedToResume = savedWithUpdates[0]
    ?? dashboard.savedProjects.find((saved) => saved.state?.resumeIsValid)
    ?? dashboard.savedProjects[0]
  const reviewRun = activeRuns[0]
  const publishedProject = dashboard.ownedProjects[0]
  const inProgressCount = activeRuns.length + dashboard.unfinishedForks.length
  const modelUpdateCount = savedWithUpdates.reduce((total, saved) => total + saved.unseenModelUpdateCount, 0)
  const summaryItems = [
    inProgressCount > 0 ? { label: 'In progress', value: inProgressCount } : null,
    dashboard.savedProjects.length > 0 ? { label: 'Saved', value: dashboard.savedProjects.length } : null,
    modelUpdateCount > 0 ? { label: 'Model updates', value: modelUpdateCount } : null,
    dashboard.ownedProjects.length > 0 ? { label: 'Published', value: dashboard.ownedProjects.length } : null,
  ].filter((item): item is { label: string; value: number } => Boolean(item))
  const hasPrimaryActivity = dashboard.unfinishedForks.length > 0 || activeRuns.length > 0 || dashboard.savedProjects.length > 0
  const hasAsideActivity = savedWithUpdates.length > 0 || recentRuns.length > 0

  let nextAction: ForgeNextAction
  if (repairRun) {
    nextAction = {
      eyebrow: 'Needs your attention',
      title: repairRun.title,
      body: repairRun.userStatusNote || lifecyclePresentation[repairRun.lifecycle].detail,
      href: `/build?repair=${encodeURIComponent(repairRun.id)}`,
      label: 'Repair build',
      icon: Wrench,
      tone: 'repair',
    }
  } else if (unfinishedFork) {
    const responseLabel = unfinishedFork.state.forkSourceStepNumber
      ? ` from response ${String(unfinishedFork.state.forkSourceStepNumber).padStart(2, '0')}`
      : ''
    nextAction = {
      eyebrow: 'Continue where you stopped',
      title: unfinishedFork.project.title,
      body: `Your unfinished branch${responseLabel} is ready with its saved source context.`,
      href: unfinishedForkHref(unfinishedFork),
      label: 'Continue fork',
      icon: GitFork,
      tone: 'fork',
    }
  } else if (savedToResume) {
    const hasModelUpdate = savedToResume.unseenModelUpdateCount > 0
    nextAction = {
      eyebrow: hasModelUpdate ? 'New model result available' : 'Resume a saved path',
      title: savedToResume.project.title,
      body: hasModelUpdate
        ? `${savedToResume.unseenModelUpdateCount} new verified ${savedToResume.unseenModelUpdateCount === 1 ? 'run is' : 'runs are'} ready to inspect without losing your saved place.`
        : savedToResume.state?.selectedStepNumber
          ? `Return to response ${String(savedToResume.state.selectedStepNumber).padStart(2, '0')} and the exact artifact version you last opened.`
          : 'Return to this saved path and choose the response or artifact you want to continue from.',
      href: projectHref(
        savedToResume.project.id,
        hasModelUpdate ? savedToResume.latestUnseenSourceRunId : savedToResume.state?.selectedSourceRunId,
      ),
      label: hasModelUpdate ? 'View update' : 'Resume path',
      icon: hasModelUpdate ? Sparkles : Bookmark,
      tone: 'resume',
    }
  } else if (reviewRun) {
    nextAction = {
      eyebrow: 'Follow the review',
      title: reviewRun.title,
      body: reviewRun.userStatusNote || lifecyclePresentation[reviewRun.lifecycle].detail,
      href: `/my-forge/builds/${reviewRun.id}`,
      label: 'View status',
      icon: Clock3,
      tone: 'review',
    }
  } else if (publishedProject) {
    nextAction = {
      eyebrow: 'Your work is live',
      title: publishedProject.title,
      body: 'Open your public builder page to see this path alongside the rest of your published work.',
      href: publicProfileHref,
      label: 'View public work',
      icon: Layers3,
      tone: 'published',
    }
  } else {
    nextAction = {
      eyebrow: 'Choose a starting point',
      title: 'Find a path worth making your own.',
      body: 'Explore working projects, save the useful ones, or fork an exact response when you see a direction you want to continue.',
      href: '/paths',
      label: 'Explore build paths',
      icon: Sparkles,
      tone: 'discover',
    }
  }

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {submitted && (
          <div className="mb-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-black">Source run received.</div>
              <p className="mt-1 text-xs leading-5">It now has a durable place here while extraction and review move forward.</p>
            </div>
          </div>
        )}

        <header className="flex flex-col gap-5 border-b border-surface-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange">
              <FolderGit2 className="h-4 w-4" aria-hidden="true" />
              Private workspace
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-surface-900">My Forge</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
              Resume paths, follow review, and keep your public builder work connected to one account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={publicProfileHref} className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {dashboard.profile.username ? 'Public profile' : 'Complete profile'}
            </Link>
            <Link href="/settings/profile" className="inline-flex min-h-10 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Edit profile
            </Link>
            <Link href="/build" className="inline-flex min-h-10 items-center gap-2 bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange-dark">
              <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
              New build
            </Link>
          </div>
        </header>

        {summaryItems.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-surface-200 py-3 text-xs text-surface-500" aria-label="My Forge summary">
            {summaryItems.map((item) => (
              <span key={item.label}>
                <strong className="font-black tabular-nums text-surface-900">{item.value}</strong>{' '}
                {item.label.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {!dashboard.profile.isComplete && <div className="mt-6"><ProfilePrompt username={dashboard.profile.username} /></div>}

        <NextActionCard action={nextAction} />

        {dashboard.ownedProjects.length > 0 && (
          <section className="mt-10" aria-labelledby="published-work-heading">
            <div className="mb-5 flex flex-col gap-3 border-b border-surface-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">Published work</div>
                <h2 id="published-work-heading" className="mt-1 text-2xl font-black text-surface-900">Your public Vault</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">These are the projects visitors can open from your public builder profile.</p>
              </div>
              <Link href={publicProfileHref} className="inline-flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-brand-orange">
                View public profile
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.ownedProjects.slice(0, 6).map((project) => <OwnedProjectCard key={project.id} project={project} />)}
            </div>
          </section>
        )}

        {(hasPrimaryActivity || hasAsideActivity) && (
        <div className={`mt-10 grid gap-8 ${hasPrimaryActivity && hasAsideActivity ? 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]' : ''}`}>
          {hasPrimaryActivity && <div className="space-y-9">
            {dashboard.unfinishedForks.length > 0 && (
              <section aria-labelledby="continue-forks-heading">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">Continue forging</div>
                    <h2 id="continue-forks-heading" className="mt-1 text-2xl font-black text-surface-900">Unfinished forks</h2>
                  </div>
                  <span className="text-xs font-medium text-surface-500">{dashboard.unfinishedForks.length} open</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {dashboard.unfinishedForks.map((fork) => <UnfinishedForkCard key={fork.project.id} fork={fork} />)}
                </div>
              </section>
            )}

            {activeRuns.length > 0 && <section aria-labelledby="active-builds-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange">Review pipeline</div>
                  <h2 id="active-builds-heading" className="mt-1 text-2xl font-black text-surface-900">Active builds</h2>
                </div>
                <span className="text-xs font-medium text-surface-500">{activeRuns.length} active</span>
              </div>
              <div className="space-y-3">{activeRuns.map((run) => <SubmissionCard key={run.id} run={run} />)}</div>
            </section>}

            {dashboard.savedProjects.length > 0 && <section aria-labelledby="saved-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-blue">Return loop</div>
                  <h2 id="saved-heading" className="mt-1 text-2xl font-black text-surface-900">Saved paths</h2>
                </div>
                <Link href="/paths" className="text-xs font-bold text-surface-500 hover:text-brand-orange">Find paths</Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {dashboard.savedProjects.map((saved) => <SavedPathCard key={saved.bookmarkId} saved={saved} />)}
              </div>
            </section>}
          </div>}

          {hasAsideActivity && <aside className="space-y-7">
            {savedWithUpdates.length > 0 && (
              <section className="border border-brand-blue/25 bg-accent-50 p-5" aria-labelledby="model-updates-heading">
                <div className="flex items-center gap-2 text-brand-blue-dark">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <h2 id="model-updates-heading" className="font-mono text-[10px] font-black uppercase tracking-[0.14em]">Updated models</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-surface-700">New verified runs are available for paths you saved.</p>
                <div className="mt-4 space-y-2">
                  {savedWithUpdates.slice(0, 5).map((saved) => (
                    <Link key={saved.bookmarkId} href={projectHref(saved.project.id, saved.latestUnseenSourceRunId)} className="flex items-center justify-between gap-3 border border-brand-blue/15 bg-white px-3 py-2.5 text-xs font-bold text-surface-800 hover:border-brand-blue">
                      <span className="line-clamp-1">{saved.project.title}</span>
                      <span className="shrink-0 text-brand-blue-dark">+{saved.unseenModelUpdateCount}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {recentRuns.length > 0 && (
              <section className="border border-surface-200 bg-white p-5" aria-labelledby="history-heading">
                <h2 id="history-heading" className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-surface-500">Recent decisions</h2>
                <div className="mt-3 divide-y divide-surface-100">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/my-forge/builds/${run.id}`} className="flex items-center justify-between gap-3 py-3 text-xs hover:text-brand-orange">
                      <span className="line-clamp-1 font-bold text-surface-800">{run.title}</span>
                      <span className="shrink-0 text-surface-400">{run.repairSubmissionId ? 'Repair submitted' : lifecyclePresentation[run.lifecycle].label}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>}
        </div>
        )}
      </div>
    </main>
  )
}
