#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const baseFixture =
  'test-fixtures/request-authority/migration-prerequisites.sql'
const baseMigration =
  'supabase/migrations/20260730040819_request_build_private_authority_v1.sql'
const replayMigration =
  'supabase/migrations/20260730093015_request_delivery_preparation_replay_binding_v1.sql'
const publicFixture =
  'test-fixtures/request-public-architecture/prerequisites.sql'
const publicMigration =
  'supabase/migrations/20260730171646_request_build_public_architecture_v1.sql'
const runtimeFixture =
  'test-fixtures/request-public-architecture/runtime-contract.sql'

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    input: options.input,
    stdio: options.input === undefined
      ? ['ignore', 'pipe', 'pipe']
      : ['pipe', 'pipe', 'pipe'],
    timeout: options.timeout ?? 120_000,
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
    run(program, ['--version'], {
      allowFailure: true,
      timeout: 3_000,
    }).status === 0
  ))
}

function createLocalHarness() {
  const temporaryDirectory = mkdtempSync(
    '/tmp/pathforge-request-public-architecture-',
  )
  const dataDirectory = path.join(temporaryDirectory, 'data')
  const port =
    58_000 + Number.parseInt(randomUUID().slice(0, 4), 16) % 1_000
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
      `-h 127.0.0.1 -k ${temporaryDirectory} -p ${port}`,
      'start',
    ])
    started = true
    const psql = [
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
    ]
    return {
      apply(sql, options = {}) {
        return run(
          'psql',
          options.singleTransaction
            ? [...psql, '--single-transaction']
            : psql,
          { input: sql, allowFailure: options.allowFailure },
        )
      },
      applyConcurrently(sqlInputs) {
        return Promise.all(sqlInputs.map((sql) => new Promise((resolve) => {
          const child = spawn('psql', psql, {
            cwd: root,
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          let stdout = ''
          let stderr = ''
          child.stdout.setEncoding('utf8')
          child.stderr.setEncoding('utf8')
          child.stdout.on('data', (chunk) => { stdout += chunk })
          child.stderr.on('data', (chunk) => { stderr += chunk })
          const timeout = setTimeout(() => child.kill('SIGKILL'), 30_000)
          child.on('error', (error) => {
            clearTimeout(timeout)
            resolve({
              status: null,
              stdout,
              stderr: `${stderr}\n${error.message}`,
            })
          })
          child.on('close', (status) => {
            clearTimeout(timeout)
            resolve({ status, stdout, stderr })
          })
          child.stdin.end(sql)
        })))
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
        '--mode',
        'fast',
        'stop',
      ], { allowFailure: true })
    }
    rmSync(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

async function createDockerHarness() {
  const container =
    `pathforge-request-public-${randomUUID().slice(0, 8)}`
  const password = randomUUID()
  run('docker', ['version'], { timeout: 5_000 })
  run('docker', [
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    `POSTGRES_PASSWORD=${password}`,
    '--env',
    'POSTGRES_USER=postgres',
    'postgres:17-alpine',
  ])
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
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
      if (probe.status === 0 && probe.stdout.trim() === '1') {
        const baseArgs = [
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
        ]
        return {
          apply(sql, options = {}) {
            return run(
              'docker',
              options.singleTransaction
                ? [...baseArgs, '--single-transaction']
                : baseArgs,
              { input: sql, allowFailure: options.allowFailure },
            )
          },
          applyConcurrently(sqlInputs) {
            return Promise.all(sqlInputs.map((sql) => new Promise((resolve) => {
              const child = spawn('docker', baseArgs, {
                cwd: root,
                stdio: ['pipe', 'pipe', 'pipe'],
              })
              let stdout = ''
              let stderr = ''
              child.stdout.setEncoding('utf8')
              child.stderr.setEncoding('utf8')
              child.stdout.on('data', (chunk) => { stdout += chunk })
              child.stderr.on('data', (chunk) => { stderr += chunk })
              const timeout = setTimeout(() => child.kill('SIGKILL'), 30_000)
              child.on('error', (error) => {
                clearTimeout(timeout)
                resolve({
                  status: null,
                  stdout,
                  stderr: `${stderr}\n${error.message}`,
                })
              })
              child.on('close', (status) => {
                clearTimeout(timeout)
                resolve({ status, stdout, stderr })
              })
              child.stdin.end(sql)
            })))
          },
          cleanup() {
            run('docker', ['rm', '--force', container], {
              allowFailure: true,
            })
          },
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } catch (error) {
    run('docker', ['rm', '--force', container], { allowFailure: true })
    throw error
  }
  run('docker', ['rm', '--force', container], { allowFailure: true })
  throw new Error('Disposable PostgreSQL 17 did not become ready.')
}

function assertPostgres17(harness) {
  const result = harness.apply(
    "SELECT current_setting('server_version_num');",
  )
  const version = Number.parseInt(
    result.stdout.match(/\d{6}/)?.[0] ?? '',
    10,
  )
  if (!Number.isInteger(version) || version < 170_000 || version >= 180_000) {
    throw new Error(
      `Request public architecture requires PostgreSQL 17; observed ${result.stdout.trim() || 'unknown'}.`,
    )
  }
}

function applyFoundation(harness) {
  harness.apply(read(baseFixture))
  harness.apply(read(baseMigration))
  harness.apply(read(replayMigration))
  harness.apply(read(publicFixture))
}

const migrationSql = read(publicMigration)
for (const [label, pattern] of [
  ['default-off transactional notifications', /transactional_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE/],
  ['default-off publication consent', /publication_consent_enabled BOOLEAN NOT NULL DEFAULT FALSE/],
  ['default-off publication airlock', /publication_airlock_enabled BOOLEAN NOT NULL DEFAULT FALSE/],
  ['default-off public outcomes', /public_outcomes_enabled BOOLEAN NOT NULL DEFAULT FALSE/],
  ['authenticated intake risk screen', /issue_build_request_intake_risk_grant_v1/],
  ['dual-consent publication authority', /build_request_publication_consent_receipts/],
  ['safe public outcome projection', /build_request_public_outcomes/],
  ['bounded maintenance', /maintain_build_request_public_architecture_v1/],
]) {
  if (!pattern.test(migrationSql)) {
    throw new Error(`Public architecture lost ${label}.`)
  }
}
if (
  /\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\.build_request_(?:operator|intake|readiness|public_control|reports|report_receipts|notification|publication|public_outcomes)/i
    .test(migrationSql)
  || /\bDROP\b[\s\S]{0,30}\bCASCADE\b/i.test(migrationSql)
) {
  throw new Error(
    'Public architecture must remain RPC-only and forward-safe.',
  )
}

const createHarness = localPostgresAvailable()
  ? async () => createLocalHarness()
  : createDockerHarness

const rollbackHarness = await createHarness()
try {
  assertPostgres17(rollbackHarness)
  applyFoundation(rollbackHarness)
  const failed = rollbackHarness.apply(
    `${migrationSql}\nSELECT public.request_public_forced_late_failure();`,
    { allowFailure: true, singleTransaction: true },
  )
  if (failed.status === 0) {
    throw new Error('Injected late migration failure unexpectedly succeeded.')
  }
  const residue = rollbackHarness.apply(`
    DO $assert_no_public_architecture_residue$
    BEGIN
      IF to_regclass(
        'public.build_request_operator_memberships'
      ) IS NOT NULL
        OR to_regprocedure(
          'public.get_build_request_public_availability_v1(integer)'
        ) IS NOT NULL
      THEN
        RAISE EXCEPTION
          'Failed public architecture migration left partial authority.';
      END IF;
    END;
    $assert_no_public_architecture_residue$;
  `)
  if (residue.status !== 0) {
    throw new Error('Late-failure rollback verification failed.')
  }
} finally {
  rollbackHarness.cleanup()
}

const operatorRaceHarness = await createHarness()
try {
  assertPostgres17(operatorRaceHarness)
  applyFoundation(operatorRaceHarness)
  operatorRaceHarness.apply(migrationSql, { singleTransaction: true })
  operatorRaceHarness.apply(`
    INSERT INTO public.profiles (id, role, username, display_name) VALUES
      (
        '9b100000-0000-4000-8000-000000000001',
        'admin',
        'operator-race-admin',
        'Operator Race Admin'
      ),
      (
        '9b100000-0000-4000-8000-000000000002',
        'user',
        'operator-race-builder',
        'Operator Race Builder'
      ),
      (
        '9b100000-0000-4000-8000-000000000003',
        'user',
        'operator-race-requester-one',
        'Operator Race Requester One'
      ),
      (
        '9b100000-0000-4000-8000-000000000004',
        'user',
        'operator-race-requester-two',
        'Operator Race Requester Two'
      ),
      (
        '9b100000-0000-4000-8000-000000000005',
        'user',
        'operator-race-dual-role',
        'Operator Race Dual Role'
      ),
      (
        '9b100000-0000-4000-8000-000000000006',
        'user',
        'operator-race-requester-three',
        'Operator Race Requester Three'
      );
    INSERT INTO auth.users (id, email_confirmed_at, email) VALUES
      (
        '9b100000-0000-4000-8000-000000000001',
        clock_timestamp(),
        'operator-race-admin@example.test'
      ),
      (
        '9b100000-0000-4000-8000-000000000002',
        clock_timestamp(),
        'operator-race-builder@example.test'
      ),
      (
        '9b100000-0000-4000-8000-000000000003',
        clock_timestamp(),
        'operator-race-requester-one@example.test'
      ),
      (
        '9b100000-0000-4000-8000-000000000004',
        clock_timestamp(),
        'operator-race-requester-two@example.test'
      ),
      (
        '9b100000-0000-4000-8000-000000000005',
        clock_timestamp(),
        'operator-race-dual-role@example.test'
      ),
      (
        '9b100000-0000-4000-8000-000000000006',
        clock_timestamp(),
        'operator-race-requester-three@example.test'
      );
    INSERT INTO public.build_request_operator_memberships (
      account_id,
      operator_role,
      membership_state,
      max_active_cases,
      changed_by,
      reason
    ) VALUES
      (
        '9b100000-0000-4000-8000-000000000002',
        'builder',
        'active',
        1,
        '9b100000-0000-4000-8000-000000000001',
        'Concurrency fixture with one exact builder slot.'
      ),
      (
        '9b100000-0000-4000-8000-000000000005',
        'builder',
        'active',
        2,
        '9b100000-0000-4000-8000-000000000001',
        'Concurrency fixture with a dual-role account.'
      ),
      (
        '9b100000-0000-4000-8000-000000000005',
        'reviewer',
        'active',
        2,
        '9b100000-0000-4000-8000-000000000001',
        'Concurrency fixture with a dual-role account.'
      );
    INSERT INTO public.build_requests (
      id,
      requester_id,
      requester_display_name
    ) VALUES
      (
        '9b200000-0000-4000-8000-000000000001',
        '9b100000-0000-4000-8000-000000000003',
        'Operator Race Requester One'
      ),
      (
        '9b200000-0000-4000-8000-000000000002',
        '9b100000-0000-4000-8000-000000000004',
        'Operator Race Requester Two'
      ),
      (
        '9b200000-0000-4000-8000-000000000003',
        '9b100000-0000-4000-8000-000000000006',
        'Operator Race Requester Three'
      );
  `)
  const assignment = (id, requestId, delay = '') => `
    ${delay}
    BEGIN;
    INSERT INTO public.build_request_assignments (
      id,
      request_id,
      assignment_role,
      account_id,
      display_name,
      assigned_by
    ) VALUES (
      '${id}',
      '${requestId}',
      'builder',
      '9b100000-0000-4000-8000-000000000002',
      'Operator Race Builder',
      '9b100000-0000-4000-8000-000000000001'
    );
    ${delay ? '' : 'SELECT pg_sleep(2);'}
    COMMIT;
  `
  const raceResults = await operatorRaceHarness.applyConcurrently([
    assignment(
      '9b300000-0000-4000-8000-000000000001',
      '9b200000-0000-4000-8000-000000000001',
    ),
    assignment(
      '9b300000-0000-4000-8000-000000000002',
      '9b200000-0000-4000-8000-000000000002',
      'SELECT pg_sleep(0.25);',
    ),
  ])
  const succeeded = raceResults.filter((result) => result.status === 0)
  const rejected = raceResults.filter((result) => result.status !== 0)
  if (
    succeeded.length !== 1 ||
    rejected.length !== 1 ||
    !/request_authority:operator_unavailable/.test(
      `${rejected[0]?.stdout}\n${rejected[0]?.stderr}`,
    )
  ) {
    throw new Error(
      'Concurrent one-slot operator assignments did not converge to one success and one authority rejection.\n'
      + JSON.stringify(raceResults),
    )
  }
  const activeAssignments = operatorRaceHarness.apply(`
    SELECT count(*) AS active_assignments
    FROM public.build_request_assignments
    WHERE account_id = '9b100000-0000-4000-8000-000000000002'
      AND assignment_role = 'builder'
      AND active;
  `)
  if (!/\b1\b/.test(activeAssignments.stdout)) {
    throw new Error(
      `Operator concurrency guard retained an invalid workload: ${activeAssignments.stdout}`,
    )
  }
  const roleAssignment = (id, role, delay = '') => `
    ${delay}
    BEGIN;
    INSERT INTO public.build_request_assignments (
      id,
      request_id,
      assignment_role,
      account_id,
      display_name,
      assigned_by
    ) VALUES (
      '${id}',
      '9b200000-0000-4000-8000-000000000003',
      '${role}',
      '9b100000-0000-4000-8000-000000000005',
      'Operator Race Dual Role',
      '9b100000-0000-4000-8000-000000000001'
    );
    ${delay ? '' : 'SELECT pg_sleep(2);'}
    COMMIT;
  `
  const roleRaceResults = await operatorRaceHarness.applyConcurrently([
    roleAssignment(
      '9b300000-0000-4000-8000-000000000003',
      'builder',
    ),
    roleAssignment(
      '9b300000-0000-4000-8000-000000000004',
      'reviewer',
      'SELECT pg_sleep(0.25);',
    ),
  ])
  const roleSucceeded = roleRaceResults.filter((result) => result.status === 0)
  const roleRejected = roleRaceResults.filter((result) => result.status !== 0)
  if (
    roleSucceeded.length !== 1 ||
    roleRejected.length !== 1 ||
    !/request_authority:operator_unavailable/.test(
      `${roleRejected[0]?.stdout}\n${roleRejected[0]?.stderr}`,
    )
  ) {
    throw new Error(
      'Concurrent same-case builder/reviewer assignment did not preserve role separation.\n'
      + JSON.stringify(roleRaceResults),
    )
  }
  const dualRoleAssignments = operatorRaceHarness.apply(`
    SELECT count(*) AS active_assignments
    FROM public.build_request_assignments
    WHERE request_id = '9b200000-0000-4000-8000-000000000003'
      AND account_id = '9b100000-0000-4000-8000-000000000005'
      AND active;
  `)
  if (!/\b1\b/.test(dualRoleAssignments.stdout)) {
    throw new Error(
      `Role-separation concurrency guard retained an invalid assignment pair: ${dualRoleAssignments.stdout}`,
    )
  }
} finally {
  operatorRaceHarness.cleanup()
}

const runtimeHarness = await createHarness()
try {
  assertPostgres17(runtimeHarness)
  applyFoundation(runtimeHarness)
  runtimeHarness.apply(migrationSql, { singleTransaction: true })
  runtimeHarness.apply(read(runtimeFixture))
} finally {
  runtimeHarness.cleanup()
}

const outputDirectory = mkdtempSync(
  '/tmp/pathforge-request-public-wire-',
)
try {
  run('npx', [
    'tsc',
    '--ignoreConfig',
    'src/lib/request-lifecycle.ts',
    'src/lib/request-service.ts',
    'src/lib/request-public-architecture.ts',
    'src/lib/request-public-service.ts',
    'test-fixtures/request-public-architecture/request-public-service-wire-test.ts',
    '--target',
    'ES2022',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--skipLibCheck',
    '--noEmit',
    'false',
    '--outDir',
    outputDirectory,
    '--rootDir',
    '.',
  ])
  run('node', [
    path.join(
      outputDirectory,
      'test-fixtures/request-public-architecture/request-public-service-wire-test.js',
    ),
  ])
} finally {
  rmSync(outputDirectory, { recursive: true, force: true })
}

console.log(
  'Request public architecture PostgreSQL 17 contract passed: atomic migration rollback, RPC/RLS authority, expiring readiness and roster gates, HMAC risk-limited attested intake, capacity, private reports, reauthorized notifications, dual-consent airlock publication, withdrawal, deidentification, retention, and compiled TypeScript wire contracts are green.',
)
