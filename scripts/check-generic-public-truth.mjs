#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import ts from 'typescript'
import { derivePublicProjectPresentationCore } from '../src/lib/public-project-truth-core.mjs'
import { resolvePublicSourceEvidenceCore as resolvePublicSourceEvidence } from '../src/lib/public-source-evidence-core.mjs'

const GENERIC_ROUTE = 'src/app/prompt/[id]/page.tsx'
const RELATED_CARD = 'src/components/discovery/InteractiveBuildPathCard.tsx'
const IDEAS_ROUTE = 'src/app/what-to-build/page.tsx'
const FIXTURE_ROUTE = 'src/app/qa/generic-public-truth-fixture/page.tsx'
const PROMPT_TRUTH_PRESENTER = 'src/lib/prompt-public-truth.ts'
const FIXTURE_URL = '/qa/generic-public-truth-fixture'
const AIRLOCK_PROJECT_ID = '31faf192-93d1-41d0-a74c-4402d4223937'
const BLACKOUT_PROJECT_ID = '77dfe78d-6a3d-47f6-9384-2881958098df'

function parseBaseUrl(argv) {
  const index = argv.indexOf('--base-url')
  if (index < 0) return null
  const value = argv[index + 1]
  if (!value) throw new Error('--base-url requires a URL.')
  return new URL(value).origin
}

function scopedMatch(source, pattern, message) {
  assert.match(source, pattern, message)
}

function loadPromptTruthPresenter({ preparedProjects, variantSets }) {
  const source = readFileSync(PROMPT_TRUTH_PRESENTER, 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  })
  if (diagnostics?.length) {
    throw new Error(diagnostics.map((diagnostic) => diagnostic.messageText).join('\n'))
  }

  const loadedModule = { exports: {} }
  new Script(outputText, { filename: 'prompt-public-truth.transpiled.cjs' }).runInNewContext({
    module: loadedModule,
    exports: loadedModule.exports,
    require(specifier) {
      if (specifier === './prepared-showcase-projects') {
        return { getPreparedShowcaseProjectById: (projectId) => preparedProjects.get(projectId) ?? null }
      }
      if (specifier === './project-model-variants') {
        return {
          getProjectModelVariantSet: (projectId) => variantSets.get(projectId) ?? null,
          getProjectModelVariantKnownIssueExplanation: () => null,
        }
      }
      if (specifier === './public-project-truth') {
        return {
          derivePublicProjectTruth(input) {
            return derivePublicProjectPresentationCore({
              sourceEvidence: resolvePublicSourceEvidence(input.sourceEvidenceLookup),
              qualityStatus: input.qualityStatus,
              knownIssueExplanation: input.knownIssueExplanation,
              selectedRunPromptCount: input.selectedRunPromptCount,
              familyRunCount: input.familyRunCount,
              isCanonicalDefaultRun: input.isCanonicalDefaultRun,
            })
          },
        }
      }
      if (specifier === './types') return {}
      throw new Error(`Unexpected prompt truth dependency: ${specifier}`)
    },
    Boolean,
    Map,
  })
  return loadedModule.exports.deriveCanonicalPromptPublicTruth
}

const airlockManifest = JSON.parse(await readFile(
  'seed-runs/model-variants/airlock-zero-reactor-run.json',
  'utf8',
))
const airlockDefaultVariant = airlockManifest.variants.find((variant) => (
  variant.sourceRunId === airlockManifest.defaultSourceRunId
))
assert.ok(airlockDefaultVariant, 'Airlock fixture must preserve one configured default variant')
const blackoutPackage = JSON.parse(await readFile(
  'seed-runs/airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
  'utf8',
))
const blackoutInheritedPromptCount = blackoutPackage.fork_source?.source_step_number
const blackoutContinuationSteps = blackoutPackage.steps.filter((step) => (
  step.step_number > blackoutInheritedPromptCount
))
assert.equal(blackoutInheritedPromptCount, 10, 'Blackout fixture must preserve 10 inherited parent prompt-response pairs')
assert.equal(blackoutContinuationSteps.length, 4, 'Blackout fixture must preserve four child continuation prompts')

const deriveCanonicalPromptPublicTruth = loadPromptTruthPresenter({
  preparedProjects: new Map([[
    AIRLOCK_PROJECT_ID,
    {
      id: AIRLOCK_PROJECT_ID,
      sourceRunId: airlockManifest.defaultSourceRunId,
      sourceRunPackageFile: airlockDefaultVariant.packageFile,
      steps: [{}, {}],
    },
  ], [
    BLACKOUT_PROJECT_ID,
    {
      id: BLACKOUT_PROJECT_ID,
      sourceRunId: blackoutPackage.source_run_id,
      sourceRunPackageFile: 'airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
      steps: blackoutContinuationSteps,
    },
  ]]),
  variantSets: new Map([[
    AIRLOCK_PROJECT_ID,
    {
      defaultSourceRunId: airlockManifest.defaultSourceRunId,
      variants: airlockManifest.variants,
    },
  ]]),
})

const genericTruth = deriveCanonicalPromptPublicTruth({
  id: 'generic-fixture',
  prompt_step_count: 4,
  steps: [{}, {}],
})

assert.equal(genericTruth.artifact.status, 'recorded')
assert.equal(genericTruth.artifact.label, 'Run recorded')
assert.equal(genericTruth.selectedRunPromptCount, 4)
assert.equal(genericTruth.familyRunCount, 1)
assert.equal(genericTruth.isCanonicalDefaultRun, true)
assert.equal(genericTruth.sourceEvidence.accessState, 'unconfirmed')
assert.equal(genericTruth.sourceEvidence.accessLabel, 'Public access not confirmed')
assert.equal(genericTruth.sourceEvidence.hasPathForgeRecord, false)
assert.equal(genericTruth.sourceEvidence.recordLabel, null)
assert.equal(genericTruth.sourceEvidence.modelProof, 'not_confirmed')
assert.equal(genericTruth.sourceEvidence.modelProofLabel, 'Model proof not confirmed')

const preparedTruth = deriveCanonicalPromptPublicTruth({
  id: AIRLOCK_PROJECT_ID,
  prompt_step_count: 99,
  steps: Array.from({ length: 99 }, () => ({})),
})
const expectedPreparedPageTruth = derivePublicProjectPresentationCore({
  sourceEvidence: resolvePublicSourceEvidence({
    sourceRunId: airlockDefaultVariant.sourceRunId,
    pathforgeRecordChecked: true,
  }),
  qualityStatus: airlockDefaultVariant.qualityStatus,
  knownIssueExplanation: null,
  selectedRunPromptCount: airlockDefaultVariant.promptCount,
  familyRunCount: airlockManifest.variants.length,
  isCanonicalDefaultRun: true,
})
assert.deepEqual(
  JSON.parse(JSON.stringify(preparedTruth)),
  JSON.parse(JSON.stringify(expectedPreparedPageTruth)),
  'prepared default card truth must equal the canonical prepared page derivation',
)
assert.equal(preparedTruth.artifact.label, 'Artifact verified')
assert.equal(preparedTruth.selectedRunPromptCount, 2)
assert.equal(preparedTruth.familyRunCount, 3)
assert.equal(preparedTruth.sourceEvidence.accessState, 'public_partial')
assert.equal(preparedTruth.sourceEvidence.recordLabel, 'PathForge record')
assert.equal(preparedTruth.sourceEvidence.modelProof, 'model_family_shown_publicly')

const blackoutTruth = deriveCanonicalPromptPublicTruth({
  id: BLACKOUT_PROJECT_ID,
  prompt_step_count: blackoutPackage.steps.length,
  steps: blackoutPackage.steps,
})
const expectedBlackoutPreparedPageTruth = derivePublicProjectPresentationCore({
  sourceEvidence: resolvePublicSourceEvidence({
    sourceRunId: blackoutPackage.source_run_id,
    pathforgeRecordChecked: true,
  }),
  qualityStatus: 'recorded',
  knownIssueExplanation: null,
  selectedRunPromptCount: blackoutContinuationSteps.length,
  familyRunCount: 1,
  isCanonicalDefaultRun: true,
})
assert.deepEqual(
  JSON.parse(JSON.stringify(blackoutTruth)),
  JSON.parse(JSON.stringify(expectedBlackoutPreparedPageTruth)),
  'Blackout card/profile truth must equal the prepared child-page truth without inherited prompts in the selected-run count',
)
assert.equal(blackoutTruth.selectedRunPromptCount, 4)
assert.equal(blackoutTruth.sourceEvidence.accessState, 'provider_private')
assert.equal(blackoutTruth.sourceEvidence.recordLabel, 'PathForge record')
assert.equal(blackoutTruth.sourceEvidence.modelProof, 'pathforge_recorded_not_public')

const [genericRoute, relatedCard, ideasRoute, fixtureRoute, promptTruthPresenter] = await Promise.all([
  readFile(GENERIC_ROUTE, 'utf8'),
  readFile(RELATED_CARD, 'utf8'),
  readFile(IDEAS_ROUTE, 'utf8'),
  readFile(FIXTURE_ROUTE, 'utf8'),
  readFile(PROMPT_TRUTH_PRESENTER, 'utf8'),
])

for (const [filePath, source] of [
  [GENERIC_ROUTE, genericRoute],
  [RELATED_CARD, relatedCard],
  [IDEAS_ROUTE, ideasRoute],
]) {
  scopedMatch(source, /BuilderByline/, `${filePath} must use the shared builder byline`)
}

scopedMatch(genericRoute, /getProfileProvenance\(prompt\.author\)/, 'generic route must validate joined author provenance through the shared presenter')
scopedMatch(genericRoute, /provenanceKind=\{publicAuthorProvenance \? prompt\.author\?\.provenance\?\.kind : null\}/, 'generic byline must disclose only trusted joined author provenance')
assert.doesNotMatch(genericRoute, /getPublicProfileByUsername|prompt\.author\?\.role/, 'generic byline cannot depend on a second profile read or infer provenance from role')
scopedMatch(genericRoute, /deriveCanonicalPromptPublicTruth\(prompt\)/, 'generic route must use the shared canonical prompt truth presenter')
for (const token of ['data-generic-public-project', 'data-generic-public-byline', 'data-generic-public-truth']) {
  assert.ok(genericRoute.includes(token), `${GENERIC_ROUTE} must preserve ${token}`)
}
const genericRail = genericRoute.match(/<aside[^>]*aria-label="Project actions"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
assert.ok(genericRail, `${GENERIC_ROUTE} must preserve the scoped sticky project-action rail`)
const genericRailTruth = genericRail.match(/<li[^>]*data-generic-rail-truth[^>]*>([\s\S]*?)<\/li>/)?.[1] ?? ''
assert.ok(genericRailTruth, `${GENERIC_ROUTE} sticky rail must contain its scoped public truth block`)
scopedMatch(genericRail, /data-public-model-identity/, 'generic sticky rail must preserve its repeated model identity')
scopedMatch(genericRailTruth, /<PublicTruthSummary[\s\S]*?truth=\{publicTruth\}/, 'generic sticky rail must render the same derived public truth')
scopedMatch(genericRailTruth, /showArtifactExplanation=\{false\}/, 'generic sticky rail truth must stay compact')
assert.ok(
  genericRail.indexOf('data-public-model-identity') < genericRail.indexOf('data-generic-rail-truth'),
  'generic sticky rail truth must be co-located immediately after the repeated model identity',
)

scopedMatch(genericRoute, /buildPathDiscoveryCatalog\(/, 'related cards must use the canonical discovery projection')
scopedMatch(genericRoute, /data-related-shared-path-cards/, 'related cards must expose a stable shared-card browser hook')
scopedMatch(genericRoute, /<BuildPathCard[\s\S]*?item=\{item\}/, 'related projects must reuse the canonical Explore card')
scopedMatch(relatedCard, /provenanceKind=\{item\.authorProvenanceKind\}/, 'shared related cards must use trusted projected provenance')
scopedMatch(relatedCard, /data-path-model-card/, 'shared related cards must expose the canonical model-card hook')
scopedMatch(relatedCard, /data-selected-run-source-evidence/, 'shared related cards must expose selected-run public truth')
assert.doesNotMatch(relatedCard, /<BuilderByline[\s\S]{0,500}?className=["'][^"']*hidden[^"']*["']/, 'related card byline and operated-builder disclosure must remain visible at 390px')

for (const [pattern, message] of [
  [/getPreparedShowcaseProjectById\(prompt\.id\)/, 'presenter must resolve prepared project evidence'],
  [/getProjectModelVariantSet\(prompt\.id\)/, 'presenter must resolve canonical model-family evidence'],
  [/variant\.sourceRunId === variantSet\.defaultSourceRunId/, 'presenter must choose the configured default run'],
  [/defaultVariant\s*\?\s*Boolean\(defaultVariant\.packageFile\)\s*:\s*Boolean\(preparedProject\?\.sourceRunPackageFile\)/, 'presenter must require the exact default-run package before checking a record'],
  [/\{ sourceRunId, pathforgeRecordChecked: true \}/, 'package-backed presenter evidence must carry exact checked identity'],
  [/defaultVariant\?\.qualityStatus \?\? ['"]recorded['"]/, 'presenter must preserve default artifact quality and generic recorded fallback'],
  [/getCanonicalPreparedSelectedRunPromptCount\(preparedProject, defaultVariant\?\.promptCount\)/, 'presenter must share canonical prepared selected-run counts with prepared pages'],
  [/familyRunCount:\s*variantSet\?\.variants\.length \?\? 1/, 'presenter must keep family runs separate from the generic fallback'],
]) {
  scopedMatch(promptTruthPresenter, pattern, `${PROMPT_TRUTH_PRESENTER}: ${message}`)
}

scopedMatch(ideasRoute, /provenanceKind=\{featured\.authorProvenanceKind\}/, 'What to Build must use trusted catalog provenance')
assert.doesNotMatch(ideasRoute, /Built by\s*<strong>/, 'What to Build must not retain its manual provenance-blind byline')

for (const token of [
  'data-generic-public-truth-fixture',
  'data-fixture-generic-header',
  'data-fixture-generic-rail',
  'data-fixture-related-project',
  'data-fixture-prepared-multi-run',
  '<PublicTruthSummary',
  '<BuildPathCard',
]) {
  assert.ok(fixtureRoute.includes(token), `${FIXTURE_ROUTE} must preserve ${token}`)
}

const baseUrl = parseBaseUrl(process.argv.slice(2))
if (baseUrl) {
  const fixtureResponse = await fetch(new URL(FIXTURE_URL, baseUrl))
  assert.equal(fixtureResponse.ok, true, `${FIXTURE_URL} must return a successful HTTP response`)
  const fixtureHtml = await fixtureResponse.text()
  for (const renderedToken of [
    'data-generic-public-truth-fixture',
    'data-builder-byline',
    'data-builder-provenance="pathforge_seed"',
    'data-artifact-truth="recorded"',
    'data-source-access="unconfirmed"',
    'data-model-proof="not_confirmed"',
    'data-fixture-generic-rail',
    'data-generic-rail-truth',
    'data-fixture-prepared-multi-run',
    'data-path-model-card',
    'data-selected-run-source-evidence',
    'Run recorded',
    'Artifact verified',
    'Default run',
    '2 prompts',
    '1 model run',
    '3 model runs',
    'Public access not confirmed',
    'Partial public source',
    'PathForge record',
    'Model proof not confirmed',
    'Model family shown publicly',
    'PathForge-operated',
  ]) {
    assert.ok(fixtureHtml.includes(renderedToken), `${FIXTURE_URL} must render ${renderedToken}`)
  }
  const genericCardHtml = fixtureHtml.match(/<section[^>]*data-fixture-related-project="true"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? ''
  const preparedCardHtml = fixtureHtml.match(/<section[^>]*data-fixture-prepared-multi-run="true"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? ''
  const genericRailHtml = fixtureHtml.match(/<section[^>]*data-fixture-generic-rail="true"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? ''
  assert.ok(genericCardHtml, `${FIXTURE_URL} must render the generic related-card fixture section`)
  assert.ok(preparedCardHtml, `${FIXTURE_URL} must render the prepared multi-run fixture section`)
  assert.ok(genericRailHtml, `${FIXTURE_URL} must render the generic sticky-rail fixture section`)
  assert.ok(genericRailHtml.includes('data-public-model-identity'), 'generic sticky-rail fixture must render its repeated model identity')
  assert.ok(genericRailHtml.includes('data-generic-rail-truth="true"'), 'generic sticky-rail fixture must render its scoped truth block')
  assert.ok(genericRailHtml.includes('data-source-access="unconfirmed"'), 'generic sticky-rail fixture must fail closed')
  assert.ok(genericRailHtml.includes('data-model-proof="not_confirmed"'), 'generic sticky-rail fixture model proof must fail closed')
  assert.equal(genericRailHtml.includes('data-pathforge-record='), false, 'generic sticky-rail fixture must not render a PathForge record claim')
  assert.ok(
    genericRailHtml.indexOf('data-public-model-identity') < genericRailHtml.indexOf('data-generic-rail-truth'),
    'generic sticky-rail fixture truth must follow its repeated model identity',
  )
  assert.ok(genericCardHtml.includes('data-path-model-card'), 'generic related card must render the canonical card')
  assert.ok(genericCardHtml.includes('Public access not confirmed'), 'generic related card must fail closed')
  assert.ok(genericCardHtml.includes('Model proof not confirmed'), 'generic related card model proof must fail closed')
  assert.equal(genericCardHtml.includes('PathForge record'), false, 'generic related card must not render a PathForge record claim')
  assert.ok(preparedCardHtml.includes('data-path-model-card'), 'prepared related card must render the canonical card')
  assert.ok(preparedCardHtml.includes('Partial public source'), 'prepared related card must render default-run source access')
  assert.ok(preparedCardHtml.includes('PathForge record'), 'prepared related card must render its checked PathForge record')
  assert.ok(preparedCardHtml.includes('Model family shown publicly'), 'prepared related card must render default-run model proof')

  const ideasResponse = await fetch(new URL('/what-to-build', baseUrl))
  assert.equal(ideasResponse.ok, true, '/what-to-build must return a successful HTTP response')
  const ideasHtml = await ideasResponse.text()
  assert.ok(ideasHtml.includes('ideas-feature-footer'), '/what-to-build must render its featured footer')
  assert.ok(ideasHtml.includes('data-builder-byline'), '/what-to-build must render the shared byline')
}

console.log(
  `Generic public truth guard passed${baseUrl ? ` with rendered HTTP fixture ${baseUrl}${FIXTURE_URL}` : ''}.`,
)
