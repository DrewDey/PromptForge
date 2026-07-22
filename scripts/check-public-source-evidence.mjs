#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  PUBLIC_MODEL_PROOF_LABELS,
  resolvePublicSourceEvidenceCore as resolvePublicSourceEvidence,
} from '../src/lib/public-source-evidence-core.mjs'

const PACKAGE_PATHS = {
  trip: 'seed-runs/trip-packing-gemini-pro-source-run.json',
  blackout: 'seed-runs/airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
  reactor:
    'seed-runs/model-variants/airlock-zero-reactor-run-chatgpt-56-sol-max-source-run.json',
}

async function readPackage(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

const [tripPackage, blackoutPackage, reactorPackage] = await Promise.all([
  readPackage(PACKAGE_PATHS.trip),
  readPackage(PACKAGE_PATHS.blackout),
  readPackage(PACKAGE_PATHS.reactor),
])

assert.deepEqual(PUBLIC_MODEL_PROOF_LABELS, {
  exact_shown_publicly: 'Exact model shown publicly',
  model_family_shown_publicly: 'Model family shown publicly',
  pathforge_recorded_not_public:
    'Exact model recorded by PathForge, not shown publicly',
  builder_reported: 'Builder reported',
  not_confirmed: 'Model proof not confirmed',
})

const trip = resolvePublicSourceEvidence(tripPackage)
assert.equal(trip.curated, true)
assert.equal(trip.accessState, 'provider_private')
assert.equal(trip.accessLabel, 'Provider sign-in required')
assert.equal(trip.transcriptCompleteness, 'provider-sign-in-required')
assert.equal(trip.transcriptLabel, 'Transcript requires provider sign-in')
assert.equal(trip.providerLinkLabel, 'Open provider session')
assert.equal(trip.hasPathForgeRecord, true)
assert.equal(trip.recordLabel, 'PathForge record')
assert.match(trip.accessNote, /does not expose the captured conversation anonymously/)
assert.match(trip.accessNote, /owner's signed-in account/)
assert.equal(
  trip.modelProofLabel,
  'Exact model recorded by PathForge, not shown publicly',
)

const blackout = resolvePublicSourceEvidence(blackoutPackage)
assert.equal(blackout.curated, true)
assert.equal(blackout.accessState, 'provider_private')
assert.equal(blackout.transcriptCompleteness, 'provider-sign-in-required')
assert.equal(blackout.hasPathForgeRecord, true)
assert.equal(blackout.recordLabel, 'PathForge record')
assert.match(blackout.accessNote, /owner's signed-in account/)
assert.equal(
  blackout.modelProofLabel,
  'Exact model recorded by PathForge, not shown publicly',
)

const reactor = resolvePublicSourceEvidence(reactorPackage)
assert.equal(reactor.curated, true)
assert.equal(reactor.accessState, 'public_partial')
assert.equal(reactor.transcriptCompleteness, 'partial')
assert.equal(reactor.transcriptLabel, 'Partial public transcript')
assert.equal(reactor.providerLinkLabel, 'Open partial public source')
assert.equal(reactor.hasPathForgeRecord, true)
assert.equal(reactor.recordLabel, 'PathForge record')
assert.equal(
  reactor.modelProofLabel,
  'Model family shown publicly',
)

const checkedUnknown = resolvePublicSourceEvidence({
  sourceRunId: 'unknown-source-run',
  pathforgeRecordChecked: true,
})
assert.equal(checkedUnknown.curated, false)
assert.equal(checkedUnknown.accessState, 'unconfirmed')
assert.equal(checkedUnknown.accessLabel, 'Public access not confirmed')
assert.equal(checkedUnknown.providerLinkLabel, 'Open provider session')
assert.equal(checkedUnknown.hasPathForgeRecord, true)
assert.equal(checkedUnknown.recordLabel, 'PathForge record only')
assert.match(
  checkedUnknown.accessNote,
  /checked PathForge record preserves the submitted prompts, responses, and artifact hashes/,
)

const urlOnly = resolvePublicSourceEvidence({
  source_url: tripPackage.source_url,
})
assert.equal(urlOnly.curated, false)
assert.equal(urlOnly.accessLabel, 'Public access not confirmed')
assert.equal(urlOnly.providerLinkLabel, 'Open provider session')
assert.equal(urlOnly.hasPathForgeRecord, false)
assert.equal(urlOnly.recordLabel, null)
assert.doesNotMatch(urlOnly.accessNote, /checked PathForge record preserves/)

const missing = resolvePublicSourceEvidence(null)
assert.equal(missing.accessState, 'unconfirmed')
assert.equal(missing.hasPathForgeRecord, false)
assert.equal(missing.recordLabel, null)
assert.doesNotMatch(missing.accessNote, /checked PathForge record preserves/)

const ambiguous = resolvePublicSourceEvidence({
  source_run_id: '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
  sourceRunId: reactorPackage.source_run_id,
})
assert.equal(ambiguous.curated, false)
assert.equal(ambiguous.sourceRunId, null)

const slugVsPendingConflict = resolvePublicSourceEvidence({
  slug: tripPackage.slug,
  pathforge_pending_id: reactorPackage.source_run_id,
  pathforgeRecordChecked: true,
})
assert.equal(slugVsPendingConflict.curated, false)
assert.equal(slugVsPendingConflict.accessState, 'unconfirmed')
assert.equal(slugVsPendingConflict.sourceRunId, null)

const slugVsSubmissionConflict = resolvePublicSourceEvidence({
  slug: reactorPackage.slug,
  source_run_submission_id: blackoutPackage.source_run_id,
  pathforgeRecordChecked: true,
})
assert.equal(slugVsSubmissionConflict.curated, false)
assert.equal(slugVsSubmissionConflict.accessState, 'unconfirmed')
assert.equal(slugVsSubmissionConflict.sourceRunId, null)

const crossFieldConflict = resolvePublicSourceEvidence({
  source_run_id: tripPackage.pathforge_pending_id,
  sourceRunId: tripPackage.pathforge_pending_id,
  source_run_submission_id: blackoutPackage.source_run_id,
  pathforge_pending_id: tripPackage.pathforge_pending_id,
  pathforgeRecordChecked: true,
})
assert.equal(crossFieldConflict.curated, false)
assert.equal(crossFieldConflict.accessState, 'unconfirmed')
assert.equal(crossFieldConflict.sourceRunId, null)

const agreeingAliases = resolvePublicSourceEvidence({
  slug: tripPackage.slug,
  source_run_id: tripPackage.pathforge_pending_id,
  sourceRunId: tripPackage.pathforge_pending_id,
  source_run_submission_id: tripPackage.pathforge_pending_id,
  pathforge_pending_id: tripPackage.pathforge_pending_id,
})
assert.equal(agreeingAliases.curated, true)
assert.equal(agreeingAliases.sourceRunId, tripPackage.pathforge_pending_id)
assert.equal(agreeingAliases.accessState, 'provider_private')

for (const malformedSlug of [123, '   ']) {
  const malformedSlugLookup = resolvePublicSourceEvidence({
    sourceRunId: tripPackage.pathforge_pending_id,
    slug: malformedSlug,
    pathforgeRecordChecked: true,
  })
  assert.equal(malformedSlugLookup.curated, false)
  assert.equal(malformedSlugLookup.sourceRunId, null)
  assert.equal(malformedSlugLookup.accessState, 'unconfirmed')
}

const unknownPackageId = 'unknown-package-source-run'
const agreeingUnknownAliases = resolvePublicSourceEvidence({
  source_run_id: unknownPackageId,
  sourceRunId: unknownPackageId,
  source_run_submission_id: unknownPackageId,
  pathforge_pending_id: unknownPackageId,
  pathforgeRecordChecked: true,
})
assert.equal(agreeingUnknownAliases.curated, false)
assert.equal(agreeingUnknownAliases.sourceRunId, unknownPackageId)
assert.equal(agreeingUnknownAliases.accessState, 'unconfirmed')
assert.equal(agreeingUnknownAliases.recordLabel, 'PathForge record only')

const supportedSourceRunAliases = [
  'source_run_id',
  'sourceRunId',
  'source_run_submission_id',
  'pathforge_pending_id',
]
for (const alias of supportedSourceRunAliases) {
  for (const malformedValue of [42, '   ']) {
    const malformedAlias = resolvePublicSourceEvidence({
      slug: tripPackage.slug,
      [alias]: malformedValue,
      pathforgeRecordChecked: true,
    })
    assert.equal(
      malformedAlias.curated,
      false,
      `${alias}=${JSON.stringify(malformedValue)} must not promote a curated slug.`,
    )
    assert.equal(malformedAlias.sourceRunId, null)
    assert.equal(malformedAlias.accessState, 'unconfirmed')
  }
}

for (const truth of [
  trip,
  blackout,
  reactor,
  checkedUnknown,
  urlOnly,
  missing,
  ambiguous,
  slugVsPendingConflict,
  slugVsSubmissionConflict,
  crossFieldConflict,
  agreeingAliases,
  agreeingUnknownAliases,
]) {
  assert.doesNotThrow(() => JSON.stringify(truth))
}

console.log('Public source evidence contract checks passed.')
