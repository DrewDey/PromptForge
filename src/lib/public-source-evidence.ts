export type PublicSourceAccess =
  | 'public_exact'
  | 'public_partial'
  | 'provider_private'
  | 'unconfirmed'

export type PublicTranscriptCompleteness =
  | 'complete'
  | 'partial'
  | 'provider-sign-in-required'
  | 'not-confirmed'

import {
  PUBLIC_MODEL_PROOF_LABELS as PUBLIC_MODEL_PROOF_LABELS_CORE,
  resolvePublicSourceEvidenceCore,
} from './public-source-evidence-core.mjs'
import type { ResolvedProviderPublicShare } from './provider-public-share'

export const PUBLIC_MODEL_PROOF_LABELS = PUBLIC_MODEL_PROOF_LABELS_CORE as Readonly<{
  exact_shown_publicly: 'Exact model shown publicly'
  model_family_shown_publicly: 'Model family shown publicly'
  pathforge_recorded_not_public: 'Exact model recorded by PathForge, not shown publicly'
  builder_reported: 'Builder reported'
  not_confirmed: 'Model proof not confirmed'
}>

export type PublicModelProof = keyof typeof PUBLIC_MODEL_PROOF_LABELS

export type PublicEvidenceTruth = Readonly<{
  schemaVersion: 1
  sourceRunId: string | null
  curated: boolean
  accessState: PublicSourceAccess
  accessLabel: string
  providerLinkLabel: string
  transcriptCompleteness: PublicTranscriptCompleteness
  transcriptLabel: string
  hasPathForgeRecord: boolean
  recordLabel: 'PathForge record' | 'PathForge record only' | null
  modelProof: PublicModelProof
  modelProofLabel: string
  accessNote: string | null
}>

export type PublicEvidencePackageReference = Readonly<{
  source_run_id?: unknown
  sourceRunId?: unknown
  source_run_submission_id?: unknown
  pathforge_pending_id?: unknown
  slug?: unknown
  pathforgeRecordChecked?: unknown
}>

export type PublicEvidenceLookup =
  | string
  | PublicEvidencePackageReference
  | null
  | undefined

/**
 * Returns only explicitly curated public-source evidence. Unknown or ambiguous
 * source runs fail closed; provider names and URL shapes are never inferred.
 */
export function resolvePublicSourceEvidence(
  input: PublicEvidenceLookup,
): PublicEvidenceTruth {
  return resolvePublicSourceEvidenceCore(input) as PublicEvidenceTruth
}

export function applyProviderPublicShareEvidence(
  evidence: PublicEvidenceTruth,
  share: ResolvedProviderPublicShare | null,
): PublicEvidenceTruth {
  if (!share) return evidence

  const checkedDate = share.anonymous_access_verified_at.slice(0, 10)
  if (share.access_state === 'public_partial') {
    return {
      ...evidence,
      sourceRunId: share.source_run_id,
      curated: true,
      accessState: 'public_partial',
      accessLabel: 'Partial public source',
      providerLinkLabel: 'Open partial public source',
      transcriptCompleteness: 'partial',
      transcriptLabel: 'Partial public transcript',
      hasPathForgeRecord: true,
      recordLabel: 'PathForge record',
      accessNote:
        `Anonymous provider access was verified on ${checkedDate}. The public share covers only part of this run; the PathForge record preserves the complete captured evidence.`,
    }
  }

  return {
    ...evidence,
    sourceRunId: share.source_run_id,
    curated: true,
    accessState: 'public_exact',
    accessLabel: 'Public source verified',
    providerLinkLabel: 'Open public source',
    transcriptCompleteness: 'complete',
    transcriptLabel: 'Complete public transcript',
    hasPathForgeRecord: true,
    recordLabel: 'PathForge record',
    accessNote: `Anonymous provider access was verified on ${checkedDate}.`,
  }
}
