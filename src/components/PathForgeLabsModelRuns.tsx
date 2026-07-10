import Link from 'next/link'
import { CheckCircle2, FlaskConical, History, TriangleAlert } from 'lucide-react'
import type {
  ProjectModelVariant,
  ProjectModelVariantSet,
} from '@/lib/project-model-variants'

function formatCapturedAt(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function runHref(route: string, run: ProjectModelVariant, compare?: ProjectModelVariant | null) {
  const params = new URLSearchParams({ run: run.sourceRunId })
  if (compare && compare.sourceRunId !== run.sourceRunId) {
    params.set('compare', compare.sourceRunId)
  }
  return `${route}?${params.toString()}`
}

function statusLabel(variant: ProjectModelVariant) {
  return variant.qualityStatus === 'verified' ? 'Verified' : 'Known issue'
}

function StatusBadge({ variant }: { variant: ProjectModelVariant }) {
  const verified = variant.qualityStatus === 'verified'
  return (
    <span className={[
      'inline-flex items-center gap-1 border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]',
      verified
        ? 'border-brand-blue/30 bg-blue-50 text-brand-blue-dark'
        : 'border-amber-300 bg-amber-50 text-amber-800',
    ].join(' ')}>
      {verified ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
      {statusLabel(variant)}
    </span>
  )
}

export default function PathForgeLabsModelRuns({
  variantSet,
  activeVariant,
}: {
  variantSet: ProjectModelVariantSet
  activeVariant: ProjectModelVariant
}) {
  const historicalVariant = variantSet.variants.find(
    (variant) => variant.runRole === 'historical-baseline',
  )

  return (
    <aside
      className="border border-brand-blue/35 bg-[#f4f8ff] p-4 shadow-[0_14px_38px_rgba(34,113,255,0.08)]"
      data-model-variant-selector
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">
            <FlaskConical className="h-3.5 w-3.5" />
            PathForge Labs
          </div>
          <p className="mt-2 text-xs leading-5 text-surface-600">
            Developer-operated reruns · same brief · not community forks
          </p>
        </div>
        <StatusBadge variant={activeVariant} />
      </div>

      <details className="group mt-4 border border-brand-blue/25 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-surface-900">
                {activeVariant.modelLabel}
              </div>
              <div className="mt-1 truncate text-xs text-surface-500">
                {activeVariant.serviceLabel} · {activeVariant.modelSettings}
              </div>
            </div>
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-blue group-open:hidden">
              Change
            </span>
            <span className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-blue group-open:inline">
              Close
            </span>
          </div>
        </summary>

        <div className="max-h-80 overflow-y-auto border-t border-brand-blue/20 p-3">
          <div className="mb-3 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-surface-500">
            <History className="h-3.5 w-3.5" />
            Model history
          </div>
          <div className="space-y-2">
            {variantSet.variants.map((variant) => {
              const isActive = variant.sourceRunId === activeVariant.sourceRunId
              const isDefault = variant.sourceRunId === variantSet.defaultSourceRunId
              return (
                <div
                  key={variant.sourceRunId}
                  className={[
                    'border p-3',
                    isActive ? 'border-brand-blue bg-[#f4f8ff]' : 'border-surface-200 bg-white',
                  ].join(' ')}
                  data-model-variant-run={variant.sourceRunId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-surface-900">{variant.modelLabel}</div>
                      <div className="mt-1 text-xs text-surface-500">
                        {variant.serviceLabel} · {formatCapturedAt(variant.capturedAt)} · {variant.promptCount} {variant.promptCount === 1 ? 'prompt' : 'prompts'}
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-surface-500">
                        {variant.modelSettings}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {isDefault && (
                        <span className="border border-brand-orange/40 bg-orange-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-brand-orange-dark">
                          Default
                        </span>
                      )}
                      {isActive && (
                        <span className="border border-brand-blue/30 bg-blue-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-brand-blue">
                          Viewing
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-100 pt-3">
                    <span className="text-[11px] text-surface-500">{variant.operatorLabel}</span>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      {!isActive && (
                        <Link href={runHref(variantSet.canonicalRoute, variant)} className="text-brand-blue hover:text-brand-blue-dark">
                          View run
                        </Link>
                      )}
                      {!isActive && (
                        <Link
                          href={runHref(variantSet.canonicalRoute, activeVariant, variant)}
                          className="text-brand-orange hover:text-brand-orange-dark"
                        >
                          Compare
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </details>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="border border-brand-blue/20 bg-white px-2 py-2">
          <div className="text-lg font-black text-surface-900">{variantSet.variants.length}</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-surface-500">Runs</div>
        </div>
        <div className="border border-brand-blue/20 bg-white px-2 py-2">
          <div className="text-lg font-black text-surface-900">{activeVariant.finalMetrics.functionalChecks.passed}/{activeVariant.finalMetrics.functionalChecks.total}</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-surface-500">Checks</div>
        </div>
        <div className="border border-brand-blue/20 bg-white px-2 py-2">
          <div className="text-lg font-black text-surface-900">{activeVariant.promptCount}</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-surface-500">Prompts</div>
        </div>
      </div>

      {activeVariant.runRole !== 'historical-baseline' && historicalVariant && (
        <p className="mt-3 border-t border-brand-blue/20 pt-3 text-[11px] leading-5 text-surface-500">
          Labs runs are read-only for lineage. Community forks stay attached to the{' '}
          <Link
            href={runHref(variantSet.canonicalRoute, historicalVariant)}
            className="font-bold text-brand-blue hover:text-brand-blue-dark"
          >
            original run
          </Link>
          .
        </p>
      )}
    </aside>
  )
}

function ComparisonCard({
  label,
  variant,
  variantSet,
  otherVariant,
}: {
  label: 'A' | 'B'
  variant: ProjectModelVariant
  variantSet: ProjectModelVariantSet
  otherVariant: ProjectModelVariant
}) {
  return (
    <article className="border border-brand-blue/25 bg-white p-4" data-model-variant-comparison={label}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">
            Run {label}
          </div>
          <h3 className="mt-2 text-lg font-black text-surface-900">{variant.modelLabel}</h3>
          <p className="mt-1 text-xs leading-5 text-surface-500">
            {variant.serviceLabel} · {variant.modelSettings}
          </p>
        </div>
        <StatusBadge variant={variant} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="border border-surface-100 bg-surface-50 p-2">
          <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-surface-500">Prompts</dt>
          <dd className="mt-1 font-black text-surface-900">{variant.promptCount}</dd>
        </div>
        <div className="border border-surface-100 bg-surface-50 p-2">
          <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-surface-500">Checks</dt>
          <dd className="mt-1 font-black text-surface-900">
            {variant.finalMetrics.functionalChecks.passed}/{variant.finalMetrics.functionalChecks.total}
          </dd>
        </div>
      </dl>
      <Link
        href={runHref(variantSet.canonicalRoute, variant, otherVariant)}
        className="mt-4 inline-flex text-xs font-black text-brand-blue hover:text-brand-blue-dark"
      >
        Preview run {label} below
      </Link>
    </article>
  )
}

export function PathForgeLabsModelComparison({
  variantSet,
  activeVariant,
  compareVariant,
}: {
  variantSet: ProjectModelVariantSet
  activeVariant: ProjectModelVariant
  compareVariant: ProjectModelVariant
}) {
  const exitHref =
    activeVariant.sourceRunId === variantSet.defaultSourceRunId
      ? variantSet.canonicalRoute
      : runHref(variantSet.canonicalRoute, activeVariant)

  return (
    <section className="border-b border-brand-blue/20 bg-[#f4f8ff] px-4 py-7 sm:px-6 lg:px-8" data-model-variant-comparison-panel>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-l-4 border-brand-blue pl-4">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">
              PathForge Labs comparison
            </div>
            <h2 className="mt-1 text-2xl font-black text-surface-900">Same exact brief, two model runs</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
              The opening request and acceptance contract are fixed. Follow-ups only address defects found during verification.
            </p>
          </div>
          <Link
            href={exitHref}
            className="border border-brand-blue/30 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-blue hover:bg-blue-50"
          >
            Exit comparison
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ComparisonCard label="A" variant={activeVariant} variantSet={variantSet} otherVariant={compareVariant} />
          <ComparisonCard label="B" variant={compareVariant} variantSet={variantSet} otherVariant={activeVariant} />
        </div>
      </div>
    </section>
  )
}
