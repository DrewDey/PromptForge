#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function read(path) {
  return readFile(path, 'utf8')
}

function mustInclude(source, needle, message) {
  assert.ok(source.includes(needle), message)
}

const [
  homeMosaic,
  profilePresentation,
  builderCard,
  exploreCard,
  pathDiscovery,
  homeHero,
  whatToBuild,
  homeCss,
  ideasCss,
] = await Promise.all([
  read('src/components/home/HomeBuildMosaic.tsx'),
  read('src/lib/profile-presentation.ts'),
  read('src/components/BuilderWorkCard.tsx'),
  read('src/components/discovery/InteractiveBuildPathCard.tsx'),
  read('src/lib/path-discovery.ts'),
  read('src/components/home/HomeHero.tsx'),
  read('src/app/what-to-build/page.tsx'),
  read('src/app/home.css'),
  read('src/app/what-to-build/what-to-build.css'),
])

mustInclude(
  homeMosaic,
  'data-home-shared-path-cards',
  'The homepage project grid must expose a stable shared-card selector.',
)
mustInclude(
  homeMosaic,
  '<BuildPathCard',
  'The homepage must reuse the Explore card that exposes selected-run source access.',
)

for (const field of [
  'defaultSourceAccessLabel: string',
  "defaultRecordLabel: PublicEvidenceTruth['recordLabel']",
  'defaultSourceAccessLabel: defaultSourceEvidence.accessLabel',
  'defaultRecordLabel: defaultSourceEvidence.recordLabel',
]) {
  mustInclude(
    profilePresentation,
    field,
    `Profile presentation is missing default-run evidence field: ${field}`,
  )
}
for (const field of [
  'sourceRunId: defaultVariant?.sourceRunId',
  '?? preparedProject?.sourceRunId',
  '`community-project:${communityProject.submission_id}:v${communityProject.submission_version}`',
  'pathforgeRecordChecked: Boolean(defaultVariant || preparedProject || communityProject)',
]) {
  mustInclude(
    profilePresentation,
    field,
    `Profile evidence is missing an authoritative default-run source field: ${field}`,
  )
}

mustInclude(
  builderCard,
  'data-profile-default-source-evidence',
  'BuilderWorkCard must expose a stable default-run source-evidence selector.',
)
mustInclude(
  builderCard,
  'evidence.defaultSourceAccessLabel',
  'BuilderWorkCard must show default-run source access.',
)
mustInclude(
  builderCard,
  "evidence.defaultRecordLabel ? ` · ${evidence.defaultRecordLabel}` : ''",
  'BuilderWorkCard must show PathForge record scope only when it exists.',
)

const triggerStart = exploreCard.indexOf('className="path-model-trigger"')
const triggerEnd = exploreCard.indexOf('</button>', triggerStart)
assert.ok(triggerStart >= 0 && triggerEnd > triggerStart, 'Explore model trigger was not found.')
const closedTrigger = exploreCard.slice(triggerStart, triggerEnd)
mustInclude(
  closedTrigger,
  'data-selected-run-source-evidence',
  'The closed Explore trigger must expose a stable selected-run source-evidence selector.',
)
mustInclude(
  closedTrigger,
  'selectedVariant.sourceAccessLabel',
  'The closed Explore trigger must visibly show selected-run source access.',
)
mustInclude(
  closedTrigger,
  "selectedVariant.recordLabel ? ` · ${selectedVariant.recordLabel}` : ''",
  'The closed Explore trigger must conditionally show selected-run PathForge record scope.',
)

const helperStart = pathDiscovery.indexOf('export function getCanonicalDefaultDiscoveryTruth(')
const helperEnd = pathDiscovery.indexOf('\n}\n\nexport const DISCOVERY_INTENTS', helperStart)
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Canonical discovery truth helper was not found.')
const canonicalTruthHelper = pathDiscovery.slice(helperStart, helperEnd)
for (const field of [
  'requireCanonicalDefaultModelRun(item.modelVariants)',
  'sourceRunId: defaultVariant.sourceRunId',
  'pathforgeRecordChecked: defaultVariant.recordLabel !== null',
  'qualityStatus: defaultVariant.qualityStatus',
  'knownIssueExplanation: defaultVariant.knownIssueExplanation',
  'selectedRunPromptCount: defaultVariant.promptCount',
  'familyRunCount: item.modelVariants.length',
  'isCanonicalDefaultRun: true',
]) {
  mustInclude(
    canonicalTruthHelper,
    field,
    `Canonical discovery truth is missing required default-run input: ${field}`,
  )
}
assert.ok(
  !/artifactPath|sourceUrl|providerUrl/.test(canonicalTruthHelper),
  'Canonical discovery truth must not infer checked-record state from artifact or provider URLs.',
)

for (const [surface, source, selector] of [
  ['Homepage hero', homeHero, 'data-home-hero-public-truth'],
  ['What-to-build feature', whatToBuild, 'data-ideas-feature-public-truth'],
]) {
  mustInclude(
    source,
    'getCanonicalDefaultDiscoveryTruth(featured)',
    `${surface} must derive truth from its featured canonical default run.`,
  )
  const hookStart = source.indexOf(`<div ${selector}>`)
  const hookEnd = source.indexOf('</div>', hookStart)
  assert.ok(hookStart >= 0 && hookEnd > hookStart, `${surface} must expose a scoped public-truth hook.`)
  const hookBlock = source.slice(hookStart, hookEnd)
  mustInclude(hookBlock, '<PublicTruthSummary', `${surface} hook must render PublicTruthSummary.`)
  mustInclude(hookBlock, 'truth={featuredTruth}', `${surface} hook must render the canonical featured truth.`)
  mustInclude(hookBlock, 'showArtifactExplanation={false}', `${surface} hook must keep detailed artifact notes out of the compact surface.`)
}

for (const [surface, source, selector] of [
  ['Homepage hero', homeCss, '.pf-home-next .home-hero-public-truth'],
  ['What-to-build feature', ideasCss, '.pf-ideas .ideas-feature-public-truth'],
]) {
  const ruleStart = source.indexOf(selector)
  const ruleEnd = source.indexOf('}', ruleStart)
  assert.ok(ruleStart >= 0 && ruleEnd > ruleStart, `${surface} truth row must have scoped styling.`)
  const rule = source.slice(ruleStart, ruleEnd)
  for (const property of ['border-top:', 'padding', 'row-gap:', 'color:', 'line-height:']) {
    mustInclude(rule, property, `${surface} truth row styling must include ${property}`)
  }
}

console.log('Compact source-evidence surface checks passed.')
