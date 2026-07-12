import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileWarning,
  GitFork,
  Link2,
  Wrench,
} from 'lucide-react'
import { getMyForgeDashboard } from '@/lib/data/my-forge'
import { getProjectHref } from '@/lib/project-links'
import { canonicalMetadata } from '@/lib/site-url'
import type { MyForgeSourceRun } from '@/lib/my-forge-types'

export const metadata: Metadata = {
  title: 'Build status | My Forge | PathForge',
  description: 'Private status and source lineage for a PathForge build submission.',
  robots: { index: false, follow: false },
  ...canonicalMetadata('/my-forge'),
}

const lifecycleSteps = [
  { key: 'received', label: 'Received' },
  { key: 'extracting', label: 'Extracting' },
  { key: 'in_review', label: 'In review' },
  { key: 'live', label: 'Live' },
] as const

function lifecycleIndex(lifecycle: MyForgeSourceRun['lifecycle']) {
  if (lifecycle === 'needs_repair' || lifecycle === 'failed') return 2
  if (lifecycle === 'declined') return 2
  return lifecycleSteps.findIndex((step) => step.key === lifecycle)
}

function statusCopy(run: MyForgeSourceRun) {
  switch (run.lifecycle) {
    case 'received': return 'PathForge has the source link and ownership record. Extraction has not started yet.'
    case 'extracting': return 'The source session is being converted into a reviewable path and artifact package.'
    case 'in_review': return 'The extracted path is being checked for source fidelity, usefulness, safety, and artifact quality.'
    case 'needs_repair': return run.userStatusNote || 'The source run needs a concrete correction before it can move forward.'
    case 'live': return 'This build passed review and is now attached to your public Vault.'
    case 'declined': return run.userStatusNote || 'This submission was closed after review and remains here as part of your private history.'
    case 'failed': return run.userStatusNote || 'PathForge could not finish processing this source run. Open a repair submission to continue.'
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default async function MyForgeBuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dashboard = await getMyForgeDashboard()
  if (!dashboard) redirect(`/auth/login?next=${encodeURIComponent(`/my-forge/builds/${id}`)}`)

  const run = dashboard.sourceRuns.find((candidate) => candidate.id === id)
  if (!run) notFound()

  const progressIndex = lifecycleIndex(run.lifecycle)
  const needsAction = (run.lifecycle === 'needs_repair' || run.lifecycle === 'failed') && !run.repairSubmissionId
  const liveHref = run.extractedProject ? getProjectHref({ id: run.extractedProject.id }) : null

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/my-forge" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-orange">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          My Forge
        </Link>

        <div className="mt-6 border border-surface-200 bg-white">
          <header className="border-b border-surface-200 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange">Private build record</div>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-surface-900 sm:text-4xl">{run.title}</h1>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                  <span>Submitted {formatTimestamp(run.createdAt)}</span>
                  <span>Updated {formatTimestamp(run.updatedAt)}</span>
                  <span className="font-mono">ID {run.id}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {needsAction && (
                  <Link href={`/build?repair=${encodeURIComponent(run.id)}`} className="inline-flex min-h-10 items-center gap-2 bg-surface-900 px-4 py-2 text-xs font-bold text-white hover:bg-brand-orange">
                    Repair run
                    <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
                {liveHref && (
                  <Link href={liveHref} className="inline-flex min-h-10 items-center gap-2 bg-[#07551f] px-4 py-2 text-xs font-bold text-white hover:bg-[#053d16]">
                    View live path
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </header>

          <section className="p-5 sm:p-7" aria-labelledby="status-heading">
            <div className="flex items-center gap-2">
              {needsAction ? <FileWarning className="h-5 w-5 text-rose-600" aria-hidden="true" /> : run.lifecycle === 'live' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <Clock3 className="h-5 w-5 text-brand-blue" aria-hidden="true" />}
              <h2 id="status-heading" className="text-xl font-black text-surface-900">
                {run.lifecycle === 'needs_repair' ? 'Needs attention' : run.lifecycle.replace('_', ' ')}
              </h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-600">{statusCopy(run)}</p>

            {run.repairSubmissionId && (
              <div className="mt-5 flex flex-col gap-3 border border-brand-blue/25 bg-accent-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black text-surface-900">Repair submitted</div>
                  <p className="mt-1 text-xs leading-5 text-surface-600">The next submission now owns the active review step for this build.</p>
                </div>
                <Link href={`/my-forge/builds/${run.repairSubmissionId}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 bg-surface-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-orange">
                  View repair
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            <ol className="mt-7 grid grid-cols-4 gap-1" aria-label="Review progress">
              {lifecycleSteps.map((step, index) => {
                const complete = run.lifecycle === 'live' || index < progressIndex
                const current = index === progressIndex && run.lifecycle !== 'declined'
                return (
                  <li key={step.key} className="min-w-0">
                    <div className={`h-1.5 ${complete || current ? 'bg-brand-orange' : 'bg-surface-200'}`} aria-hidden="true" />
                    <div className={`mt-2 truncate font-mono text-[9px] font-bold uppercase tracking-[0.08em] ${current ? 'text-surface-900' : complete ? 'text-brand-orange' : 'text-surface-400'}`}>
                      {step.label}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className="grid border-t border-surface-200 lg:grid-cols-2" aria-label="Source and lineage">
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-surface-500">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Source evidence
              </div>
              {run.sourceUrl ? (
                <a href={run.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex max-w-full items-center gap-2 text-sm font-bold text-brand-blue hover:text-brand-blue-dark">
                  <span className="truncate">Open original source run</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-4 text-sm text-surface-500">No public source URL is attached to this legacy entry.</p>
              )}
              {run.fileName && <p className="mt-2 font-mono text-[10px] text-surface-400">File: {run.fileName}</p>}
            </div>

            <div className="border-t border-surface-200 p-5 lg:border-l lg:border-t-0 sm:p-7">
              <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-[#07551f]">
                <GitFork className="h-4 w-4" aria-hidden="true" />
                Lineage
              </div>
              {run.forkSourceProjectId ? (
                <div className="mt-4">
                  <div className="text-sm font-black text-surface-900">Forked from {run.forkSourceProjectTitle || 'a PathForge path'}</div>
                  <div className="mt-2 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-surface-500">
                    {run.forkSourceStepNumber && <span className="border border-surface-200 bg-surface-50 px-2 py-1">Response {run.forkSourceStepNumber}</span>}
                    {run.forkSourceRunId && <span className="border border-surface-200 bg-surface-50 px-2 py-1">Model run locked</span>}
                  </div>
                  <Link href={getProjectHref({ id: run.forkSourceProjectId })} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#07551f] hover:text-brand-orange">
                    View parent path
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-surface-500">Original build. This entry does not branch from another PathForge response.</p>
              )}
              {run.resubmissionOfId && (
                <Link href={`/my-forge/builds/${run.resubmissionOfId}`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-surface-700 hover:text-brand-orange">
                  <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                  View the entry this repair continues
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
