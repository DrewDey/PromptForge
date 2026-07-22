#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACTIVE_PROJECT_EXPLANATION,
  calculateDiscoveryActivity,
  compareActiveDiscoveryItems,
  compareForkDiscoveryItems,
  compareMultiModelDiscoveryItems,
  countDistinctVerifiedModels,
  deriveDiscoveryRunCounts,
  requireCanonicalDefaultModelRun,
  retainDistinctRecordedModelRuns,
} from '../src/lib/discovery-activity.mjs'

assert.equal(
  countDistinctVerifiedModels(['GPT-5.6 Luna', 'gpt-5.6 luna', ' Gemini 3.1 Pro ', '']),
  2,
  'reruns from the same model should not inflate the distinct model count',
)

const longitudinalDefaultSourceRunId = 'same-model-run-a'
const longitudinalSameModelRuns = retainDistinctRecordedModelRuns([
  {
    sourceRunId: 'same-model-run-a',
    isCanonicalDefault: 'same-model-run-a' === longitudinalDefaultSourceRunId,
    publicModelLabel: 'GPT-5.6 Luna',
    capturedAt: '2026-07-20T00:00:00.000Z',
    promptCount: 2,
    artifactPath: '/artifacts/same-model-run-a.html',
    href: '/same-model-family',
    sourceAccessState: 'public_exact',
  },
  {
    sourceRunId: 'same-model-run-b',
    isCanonicalDefault: 'same-model-run-b' === longitudinalDefaultSourceRunId,
    publicModelLabel: 'GPT-5.6 Luna',
    capturedAt: '2026-07-21T00:00:00.000Z',
    promptCount: 5,
    artifactPath: '/artifacts/same-model-run-b.html',
    href: '/same-model-family?run=same-model-run-b',
    sourceAccessState: 'provider_private',
  },
])
assert.deepEqual(
  longitudinalSameModelRuns.map((run) => ({
    sourceRunId: run.sourceRunId,
    isCanonicalDefault: run.isCanonicalDefault,
    promptCount: run.promptCount,
    artifactPath: run.artifactPath,
    href: run.href,
    sourceAccessState: run.sourceAccessState,
  })),
  [
    {
      sourceRunId: 'same-model-run-a',
      isCanonicalDefault: true,
      promptCount: 2,
      artifactPath: '/artifacts/same-model-run-a.html',
      href: '/same-model-family',
      sourceAccessState: 'public_exact',
    },
    {
      sourceRunId: 'same-model-run-b',
      isCanonicalDefault: false,
      promptCount: 5,
      artifactPath: '/artifacts/same-model-run-b.html',
      href: '/same-model-family?run=same-model-run-b',
      sourceAccessState: 'provider_private',
    },
  ],
  'same-model captures must retain both source-run identities and their own public truth',
)
const longitudinalPublicModelLabels = [...new Set(
  longitudinalSameModelRuns.map((run) => run.publicModelLabel),
)]
assert.deepEqual(
  {
    verifiedModelCount: countDistinctVerifiedModels(
      longitudinalSameModelRuns.map((run) => run.publicModelLabel),
    ),
    comparisonCount: Math.max(1, longitudinalPublicModelLabels.length),
  },
  { verifiedModelCount: 1, comparisonCount: 1 },
  'same-model longitudinal runs must remain one distinct public model comparison',
)
assert.deepEqual(
  deriveDiscoveryRunCounts(longitudinalSameModelRuns, longitudinalSameModelRuns),
  { modelRunCount: 2, verifiedModelRunCount: 2 },
  'the public family total must align with both retained source runs',
)
const longitudinalNewestFirst = longitudinalSameModelRuns.toSorted((left, right) => (
  Date.parse(right.capturedAt) - Date.parse(left.capturedAt)
))
assert.equal(longitudinalNewestFirst[0].sourceRunId, 'same-model-run-b')
assert.deepEqual(
  requireCanonicalDefaultModelRun(longitudinalNewestFirst),
  longitudinalSameModelRuns[0],
  'newest-first ordering must not replace the configured default prompt, artifact, or href',
)

const twoRuns = calculateDiscoveryActivity({
  modelRunCount: 2,
  forkCount: 0,
  voteCount: 0,
  bookmarkCount: 0,
})
assert.equal(twoRuns.score, 4)
assert.equal(twoRuns.isActive, true)

const twoForks = calculateDiscoveryActivity({
  modelRunCount: 0,
  forkCount: 2,
  voteCount: 0,
  bookmarkCount: 0,
})
assert.equal(twoForks.score, 4)
assert.equal(twoForks.isActive, true)

const oneOfEach = calculateDiscoveryActivity({
  modelRunCount: 1,
  forkCount: 1,
  voteCount: 0,
  bookmarkCount: 0,
})
assert.equal(oneOfEach.score, 4)
assert.equal(oneOfEach.isActive, true)

const cheapEngagementOnly = calculateDiscoveryActivity({
  modelRunCount: 0,
  forkCount: 0,
  voteCount: 1_000_000,
  bookmarkCount: 1_000_000,
})
assert.equal(cheapEngagementOnly.communityPoints, 3)
assert.equal(cheapEngagementOnly.isActive, false)

const oneRunWithEngagement = calculateDiscoveryActivity({
  modelRunCount: 1,
  forkCount: 0,
  voteCount: 1_000_000,
  bookmarkCount: 1_000_000,
})
assert.equal(oneRunWithEngagement.score, 5)
assert.equal(oneRunWithEngagement.isActive, false)

const cappedSignals = calculateDiscoveryActivity({
  modelRunCount: 100,
  forkCount: 100,
  voteCount: 100,
  bookmarkCount: 100,
})
assert.deepEqual(cappedSignals, {
  score: 15,
  isActive: true,
  modelRunPoints: 6,
  forkPoints: 6,
  communityPoints: 3,
})

function item(overrides = {}) {
  return {
    id: 'project-a',
    title: 'Alpha',
    isActive: false,
    activityScore: 0,
    verifiedModelCount: 0,
    modelRunCount: 0,
    verifiedModelRunCount: 0,
    forkCount: 0,
    latestActivityAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const activeItems = [
  item({ id: 'inactive', title: 'Inactive', activityScore: 3 }),
  item({ id: 'older-active', title: 'Older active', isActive: true, activityScore: 4, modelRunCount: 3, verifiedModelRunCount: 2, latestActivityAt: '2026-07-10T00:00:00.000Z' }),
  item({ id: 'newer-active', title: 'Newer active', isActive: true, activityScore: 4, modelRunCount: 2, verifiedModelRunCount: 2, latestActivityAt: '2026-07-11T00:00:00.000Z' }),
]
assert.deepEqual(
  activeItems.toSorted(compareActiveDiscoveryItems).map((entry) => entry.id),
  ['newer-active', 'older-active', 'inactive'],
  'recorded-only history must not outrank a project with the same verified activity and newer evidence',
)

const exactTies = [
  item({ id: 'project-b', title: 'Same' }),
  item({ id: 'project-a', title: 'Same' }),
]
assert.deepEqual(
  exactTies.toSorted(compareActiveDiscoveryItems).map((entry) => entry.id),
  ['project-a', 'project-b'],
)

const countItems = [
  item({ id: 'many-reruns', verifiedModelCount: 1, modelRunCount: 5, verifiedModelRunCount: 5, forkCount: 1, activityScore: 8 }),
  item({ id: 'three-models', verifiedModelCount: 3, modelRunCount: 3, verifiedModelRunCount: 3, forkCount: 1, activityScore: 8 }),
  item({ id: 'two-models', verifiedModelCount: 2, modelRunCount: 4, verifiedModelRunCount: 4, forkCount: 4, activityScore: 10 }),
]
assert.deepEqual(
  countItems.toSorted(compareForkDiscoveryItems).map((entry) => entry.id),
  ['two-models', 'many-reruns', 'three-models'],
)
assert.deepEqual(
  countItems.toSorted(compareMultiModelDiscoveryItems).map((entry) => entry.id),
  ['three-models', 'two-models', 'many-reruns'],
  'multiple distinct models should outrank repeated runs from one model',
)

assert.match(ACTIVE_PROJECT_EXPLANATION, /2 points per artifact-verified run \(maximum 6\)/)
assert.match(ACTIVE_PROJECT_EXPLANATION, /votes and saves alone never qualify/)

const discoverySource = readFileSync('src/components/discovery/BuildPathsDiscovery.tsx', 'utf8')
const navigationSource = readFileSync('src/components/discovery/DiscoveryNavigationFeedback.tsx', 'utf8')
const cardSource = readFileSync('src/components/discovery/BuildPathCard.tsx', 'utf8')
const interactiveCardSource = readFileSync('src/components/discovery/InteractiveBuildPathCard.tsx', 'utf8')
const knownIssueSource = readFileSync('src/components/ModelVariantKnownIssue.tsx', 'utf8')
const whatToBuildSource = readFileSync('src/app/what-to-build/page.tsx', 'utf8')
const homeMosaicSource = readFileSync('src/components/home/HomeBuildMosaic.tsx', 'utf8')
const genericProjectSource = readFileSync('src/app/prompt/[id]/page.tsx', 'utf8')
const pathsLoadingSource = readFileSync('src/app/paths/loading.tsx', 'utf8')
const catalogSource = readFileSync('src/lib/path-discovery.ts', 'utf8')
const variantSource = readFileSync('src/lib/project-model-variants.ts', 'utf8')
const dataSource = readFileSync('src/lib/data.ts', 'utf8')
const summaries = JSON.parse(readFileSync('src/lib/project-model-profile-summaries.json', 'utf8'))

const recordedFamilyFixtures = [
  'booking-flow-handoff-simulator.json',
  'calming-sleep-sound-mixer.json',
  'first-principles-claim-ladder-game.json',
  't-shirt-print-alignment-press-game.json',
]
for (const fileName of recordedFamilyFixtures) {
  const manifest = JSON.parse(readFileSync(`seed-runs/model-variants/${fileName}`, 'utf8'))
  const verifiedSummary = summaries[manifest.canonicalProjectId] ?? []
  const counts = deriveDiscoveryRunCounts(manifest.variants, verifiedSummary)
  assert.deepEqual(
    counts,
    { modelRunCount: 3, verifiedModelRunCount: 2 },
    `${fileName} must expose all three recorded runs while keeping two artifact-verified activity runs`,
  )
  assert.equal(
    calculateDiscoveryActivity({
      modelRunCount: counts.verifiedModelRunCount,
      forkCount: 0,
      voteCount: 0,
      bookmarkCount: 0,
    }).score,
    4,
    `${fileName} Active score must remain based on its two artifact-verified runs`,
  )
}
assert.match(
  whatToBuildSource,
  /item\.modelRunCount > 1 \? `\$\{item\.modelRunCount\} model runs` : item\.modelLabel/,
  'what-to-build must describe the four fixture families as three recorded model runs',
)
assert.doesNotMatch(
  whatToBuildSource,
  /item\.comparisonCount[^\n]*model runs/,
  'distinct-model comparison counts must never be labeled as model runs',
)
assert.match(
  whatToBuildSource,
  /<BuildPathCard[\s\S]*?item=\{item\}/,
  'what-to-build recommendations must reuse the canonical Explore card',
)
assert.match(whatToBuildSource, /data-ideas-shared-path-cards/)
assert.match(
  homeMosaicSource,
  /<BuildPathCard[\s\S]*?item=\{item\}/,
  'homepage recommendations must reuse the canonical Explore card',
)
assert.match(homeMosaicSource, /data-home-shared-path-cards/)
assert.match(
  genericProjectSource,
  /data-related-shared-path-cards[\s\S]*?<BuildPathCard[\s\S]*?item=\{item\}/,
  'generic related projects must reuse the canonical Explore card',
)
assert.doesNotMatch(
  pathsLoadingSource,
  /\.\.\/browse\/loading|bg-surface-900|border-surface-800|bg-surface-800/,
  'Explore loading must not regress to the obsolete dark Browse shell',
)

for (const sortValue of ['active', 'forks', 'models', 'newest']) {
  assert.match(discoverySource, new RegExp(`value: '${sortValue}'`))
}
assert.match(discoverySource, /value: 'models', label: 'Multiple models'/)
assert.match(discoverySource, /rawSort === 'model-runs' \? 'models'/)
assert.match(discoverySource, /name="sort" value=\{activeSort\}/)
assert.match(discoverySource, /getPrompts\(\{ sort: 'newest' \}\)/)
assert.doesNotMatch(discoverySource, /getPrompts\(\{ sort: 'newest', limit:/)
assert.match(discoverySource, /activeOrder\(filtered\)/)
assert.match(discoverySource, /forkCountOrder\(filtered\)/)
assert.match(discoverySource, /multiModelOrder\(filtered\)/)
assert.match(discoverySource, /item\.verifiedModelCount < 2/)
assert.match(discoverySource, /item\.verifiedModelCount > 1/)
assert.doesNotMatch(
  discoverySource,
  /activeCompare && item\.modelVariants\.length|multiModelPathCount = catalog\.filter\(\(item\) => item\.modelVariants\.length/,
  'same-model reruns must not qualify a project for Multiple models',
)
assert.match(discoverySource, /multiModelPathCount/)
assert.match(discoverySource, /Longitudinal reruns remain selectable without inflating this count/)
assert.match(discoverySource, /path-filter-count/)
assert.match(discoverySource, /What “Active” means/)
assert.match(discoverySource, /DiscoveryNavigationFeedbackProvider/)
assert.match(discoverySource, /DiscoveryNavigationLink/)
assert.match(discoverySource, /DiscoverySortMenu/)
assert.match(navigationSource, /startTransition\(\(\) =>/)
assert.match(navigationSource, /router\.push\(navigation\.href\)/)
assert.match(navigationSource, /aria-busy=\{isThisNavigationPending \|\| undefined\}/)
assert.match(navigationSource, /aria-disabled=\{isNavigationLocked \|\| undefined\}/)
assert.match(navigationSource, /data-discovery-navigation-pending/)
assert.match(navigationSource, /isModifiedActivation\(event\)/)
assert.match(navigationSource, /data-discovery-sort-label/)
assert.match(navigationSource, /pendingSort \? `\$\{pendingSort\.label\}…` : activeLabel/)
assert.match(interactiveCardSource, /item\.isActive/)
assert.match(interactiveCardSource, /item\.modelVariants\.length/)
assert.match(interactiveCardSource, /requireCanonicalDefaultModelRun\(variants\)/)
assert.doesNotMatch(interactiveCardSource, /canonicalDefaultVariant[^\n]*\?\? variants\[0\]/)
assert.match(interactiveCardSource, /item\.modelRunCount\} recorded model runs/)
assert.match(interactiveCardSource, /item\.verifiedModelRunCount\} artifact-verified model runs/)
assert.match(cardSource, /verifiedModelRunCount: item\.verifiedModelRunCount/)
assert.match(interactiveCardSource, /item\.forkCount/)
assert.match(interactiveCardSource, /data-model-order-option="new"/)
assert.match(interactiveCardSource, /data-model-order-option="active"/)
assert.match(interactiveCardSource, /activityProjectCount/)
assert.match(interactiveCardSource, /data-model-total/)
assert.match(
  interactiveCardSource,
  /<strong>\{variants\.length\}<\/strong> model \{variants\.length === 1 \? 'run' : 'runs'\}/,
  'path-card model totals must describe recorded runs rather than overstate distinct model evidence',
)
assert.doesNotMatch(
  interactiveCardSource,
  /<strong>\{variants\.length\}<\/strong>\s+models/,
  'path-card run totals must not regress to a models label',
)
assert.doesNotMatch(interactiveCardSource, /Only recorded model/)
assert.match(interactiveCardSource, /data-path-card-primary-link/)
assert.doesNotMatch(cardSource, /variantsAreVerified/)
assert.match(interactiveCardSource, /ModelVariantKnownIssue/)
assert.match(interactiveCardSource, /knownIssueExplanation/)
assert.match(interactiveCardSource, /model results/)
assert.match(knownIssueSource, /role="tooltip"/)
assert.match(knownIssueSource, /Historical run preserved for comparison/)
assert.match(catalogSource, /getProjectModelProfileSummary/)
assert.match(catalogSource, /getProjectModelVariantSet/)
assert.match(catalogSource, /const comparisonCount = Math\.max\(1, modelLabels\.length\)/)
assert.match(catalogSource, /variantSummary\.map\(\(variant\) => variant\.publicModelLabel\)/)
assert.match(catalogSource, /retainDistinctRecordedModelRuns\(candidates\)/)
assert.match(catalogSource, /isCanonicalDefault: variant\.sourceRunId === variantSet\?\.defaultSourceRunId/)
assert.match(catalogSource, /requireCanonicalDefaultModelRun\(modelVariants\)/)
assert.doesNotMatch(catalogSource, /canonicalDefaultVariant[\s\S]{0,120}\?\? modelVariants\[0\]/)
assert.match(catalogSource, /deriveDiscoveryRunCounts\(\s*modelVariants,\s*variantSummary,?\s*\)/)
assert.match(catalogSource, /modelRunCount: verifiedModelRunCount/)
assert.match(catalogSource, /variant\.qualityStatus === 'verified'/)
assert.doesNotMatch(catalogSource, /\.filter\(\(variant\) => variant\.qualityStatus === 'verified'\)/)
assert.match(catalogSource, /qualityStatus: variant\.qualityStatus/)
assert.match(catalogSource, /knownIssueExplanation: getProjectModelVariantKnownIssueExplanation\(variant\)/)
assert.match(variantSource, /getProjectModelVariantKnownIssueExplanation/)
assert.match(variantSource, /needs a user-facing explanation/)
assert.match(catalogSource, /projectsByProvider/)
assert.match(catalogSource, /variant\.qualityStatus !== 'verified'/)
assert.match(catalogSource, /variant\.qualityStatus === 'verified'/)
assert.match(catalogSource, /Date\.parse\(right\.capturedAt\) - Date\.parse\(left\.capturedAt\)/)
assert.match(catalogSource, /fork_source_project_id/)
assert.match(catalogSource, /calculateDiscoveryActivity/)
assert.match(dataSource, /CURATED_SOURCE_RUN_SHOWCASE_PROJECTS\.map\(\(project\) => project\.id\)/)

for (const runs of Object.values(summaries)) {
  for (const run of runs) {
    assert.equal(Number.isFinite(Date.parse(run.capturedAt)), true)
  }
}

console.log('Discovery activity, distinct-model ordering, and sort-control guard passed.')
