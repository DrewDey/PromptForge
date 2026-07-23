#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const container = `pathforge-community-db-${randomUUID().slice(0, 8)}`
const postgresPassword = randomUUID()

function run(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    input: options.input,
  })
  if (result.status !== 0 && !options.allowFailure) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`docker ${args[0]} failed${detail ? `:\n${detail}` : ''}`)
  }
  return result
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    // The official image briefly starts an initialization server, stops it,
    // and then launches the final server. pg_isready alone can catch that
    // temporary window on a slower CI runner, so require the init-complete
    // marker before accepting a real SQL round trip.
    const logs = run(['logs', container], { allowFailure: true })
    const initComplete = `${logs.stdout}\n${logs.stderr}`
      .includes('PostgreSQL init process complete; ready for start up.')
    const result = run(
      [
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
      ],
      { allowFailure: true },
    )
    if (initComplete && result.status === 0 && result.stdout.trim() === '1') return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Disposable PostgreSQL did not complete initialization within 30 seconds.')
}

function applySql(relativePath) {
  const sql = readFileSync(path.join(root, relativePath), 'utf8')
  const result = run([
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
  process.stdout.write(result.stdout)
}

try {
  run(['version'])
  run([
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    `POSTGRES_PASSWORD=${postgresPassword}`,
    'postgres:17-alpine',
  ])
  await waitForPostgres()
  applySql('test-fixtures/community-project/migration-prerequisites.sql')
  applySql('supabase/migrations/20260723054558_community_project_pilot.sql')
  applySql('test-fixtures/community-project/migration-transaction-test.sql')
  console.log('Community project database check passed in disposable PostgreSQL.')
} finally {
  run(['rm', '--force', container], { allowFailure: true })
}
