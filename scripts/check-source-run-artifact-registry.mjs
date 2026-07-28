#!/usr/bin/env node

import assert from 'node:assert/strict'
import { resolveExactArtifactPackage } from '../src/lib/source-run-artifact-registry.mjs'

const root = {
  id: 'root-artifact',
  artifactPath: '/artifacts/root.html',
  stepId: 'root-step',
  stepNumber: 1,
  artifactSha256: 'a'.repeat(64),
}
const middle = {
  id: 'middle-artifact',
  artifactPath: '/artifacts/middle.html',
  stepId: 'middle-step',
  stepNumber: 2,
  artifactSha256: 'b'.repeat(64),
}
const current = {
  id: 'current-artifact',
  artifactPath: '/artifacts/current.html',
  stepId: 'current-step',
  stepNumber: 3,
  artifactSha256: 'c'.repeat(64),
}
const completeRegistry = [root, middle, current]

for (const artifact of completeRegistry) {
  assert.equal(
    resolveExactArtifactPackage(
      completeRegistry,
      artifact.artifactPath,
      artifact.id,
    ),
    artifact,
    `exact ${artifact.id} identity should resolve`,
  )
}

assert.equal(
  resolveExactArtifactPackage(
    completeRegistry,
    root.artifactPath,
    middle.id,
  ),
  undefined,
  'right path with the wrong package id must fail closed',
)
assert.equal(
  resolveExactArtifactPackage(
    completeRegistry,
    middle.artifactPath,
    root.id,
  ),
  undefined,
  'right package id with the wrong path must fail closed',
)
assert.equal(
  resolveExactArtifactPackage(
    [root, { ...root, artifactPath: '/artifacts/conflict.html' }],
    root.artifactPath,
    root.id,
  ),
  undefined,
  'one package id pointing at two paths must fail closed',
)
assert.equal(
  resolveExactArtifactPackage(
    [current, { ...current, artifactSha256: 'd'.repeat(64) }],
    current.artifactPath,
    current.id,
  ),
  undefined,
  'conflicting exact-package digests must fail closed',
)
assert.equal(
  resolveExactArtifactPackage(
    [middle, { ...middle }],
    middle.artifactPath,
    middle.id,
  )?.artifactSha256,
  middle.artifactSha256,
  'identical bounded lineage duplicates may resolve deterministically',
)

console.log('Source-run lineage artifact registry guard passed.')
