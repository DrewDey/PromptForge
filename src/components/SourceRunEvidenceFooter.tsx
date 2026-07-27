import { ExternalLink } from 'lucide-react'
import type { PublicEvidenceTruth } from '@/lib/public-source-evidence'
import { providerPublicShareHref } from '@/lib/provider-public-share'

export function SourceRunEvidenceFooter({
  sourceRunHref,
  evidence,
}: {
  sourceRunHref: string | null
  evidence: PublicEvidenceTruth
}) {
  const publicShareHref = providerPublicShareHref(
    sourceRunHref,
    evidence.accessState,
  )

  return (
    <div className="mt-8 border border-surface-200 bg-white p-4" data-source-run-evidence-footer>
      {publicShareHref && (
        <a
          href={publicShareHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          {evidence.providerLinkLabel}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
      <div className={`${publicShareHref ? 'mt-2 ' : ''}flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-surface-500`}>
        <span data-source-access={evidence.accessState}>{evidence.accessLabel}</span>
        {evidence.recordLabel && (
          <span data-pathforge-record={evidence.hasPathForgeRecord ? 'true' : 'false'}>
            {evidence.recordLabel}
          </span>
        )}
        <span data-model-proof={evidence.modelProof}>{evidence.modelProofLabel}</span>
      </div>
      {evidence.accessNote && (
        <p className="mt-2 text-xs leading-5 text-surface-500" data-source-run-access-note>
          {evidence.accessNote}
        </p>
      )}
    </div>
  )
}
