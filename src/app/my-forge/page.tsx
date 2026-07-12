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

function OwnedProjectRow({ project }: { project: MyForgeOwnedProject }) {
  return (
    <Link
      href={getProjectHref({ id: project.id })}
      className="group grid gap-2 border-b border-surface-100 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {project.isFork ? (
            <GitFork className="h-3.5 w-3.5 shrink-0 text-[#07551f]" aria-hidden="true" />
          ) : (
            <Layers3 className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
          )}
          <span className="truncate text-sm font-bold text-surface-900 group-hover:text-brand-orange">{project.title}</span>
        </div>
        <p className="mt-1 line-clamp-1 pl-5.5 text-xs text-surface-500">{project.description}</p>
      </div>
      <div className="flex items-center gap-3 pl-5.5 text-[10px] text-surface-400 sm:pl-0">
        <span>{project.voteCount} upvotes</span>
        <span>{project.bookmarkCount} saves</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}

function UnfinishedForkCard({ fork }: { fork: MyForgeUnfinishedFork }) {
  const { project, state } = fork
  const href = buildProjectForkHref({
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
              Public profile
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

        <section className="grid grid-cols-2 border-x border-b border-surface-200 bg-white lg:grid-cols-4" aria-label="My Forge summary">
          {[
            ['In progress', activeRuns.length + dashboard.unfinishedForks.length],
            ['Saved paths', dashboard.savedProjects.length],
            ['Model updates', savedWithUpdates.reduce((total, saved) => total + saved.unseenModelUpdateCount, 0)],
            ['Published', dashboard.ownedProjects.length],
          ].map(([label, value], index) => (
            <div key={String(label)} className={`p-4 ${index % 2 ? '' : 'border-r'} border-surface-200 lg:border-r lg:last:border-r-0`}>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-500">{String(label)}</div>
              <div className="mt-1 text-2xl font-black tabular-nums text-surface-900">{Number(value)}</div>
            </div>
          ))}
        </section>

        {!dashboard.profile.isComplete && <div className="mt-6"><ProfilePrompt username={dashboard.profile.username} /></div>}

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
          <div className="space-y-9">
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

            <section aria-labelledby="active-builds-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange">Review pipeline</div>
                  <h2 id="active-builds-heading" className="mt-1 text-2xl font-black text-surface-900">Active builds</h2>
                </div>
                <span className="text-xs font-medium text-surface-500">{activeRuns.length} active</span>
              </div>
              {activeRuns.length ? (
                <div className="space-y-3">{activeRuns.map((run) => <SubmissionCard key={run.id} run={run} />)}</div>
              ) : (
                <div className="border border-dashed border-surface-300 bg-white p-7 text-center">
                  <Hammer className="mx-auto h-6 w-6 text-brand-orange" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-black text-surface-900">Nothing waiting on review.</h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-surface-500">Start with a real AI session and submit its source run when the project is ready to become a public path.</p>
                  <Link href="/build" className="mt-5 inline-flex min-h-10 items-center gap-2 bg-surface-900 px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange">Start a build <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              )}
            </section>

            <section aria-labelledby="saved-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-blue">Return loop</div>
                  <h2 id="saved-heading" className="mt-1 text-2xl font-black text-surface-900">Saved paths</h2>
                </div>
                <Link href="/paths" className="text-xs font-bold text-surface-500 hover:text-brand-orange">Find paths</Link>
              </div>
              {dashboard.savedProjects.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {dashboard.savedProjects.map((saved) => <SavedPathCard key={saved.bookmarkId} saved={saved} />)}
                </div>
              ) : (
                <div className="border border-dashed border-surface-300 bg-white p-6">
                  <Bookmark className="h-5 w-5 text-brand-orange" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-black text-surface-900">Your saved shelf is ready.</h3>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-surface-500">Save a useful public path and My Forge will remember the exact model run, response, and artifact you last opened.</p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-7">
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

            <section className="border border-surface-200 bg-white p-5" aria-labelledby="vault-heading">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">Ownership</div>
                  <h2 id="vault-heading" className="mt-1 text-xl font-black text-surface-900">Your public Vault</h2>
                </div>
                <Layers3 className="h-5 w-5 text-[#07551f]" aria-hidden="true" />
              </div>
              <div className="mt-3">
                {dashboard.ownedProjects.length ? (
                  dashboard.ownedProjects.slice(0, 7).map((project) => <OwnedProjectRow key={project.id} project={project} />)
                ) : (
                  <p className="border-t border-surface-100 py-4 text-xs leading-5 text-surface-500">Approved paths will appear here and on your public profile.</p>
                )}
              </div>
              <Link href={publicProfileHref} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-brand-orange">
                View public profile
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </section>

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
          </aside>
        </div>
      </div>
    </main>
  )
}
