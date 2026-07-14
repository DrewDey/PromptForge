import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Eye,
  GitFork,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  ACTIVATION_WINDOWS,
  getActivationDashboard,
  normalizeActivationWindow,
} from '@/lib/activation/dashboard'
import type { ActivationDashboardData, ActivationFunnelStep } from '@/lib/activation/contract'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Launch Activation | PathForge Admin',
  robots: { index: false, follow: false },
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(value % 1 === 0 ? 0 : 1) : '0'}%`
}

function formatDate(value: string | null) {
  if (!value) return 'No events yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No events yet'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function metricRead(data: ActivationDashboardData) {
  if (data.summary.project_sessions < 20) {
    return {
      eyebrow: 'Collect a trustworthy baseline',
      title: 'Keep the funnel live; do not optimize from noise yet.',
      body: `${data.summary.project_sessions} external project session${data.summary.project_sessions === 1 ? '' : 's'} entered this window. Wait for at least 20 before treating one stage as the product bottleneck.`,
    }
  }

  const transitions = data.funnel.slice(1)
  const weakest = transitions.reduce((lowest, step) => (
    step.rate_from_previous < lowest.rate_from_previous ? step : lowest
  ), transitions[0])

  if (weakest?.key === 'build_path_reached') {
    return {
      eyebrow: 'Largest current drop-off',
      title: 'More visitors need to reach the evidence.',
      body: 'Prioritize the project-to-build-path handoff: clarify that the working artifact is only the result and that the exact prompts, responses, and fork points are directly below it.',
    }
  }
  if (weakest?.key === 'builder_action_started') {
    return {
      eyebrow: 'Largest current drop-off',
      title: 'Evidence is being inspected, but not continued.',
      body: 'Prioritize fork and Share a Build intent: make the next useful action clearer at the response where a visitor is already evaluating the path.',
    }
  }
  return {
    eyebrow: 'Largest current drop-off',
    title: 'Started builds are not reaching the review queue.',
    body: 'Prioritize the build intake handoff: inspect where builders abandon the source link, model identity, or final-result clue before submission.',
  }
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  emphasis = false,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  emphasis?: boolean
}) {
  return (
    <article className={`relative overflow-hidden border p-4 sm:p-5 ${emphasis ? 'border-brand-orange bg-primary-50' : 'border-surface-200 bg-white'}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${emphasis ? 'bg-brand-orange' : 'bg-surface-900'}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div>
          <div className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-surface-500">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-surface-900">{value}</div>
          <p className="mt-1 text-xs leading-5 text-surface-500">{detail}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center ${emphasis ? 'bg-brand-orange text-surface-900' : 'bg-surface-100 text-surface-700'}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </article>
  )
}

function FunnelStep({ step, maximum, index }: { step: ActivationFunnelStep; maximum: number; index: number }) {
  const width = maximum > 0 ? Math.max(step.sessions > 0 ? 3 : 0, step.sessions * 100 / maximum) : 0
  const tones = ['bg-surface-800', 'bg-brand-blue', 'bg-brand-orange', 'bg-emerald-600']
  return (
    <li className="grid gap-3 border-b border-surface-200 py-4 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)_96px] sm:items-center">
      <div>
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-surface-400">Stage {index + 1}</div>
        <div className="mt-1 text-sm font-black text-surface-900">{step.label}</div>
      </div>
      <div>
        <div className="h-3 bg-surface-100" aria-hidden="true">
          <div className={`h-full ${tones[index]}`} style={{ width: `${width}%` }} />
        </div>
        <div className="mt-1.5 text-[10px] text-surface-500">
          {index === 0 ? 'Funnel entry' : `${formatPercent(step.rate_from_previous)} from previous stage`}
        </div>
      </div>
      <div className="text-left sm:text-right">
        <strong className="text-xl font-black text-surface-900">{step.sessions}</strong>
        <span className="ml-1 text-[10px] uppercase tracking-[0.08em] text-surface-400">sessions</span>
      </div>
    </li>
  )
}

function DailyTrend({ data }: { data: ActivationDashboardData['daily'] }) {
  const maximum = Math.max(1, ...data.map((day) => day.project_sessions))
  const labelEvery = Math.max(1, Math.ceil(data.length / 7))
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[0.1em] text-surface-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-surface-300" aria-hidden="true" /> Project sessions</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-brand-orange" aria-hidden="true" /> Activated</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex h-44 min-w-[560px] items-end gap-1.5 border-b border-surface-300 px-1" role="img" aria-label="Daily project sessions and activated sessions">
          {data.map((day, index) => {
            const projectHeight = day.project_sessions * 100 / maximum
            const activatedHeight = day.activated_sessions * 100 / maximum
            const date = new Date(`${day.date}T00:00:00Z`)
            const label = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
            return (
              <div key={day.date} className="group relative flex h-full min-w-2 flex-1 items-end justify-center" title={`${label}: ${day.project_sessions} project sessions, ${day.activated_sessions} activated`}>
                <div className="relative h-full w-full max-w-5">
                  <span className="absolute inset-x-0 bottom-0 bg-surface-300" style={{ height: `${projectHeight}%` }} />
                  <span className="absolute inset-x-0 bottom-0 bg-brand-orange" style={{ height: `${activatedHeight}%` }} />
                </div>
                {(index % labelEvery === 0 || index === data.length - 1) && (
                  <span className="absolute -bottom-6 whitespace-nowrap font-mono text-[8px] text-surface-400">{label}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EmptyActivationState({ days }: { days: number }) {
  return (
    <section className="mt-7 grid gap-0 overflow-hidden border border-surface-200 bg-white lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="p-7 sm:p-10">
        <span className="flex h-11 w-11 items-center justify-center bg-primary-50 text-brand-orange-ink"><Activity className="h-5 w-5" aria-hidden="true" /></span>
        <p className="mt-6 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Measurement is ready</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-surface-900">Waiting for the first production journey.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-600">
          No external activation events reached the production dataset in the last {days} days. The dashboard will populate as visitors open projects, inspect build paths, and start forks or submissions.
        </p>
      </div>
      <aside className="border-t border-surface-200 bg-surface-900 p-7 text-white lg:border-l lg:border-t-0">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange-light">What is excluded</div>
        <p className="mt-4 text-sm leading-6 text-surface-300">Seed profiles, PathForge team accounts, admins, preview traffic, search text, prompt contents, referrers, IPs, and user agents never enter the launch KPI.</p>
      </aside>
    </section>
  )
}

export default async function ActivationDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const days = normalizeActivationWindow(params.days)
  let data: ActivationDashboardData | null = null
  let queryError = false
  try {
    data = await getActivationDashboard(days)
  } catch {
    queryError = true
  }

  const recommendation = data ? metricRead(data) : null
  const funnelMaximum = Math.max(0, ...(data?.funnel.map((step) => step.sessions) ?? []))

  return (
    <div className="min-w-0">
      <section className="grid gap-5 border-b border-surface-200 pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
            <Activity className="h-4 w-4" aria-hidden="true" /> Launch activation
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-surface-900 sm:text-4xl">See whether PathForge creates builders.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600 sm:text-base">
            The primary signal is an external session that opens a project, reaches its build evidence, then starts a fork or source-run share—in that order.
          </p>
        </div>
        <nav className="flex border border-surface-200 bg-white p-1" aria-label="Activation window">
          {ACTIVATION_WINDOWS.map((window) => (
            <Link
              key={window}
              href={`/admin/analytics?days=${window}`}
              aria-current={days === window ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center px-3 text-xs font-black ${days === window ? 'bg-surface-900 text-white' : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'}`}
            >
              {window} days
            </Link>
          ))}
        </nav>
      </section>

      {queryError && (
        <section className="mt-7 border border-rose-200 bg-rose-50 p-5 text-rose-900" role="alert">
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-black">Activation data is temporarily unavailable.</h2>
              <p className="mt-1 text-sm leading-6">The admin console remains usable. Reload this view after the analytics service or database connection recovers.</p>
            </div>
          </div>
        </section>
      )}

      {data && data.health.total_events === 0 && <EmptyActivationState days={days} />}

      {data && data.health.total_events > 0 && (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Activation summary">
            <MetricCard label="Evidence-qualified activation" value={formatPercent(data.summary.activation_rate)} detail={`${data.summary.activated_sessions} of ${data.summary.project_sessions} project sessions`} icon={Sparkles} emphasis />
            <MetricCard label="Evidence reach" value={formatPercent(data.summary.evidence_rate)} detail={`${data.summary.evidence_sessions} sessions reached the build path`} icon={Eye} />
            <MetricCard label="Submission completion" value={formatPercent(data.summary.completion_rate)} detail={`${data.summary.completed_sessions} completed after starting`} icon={GitFork} />
            <MetricCard label="Builder return" value={formatPercent(data.summary.return_rate)} detail={`${data.summary.returning_builders} of ${data.summary.member_builders} member builders returned in a later session`} icon={Users} />
          </section>

          {recommendation && (
            <section className="mt-5 grid gap-0 border border-brand-orange/60 bg-white lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
              <div className="bg-primary-50 p-5">
                <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">{recommendation.eyebrow}</div>
                <div className="mt-2 flex h-10 w-10 items-center justify-center bg-brand-orange text-surface-900"><TrendingUp className="h-4 w-4" /></div>
              </div>
              <div className="border-t border-brand-orange/30 p-5 lg:border-l lg:border-t-0">
                <h2 className="text-xl font-black text-surface-900">{recommendation.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">{recommendation.body}</p>
              </div>
              <Link href="/admin" className="m-5 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-surface-300 px-3 py-2 text-xs font-black text-surface-800 hover:border-brand-orange">
                Review operations <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>
          )}

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
            <section className="border border-surface-200 bg-white p-5 sm:p-6" aria-labelledby="activation-funnel-title">
              <div className="flex items-start justify-between gap-4 border-b border-surface-200 pb-4">
                <div>
                  <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">Ordered behavior</div>
                  <h2 id="activation-funnel-title" className="mt-1 text-2xl font-black text-surface-900">Builder activation funnel</h2>
                </div>
                <BarChart3 className="h-5 w-5 text-surface-400" aria-hidden="true" />
              </div>
              <ol>
                {data.funnel.map((step, index) => <FunnelStep key={step.key} step={step} maximum={funnelMaximum} index={index} />)}
              </ol>
            </section>

            <section className="border border-surface-200 bg-white p-5 sm:p-6" aria-labelledby="activation-trend-title">
              <div className="mb-5 border-b border-surface-200 pb-4">
                <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">Momentum</div>
                <h2 id="activation-trend-title" className="mt-1 text-2xl font-black text-surface-900">Daily signal</h2>
              </div>
              <DailyTrend data={data.daily} />
            </section>
          </div>

          <section className="mt-8" aria-labelledby="project-performance-title">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">Project contribution</div>
                <h2 id="project-performance-title" className="mt-1 text-2xl font-black text-surface-900">Which paths create action</h2>
              </div>
              <p className="max-w-xl text-xs leading-5 text-surface-500">Ranked by qualified activation, then evidence reach—not by raw views.</p>
            </div>
            {data.projects.length === 0 ? (
              <div className="border border-surface-200 bg-white p-5 text-sm text-surface-500">Project-level results will appear after the first external project session.</div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.projects.map((project, index) => (
                  <article key={project.project_id ?? project.path} className="grid gap-4 border border-surface-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-surface-400">Rank {index + 1}</div>
                      <h3 className="mt-1 truncate text-sm font-black text-surface-900">{project.project_title}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-surface-500">
                        <span>{project.opens} opened</span><span>{project.evidence} reached evidence</span><span>{project.activated} activated</span><span>{project.completed} submitted</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="text-right"><strong className="block text-xl font-black text-surface-900">{formatPercent(project.activation_rate)}</strong><span className="text-[9px] uppercase tracking-[0.08em] text-surface-400">activation</span></div>
                      <Link href={project.path} aria-label={`Open ${project.project_title}`} className="flex h-10 w-10 items-center justify-center bg-surface-900 text-white hover:bg-primary-700"><ArrowRight className="h-4 w-4" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="border border-surface-200 bg-white p-5 sm:p-6" aria-labelledby="entry-surface-title">
              <div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">Acquisition quality</div>
              <h2 id="entry-surface-title" className="mt-1 text-xl font-black text-surface-900">Entry surfaces</h2>
              <div className="mt-5 space-y-3">
                {data.surfaces.map((surface) => (
                  <div key={surface.surface} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-surface-100 pb-3 last:border-0 last:pb-0">
                    <div><strong className="block text-sm capitalize text-surface-900">{surface.surface.replaceAll('_', ' ')}</strong><span className="text-[10px] text-surface-500">{surface.project_sessions} project sessions · {surface.evidence_sessions} reached evidence</span></div>
                    <div className="text-right"><strong className="block text-sm text-surface-900">{formatPercent(surface.activation_rate)}</strong><span className="text-[9px] uppercase tracking-[0.08em] text-surface-400">activated</span></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-surface-200 bg-surface-900 p-5 text-white sm:p-6" aria-labelledby="measurement-health-title">
              <div className="flex items-center gap-2 font-mono text-[9px] font-black uppercase tracking-[0.15em] text-brand-orange-light"><ShieldCheck className="h-4 w-4" /> Measurement health</div>
              <h2 id="measurement-health-title" className="mt-2 text-xl font-black">Useful signal, deliberately narrow data.</h2>
              <dl className="mt-5 grid grid-cols-2 gap-px bg-white/10">
                <div className="bg-surface-900 p-3"><dt className="text-[9px] uppercase tracking-[0.1em] text-surface-400">External events</dt><dd className="mt-1 text-xl font-black">{data.health.external_events}</dd></div>
                <div className="bg-surface-900 p-3"><dt className="text-[9px] uppercase tracking-[0.1em] text-surface-400">External sessions</dt><dd className="mt-1 text-xl font-black">{data.health.external_sessions}</dd></div>
                <div className="bg-surface-900 p-3"><dt className="text-[9px] uppercase tracking-[0.1em] text-surface-400">Internal excluded</dt><dd className="mt-1 text-xl font-black">{data.health.internal_events}</dd></div>
                <div className="bg-surface-900 p-3"><dt className="text-[9px] uppercase tracking-[0.1em] text-surface-400">Last received</dt><dd className="mt-1 text-xs font-bold leading-5">{formatDate(data.health.last_event_at)}</dd></div>
              </dl>
              <p className="mt-5 text-xs leading-5 text-surface-300">Search terms, prompt and response text, artifacts, full URLs, referrers, IP addresses, and user agents are not collected. Seed, team, and admin traffic is stored only for diagnostics and excluded from every product KPI above.</p>
            </section>
          </div>

          <section className="mt-8 border-t border-surface-200 pt-5" aria-labelledby="supporting-signals-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="font-mono text-[9px] font-black uppercase tracking-[0.15em] text-surface-400">Supporting diagnostics</div><h2 id="supporting-signals-title" className="mt-1 text-lg font-black text-surface-900">Behavior that explains the funnel</h2></div>
              <div className="flex flex-wrap gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-surface-600">
                <span className="border border-surface-200 bg-white px-2.5 py-2">{data.supporting.discovery_sessions} discovery sessions</span>
                <span className="border border-surface-200 bg-white px-2.5 py-2">{data.supporting.search_sessions} searched</span>
                <span className="border border-surface-200 bg-white px-2.5 py-2">{data.supporting.artifact_sessions} opened artifacts</span>
                <span className="border border-surface-200 bg-white px-2.5 py-2">{data.supporting.comparison_sessions} compared models</span>
                <span className="border border-surface-200 bg-white px-2.5 py-2">{data.summary.account_sessions} account sessions</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
