import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bookmark,
  Bot,
  CheckCircle2,
  CircleX,
  Clock3,
  FileWarning,
  FolderGit2,
  GitFork,
  Hammer,
  Layers3,
  RefreshCw,
  Settings,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { getMyForgeDashboard } from '@/lib/data/my-forge'
import { getProjectHref } from '@/lib/project-links'
import { getPreparedProjectModelIdentity } from '@/lib/prepared-project-model-identities'
import { getProjectModelVariantSet } from '@/lib/project-model-variants'
import { getPublicModelIdentityLabel } from '@/lib/public-model-labels'
import { canonicalMetadata } from '@/lib/site-url'
import { profileAvatarClasses, profileMonogram } from '@/lib/profile-visuals'
import type {
  MyForgeDashboard,
  MyForgeProjectSummary,
  MyForgeSavedProject,
  MyForgeSourceRun,
  MyForgeUnfinishedFork,
} from '@/lib/my-forge-types'
import { buildProjectForkHref } from '@/lib/project-forks'
import MyForgeActivationTracker from '@/components/analytics/MyForgeActivationTracker'

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

function projectModelIdentity(
  project: MyForgeProjectSummary,
  sourceRunId?: string | null,
) {
  const variantSet = getProjectModelVariantSet(project.id)
  const variant = variantSet?.variants.find((candidate) => (
    candidate.sourceRunId === (sourceRunId ?? variantSet.defaultSourceRunId)
  ))
  if (variant) {
    return getPublicModelIdentityLabel({
      provider: variant.serviceLabel,
      model: variant.modelLabel,
      modelSettings: variant.modelSettings,
    })
  }

  const preparedIdentity = getPreparedProjectModelIdentity(project.id)
  if (preparedIdentity) return preparedIdentity.publicLabel

  return getPublicModelIdentityLabel({ model: project.modelUsed })
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
  if (lifecycle === 'declined') return <CircleX className="h-3 w-3" aria-hidden="true" />
  if (lifecycle === 'needs_repair' || lifecycle === 'failed') {
    return <FileWarning className="h-3 w-3" aria-hidden="true" />
  }
  if (lifecycle === 'extracting') return <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
  return <Clock3 className="h-3 w-3" aria-hidden="true" />
}

function LoggedOutForge() {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid overflow-hidden border border-surface-200 bg-white lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-7 sm:p-10">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
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
              <Link href="/auth/login?next=%2Fmy-forge" className="inline-flex min-h-11 items-center gap-2 bg-brand-orange px-5 py-3 text-sm font-extrabold text-surface-900 hover:bg-brand-orange-light">
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
    </div>
  )
}

type WorkQueueItem = {
  id: string
  eyebrow: string
  title: string
  body: string
  meta: string
  href: string
  action: string
  icon: LucideIcon
  tone: 'repair' | 'fork' | 'review' | 'update' | 'resume'
}

const queueTone: Record<WorkQueueItem['tone'], { border: string; rail: string; icon: string; label: string }> = {
  repair: { border: 'border-rose-300', rail: 'bg-rose-700', icon: 'bg-rose-50 text-rose-700', label: 'text-rose-700' },
  fork: { border: 'border-[#07551f]/35', rail: 'bg-[#07551f]', icon: 'bg-[#effdf3] text-[#07551f]', label: 'text-[#07551f]' },
  review: { border: 'border-amber-300', rail: 'bg-amber-600', icon: 'bg-amber-50 text-amber-700', label: 'text-amber-700' },
  update: { border: 'border-brand-blue/30', rail: 'bg-brand-blue', icon: 'bg-accent-50 text-brand-blue-dark', label: 'text-brand-blue-dark' },
  resume: { border: 'border-surface-300', rail: 'bg-surface-900', icon: 'bg-surface-100 text-surface-700', label: 'text-surface-500' },
}

function QueueItem({ item, position }: { item: WorkQueueItem; position: number }) {
  const Icon = item.icon
  const tone = queueTone[item.tone]
  const isFirst = position === 0

  return (
    <article className={`relative overflow-hidden border bg-white ${tone.border} ${isFirst ? 'shadow-[8px_8px_0_rgba(24,24,27,0.06)]' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden="true" />
      <div className={`grid gap-4 pl-5 ${isFirst ? 'p-5 sm:grid-cols-[46px_minmax(0,1fr)_auto] sm:items-center sm:p-6 sm:pl-7' : 'p-4 sm:grid-cols-[38px_minmax(0,1fr)_auto] sm:items-center sm:pl-6'}`}>
        <span className={`flex shrink-0 items-center justify-center ${tone.icon} ${isFirst ? 'h-11 w-11' : 'h-9 w-9'}`}>
          <Icon className={isFirst ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className={`font-mono text-[9px] font-black uppercase tracking-[0.15em] ${tone.label}`}>
            {isFirst ? 'Up next · ' : ''}{item.eyebrow}
          </div>
          <h3 className={`${isFirst ? 'mt-1 text-xl' : 'mt-0.5 text-base'} font-black leading-tight text-surface-900`}>{item.title}</h3>
          <p className={`mt-1.5 text-surface-600 ${isFirst ? 'max-w-2xl text-sm leading-6' : 'line-clamp-2 text-xs leading-5'}`}>{item.body}</p>
          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.09em] text-surface-400">{item.meta}</div>
        </div>
        <Link href={item.href} className={`inline-flex shrink-0 items-center justify-center gap-2 bg-surface-900 font-bold text-white hover:bg-primary-700 ${isFirst ? 'min-h-11 px-4 py-2.5 text-sm' : 'min-h-10 px-3 py-2 text-xs'}`}>
          {item.action}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

function IdentityRail({
  dashboard,
  activeBuildCount,
  modelUpdateCount,
}: {
  dashboard: MyForgeDashboard
  activeBuildCount: number
  modelUpdateCount: number
}) {
  const { profile } = dashboard
  const displayName = profile.displayName?.trim() || profile.username || 'PathForge builder'
  const publicProfileHref = profile.username ? `/user/${profile.username}` : '/settings/profile'
  const inventory = [
    { label: 'Active builds', value: activeBuildCount },
    { label: 'Unfinished forks', value: dashboard.unfinishedForks.length },
    { label: 'Saved paths', value: dashboard.savedProjects.length },
    { label: 'Updated models', value: modelUpdateCount },
  ]

  return (
    <aside className="order-2 self-start border border-surface-200 bg-white lg:order-1 lg:sticky lg:top-24">
      <div className="border-b border-surface-200 p-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center text-sm font-black ${profileAvatarClasses(profile.username)}`}>
            {profileMonogram({ display_name: profile.displayName, username: profile.username })}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-black text-surface-900">{displayName}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-surface-500">
              {profile.username ? `@${profile.username}` : 'Public handle not chosen'}
            </div>
            <div className={`mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${profile.isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
              <span className={`h-1.5 w-1.5 ${profile.isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
              {profile.isComplete ? 'Identity ready' : 'Identity needs details'}
            </div>
          </div>
        </div>

        {!profile.isComplete && (
          <p className="mt-4 border-l-2 border-brand-orange pl-3 text-xs leading-5 text-surface-600">
            Finish your display name, public handle, and bio so every published path introduces you clearly.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={publicProfileHref} className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange-ink hover:text-brand-orange-ink">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            {profile.username ? 'Public profile' : 'Choose handle'}
          </Link>
          <Link href="/settings/profile" className="inline-flex min-h-10 items-center justify-center gap-2 border border-surface-300 px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange-ink hover:text-brand-orange-ink">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Edit profile
          </Link>
        </div>
      </div>

      <div className="border-b border-surface-200 p-5">
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-surface-400">Work inventory</div>
        <dl className="mt-3 divide-y divide-surface-100">
          {inventory.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs text-surface-600">{item.label}</dt>
              <dd className="font-mono text-xs font-black tabular-nums text-surface-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-b border-surface-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-[#07551f]">Your public Vault</div>
            <div className="mt-1 text-sm font-black text-surface-900">
              {dashboard.ownedProjects.length} published {dashboard.ownedProjects.length === 1 ? 'path' : 'paths'}
            </div>
          </div>
          <Layers3 className="h-4 w-4 text-[#07551f]" aria-hidden="true" />
        </div>
        {dashboard.ownedProjects.length > 0 ? (
          <div className="mt-3 divide-y divide-surface-100 border-y border-surface-100">
            {dashboard.ownedProjects.slice(0, 3).map((project) => (
              <Link key={project.id} href={getProjectHref({ id: project.id })} className="group flex items-center justify-between gap-3 py-2.5 text-xs">
                <span className="line-clamp-1 font-bold text-surface-700 group-hover:text-brand-orange-ink">{project.title}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-surface-300 group-hover:text-brand-orange-ink" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-surface-500">Approved work will collect here and on your public profile.</p>
        )}
        <Link href={publicProfileHref} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-surface-600 hover:text-brand-orange-ink">
          {profile.username ? 'View public profile' : 'Prepare public profile'}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 p-5">
        <Link href="/build" className="inline-flex min-h-11 items-center justify-center gap-2 bg-brand-orange px-3 py-2.5 text-xs font-extrabold text-surface-900 hover:bg-brand-orange-light">
          <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
          Share a build
        </Link>
        <Link href="/paths" className="inline-flex min-h-11 items-center justify-center border border-surface-300 px-3 py-2.5 text-xs font-bold text-surface-800 hover:border-surface-900">
          Explore paths
        </Link>
      </div>
    </aside>
  )
}

function queueItemForRun(run: MyForgeSourceRun): WorkQueueItem {
  const needsRepair = run.lifecycle === 'needs_repair' || run.lifecycle === 'failed'
  const presentation = lifecyclePresentation[run.lifecycle]
  return {
    id: `run-${run.id}`,
    eyebrow: run.lifecycle === 'failed'
      ? 'Could not process'
      : needsRepair
        ? 'Repair requested'
        : presentation.label,
    title: run.title,
    body: run.userStatusNote || presentation.detail,
    meta: `${run.forkSourceProjectTitle ? `Fork of ${run.forkSourceProjectTitle} · ` : ''}Updated ${formatDate(run.updatedAt)}`,
    href: needsRepair ? `/build?repair=${encodeURIComponent(run.id)}` : `/my-forge/builds/${run.id}`,
    action: needsRepair ? 'Repair build' : 'View status',
    icon: needsRepair ? Wrench : Clock3,
    tone: needsRepair ? 'repair' : 'review',
  }
}

function queueItemForFork(fork: MyForgeUnfinishedFork): WorkQueueItem {
  const response = fork.state.forkSourceStepNumber
    ? `Response ${String(fork.state.forkSourceStepNumber).padStart(2, '0')} is attached with its saved branch context.`
    : 'The source path and branch context are saved.'
  return {
    id: `fork-${fork.project.id}`,
    eyebrow: 'Unfinished fork',
    title: fork.project.title,
    body: response,
    meta: `${projectModelIdentity(fork.project, fork.state.selectedSourceRunId) || 'Source model on path'} · Started ${fork.state.forkStartedAt ? formatDate(fork.state.forkStartedAt) : 'recently'}`,
    href: unfinishedForkHref(fork),
    action: 'Continue fork',
    icon: GitFork,
    tone: 'fork',
  }
}

function queueItemForSaved(saved: MyForgeSavedProject): WorkQueueItem {
  const hasUpdate = saved.unseenModelUpdateCount > 0
  const sourceRunId = hasUpdate ? saved.latestUnseenSourceRunId : saved.state?.selectedSourceRunId
  return {
    id: `saved-${saved.bookmarkId}`,
    eyebrow: hasUpdate ? 'Updated models' : 'Saved path',
    title: saved.project.title,
    body: hasUpdate
      ? `${saved.unseenModelUpdateCount} new artifact-verified ${saved.unseenModelUpdateCount === 1 ? 'run is' : 'runs are'} ready to compare with the version you saved.`
      : saved.state?.selectedStepNumber
        ? `Return to response ${String(saved.state.selectedStepNumber).padStart(2, '0')} and the exact artifact version you last opened.`
        : 'Open this saved path and choose the response or artifact you want to continue from.',
    meta: `${projectModelIdentity(saved.project, sourceRunId) || 'Model details on path'} · Saved ${formatDate(saved.savedAt)}`,
    href: projectHref(saved.project.id, sourceRunId),
    action: hasUpdate ? 'View update' : saved.state?.resumeIsValid ? 'Resume path' : 'Open path',
    icon: hasUpdate ? Bot : Bookmark,
    tone: hasUpdate ? 'update' : 'resume',
  }
}

export default async function MyForgePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const dashboard = await getMyForgeDashboard()
  if (!dashboard) return <LoggedOutForge />

  const { submitted } = await searchParams
  const submittedRun = submitted
    ? dashboard.sourceRuns.find((run) => run.id === submitted)
    : null
  const activeRuns = dashboard.sourceRuns.filter((run) => (
    !['live', 'declined'].includes(run.lifecycle) && !run.repairSubmissionId
  ))
  const repairRuns = activeRuns.filter((run) => (
    run.lifecycle === 'needs_repair' || run.lifecycle === 'failed'
  ))
  const reviewRuns = activeRuns.filter((run) => (
    run.lifecycle !== 'needs_repair' && run.lifecycle !== 'failed'
  ))
  const savedWithUpdates = dashboard.savedProjects.filter((saved) => saved.unseenModelUpdateCount > 0)
  const savedWithoutUpdates = dashboard.savedProjects.filter((saved) => saved.unseenModelUpdateCount === 0)
  const recentRuns = dashboard.sourceRuns.filter((run) => (
    ['live', 'declined'].includes(run.lifecycle) || Boolean(run.repairSubmissionId)
  )).slice(0, 5)
  const modelUpdateCount = savedWithUpdates.reduce((total, saved) => total + saved.unseenModelUpdateCount, 0)

  const queue: WorkQueueItem[] = [
    ...repairRuns.map(queueItemForRun),
    ...dashboard.unfinishedForks.map(queueItemForFork),
    ...reviewRuns.map(queueItemForRun),
    ...savedWithUpdates.map(queueItemForSaved),
    ...savedWithoutUpdates
      .sort((left, right) => Number(Boolean(right.state?.resumeIsValid)) - Number(Boolean(left.state?.resumeIsValid)))
      .map(queueItemForSaved),
  ]

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <MyForgeActivationTracker />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <header className="mb-6 flex flex-col gap-4 border-b border-surface-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
              <FolderGit2 className="h-4 w-4" aria-hidden="true" />
              Private workspace
            </div>
            <h1 className="mt-1.5 text-3xl font-black tracking-[-0.04em] text-surface-900 sm:text-4xl">My Forge</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-surface-600">
              One work console for review, unfinished branches, saved paths, and the public portfolio they become.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/my-forge/community-projects" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-surface-300 bg-white px-4 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange">
              <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
              Pilot projects
            </Link>
            <Link href="/build" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-surface-900 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700">
              <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
              Submit a project
            </Link>
          </div>
        </header>

        {submittedRun && (
          <div className="mb-5 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-black">Source run received.</div>
              <p className="mt-1 text-xs leading-5">
                <span className="font-bold">{submittedRun.title}</span> now has a durable place here while extraction and review move forward.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <IdentityRail
            dashboard={dashboard}
            activeBuildCount={activeRuns.length}
            modelUpdateCount={modelUpdateCount}
          />

          <div className="order-1 min-w-0 lg:order-2">
            <section aria-labelledby="work-queue-heading">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-surface-400">Current work</div>
                  <h2 id="work-queue-heading" className="mt-1 text-2xl font-black tracking-[-0.025em] text-surface-900">Work queue</h2>
                  <p className="mt-1 text-sm leading-6 text-surface-500">
                    Ordered by what needs you first: repair, continue, follow review, then return to saved work.
                  </p>
                </div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-surface-400">
                  {queue.length} {queue.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.map((item, index) => <QueueItem key={item.id} item={item} position={index} />)}
                </div>
              ) : (
                <div className="border border-surface-200 bg-white p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="flex h-11 w-11 items-center justify-center bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Caught up</div>
                      <h3 className="mt-1 text-lg font-black text-surface-900">Nothing needs your attention.</h3>
                      <p className="mt-1 text-sm leading-6 text-surface-600">Start another source run, or find a proven path worth saving and continuing.</p>
                    </div>
                    <Link href="/build" className="inline-flex min-h-11 items-center justify-center gap-2 bg-brand-orange px-4 py-2.5 text-sm font-extrabold text-surface-900 hover:bg-brand-orange-light">
                      Share another build
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {recentRuns.length > 0 && (
              <section className="mt-8 border-t border-surface-200 pt-5" aria-labelledby="history-heading">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 id="history-heading" className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-surface-500">Recent decisions</h2>
                  <span className="text-[10px] text-surface-400">Private history</span>
                </div>
                <div className="divide-y divide-surface-200 border-y border-surface-200 bg-white">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/my-forge/builds/${run.id}`} className="group grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-xs font-bold text-surface-800 group-hover:text-brand-orange-ink">{run.title}</div>
                        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.09em] text-surface-400">Updated {formatDate(run.updatedAt)}</div>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.1em] ${lifecyclePresentation[run.lifecycle].className}`}>
                        <SubmissionStatusIcon lifecycle={run.lifecycle} />
                        {run.repairSubmissionId ? 'Repair submitted' : lifecyclePresentation[run.lifecycle].label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
