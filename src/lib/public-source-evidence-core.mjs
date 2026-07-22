// @ts-check

export const PUBLIC_MODEL_PROOF_LABELS = {
  exact_shown_publicly: 'Exact model shown publicly',
  model_family_shown_publicly: 'Model family shown publicly',
  pathforge_recorded_not_public:
    'Exact model recorded by PathForge, not shown publicly',
  builder_reported: 'Builder reported',
  not_confirmed: 'Model proof not confirmed',
}

/** @type {import('./public-source-evidence').PublicEvidenceTruth} */
const NO_RECORD_PUBLIC_EVIDENCE = {
  schemaVersion: 1,
  sourceRunId: null,
  curated: false,
  accessState: 'unconfirmed',
  accessLabel: 'Public access not confirmed',
  providerLinkLabel: 'Open provider session',
  transcriptCompleteness: 'not-confirmed',
  transcriptLabel: 'Public transcript not confirmed',
  hasPathForgeRecord: false,
  recordLabel: null,
  modelProof: 'not_confirmed',
  modelProofLabel: PUBLIC_MODEL_PROOF_LABELS.not_confirmed,
  accessNote: 'Public provider access was not confirmed.',
}

const CHECKED_RECORD_ACCESS_NOTE =
  'The checked PathForge record preserves the submitted prompts, responses, and artifact hashes, but public provider access was not confirmed.'

/** @type {Readonly<Record<string, import('./public-source-evidence').PublicEvidenceTruth>>} */
const CURATED_PUBLIC_SOURCE_EVIDENCE = {
  '4777cdee-dd14-4102-9e36-94cc9e9b9be9': {
    schemaVersion: 1,
    sourceRunId: '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
    curated: true,
    accessState: 'public_partial',
    accessLabel: 'Incomplete public source',
    providerLinkLabel: 'Open partial public source',
    transcriptCompleteness: 'partial',
    transcriptLabel: 'Incomplete public transcript',
    hasPathForgeRecord: true,
    recordLabel: 'PathForge record',
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: PUBLIC_MODEL_PROOF_LABELS.pathforge_recorded_not_public,
    accessNote:
      'The Gemini link opens anonymously, but the shared page does not expose the captured conversation.',
  },
  'fabb195e-18e9-4f24-8880-f6d784305bc5': {
    schemaVersion: 1,
    sourceRunId: 'fabb195e-18e9-4f24-8880-f6d784305bc5',
    curated: true,
    accessState: 'provider_private',
    accessLabel: 'Provider sign-in required',
    providerLinkLabel: 'Open provider session',
    transcriptCompleteness: 'provider-sign-in-required',
    transcriptLabel: 'Transcript requires provider sign-in',
    hasPathForgeRecord: true,
    recordLabel: 'PathForge record',
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: PUBLIC_MODEL_PROOF_LABELS.pathforge_recorded_not_public,
    accessNote:
      "Claude did not expose a public sharing control for this run. The provider session requires the owner's signed-in account.",
  },
  '2e526efa-191c-48ea-9ba0-5ff073403770': {
    schemaVersion: 1,
    sourceRunId: '2e526efa-191c-48ea-9ba0-5ff073403770',
    curated: true,
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    providerLinkLabel: 'Open partial public source',
    transcriptCompleteness: 'partial',
    transcriptLabel: 'Partial public transcript',
    hasPathForgeRecord: true,
    recordLabel: 'PathForge record',
    modelProof: 'model_family_shown_publicly',
    modelProofLabel: PUBLIC_MODEL_PROOF_LABELS.model_family_shown_publicly,
    accessNote:
      'The checked PathForge record contains the full prompt-response run; the public ChatGPT share exposes only part.',
  },
}

/** @type {Readonly<Record<string, string>>} */
const CURATED_SOURCE_RUN_BY_PACKAGE_SLUG = {
  'trip-packing-gemini-pro': '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
  'airlock-zero-blackout-shift-claude-sonnet-5-max-fork':
    'fabb195e-18e9-4f24-8880-f6d784305bc5',
  'airlock-zero-reactor-run-chatgpt-56-sol-max':
    '2e526efa-191c-48ea-9ba0-5ff073403770',
}

/**
 * @param {import('./public-source-evidence').PublicEvidenceLookup} input
 * @returns {string | null}
 */
function normalizedSourceRunId(input) {
  if (typeof input === 'string') return input.trim() || null
  if (!input || typeof input !== 'object') return null

  const packageSourceRunIds = []
  const supportedAliases = [
    { present: Object.hasOwn(input, 'source_run_id'), value: input.source_run_id },
    { present: Object.hasOwn(input, 'sourceRunId'), value: input.sourceRunId },
    {
      present: Object.hasOwn(input, 'source_run_submission_id'),
      value: input.source_run_submission_id,
    },
    {
      present: Object.hasOwn(input, 'pathforge_pending_id'),
      value: input.pathforge_pending_id,
    },
  ]

  for (const alias of supportedAliases) {
    if (!alias.present) continue
    if (typeof alias.value !== 'string') return null
    const normalizedAlias = alias.value.trim()
    if (!normalizedAlias) return null
    packageSourceRunIds.push(normalizedAlias)
  }

  const distinctPackageSourceRunIds = new Set(packageSourceRunIds)
  if (distinctPackageSourceRunIds.size > 1) return null

  const packageSourceRunId = packageSourceRunIds[0] ?? ''
  const hasPackageSlug = Object.prototype.hasOwnProperty.call(input, 'slug')
  if (
    hasPackageSlug &&
    (typeof input.slug !== 'string' || !input.slug.trim())
  ) return null
  const packageSlug = typeof input.slug === 'string' ? input.slug.trim() : ''
  const slugSourceRunId = packageSlug
    ? CURATED_SOURCE_RUN_BY_PACKAGE_SLUG[packageSlug] ?? ''
    : ''

  if (packageSourceRunId && slugSourceRunId && packageSourceRunId !== slugSourceRunId) {
    return null
  }

  return packageSourceRunId || slugSourceRunId || null
}

/**
 * @param {import('./public-source-evidence').PublicEvidenceLookup} input
 * @returns {boolean}
 */
function hasExplicitCheckedRecord(input) {
  return Boolean(
    input
      && typeof input === 'object'
      && input.pathforgeRecordChecked === true,
  )
}

/**
 * Returns only explicitly curated public-source evidence. Unknown or ambiguous
 * source runs fail closed; provider names and URL shapes are never inferred.
 */
/**
 * @param {import('./public-source-evidence').PublicEvidenceLookup} input
 * @returns {import('./public-source-evidence').PublicEvidenceTruth}
 */
export function resolvePublicSourceEvidenceCore(input) {
  const sourceRunId = normalizedSourceRunId(input)
  const hasCheckedRecord = hasExplicitCheckedRecord(input)
  const curated = sourceRunId
    ? CURATED_PUBLIC_SOURCE_EVIDENCE[sourceRunId]
    : undefined

  if (curated) return { ...curated }

  if (hasCheckedRecord) {
    return {
      ...NO_RECORD_PUBLIC_EVIDENCE,
      sourceRunId,
      hasPathForgeRecord: true,
      recordLabel: 'PathForge record only',
      accessNote: CHECKED_RECORD_ACCESS_NOTE,
    }
  }

  return {
    ...NO_RECORD_PUBLIC_EVIDENCE,
    sourceRunId,
  }
}
