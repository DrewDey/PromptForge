#!/usr/bin/env node

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const failures = []

function writeFixture(dir, name, pkg) {
  const path = join(dir, `${name}.json`)
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
  return path
}

function runImporter(args) {
  return spawnSync(process.execPath, ['scripts/import-pathforge-source-run.mjs', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function parseJsonOutput(result, label) {
  try {
    return JSON.parse(result.stdout)
  } catch {
    failures.push(`${label}: importer did not return JSON output`)
    return null
  }
}

const fixtureDir = mkdtempSync(join(tmpdir(), 'pathforge-reupload-fixtures-'))
const alphaPackage = writeFixture(fixtureDir, 'alpha-source-run', {
  title: 'Reliability Fixture Alpha',
  source_url: 'https://example.com/pathforge/reliability-fixture-alpha',
  provider: 'FixtureProvider',
  model: 'Fixture Model A',
  model_settings: ['temperature: default', 'no uploaded files'],
  agent_notes: [
    'Fixture package used only for importer dry-run reliability checks.',
    { prompt_count: 2, artifact_versions: 1 },
  ],
  final_artifact_path: 'public/artifacts/reliability-fixture-alpha.html',
})
const betaPackage = writeFixture(fixtureDir, 'beta-source-run', {
  title: 'Reliability Fixture Beta',
  source_url: 'https://example.com/pathforge/reliability-fixture-beta',
  provider: 'FixtureProvider',
  model_used: 'Fixture Model B',
  model_settings: {
    route: 'dry-run',
    visibility: 'local only',
  },
  agent_notes: 'Second fixture package used to simulate a separate subagent reupload.',
})
const missingProviderPackage = writeFixture(fixtureDir, 'missing-provider-source-run', {
  title: 'Reliability Fixture Missing Provider',
  source_url: 'https://example.com/pathforge/reliability-fixture-missing-provider',
  model: 'Fixture Model C',
})

for (const [label, packagePath] of [
  ['alpha', alphaPackage],
  ['beta', betaPackage],
]) {
  const result = runImporter(['--package', packagePath, '--dry-run', '--username', `Fixture${label}`])
  assert(result.status === 0, `${label}: dry-run importer should succeed: ${result.stderr || result.stdout}`)
  const output = parseJsonOutput(result, label)
  if (output) {
    assert(output.dry_run === true, `${label}: output must report dry_run`)
    assert(output.mode === 'source-run-intake', `${label}: output must stay in source-run intake mode`)
    assert(output.status === 'queued', `${label}: output must report queued status`)
    assert(output.admin_queue === 'pending review', `${label}: output must identify the admin queue handoff`)
    assert(
      output.next_step === 'Admin reviews the source-run intake. No prompt/upvote page is created by this importer.',
      `${label}: output must preserve the no-public-page boundary`,
    )
    assert(output.deduplicated === false, `${label}: dry-run fixture should not claim a live dedupe`)
  }
}

const missingProvider = runImporter(['--package', missingProviderPackage, '--dry-run'])
assert(missingProvider.status !== 0, 'missing-provider fixture must fail validation')
assert(
  missingProvider.stderr.includes('Seed package is missing provider.'),
  'missing-provider fixture must fail with a provider metadata error',
)

const oldDraftMode = runImporter(['--package', alphaPackage, '--submit-draft'])
assert(oldDraftMode.status !== 0, 'old --submit-draft mode must stay disabled')
assert(
  oldDraftMode.stderr.includes('--submit-draft has been disabled'),
  'old --submit-draft mode must explain that it cannot create draft/public pages',
)

if (failures.length > 0) {
  console.error('Source-run reupload fixture guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run reupload fixture guard passed.')
