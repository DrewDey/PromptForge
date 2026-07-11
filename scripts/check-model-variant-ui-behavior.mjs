#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  artifactDocumentKey,
  compareModelVariantRecords,
  currentArtifactLoad,
} from '../src/lib/model-variant-ui.mjs'

const variants = [
  {
    modelLabel: 'Gemini 3.1 Pro',
    serviceLabel: 'Gemini',
    capturedAt: '2026-07-10T04:00:00.000Z',
    sourceRunId: 'gemini-new',
  },
  {
    modelLabel: 'Fable 5 High',
    serviceLabel: 'Claude',
    capturedAt: '2026-07-10T03:00:00.000Z',
    sourceRunId: 'claude',
  },
  {
    modelLabel: 'GPT-5.6 Luna',
    serviceLabel: 'ChatGPT',
    capturedAt: '2026-07-10T02:00:00.000Z',
    sourceRunId: 'chatgpt',
  },
  {
    modelLabel: 'Gemini 3.1 Pro',
    serviceLabel: 'Gemini',
    capturedAt: '2026-07-09T04:00:00.000Z',
    sourceRunId: 'gemini-old',
  },
]

function orderedIds() {
  return [...variants].sort(compareModelVariantRecords).map((variant) => variant.sourceRunId)
}

const expectedOrder = ['claude', 'gemini-new', 'gemini-old', 'chatgpt']
assert.deepEqual(orderedIds(), expectedOrder)

for (const activeSourceRunId of variants.map((variant) => variant.sourceRunId)) {
  assert.deepEqual(
    orderedIds(),
    expectedOrder,
    `selecting ${activeSourceRunId} must not change selector order`,
  )
}

const simultaneousCohort = [
  {
    modelLabel: 'Sonnet 5 Max',
    serviceLabel: 'Claude',
    capturedAt: '2026-07-11T03:00:00.000Z',
    sourceRunId: 'cohort-claude',
  },
  {
    modelLabel: '5.6 Sol Max',
    serviceLabel: 'ChatGPT',
    capturedAt: '2026-07-11T04:00:00.000Z',
    sourceRunId: 'cohort-chatgpt',
  },
  {
    modelLabel: '3.5 Flash',
    serviceLabel: 'Gemini',
    capturedAt: '2026-07-11T05:00:00.000Z',
    sourceRunId: 'cohort-gemini',
  },
]
const simultaneousCohortOrder = simultaneousCohort
  .toSorted(compareModelVariantRecords)
  .map((variant) => variant.sourceRunId)
assert.deepEqual(simultaneousCohortOrder, [
  'cohort-gemini',
  'cohort-chatgpt',
  'cohort-claude',
])
assert.deepEqual(
  simultaneousCohort.map((variant) => variant.sourceRunId),
  ['cohort-claude', 'cohort-chatgpt', 'cohort-gemini'],
  'sorting the selector must not mutate its manifest history',
)

const promptTwoLoad = { packageId: 'prompt-2', srcDoc: '<p>two</p>', error: null }
const promptThreeLoad = { packageId: 'prompt-3', srcDoc: '<p>three</p>', error: null }
assert.equal(currentArtifactLoad('prompt-3', promptTwoLoad), null)
assert.equal(currentArtifactLoad('prompt-3', promptThreeLoad), promptThreeLoad)
assert.notEqual(artifactDocumentKey('prompt-2'), artifactDocumentKey('prompt-3'))

console.log('Model-variant UI behavior guard passed.')
