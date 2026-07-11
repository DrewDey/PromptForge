#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  artifactEvidenceMatches,
  attachSourceRunIdentityToArtifactEvidence,
} from './project-model-variant-release-evidence.mjs'

const releasedModelRows = [
  { id: 'variant-a', source_run_id: 'run-a' },
  { id: 'variant-b', source_run_id: 'run-b' },
]
const storedRows = [
  {
    model_variant_id: 'variant-b',
    source_step_id: 'project:run-b:step:2',
    source_step_number: 2,
    artifact_path: 'public/artifacts/b.html',
    artifact_sha256: 'b'.repeat(64),
  },
  {
    model_variant_id: 'variant-a',
    source_step_id: 'project:run-a:step:1',
    source_step_number: 1,
    artifact_path: 'public/artifacts/a.html',
    artifact_sha256: 'a'.repeat(64),
  },
]
const expectedRows = [
  { ...storedRows[1], source_run_id: 'run-a' },
  { ...storedRows[0], source_run_id: 'run-b' },
]

const enriched = attachSourceRunIdentityToArtifactEvidence(
  storedRows,
  releasedModelRows,
)
assert.equal(
  artifactEvidenceMatches(enriched, expectedRows),
  true,
  'RPC rows without source_run_id must compare successfully after immutable ID enrichment.',
)
assert.equal(
  artifactEvidenceMatches(
    enriched,
    expectedRows.map((row, index) => (
      index === 0 ? { ...row, artifact_sha256: 'c'.repeat(64) } : row
    )),
  ),
  false,
  'Artifact evidence drift must still fail the post-release comparison.',
)
assert.throws(
  () => attachSourceRunIdentityToArtifactEvidence(
    [{ ...storedRows[0], model_variant_id: 'unknown-variant' }],
    releasedModelRows,
  ),
  /unknown model-variant row/i,
  'Unknown model rows must fail closed.',
)

console.log('Model-variant release artifact-evidence guard passed.')
