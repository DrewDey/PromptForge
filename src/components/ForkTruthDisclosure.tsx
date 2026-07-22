import type { PublicArtifactStatusPresentation } from '@/lib/public-project-truth'
import type { PublicEvidenceTruth } from '@/lib/public-source-evidence'

export function ForkTruthDisclosure({
  artifact,
  sourceEvidence,
}: {
  artifact: PublicArtifactStatusPresentation
  sourceEvidence: PublicEvidenceTruth
}) {
  return (
    <div
      className="grid gap-1.5 text-xs leading-5 text-surface-500"
      data-fork-truth-disclosure
    >
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="font-semibold text-surface-700" data-artifact-truth={artifact.status}>
          {artifact.label}
        </span>
        <span data-source-access={sourceEvidence.accessState}>
          {sourceEvidence.accessLabel}
        </span>
        {sourceEvidence.recordLabel && (
          <span data-pathforge-record={sourceEvidence.hasPathForgeRecord ? 'true' : 'false'}>
            {sourceEvidence.recordLabel}
          </span>
        )}
        <span data-model-proof={sourceEvidence.modelProof}>
          {sourceEvidence.modelProofLabel}
        </span>
      </div>
      {artifact.explanation && (
        <p className="text-amber-800" data-artifact-truth-explanation>
          {artifact.explanation}
        </p>
      )}
      {sourceEvidence.accessNote && (
        <p data-source-run-access-note>{sourceEvidence.accessNote}</p>
      )}
    </div>
  )
}
