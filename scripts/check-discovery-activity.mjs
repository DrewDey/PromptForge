#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACTIVE_PROJECT_EXPLANATION,
  calculateDiscoveryActivity,
  compareActiveDiscoveryItems,
  compareForkDiscoveryItems,
  compareModelRunDiscoveryItems,
} from '../src/lib/discovery-activity.mjs'

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
    modelRunCount: 0,
    forkCount: 0,
    latestActivityAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const activeItems = [
  item({ id: 'inactive', title: 'Inactive', activityScore: 3 }),
  item({ id: 'older-active', title: 'Older active', isActive: true, activityScore: 4, modelRunCount: 2, latestActivityAt: '2026-07-10T00:00:00.000Z' }),
  item({ id: 'newer-active', title: 'Newer active', isActive: true, activityScore: 4, modelRunCount: 2, latestActivityAt: '2026-07-11T00:00:00.000Z' }),
]
assert.deepEqual(
  activeItems.toSorted(compareActiveDiscoveryItems).map((entry) => entry.id),
  ['newer-active', 'older-active', 'inactive'],
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
  item({ id: 'one', modelRunCount: 3, forkCount: 1, activityScore: 8 }),
  item({ id: 'two', modelRunCount: 2, forkCount: 4, activityScore: 10 }),
  item({ id: 'three', modelRunCount: 2, forkCount: 2, activityScore: 8 }),
]
assert.deepEqual(
  countItems.toSorted(compareForkDiscoveryItems).map((entry) => entry.id),
  ['two', 'three', 'one'],
)
assert.deepEqual(
  countItems.toSorted(compareModelRunDiscoveryItems).map((entry) => entry.id),
  ['one', 'two', 'three'],
)

assert.match(ACTIVE_PROJECT_EXPLANATION, /2 points per verified run \(maximum 6\)/)
assert.match(ACTIVE_PROJECT_EXPLANATION, /votes and saves alone never qualify/)

const discoverySource = readFileSync('src/components/discovery/BuildPathsDiscovery.tsx', 'utf8')
const cardSource = readFileSync('src/components/discovery/BuildPathCard.tsx', 'utf8')
const catalogSource = readFileSync('src/lib/path-discovery.ts', 'utf8')
const summaries = JSON.parse(readFileSync('src/lib/project-model-profile-summaries.json', 'utf8'))

for (const sortValue of ['active', 'forks', 'model-runs', 'newest']) {
  assert.match(discoverySource, new RegExp(`value: '${sortValue}'`))
}
assert.match(discoverySource, /name="sort" value=\{activeSort\}/)
assert.match(discoverySource, /getPrompts\(\{ sort: 'newest' \}\)/)
assert.doesNotMatch(discoverySource, /getPrompts\(\{ sort: 'newest', limit:/)
assert.match(discoverySource, /activeOrder\(filtered\)/)
assert.match(discoverySource, /forkCountOrder\(filtered\)/)
assert.match(discoverySource, /modelRunCountOrder\(filtered\)/)
assert.match(discoverySource, /What “Active” means/)
assert.match(cardSource, /item\.isActive/)
assert.match(cardSource, /item\.modelRunCount/)
assert.match(cardSource, /item\.forkCount/)
assert.match(catalogSource, /getProjectModelProfileSummary/)
assert.match(catalogSource, /fork_source_project_id/)
assert.match(catalogSource, /calculateDiscoveryActivity/)

for (const runs of Object.values(summaries)) {
  for (const run of runs) {
    assert.equal(Number.isFinite(Date.parse(run.capturedAt)), true)
  }
}

console.log('Discovery activity score, stable ordering, and sort-control guard passed.')
