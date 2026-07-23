import Link from 'next/link'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Inbox,
  Layers3,
  SearchCheck,
} from 'lucide-react'
import { getAllPromptsForAdmin, getAllSourceRunSubmissionsForAdmin, getAllSuggestionsForAdmin } from '@/lib/data'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { projectForkSourceFromSubmissionFields } from '@/lib/project-forks'
import { modelMetadataForSourceRunReview, titleForSourceRunReview } from '@/lib/source-run-review'
import type { SourceRunSubmissionWithRelations } from '@/lib/types'
import AdminPromptRow from './AdminPromptRow'
import AdminSuggestionRow from './AdminSuggestionRow'

export const dynamic = 'force-dynamic'

type AdminTab = 'overview' | 'pending' | 'all' | 'suggestions'

const ADMIN_TABS: AdminTab[] = ['overview', 'pending', 'all', 'suggestions']

function adminRequestTimestamp() {
  // This route is force-dynamic, so the timestamp is created once for each fresh admin request.
  return Date.now()
}

function normalizeTab(requestedTab?: string): AdminTab {
  const normalized = requestedTab === 'source-runs' ? 'pending' : requestedTab
  return ADMIN_TABS.includes(normalized as AdminTab) ? normalized as AdminTab : 'overview'
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = normalizeTab(params.tab)
  const nowMs = adminRequestTimestamp()

  const [allPrompts, allSuggestions, sourceRuns] = await Promise.all([
    getAllPromptsForAdmin(),
    getAllSuggestionsForAdmin(),
    getAllSourceRunSubmissionsForAdmin(),
  ])

  const pendingPrompts = allPrompts.filter(prompt => prompt.status === 'pending')
  const approvedPrompts = allPrompts.filter(prompt => prompt.status === 'approved')
  const pendingSuggestions = allSuggestions.filter(suggestion => (
    suggestion.moderation_status === 'pending' && suggestion.public_status === 'under_review'
  ))
  const reviewedSuggestions = allSuggestions.filter(suggestion => !pendingSuggestions.includes(suggestion))
  const publicSuggestions = allSuggestions.filter(suggestion => {
    if (suggestion.moderation_status !== 'approved') return false
    if (suggestion.visibility === 'public') return true
    return Boolean(
      suggestion.visibility === 'scheduled_public' &&
      suggestion.scheduled_publish_at &&
      new Date(suggestion.scheduled_publish_at).getTime() <= nowMs
    )
  })

  const intakeItems = sourceRuns.filter(sourceRun => (
    (sourceRun.status === 'queued' || sourceRun.status === 'extracting') &&
    !sourceRun.extracted_prompt_id
  ))
  const sourceRunByPromptId = new Map(
    sourceRuns
      .filter(sourceRun => sourceRun.extracted_prompt_id)
      .map(sourceRun => [sourceRun.extracted_prompt_id, sourceRun])
  )
  const reviewCount = pendingPrompts.length + intakeItems.length
  const pageCopy = adminPageCopy(tab, reviewCount)

  return (
    <div className="min-w-0">
      <section className="grid min-w-0 gap-5 border-b border-surface-200 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">
            <span className="h-2 w-2 bg-brand-orange" aria-hidden="true" />
            Live review workspace
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-surface-900 sm:text-4xl">
            {pageCopy.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600 sm:text-base">
            {pageCopy.description}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-3 border border-surface-200 bg-white px-4 py-3 shadow-[4px_4px_0_rgba(24,24,27,0.05)]">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${reviewCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
            {reviewCount > 0
              ? <Clock3 className="h-4 w-4" aria-hidden="true" />
              : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
              Review queue
            </p>
            <p className="truncate text-sm font-bold text-surface-900">
              {reviewCount > 0 ? `${reviewCount} item${reviewCount === 1 ? '' : 's'} need attention` : 'Queue is clear'}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-5 flex justify-end">
        <Link href="/admin/community-projects" className="inline-flex min-h-11 items-center gap-2 border border-brand-orange/40 bg-brand-orange/10 px-4 py-2 text-sm font-black text-brand-orange-ink hover:bg-brand-orange/15">
          <FileCheck2 className="h-4 w-4" aria-hidden="true" /> Community project pilot
        </Link>
      </div>

      <nav aria-label="Admin sections" className="mt-6 min-w-0 border border-surface-200 bg-white p-1.5">
        <div className="grid min-w-0 grid-cols-2 gap-1 sm:flex sm:flex-wrap">
          <AdminTabLink href="/admin" label="Overview" active={tab === 'overview'} />
          <AdminTabLink href="/admin?tab=pending" label="Review queue" count={reviewCount} active={tab === 'pending'} />
          <AdminTabLink href="/admin?tab=all" label="All projects" count={allPrompts.length} active={tab === 'all'} />
          <AdminTabLink href="/admin?tab=suggestions" label="Suggestions" count={pendingSuggestions.length} active={tab === 'suggestions'} />
        </div>
      </nav>

      <dl className="mt-5 grid min-w-0 grid-cols-2 border border-surface-200 bg-white lg:grid-cols-4">
        <StatCard label="Needs review" value={reviewCount} highlight={reviewCount > 0} />
        <StatCard label="Published paths" value={approvedPrompts.length} />
        <StatCard label="Feedback waiting" value={pendingSuggestions.length} highlight={pendingSuggestions.length > 0} />
        <StatCard label="Public suggestions" value={publicSuggestions.length} />
      </dl>

      {(tab === 'overview' || tab === 'pending') && (
        <section className="mt-9 min-w-0" aria-labelledby="pending-review-heading">
          <SectionHeading
            eyebrow="Review pipeline"
            title="Pending review"
            description={`${pendingPrompts.length} project submission${pendingPrompts.length === 1 ? '' : 's'} and ${intakeItems.length} source-run intake${intakeItems.length === 1 ? '' : 's'}.`}
            count={reviewCount}
          />

          {reviewCount === 0 ? (
            <EmptyState
              icon={<SearchCheck className="h-5 w-5" aria-hidden="true" />}
              title="Nothing is waiting on review."
              description="New project submissions and source-run intakes will appear here with their author, model evidence, and next moderation action."
              action={<Link href="/admin?tab=all" className="font-bold text-brand-orange-ink hover:text-primary-700">Review published projects</Link>}
            />
          ) : (
            <div className="min-w-0 divide-y divide-surface-200 border border-surface-200 bg-white">
              {pendingPrompts.map(prompt => {
                const sourceRun = sourceRunByPromptId.get(prompt.id)
                return (
                  <AdminPromptRow
                    key={prompt.id}
                    prompt={prompt}
                    sourceRunHref={sourceRun ? `/admin/source-runs/${sourceRun.id}` : undefined}
                  />
                )
              })}
              {intakeItems.map(sourceRun => (
                <SourceRunIntakeRow key={sourceRun.id} sourceRun={sourceRun} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'all' && (
        <section className="mt-9 min-w-0" aria-labelledby="all-projects-heading">
          <SectionHeading
            eyebrow="Project registry"
            title="All projects"
            description="Published, pending, and declined projects remain visible here for moderation and recovery."
            count={allPrompts.length}
          />
          {allPrompts.length === 0 ? (
            <EmptyState
              icon={<Layers3 className="h-5 w-5" aria-hidden="true" />}
              title="No projects have entered the registry."
              description="Approved and pending source-run projects will appear here once the first intake is structured."
            />
          ) : (
            <div className="min-w-0 divide-y divide-surface-200 border border-surface-200 bg-white">
              {allPrompts.map(prompt => (
                <AdminPromptRow key={prompt.id} prompt={prompt} showStatus />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'suggestions' && (
        <section className="mt-9 min-w-0" aria-labelledby="suggestion-box-heading">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Community feedback"
              title="Suggestion box"
              description="Moderate feedback, update its public status, and answer the person who sent it."
              count={allSuggestions.length}
            />
            <Link
              href="/suggestion-box"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-700 transition-colors hover:border-brand-orange-ink hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
            >
              View public board
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {allSuggestions.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-5 w-5" aria-hidden="true" />}
              title="No suggestions have arrived yet."
              description="Site feedback, bugs, moderation concerns, and feature requests will enter this workspace for review."
              action={<Link href="/suggestion-box" className="font-bold text-brand-orange-ink hover:text-primary-700">Open the public form</Link>}
            />
          ) : (
            <div className="mt-6 min-w-0 space-y-8">
              {pendingSuggestions.length > 0 && (
                <div className="min-w-0">
                  <SubsectionLabel label="Pending review" count={pendingSuggestions.length} tone="amber" />
                  <div className="mt-3 min-w-0 space-y-4">
                    {pendingSuggestions.map(suggestion => (
                      <AdminSuggestionRow key={suggestion.id} suggestion={suggestion} nowMs={nowMs} />
                    ))}
                  </div>
                </div>
              )}

              <div className="min-w-0">
                <SubsectionLabel label="Reviewed suggestions" count={reviewedSuggestions.length} />
                {reviewedSuggestions.length === 0 ? (
                  <div className="mt-3 border border-surface-200 bg-white p-5 text-sm text-surface-500">
                    Reviewed feedback will remain here with its response and publication state.
                  </div>
                ) : (
                  <div className="mt-3 min-w-0 space-y-4">
                    {reviewedSuggestions.map(suggestion => (
                      <AdminSuggestionRow key={suggestion.id} suggestion={suggestion} nowMs={nowMs} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function adminPageCopy(tab: AdminTab, reviewCount: number) {
  if (tab === 'pending') {
    return {
      title: 'Review what ships next.',
      description: reviewCount > 0
        ? 'Open each intake, verify its source evidence, and take the next publishing or moderation action.'
        : 'The review queue is clear. New source runs and project submissions will collect here.',
    }
  }
  if (tab === 'all') {
    return {
      title: 'Keep the project registry healthy.',
      description: 'Find any project, confirm its publication state, and recover or remove it without losing its source trail.',
    }
  }
  if (tab === 'suggestions') {
    return {
      title: 'Turn feedback into decisions.',
      description: 'Review what users sent, respond directly, and control what appears on the public suggestion board.',
    }
  }
  return {
    title: 'Run PathForge with confidence.',
    description: 'One operational view for project review, source-run intake, publishing state, and community feedback.',
  }
}

function AdminTabLink({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex min-h-10 min-w-0 items-center justify-between gap-2 px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink sm:min-w-32 sm:justify-center',
        active
          ? 'bg-surface-900 text-white'
          : 'text-surface-600 hover:bg-primary-50 hover:text-brand-orange-ink',
      ].join(' ')}
    >
      <span className="truncate">{label}</span>
      {typeof count === 'number' && (
        <span className={`shrink-0 font-mono text-[9px] ${active ? 'text-brand-orange-light' : 'text-surface-400'}`}>
          {count}
        </span>
      )}
    </Link>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string
  title: string
  description: string
  count: number
}) {
  const headingId = title.toLowerCase().replaceAll(' ', '-') + '-heading'
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">{eyebrow}</p>
        <h2 id={headingId} className="mt-1 text-2xl font-black tracking-[-0.03em] text-surface-900">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-surface-600">{description}</p>
      </div>
      <span className="w-fit shrink-0 border border-surface-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-surface-500">
        {count} total
      </span>
    </div>
  )
}

function SubsectionLabel({ label, count, tone = 'neutral' }: { label: string; count: number; tone?: 'neutral' | 'amber' }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 ${tone === 'amber' ? 'bg-amber-500' : 'bg-surface-400'}`} aria-hidden="true" />
      <h3 className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${tone === 'amber' ? 'text-amber-800' : 'text-surface-500'}`}>
        {label}
      </h3>
      <span className="font-mono text-[10px] text-surface-400">{count}</span>
    </div>
  )
}

function SourceRunIntakeRow({ sourceRun }: { sourceRun: SourceRunSubmissionWithRelations }) {
  const preparedProject = getPreparedShowcaseProjectBySourceRunId(sourceRun.id)
  const title = titleForSourceRunReview({
    title: sourceRun.title,
    notes: sourceRun.notes,
    sourceUrl: sourceRun.source_url,
    fileName: sourceRun.file_name,
  })
  const sourceLabel = sourceRun.source_url ?? sourceRun.file_name ?? 'Source run'
  const modelMetadata = modelMetadataForSourceRunReview({
    notes: sourceRun.notes,
    sourceUrl: sourceRun.source_url,
  })
  const forkSource = projectForkSourceFromSubmissionFields(sourceRun)

  return (
    <article
      className="min-w-0 bg-amber-50/35 p-4 transition-colors hover:bg-amber-50/70 sm:p-5"
      data-source-run-id={sourceRun.id}
      data-source-url={sourceRun.source_url ?? undefined}
    >
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${preparedProject ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-white text-amber-800'}`}>
              <FileCheck2 className="h-3 w-3" aria-hidden="true" />
              {preparedProject ? 'Prepared page ready' : 'Source-run review'}
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-500">
              {sourceRun.status.replace('_', ' ')}
            </span>
          </div>

          <Link
            href={`/admin/source-runs/${sourceRun.id}`}
            className="block break-words text-base font-black leading-6 text-surface-900 transition-colors hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
          >
            {title}
          </Link>
          <p className="mt-1 break-all font-mono text-[10px] leading-5 text-surface-500">{sourceLabel}</p>

          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 text-[11px] text-surface-700">
            {forkSource && (
              <span className="border border-green-200 bg-green-50 px-2 py-1 text-green-800">
                Fork: {forkSource.sourceStepNumber
                  ? `response ${String(forkSource.sourceStepNumber).padStart(2, '0')}`
                  : 'source attached'}
                {forkSource.sourceRunId ? ' · exact model run' : ''}
              </span>
            )}
            <span className="border border-surface-200 bg-white px-2 py-1">
              Provider: {modelMetadata.provider || 'Not specified'}
            </span>
            <span className="border border-surface-200 bg-white px-2 py-1">
              Model: {modelMetadata.modelUsed || 'Not specified'}
            </span>
            {modelMetadata.modelSettings && (
              <span className="border border-surface-200 bg-white px-2 py-1">
                Settings: {modelMetadata.modelSettings}
              </span>
            )}
          </div>

          <p className={`mt-3 text-xs leading-5 ${preparedProject ? 'font-semibold text-green-800' : 'text-surface-500'}`}>
            {preparedProject
              ? `Prepared for publication at ${preparedProject.href}.`
              : 'No prepared public page yet. Structure it first, then publish from this review item.'}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-3 border-t border-surface-200 pt-4 lg:min-w-56 lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs lg:grid-cols-1 lg:text-right">
            <div className="min-w-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">Submitted by</dt>
              <dd className="mt-0.5 truncate font-semibold text-surface-700">
                {sourceRun.author?.display_name ?? sourceRun.author?.username ?? 'Anonymous'}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-surface-400">Received</dt>
              <dd className="mt-0.5 font-semibold text-surface-700">{new Date(sourceRun.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
          <Link
            href={`/admin/source-runs/${sourceRun.id}`}
            className={[
              'inline-flex min-h-10 w-full items-center justify-center px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink lg:w-auto',
              preparedProject
                ? 'bg-green-800 text-white hover:bg-green-900'
                : 'bg-surface-900 text-white hover:bg-primary-700',
            ].join(' ')}
          >
            {preparedProject ? 'Publish prepared page' : 'Review source run'}
          </Link>
        </div>
      </div>
    </article>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="min-w-0 border-b border-r border-surface-200 p-3.5 last:border-r-0 lg:border-b-0 lg:p-4">
      <dt className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-surface-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-black tracking-[-0.04em] ${highlight ? 'text-brand-orange-ink' : 'text-surface-900'}`}>{value}</dd>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="border border-dashed border-surface-300 bg-white px-5 py-10 text-center sm:px-8 sm:py-14">
      <div className="mx-auto flex h-11 w-11 items-center justify-center bg-primary-50 text-brand-orange-ink">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-black text-surface-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-surface-600">{description}</p>
      {action && <div className="mt-4 text-sm">{action}</div>}
    </div>
  )
}
