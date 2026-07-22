import Link from 'next/link'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import ModelComparisonPreviewLink, {
  ModelComparisonCurrentPreviewLink,
  ModelComparisonViewportManager,
  ModelVariantViewLink,
} from '@/components/ModelComparisonPreviewLink'
import { ModelVariantMenuCloseButton } from '@/components/ModelVariantMenuCloseButton'
import { ModelVariantKnownIssue } from '@/components/ModelVariantKnownIssue'
import type {
  ProjectModelVariant,
  ProjectModelVariantSet,
} from '@/lib/project-model-variants'
import { getProjectModelVariantKnownIssueExplanation } from '@/lib/project-model-variants'
import {
  compareModelVariantRecords,
  comparisonRunEvidenceLookup,
} from '@/lib/model-variant-ui.mjs'
import { getPublicModelIdentityLabel } from '@/lib/public-model-labels'
import { publicArtifactStatusPresentation } from '@/lib/public-project-truth'
import { resolvePublicSourceEvidence } from '@/lib/public-source-evidence'

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
  return publicArtifactStatusPresentation({
    qualityStatus: variant.qualityStatus,
    knownIssueExplanation: getProjectModelVariantKnownIssueExplanation(variant),
  }).label
}

function conciseModelSettings(variant: ProjectModelVariant) {
  const settings = variant.modelSettings.trim()
  if (settings.length <= 96) return settings
  return 'Detailed model settings are preserved in the source evidence.'
}

function runTimestamp(variant: ProjectModelVariant) {
  return RUN_TIMESTAMP_FORMATTER.format(new Date(variant.capturedAt))
}

function modelIdentityLabel(variant: ProjectModelVariant) {
  return getPublicModelIdentityLabel({
    provider: variant.serviceLabel,
    model: variant.modelLabel,
    modelSettings: variant.modelSettings,
  })
}

function accessibleRunLabel(variant: ProjectModelVariant) {
  const knownIssueExplanation = getProjectModelVariantKnownIssueExplanation(variant)
  return [
    `${modelIdentityLabel(variant)}, captured ${runTimestamp(variant)}; source run ${variant.sourceRunId}`,
    knownIssueExplanation
      ? `Artifact has known issue: ${knownIssueExplanation}`
      : 'Artifact verified',
  ].join('. ')
}

function StatusBadge({
  variant,
  id,
  focusable = false,
  inlineOnMobile = false,
}: {
  variant: ProjectModelVariant
  id: string
  focusable?: boolean
  inlineOnMobile?: boolean
}) {
  const verified = variant.qualityStatus === 'verified'
  const knownIssueExplanation = getProjectModelVariantKnownIssueExplanation(variant)
  if (knownIssueExplanation) {
    return (
      <ModelVariantKnownIssue
        id={id}
        explanation={knownIssueExplanation}
        focusable={focusable}
        inlineOnMobile={inlineOnMobile}
        placement="end"
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-1 border border-brand-blue/30 bg-blue-50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-brand-blue-dark">
      {verified ? <CheckCircle2 className="h-3 w-3" /> : null}
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
  const activeKnownIssueExplanation = getProjectModelVariantKnownIssueExplanation(activeVariant)
  const activeKnownIssueId = `active-model-${activeVariant.sourceRunId}-known-issue`
  const activeSourceEvidence = resolvePublicSourceEvidence({
    sourceRunId: activeVariant.sourceRunId,
    pathforgeRecordChecked: true,
  })

  return (
    <aside
      className="relative w-full lg:w-[340px] lg:shrink-0"
      data-model-variant-selector
    >
      <ModelComparisonViewportManager
        navigationKey={`${activeVariant.sourceRunId}:${compareSourceRunId ?? ''}`}
      />
      <details
        key={`${activeVariant.sourceRunId}:${compareSourceRunId ?? ''}`}
        className="group relative"
      >
        <summary
          className={`flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 border border-surface-300 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue${activeKnownIssueExplanation ? ' model-known-issue-owner' : ''}`}
          aria-describedby={activeKnownIssueExplanation ? activeKnownIssueId : undefined}
        >
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-surface-500">
              Model result
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span
                className="truncate text-sm font-black text-surface-900"
                title={modelIdentityLabel(activeVariant)}
                data-public-model-identity
              >
                {modelIdentityLabel(activeVariant)}
              </span>
              <span className="text-xs text-surface-500">
                <time dateTime={activeVariant.capturedAt}>{runTimestamp(activeVariant)}</time>
              </span>
              <StatusBadge
                variant={activeVariant}
                id={activeKnownIssueId}
                inlineOnMobile
              />
              <span className="basis-full text-xs text-surface-500">
                {activeVariant.promptCount} {activeVariant.promptCount === 1 ? 'prompt' : 'prompts'} · {variantSet.variants.length} model {variantSet.variants.length === 1 ? 'run' : 'runs'}
              </span>
              <span
                className="basis-full text-[10px] leading-4 text-surface-500"
                data-selected-model-public-truth
                data-source-run-id={activeVariant.sourceRunId}
                data-source-access={activeSourceEvidence.accessState}
                data-pathforge-record={activeSourceEvidence.hasPathForgeRecord ? 'true' : 'false'}
                data-model-proof={activeSourceEvidence.modelProof}
                data-selected-run-prompt-count={activeVariant.promptCount}
              >
                {[
                  activeSourceEvidence.accessLabel,
                  activeSourceEvidence.recordLabel,
                  activeSourceEvidence.modelProofLabel,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-blue">
            Change
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div
          className="fixed inset-x-4 bottom-4 top-20 z-40 flex w-auto flex-col border border-surface-300 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[calc(100%+8px)] sm:block sm:w-[390px]"
          data-model-variant-menu
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-200 px-4 py-3">
            <div className="text-sm font-black text-surface-900">Choose a model run</div>
            <ModelVariantMenuCloseButton />
          </div>

          <div className="min-h-0 flex-1 divide-y divide-surface-200 overflow-y-auto sm:max-h-none sm:overflow-visible">
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
              const knownIssueExplanation = getProjectModelVariantKnownIssueExplanation(variant)
              const knownIssueId = `model-menu-${variant.sourceRunId}-known-issue`
              const variantSourceEvidence = resolvePublicSourceEvidence({
                sourceRunId: variant.sourceRunId,
                pathforgeRecordChecked: true,
              })
              return (
                <div
                  key={variant.sourceRunId}
                  className={isActive ? 'bg-blue-50/70 px-4 py-3' : 'bg-white px-4 py-3'}
                  data-model-variant-run={variant.sourceRunId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-surface-900" data-public-model-identity>
                          {modelIdentityLabel(variant)}
                        </span>
                        {releaseLabel && (
                          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-brand-orange-dark">
                            {releaseLabel}
                          </span>
                        )}
                      </div>
                      <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs text-surface-500${knownIssueExplanation ? ' model-known-issue-owner' : ''}`}>
                        <time dateTime={variant.capturedAt}>{runTimestamp(variant)}</time>
                        <span>{variant.promptCount} {variant.promptCount === 1 ? 'prompt' : 'prompts'}</span>
                        <span>{variantSourceEvidence.accessLabel}</span>
                        {variantSourceEvidence.recordLabel && <span>{variantSourceEvidence.recordLabel}</span>}
                        <span>{variantSourceEvidence.modelProofLabel}</span>
                        <StatusBadge
                          variant={variant}
                          id={knownIssueId}
                          focusable={Boolean(knownIssueExplanation)}
                          inlineOnMobile
                        />
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
                        <ModelVariantViewLink
                          href={viewRunHref(variantSet, variant)}
                          ariaLabel={`View ${accessibleRunLabel(variant)}`}
                          className="border border-brand-blue bg-brand-blue px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-brand-blue-dark"
                        >
                          View run
                        </ModelVariantViewLink>
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

          <p className="shrink-0 border-t border-surface-200 bg-surface-50 px-4 py-3 text-[11px] leading-5 text-surface-500">
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
  isPreviewed,
}: {
  label: 'A' | 'B'
  variant: ProjectModelVariant
  variantSet: ProjectModelVariantSet
  otherVariant: ProjectModelVariant
  isPreviewed: boolean
}) {
  const knownIssueExplanation = getProjectModelVariantKnownIssueExplanation(variant)
  const knownIssueId = `comparison-${label}-${variant.sourceRunId}-known-issue`
  const sourceEvidence = resolvePublicSourceEvidence(comparisonRunEvidenceLookup(variant))
  return (
    <article
      className="border border-brand-blue/25 bg-white p-4"
      data-model-variant-comparison={label}
      data-model-variant-source-run={variant.sourceRunId}
    >
      <div className={`flex items-start justify-between gap-3${knownIssueExplanation ? ' model-known-issue-owner' : ''}`}>
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">
            Run {label}
          </div>
          <h3 className="mt-2 text-lg font-black text-surface-900" data-public-model-identity>
            {modelIdentityLabel(variant)}
          </h3>
          <p
            className="mt-1 max-w-xl text-xs leading-5 text-surface-500"
            title={variant.modelSettings}
          >
            Captured <time dateTime={variant.capturedAt}>{runTimestamp(variant)}</time>
            <br />
            {conciseModelSettings(variant)}
          </p>
        </div>
        <div data-comparison-artifact-state={variant.qualityStatus}>
          <StatusBadge
            variant={variant}
            id={knownIssueId}
            focusable={Boolean(knownIssueExplanation)}
            inlineOnMobile
          />
        </div>
      </div>
      <div
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand-blue/10 pt-3 text-[10px] leading-4 text-surface-500"
        data-model-variant-comparison-evidence={sourceEvidence.sourceRunId ?? ''}
      >
        <span data-comparison-source-access={sourceEvidence.accessState}>
          {sourceEvidence.accessLabel}
        </span>
        {sourceEvidence.recordLabel && (
          <span data-comparison-record-label>{sourceEvidence.recordLabel}</span>
        )}
        <span data-comparison-model-proof={sourceEvidence.modelProof}>
          {sourceEvidence.modelProofLabel}
        </span>
      </div>
      {isPreviewed ? (
        <ModelComparisonCurrentPreviewLink
          ariaLabel={`Reveal the current preview for ${accessibleRunLabel(variant)} below`}
          className="mt-4 inline-flex border border-brand-blue bg-brand-blue px-3 py-2 text-xs font-black text-white"
        >
          Previewing run {label} below
        </ModelComparisonCurrentPreviewLink>
      ) : (
        <ModelComparisonPreviewLink
          href={`${runHref(variantSet.canonicalRoute, variant, otherVariant)}#final-result`}
          ariaLabel={`Preview ${accessibleRunLabel(variant)} below`}
          className="mt-4 inline-flex border border-brand-blue/30 px-3 py-2 text-xs font-black text-brand-blue hover:bg-blue-50"
        >
          Preview run {label} below
        </ModelComparisonPreviewLink>
      )}
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
  const [runA, runB] = [activeVariant, compareVariant].sort(compareModelVariantRecords)
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
              The opening request and acceptance contract are fixed. Follow-ups preserve the run&apos;s own path through verified repairs or clearly labeled product refinement.
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
          <ComparisonCard
            label="A"
            variant={runA}
            variantSet={variantSet}
            otherVariant={runB}
            isPreviewed={runA.sourceRunId === activeVariant.sourceRunId}
          />
          <ComparisonCard
            label="B"
            variant={runB}
            variantSet={variantSet}
            otherVariant={runA}
            isPreviewed={runB.sourceRunId === activeVariant.sourceRunId}
          />
        </div>
      </div>
    </section>
  )
}
