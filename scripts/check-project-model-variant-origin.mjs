#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  assertProjectModelVariantOrigin,
  resolveProjectModelVariantOriginMode,
} from '../src/lib/project-model-variant-origin.mjs'

const existingProjectRuns = [
  {
    sourceRunId: 'author-run',
    runRole: 'historical-baseline',
    operatorKind: 'original-author',
    qualityStatus: 'known-issue',
  },
  {
    sourceRunId: 'labs-openai',
    runRole: 'comparison-run',
    operatorKind: 'pathforge-labs-manual',
    qualityStatus: 'verified',
  },
  {
    sourceRunId: 'labs-google',
    runRole: 'comparison-run',
    operatorKind: 'pathforge-labs-manual',
    qualityStatus: 'verified',
  },
]

const modelCohortRuns = [
  {
    sourceRunId: 'cohort-anthropic',
    runRole: 'comparison-run',
    operatorKind: 'pathforge-labs-manual',
    qualityStatus: 'verified',
  },
  {
    sourceRunId: 'cohort-openai',
    runRole: 'comparison-run',
    operatorKind: 'pathforge-labs-manual',
    qualityStatus: 'verified',
  },
  {
    sourceRunId: 'cohort-google',
    runRole: 'comparison-run',
    operatorKind: 'pathforge-labs-manual',
    qualityStatus: 'verified',
  },
]

assert.equal(resolveProjectModelVariantOriginMode(undefined), 'existing-project')
assert.equal(resolveProjectModelVariantOriginMode('existing-project'), 'existing-project')
assert.equal(resolveProjectModelVariantOriginMode('model-cohort'), 'model-cohort')
assert.throws(
  () => resolveProjectModelVariantOriginMode('ordinary-fork'),
  /Invalid model-variant origin mode/,
)

assert.doesNotThrow(() => assertProjectModelVariantOrigin({
  canonicalProjectId: 'existing-project',
  originMode: 'existing-project',
  variants: existingProjectRuns,
}))
assert.throws(
  () => assertProjectModelVariantOrigin({
    canonicalProjectId: 'existing-project',
    originMode: 'existing-project',
    variants: modelCohortRuns,
  }),
  /must have one original-author historical baseline/,
)

assert.doesNotThrow(() => assertProjectModelVariantOrigin({
  canonicalProjectId: 'simultaneous-cohort',
  originMode: 'model-cohort',
  variants: modelCohortRuns,
}))
assert.throws(
  () => assertProjectModelVariantOrigin({
    canonicalProjectId: 'false-history',
    originMode: 'model-cohort',
    variants: existingProjectRuns,
  }),
  /cannot claim an original-author historical baseline/,
)
assert.throws(
  () => assertProjectModelVariantOrigin({
    canonicalProjectId: 'unverified-cohort',
    originMode: 'model-cohort',
    variants: modelCohortRuns.map((run, index) => (
      index === 0 ? { ...run, qualityStatus: 'known-issue' } : run
    )),
  }),
  /must be a verified developer-operated comparison run/,
)

console.log('Project model-variant origin guard passed.')
