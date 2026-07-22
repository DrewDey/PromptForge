import {
  resolvePublicSourceEvidence,
  type PublicEvidenceLookup,
  type PublicEvidenceTruth,
  type PublicSourceAccess,
} from './public-source-evidence'
import {
  derivePublicProjectPresentationCore,
  publicArtifactStatusPresentationCore,
} from './public-project-truth-core.mjs'

export type PublicArtifactStatus = 'verified' | 'known-issue' | 'recorded'

export type PublicArtifactStatusPresentation = Readonly<{
  status: PublicArtifactStatus
  label: 'Artifact verified' | 'Artifact has known issue' | 'Run recorded'
  explanation: string | null
}>

export type PublicProjectTruth = Readonly<{
  sourceEvidence: PublicEvidenceTruth
  artifact: PublicArtifactStatusPresentation
  selectedRunPromptCount: number
  selectedRunPromptLabel: string
  familyRunCount: number
  familyRunLabel: string
  isCanonicalDefaultRun: boolean
  runContextLabel: 'Default run' | 'Selected run'
}>

export type PublicProjectTruthInput = Readonly<{
  sourceEvidence?: PublicEvidenceTruth
  sourceEvidenceLookup?: PublicEvidenceLookup
  qualityStatus?: 'verified' | 'known-issue' | 'recorded' | null
  knownIssueExplanation?: string | null
  selectedRunPromptCount: number
  familyRunCount?: number
  isCanonicalDefaultRun?: boolean
}>

// Missing evidence always fails closed. A checked package may separately carry
// the narrower `PathForge record only` label, but never promotes provider access.
const fallbackPublicSourceAccess: PublicSourceAccess = 'unconfirmed'
const publicSourceAccessStates: readonly PublicSourceAccess[] = [
  'public_exact',
  'public_partial',
  'provider_private',
  fallbackPublicSourceAccess,
]

export function publicArtifactStatusPresentation({
  qualityStatus,
  knownIssueExplanation,
}: Pick<PublicProjectTruthInput, 'qualityStatus' | 'knownIssueExplanation'>): PublicArtifactStatusPresentation {
  return publicArtifactStatusPresentationCore({
    qualityStatus,
    knownIssueExplanation,
  }) as PublicArtifactStatusPresentation
}

export function derivePublicProjectTruth(
  input: PublicProjectTruthInput,
): PublicProjectTruth {
  const resolvedSourceEvidence = input.sourceEvidence
    ?? resolvePublicSourceEvidence(input.sourceEvidenceLookup)
  const sourceEvidence = publicSourceAccessStates.includes(resolvedSourceEvidence.accessState)
    ? resolvedSourceEvidence
    : resolvePublicSourceEvidence(null)

  return derivePublicProjectPresentationCore({
    sourceEvidence,
    qualityStatus: input.qualityStatus,
    knownIssueExplanation: input.knownIssueExplanation,
    selectedRunPromptCount: input.selectedRunPromptCount,
    familyRunCount: input.familyRunCount,
    isCanonicalDefaultRun: input.isCanonicalDefaultRun,
  }) as PublicProjectTruth
}
