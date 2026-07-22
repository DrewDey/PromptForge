import type { PublicProjectTruth } from '@/lib/public-project-truth'

export function PublicTruthSummary({
  truth,
  showArtifactExplanation = true,
  className = '',
}: {
  truth: PublicProjectTruth
  showArtifactExplanation?: boolean
  className?: string
}) {
  const { artifact, sourceEvidence } = truth

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] leading-5 text-surface-600 ${className}`.trim()}
      data-public-truth-summary
    >
      <span className="font-semibold text-surface-900" data-artifact-truth={artifact.status}>
        {artifact.label}
      </span>
      <span>
        {truth.runContextLabel} · {truth.selectedRunPromptLabel}
      </span>
      <span>{truth.familyRunLabel}</span>
      <span data-source-access={sourceEvidence.accessState}>{sourceEvidence.accessLabel}</span>
      {sourceEvidence.recordLabel && (
        <span data-pathforge-record={sourceEvidence.hasPathForgeRecord ? 'true' : 'false'}>
          {sourceEvidence.recordLabel}
        </span>
      )}
      <span data-model-proof={sourceEvidence.modelProof}>{sourceEvidence.modelProofLabel}</span>
      {showArtifactExplanation && artifact.explanation && (
        <span className="basis-full text-amber-800">{artifact.explanation}</span>
      )}
    </div>
  )
}
