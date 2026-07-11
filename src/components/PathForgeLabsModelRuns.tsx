import Link from 'next/link'
import { CheckCircle2, ChevronDown, TriangleAlert } from 'lucide-react'
import type {
  ProjectModelVariant,
  ProjectModelVariantSet,
} from '@/lib/project-model-variants'
import { compareModelVariantRecords } from '@/lib/model-variant-ui.mjs'

const RUN_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
  timeZoneName: 'short',
})

function runHref(route: string, run: ProjectModelVariant, compare?: ProjectModelVariant | null) {
  const params = new URLSearchParams({ run: run.sourceRunId })
  if (compare && compare.sourceRunId !== run.sourceRunId) {
    params.set('compare', compare.sourceRunId)
  }
  return `${route}?${params.toString()}`
}

function viewRunHref(
  variantSet: ProjectModelVariantSet,
  run: ProjectModelVariant,
) {
  return run.sourceRunId === variantSet.defaultSourceRunId
    ? variantSet.canonicalRoute
    : runHref(variantSet.canonicalRoute, run)
}

function statusLabel(variant: ProjectModelVariant) {
  return variant.qualityStatus === 'verified' ? 'Verified' : 'Known issue'
}

function conciseModelSettings(variant: ProjectModelVariant) {
  const settings = variant.modelSettings.trim()
  if (settings.length <= 96) return settings
  return 'Detailed model settings are preserved in the source evidence.'
}

function runTimestamp(variant: ProjectModelVariant) {
  return RUN_TIMESTAMP_FORMATTER.format(new Date(variant.capturedAt))
}

function accessibleRunLabel(variant: ProjectModelVariant) {
  return `${variant.modelLabel} on ${variant.serviceLabel}, captured ${runTimestamp(variant)}; source run ${variant.sourceRunId}`
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
  compareSourceRunId,
}: {
  variantSet: ProjectModelVariantSet
  activeVariant: ProjectModelVariant
  compareSourceRunId?: string
}) {
  const historicalVariant = variantSet.variants.find(
    (variant) => variant.runRole === 'historical-baseline',
  )
  const orderedVariants = [...variantSet.variants].sort(compareModelVariantRecords)

  return (
    <aside
      className="relative w-full lg:w-[340px] lg:shrink-0"
      data-model-variant-selector
    >
      <details
        key={`${activeVariant.sourceRunId}:${compareSourceRunId ?? ''}`}
        className="group relative"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 border border-surface-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-surface-500">
              Model result
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="truncate text-sm font-black text-surface-900">
                {activeVariant.modelLabel}
              </span>
              <span className="text-xs text-surface-500">
                {activeVariant.serviceLabel} ·{' '}
                <time dateTime={activeVariant.capturedAt}>{runTimestamp(activeVariant)}</time>
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-blue">
            Change
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-full border border-surface-300 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:w-[390px]"
          data-model-variant-menu
        >
          <div className="border-b border-surface-200 px-4 py-3">
            <div className="text-sm font-black text-surface-900">Choose a model result</div>
          </div>

          <div className="max-h-80 divide-y divide-surface-200 overflow-y-auto">
            {orderedVariants.map((variant) => {
              const isActive = variant.sourceRunId === activeVariant.sourceRunId
              const isDefault = variant.sourceRunId === variantSet.defaultSourceRunId
              const releaseLabel = isDefault
                ? 'Default'
                : variant.isCurrent
                  ? 'Latest'
                  : variant.runRole === 'historical-baseline'
                    ? 'Original'
                    : 'Previous'
              return (
                <div
                  key={variant.sourceRunId}
                  className={isActive ? 'bg-blue-50/70 px-4 py-3' : 'bg-white px-4 py-3'}
                  data-model-variant-run={variant.sourceRunId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-surface-900">{variant.modelLabel}</span>
                        {releaseLabel && (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-brand-orange-dark">
                            {releaseLabel}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-500">
                        <span>{variant.serviceLabel}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={variant.capturedAt}>{runTimestamp(variant)}</time>
                        <StatusBadge variant={variant} />
                      </div>
                    </div>

                    {isActive ? (
                      <span
                        aria-current="page"
                        aria-label={`Viewing ${accessibleRunLabel(variant)}`}
                        className="border border-brand-blue/30 bg-white px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-brand-blue"
                      >
                        Viewing
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={viewRunHref(variantSet, variant)}
                          aria-label={`View ${accessibleRunLabel(variant)}`}
                          className="border border-brand-blue bg-brand-blue px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-brand-blue-dark"
                          data-model-variant-view
                        >
                          View run
                        </Link>
                        <Link
                          href={runHref(variantSet.canonicalRoute, activeVariant, variant)}
                          aria-label={`Compare ${accessibleRunLabel(activeVariant)} with ${accessibleRunLabel(variant)}`}
                          className="border border-brand-orange/60 bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-orange-dark hover:bg-orange-50"
                          data-model-variant-compare
                        >
                          Compare
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="border-t border-surface-200 bg-surface-50 px-4 py-3 text-[11px] leading-5 text-surface-500">
            Developer-operated reruns · same brief · not community forks.
            {activeVariant.runRole !== 'historical-baseline' && historicalVariant && (
              <>
                {' '}
                <Link
                  href={runHref(variantSet.canonicalRoute, historicalVariant)}
                  className="font-bold text-brand-blue hover:text-brand-blue-dark"
                >
                  Fork from the original run
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </details>
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
          <p
            className="mt-1 max-w-xl text-xs leading-5 text-surface-500"
            title={variant.modelSettings}
          >
            {variant.serviceLabel} · <time dateTime={variant.capturedAt}>{runTimestamp(variant)}</time>
            <br />
            {conciseModelSettings(variant)}
          </p>
        </div>
        <StatusBadge variant={variant} />
      </div>
      <Link
        href={`${runHref(variantSet.canonicalRoute, variant, otherVariant)}#final-result`}
        aria-label={`Preview ${accessibleRunLabel(variant)} below`}
        className="mt-4 inline-flex border border-brand-blue/30 px-3 py-2 text-xs font-black text-brand-blue hover:bg-blue-50"
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
