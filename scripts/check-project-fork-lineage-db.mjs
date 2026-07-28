#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const migration =
  'supabase/migrations/20260728024959_authoritative_project_fork_lineage.sql'

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
    throw new Error(`${program} ${args[0] ?? ''} failed${detail ? `:\n${detail}` : ''}`)
  }
  return result
}

function localPostgresAvailable() {
  return ['initdb', 'pg_ctl', 'psql'].every((program) => (
    run(program, ['--version'], { allowFailure: true, timeout: 3000 }).status === 0
  ))
}

async function createDockerHarness() {
  const container = `pathforge-fork-lineage-${randomUUID().slice(0, 8)}`
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
    const initialized = `${logs.stdout}\n${logs.stderr}`
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
    if (initialized && probe.status === 0 && probe.stdout.trim() === '1') {
      return {
        apply(sql, allowFailure = false) {
          return run('docker', [
            'exec',
            '-i',
            container,
            'psql',
            '--no-psqlrc',
            '--set',
            'ON_ERROR_STOP=1',
            '--username',
            'postgres',
            '--dbname',
            'postgres',
          ], { input: sql, allowFailure })
        },
        cleanup() {
          run('docker', ['rm', '--force', container], { allowFailure: true })
        },
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  run('docker', ['rm', '--force', container], { allowFailure: true })
  throw new Error('Disposable PostgreSQL 17 did not initialize within 30 seconds.')
}

function createLocalHarness() {
  const temporaryDirectory = mkdtempSync('/tmp/pathforge-fork-lineage-')
  const dataDirectory = path.join(temporaryDirectory, 'data')
  const port = 56000 + Number.parseInt(randomUUID().slice(0, 4), 16) % 1000
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
      apply(sql, allowFailure = false) {
        return run('psql', [
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
        ], { input: sql, allowFailure })
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
      run('pg_ctl', ['--pgdata', dataDirectory, '--mode', 'fast', 'stop'], {
        allowFailure: true,
      })
    }
    rmSync(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')
const harness = localPostgresAvailable()
  ? createLocalHarness()
  : await createDockerHarness()

try {
  harness.apply(read('test-fixtures/project-fork-lineage/migration-prerequisites.sql'))
  harness.apply(read('test-fixtures/project-fork-lineage/preflight-overdepth.sql'))
  const blocked = harness.apply(read(migration), true)
  const blockedOutput = `${blocked.stdout}\n${blocked.stderr}`
  if (
    blocked.status === 0 ||
    !blockedOutput.includes('unexpected stored depth 9+')
  ) {
    throw new Error('Migration did not fail explicitly on unexpected over-depth data.')
  }
  harness.apply(read('test-fixtures/project-fork-lineage/clear-preflight-overdepth.sql'))
  harness.apply(read('test-fixtures/project-fork-lineage/preflight-provenance.sql'))
  const provenanceBlocked = harness.apply(read(migration), true)
  const provenanceBlockedOutput =
    `${provenanceBlocked.stdout}\n${provenanceBlocked.stderr}`
  if (
    provenanceBlocked.status === 0 ||
    !provenanceBlockedOutput.includes('invalid legacy tuples') ||
    !provenanceBlockedOutput.includes('prompts 4 ids') ||
    !provenanceBlockedOutput.includes('71900000-0000-4000-8000-000000000001') ||
    !provenanceBlockedOutput.includes('71900000-0000-4000-8000-000000000004')
  ) {
    throw new Error(
      'Migration did not identify and abort on invalid legacy provenance tuples.',
    )
  }
  harness.apply(
    read('test-fixtures/project-fork-lineage/verify-preflight-provenance-abort.sql'),
  )
  harness.apply(read('test-fixtures/project-fork-lineage/clear-invalid-provenance.sql'))
  harness.apply(read(migration))
  harness.apply(read('test-fixtures/project-fork-lineage/runtime-provenance-test.sql'))
  harness.apply(read('test-fixtures/project-fork-lineage/runtime-action-roundtrip.sql'))
  harness.apply(read('test-fixtures/project-fork-lineage/migration-transaction-test.sql'))
  console.log('Project fork lineage migration passed in disposable PostgreSQL 17.')
} finally {
  harness.cleanup()
}
