#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  artifactDocumentKey,
  compareModelVariantRecords,
  comparisonRunEvidenceLookup,
  currentArtifactLoad,
} from '../src/lib/model-variant-ui.mjs'
import { resolvePublicSourceEvidenceCore as resolvePublicSourceEvidence } from '../src/lib/public-source-evidence-core.mjs'

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

const promptTwoLoad = {
  packageId: 'prompt-2',
  artifactPath: '/artifacts/two.html',
  srcDoc: '<p>two</p>',
  error: null,
}
const promptThreeLoad = {
  packageId: 'prompt-3',
  artifactPath: '/artifacts/three.html',
  srcDoc: '<p>three</p>',
  error: null,
}
assert.equal(currentArtifactLoad('prompt-3', '/artifacts/three.html', promptTwoLoad), null)
assert.equal(
  currentArtifactLoad('prompt-3', '/artifacts/three.html', promptThreeLoad),
  promptThreeLoad,
)
assert.equal(currentArtifactLoad('prompt-3', '/artifacts/other.html', promptThreeLoad), null)
assert.notEqual(
  artifactDocumentKey('shared-package', '/artifacts/two.html'),
  artifactDocumentKey('shared-package', '/artifacts/three.html'),
)

const comparisonRunA = {
  sourceRunId: 'fabb195e-18e9-4f24-8880-f6d784305bc5',
}
const comparisonRunB = {
  sourceRunId: '2e526efa-191c-48ea-9ba0-5ff073403770',
}
const comparisonRunALookup = comparisonRunEvidenceLookup(comparisonRunA)
const comparisonRunBLookup = comparisonRunEvidenceLookup(comparisonRunB)
assert.deepEqual(comparisonRunALookup, {
  sourceRunId: comparisonRunA.sourceRunId,
  pathforgeRecordChecked: true,
})
assert.deepEqual(comparisonRunBLookup, {
  sourceRunId: comparisonRunB.sourceRunId,
  pathforgeRecordChecked: true,
})

const comparisonRunAEvidence = resolvePublicSourceEvidence(comparisonRunALookup)
const comparisonRunBEvidence = resolvePublicSourceEvidence(comparisonRunBLookup)
assert.equal(comparisonRunAEvidence.sourceRunId, comparisonRunA.sourceRunId)
assert.equal(comparisonRunAEvidence.accessState, 'provider_private')
assert.equal(comparisonRunAEvidence.recordLabel, 'PathForge record')
assert.equal(comparisonRunAEvidence.modelProof, 'pathforge_recorded_not_public')
assert.equal(comparisonRunBEvidence.sourceRunId, comparisonRunB.sourceRunId)
assert.equal(comparisonRunBEvidence.accessState, 'public_partial')
assert.equal(comparisonRunBEvidence.recordLabel, 'PathForge record')
assert.equal(comparisonRunBEvidence.modelProof, 'model_family_shown_publicly')
assert.notDeepEqual(
  comparisonRunAEvidence,
  comparisonRunBEvidence,
  'comparison runs must keep their own public source evidence',
)

const comparisonComponent = await readFile('src/components/PathForgeLabsModelRuns.tsx', 'utf8')
assert.match(
  comparisonComponent,
  /<span className="basis-full text-xs text-surface-500">\s*\{activeVariant\.promptCount\}[\s\S]*?\{variantSet\.variants\.length\} model/,
  'selected prompt and family counts must reserve a stable row across model identities',
)
assert.match(
  comparisonComponent,
  /<span className="text-xs text-surface-500">\s*<time dateTime=\{activeVariant\.capturedAt\}>/,
  'the timestamp must remain inline while the count row supplies stable geometry',
)
assert.match(
  comparisonComponent,
  /className="fixed inset-x-4 bottom-4 top-20[^"]*sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-\[calc\(100%\+8px\)\] sm:block sm:w-\[390px\]"/,
  'the mobile model menu must stay viewport-bound while tablet and desktop retain anchored positioning',
)
assert.match(
  comparisonComponent,
  /className="min-h-0 flex-1 divide-y divide-surface-200 overflow-y-auto sm:max-h-none sm:overflow-visible"/,
  'the viewport-bound mobile run list must scroll inside the menu without hiding its controls',
)
assert.match(comparisonComponent, /<ModelVariantMenuCloseButton \/>/)

const menuCloseComponent = await readFile(
  'src/components/ModelVariantMenuCloseButton.tsx',
  'utf8',
)
assert.match(menuCloseComponent, /details\.open = false/)
assert.match(menuCloseComponent, /details\.querySelector\('summary'\)\?\.focus\(\)/)
assert.match(menuCloseComponent, /data-model-variant-menu-close/)

const comparisonCard = comparisonComponent.match(
  /function ComparisonCard\([\s\S]*?\n}\n\nexport function PathForgeLabsModelComparison/,
)?.[0] ?? ''
assert.match(comparisonCard, /resolvePublicSourceEvidence\(comparisonRunEvidenceLookup\(variant\)\)/)
assert.match(comparisonCard, /data-model-variant-comparison-evidence=\{sourceEvidence\.sourceRunId \?\? ''\}/)
assert.match(comparisonCard, /data-comparison-source-access=\{sourceEvidence\.accessState\}/)
assert.match(comparisonCard, /sourceEvidence\.recordLabel &&/)
assert.match(comparisonCard, /data-comparison-model-proof=\{sourceEvidence\.modelProof\}/)
assert.match(comparisonCard, /data-comparison-artifact-state=\{variant\.qualityStatus\}/)
assert.doesNotMatch(comparisonCard, /activeSourceEvidence/)

console.log('Model-variant UI behavior guard passed.')
