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
