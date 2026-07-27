#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const sqlFiles = [
  'test-fixtures/community-project/migration-prerequisites.sql',
  'supabase/migrations/20260723054558_community_project_pilot.sql',
  'supabase/migrations/20260723140556_harden_immediate_artifact_purge_confirmation.sql',
  'supabase/migrations/20260723152046_restore_legacy_source_run_compatibility_and_source_privacy.sql',
  'supabase/migrations/20260723173000_harden_community_project_release_review.sql',
  'supabase/migrations/20260723191235_enforce_community_invitation_and_report_alert_readiness.sql',
  'supabase/migrations/20260723204000_close_community_report_operational_gaps.sql',
  'supabase/migrations/20260724132517_distinguish_community_pilot_admission_status.sql',
  'test-fixtures/legacy-public-source/migration-prerequisites.sql',
  'supabase/migrations/20260726203000_legacy_public_source_grandfathering.sql',
  'test-fixtures/prepared-legacy-seed-profile/migration-prerequisites.sql',
  'supabase/migrations/20260726210000_prepared_legacy_seed_profile_binding.sql',
  'supabase/migrations/20260727014500_enforce_prepared_legacy_import_profile_binding.sql',
  'supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql',
  'supabase/migrations/20260727033000_project_preexisting_legacy_share_projection.sql',
  'test-fixtures/legacy-public-source/migration-transaction-test.sql',
  'test-fixtures/prepared-legacy-seed-profile/migration-transaction-test.sql',
]

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    input: options.input,
    timeout: options.timeout,
  })
  if (result.status !== 0 && !options.allowFailure) {
    const detail = [result.stdout, result.stderr, result.error?.message]
      .filter(Boolean)
      .join('\n')
      .trim()
    throw new Error(
      `${program} ${args[0] ?? ''} failed${detail ? `:\n${detail}` : ''}`,
    )
  }
  return result
}

function localPostgresAvailable() {
  return ['initdb', 'pg_ctl', 'psql'].every((program) => (
    run(program, ['--version'], { allowFailure: true, timeout: 3000 }).status === 0
  ))
}

async function createDockerHarness() {
  const container = `pathforge-legacy-source-db-${randomUUID().slice(0, 8)}`
  run('docker', ['version'], { timeout: 5000 })
  run('docker', [
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    `POSTGRES_PASSWORD=${randomUUID()}`,
    'postgres:17-alpine',
  ])

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const logs = run('docker', ['logs', container], { allowFailure: true })
    const initComplete = `${logs.stdout}\n${logs.stderr}`
      .includes('PostgreSQL init process complete; ready for start up.')
    const probe = run('docker', [
      'exec',
      container,
      'psql',
      '--no-psqlrc',
      '--tuples-only',
      '--username',
      'postgres',
      '--dbname',
      'postgres',
      '--command',
      'select 1',
    ], { allowFailure: true })
    if (initComplete && probe.status === 0 && probe.stdout.trim() === '1') {
      return {
        applySql(sql) {
          run('docker', [
            'exec',
            '-i',
            container,
            'psql',
            '--set',
            'ON_ERROR_STOP=1',
            '--username',
            'postgres',
            '--dbname',
            'postgres',
          ], { input: sql })
        },
        cleanup() {
          run('docker', ['rm', '--force', container], { allowFailure: true })
        },
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  run('docker', ['rm', '--force', container], { allowFailure: true })
  throw new Error('Disposable PostgreSQL did not complete initialization within 30 seconds.')
}

function createLocalHarness() {
  const temporaryDirectory = mkdtempSync('/tmp/pathforge-legacy-source-db-')
  const dataDirectory = path.join(temporaryDirectory, 'data')
  const port = 55000 + Number.parseInt(randomUUID().slice(0, 4), 16) % 1000
  let started = false
  try {
    run('initdb', [
      '--pgdata',
      dataDirectory,
      '--username',
      'postgres',
      '--auth',
      'trust',
      '--no-locale',
      '--encoding',
      'UTF8',
      '--no-instructions',
    ])
    run('pg_ctl', [
      '--pgdata',
      dataDirectory,
      '--wait',
      '--log',
      path.join(temporaryDirectory, 'postgres.log'),
      '--options',
      `-h '' -k ${temporaryDirectory} -p ${port}`,
      'start',
    ])
    started = true
    return {
      applySql(sql) {
        run('psql', [
          '--no-psqlrc',
          '--set',
          'ON_ERROR_STOP=1',
          '--host',
          temporaryDirectory,
          '--port',
          String(port),
          '--username',
          'postgres',
          '--dbname',
          'postgres',
        ], { input: sql })
      },
      cleanup() {
        if (started) {
          run('pg_ctl', [
            '--pgdata',
            dataDirectory,
            '--wait',
            '--mode',
            'fast',
            'stop',
          ], { allowFailure: true })
        }
        rmSync(temporaryDirectory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    if (started) {
      run('pg_ctl', [
        '--pgdata',
        dataDirectory,
        '--wait',
        '--mode',
        'fast',
        'stop',
      ], { allowFailure: true })
    }
    rmSync(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

const harness = localPostgresAvailable()
  ? createLocalHarness()
  : await createDockerHarness()

try {
  for (const relativePath of sqlFiles) {
    harness.applySql(readFileSync(path.join(root, relativePath), 'utf8'))
  }
  console.log(
    'Legacy public-source and prepared seed-profile database checks passed in disposable PostgreSQL.',
  )
} finally {
  harness.cleanup()
}
