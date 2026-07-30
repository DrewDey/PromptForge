#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const fixtureRoot = 'test-fixtures/request-authority'

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: options.cwd ?? root,
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

const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')

function checkRequestServiceWire() {
  const outputDirectory = mkdtempSync('/tmp/pathforge-request-service-wire-')
  try {
    run('npx', [
      'tsc',
      '--ignoreConfig',
      'src/lib/request-lifecycle.ts',
      'src/lib/request-service.ts',
      `${fixtureRoot}/request-service-wire-test.ts`,
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
      path.join(outputDirectory, fixtureRoot, 'request-service-wire-test.js'),
    ])
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}

function checkRequestSqlParserBridge(payload) {
  const outputDirectory = mkdtempSync('/tmp/pathforge-request-sql-parser-')
  try {
    run('npx', [
      'tsc',
      '--ignoreConfig',
      'src/lib/request-lifecycle.ts',
      'src/lib/request-service.ts',
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
    const serviceModule = path.join(
      outputDirectory,
      'src/lib/request-service.js',
    )
    const bridgeScript = `
      const fs = require('node:fs');
      const service = require(${JSON.stringify(serviceModule)});
      const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
      service.parseRequestAvailabilityV1(payload.availability);
      let admin;
      try {
        admin = service.parseRequestCaseDetailResultV1(payload.adminDetail);
      } catch (error) {
        console.error('adminDetail=' + JSON.stringify(payload.adminDetail));
        throw error;
      }
      try {
        service.parseRequestAssignedQueuePageV1(payload.adminQueue);
      } catch (error) {
        console.error('adminQueue=' + JSON.stringify(payload.adminQueue));
        throw error;
      }
      service.parseRequestEventPageV1(payload.events);
      service.parseRequestEventPageV1(payload.eventFirstPage);
      service.parseRequestEventPageV1(payload.eventSecondPage);
      service.parseRequestDeliveryArtifactReaderResultV1(payload.reader);
      service.parseRequestPilotAdmissionCandidatePageV1(payload.admissions);
      service.parseRequestCaseDetailResultV1(payload.restrictedDetail);
      let requester;
      let secondAdmin;
      let triager;
      try {
        requester = service.parseRequestCaseDetailResultV1(payload.requesterDetail);
        secondAdmin = service.parseRequestCaseDetailResultV1(payload.secondAdminDetail);
        triager = service.parseRequestCaseDetailResultV1(payload.triagerDetail);
      } catch (error) {
        console.error('requesterDetail=' + JSON.stringify(payload.requesterDetail));
        console.error('secondAdminDetail=' + JSON.stringify(payload.secondAdminDetail));
        console.error('triagerDetail=' + JSON.stringify(payload.triagerDetail));
        throw error;
      }
      service.parseRequestEventPageV1(payload.reassignmentEvents);
      service.parseRequestCaseDetailResultV1(payload.removedDetail);
      service.parseRequestEventPageV1(payload.removedEvents);
      const terminalWip = service.parseRequestCaseDetailResultV1(
        payload.terminalWipDetail
      );
      const terminalWipEvents = service.parseRequestEventPageV1(
        payload.terminalWipEvents
      );
      if (
        requester.visibility !== 'full'
        || !requester.actor.roles.includes('requester')
        || requester.actor.operatorAuthority !== 'none'
        || secondAdmin.visibility !== 'full'
        || secondAdmin.actor.roles.length !== 0
        || secondAdmin.actor.operatorAuthority !== 'admin'
        || triager.visibility !== 'full'
        || !triager.actor.roles.includes('triager')
        || triager.actor.operatorAuthority !== 'admin'
      ) {
        throw new Error('PostgreSQL actor authority did not survive compiled parsing.');
      }
      if (
        admin.visibility !== 'full'
        || admin.requesterOutcomes.length !== 2
        || admin.requesterOutcomes.some(
          (outcome) =>
            outcome.acceptedBriefRevisionId !== admin.briefRevisionId
            || outcome.outcome !== 'failed_acceptance_check'
        )
        || admin.deliveryRevisions.some(
          (revision) => Object.hasOwn(revision, 'requesterOutcomes')
        )
      ) {
        throw new Error(
          'Requester outcomes did not survive as a separate accepted-brief-bound stream.',
        );
      }
      if (
        secondAdmin.actor.capabilities.includes('deidentify_account')
        || secondAdmin.nextActions.some(
          (action) => action.kind === 'deidentify_account'
        )
      ) {
        throw new Error('Detail projection exposed account deidentification as a case capability.');
      }
      if (
        payload.removedEvents.items.length !== 0
        || payload.removedEvents.nextCursor !== null
      ) {
        throw new Error('Removed participant event page was not exactly empty.');
      }
      const retirementEvent = terminalWipEvents.items.find(
        (event) => event.kind === 'delivery_revision_retired'
      );
      if (
        terminalWip.visibility !== 'full'
        || terminalWip.lifecycleState !== 'closed'
        || terminalWip.closeReason !== 'declined'
        || !retirementEvent
        || retirementEvent.actorRole !== 'system'
        || retirementEvent.actor !== null
        || retirementEvent.reason !== null
        || retirementEvent.reference !== null
      ) {
        throw new Error(
          'Terminal WIP detail or retirement event did not survive compiled parsing.',
        );
      }
      const parsedSnapshots = Object.fromEntries(
        Object.entries(payload.lifecycleSnapshots).map(
          ([kind, detail]) => [
            kind,
            service.parseRequestCaseDetailResultV1(detail),
          ],
        ),
      );
      for (const kind of ['retention_day89', 'retention_day91']) {
        const snapshot = parsedSnapshots[kind];
        const noticeKinds = snapshot?.notices.map((notice) => notice.kind);
        if (
          snapshot?.visibility !== 'full'
          || JSON.stringify(noticeKinds)
            !== JSON.stringify([
              'raw_content_retention',
              'audit_retention',
            ])
          || snapshot.notices.some((notice) => notice.effectiveUntil === null)
          || Date.parse(snapshot.notices[0].effectiveUntil)
            >= Date.parse(snapshot.notices[1].effectiveUntil)
        ) {
          throw new Error(
            'Split participant retention horizons drifted for ' + kind + '.',
          );
        }
      }
      if (
        !parsedSnapshots.retention_day91_hold.notices.some(
          (notice) => notice.kind === 'preservation_hold'
        )
        || !parsedSnapshots.retention_moderation_hold.notices.some(
          (notice) => notice.kind === 'moderation_hold'
        )
      ) {
        throw new Error('Retention-hold notice projection drifted.');
      }
      for (const [kind, lifecycleState, closeReasons, targetDate] of [
        ['triager_accepted', 'accepted', ['declined'], '2026-08-15'],
        ['triager_building', 'building', ['declined'], '2026-08-15'],
        ['triager_review_pending', 'review_pending', ['declined'], '2026-08-15'],
        ['triager_repair_required', 'repair_required', ['declined'], '2026-08-15'],
        ['triager_delivery_ready', 'delivery_ready', [], '2026-08-15'],
        ['triager_delivered', 'delivered', [], '2026-08-15'],
      ]) {
        const snapshot = parsedSnapshots[kind];
        if (
          !snapshot
          || snapshot.visibility !== 'full'
          || snapshot.lifecycleState !== lifecycleState
          || snapshot.targetDate !== targetDate
          || JSON.stringify(snapshot.actor.allowedCloseReasons)
            !== JSON.stringify(closeReasons)
        ) {
          throw new Error(
            'Triager lifecycle close-reason projection drifted for ' + kind + '.',
          );
        }
      }
      for (const [kind, lifecycleState] of [
        ['requester_submitted', 'submitted'],
        ['triager_triage', 'triage'],
      ]) {
        const snapshot = parsedSnapshots[kind];
        if (
          !snapshot
          || snapshot.visibility !== 'full'
          || snapshot.lifecycleState !== lifecycleState
          || snapshot.targetDate !== null
        ) {
          throw new Error(
            'Pre-acceptance target-date projection drifted for ' + kind + '.',
          );
        }
      }
      for (const invalidDetail of [
        { ...parsedSnapshots.requester_submitted, targetDate: '2026-08-15' },
        { ...parsedSnapshots.triager_accepted, targetDate: null },
        { ...parsedSnapshots.triager_accepted, targetDate: '2026-02-30' },
      ]) {
        let rejected = false;
        try {
          service.parseRequestCaseDetailResultV1(invalidDetail);
        } catch {
          rejected = true;
        }
        if (!rejected) {
          throw new Error('Invalid full-detail target-date contract was accepted.');
        }
      }
      for (const state of ['staging', 'prepared', 'sealed']) {
        const snapshot = parsedSnapshots['builder_' + state];
        if (
          !snapshot
          || !snapshot.actor.roles.includes('builder')
          || snapshot.builderWorkspace?.revisionState !== state
        ) {
          throw new Error(
            'Builder WIP projection drifted for ' + state + '.',
          );
        }
      }
      const reviewerSubmitted = parsedSnapshots.reviewer_submitted;
      const requesterReviewPending = parsedSnapshots.requester_review_pending;
      const reviewerReader =
        service.parseRequestDeliveryArtifactReaderResultV1(
          payload.readerSnapshots.reviewer_review_pending
        );
      const requesterReader =
        service.parseRequestDeliveryArtifactReaderResultV1(
          payload.readerSnapshots.requester_review_pending
        );
      if (
        !reviewerSubmitted
        || reviewerSubmitted.lifecycleState !== 'review_pending'
        || !reviewerSubmitted.actor.roles.includes('reviewer')
        || !reviewerSubmitted.deliveryRevisions.some(
          (revision) => revision.artifacts.some(
            (artifact) => typeof artifact.readerHref === 'string'
          )
        )
        || !requesterReviewPending
        || requesterReviewPending.deliveryRevisions.length !== 0
        || reviewerReader.status !== 'ready'
        || reviewerReader.artifact.deliveryStatus !== 'review_pending'
        || requesterReader.status !== 'unavailable'
        || requesterReader.reason !== 'not_found'
      ) {
        throw new Error('Review-pending reader authority projection drifted.');
      }
      const receiptApplication = service.createRequestApplicationService({
        async rpc() {
          return { data: payload.reassignmentReceipt, error: null };
        },
      });
      receiptApplication.executeCommand({
        contractVersion: 1,
        kind: 'reassign_triager',
        requestId: payload.reassignmentReceipt.request_id,
        expectedVersion: 1,
        idempotencyKey: 'parser-bridge-reassign-triager',
        payload: {
          triagerId: '89000000-0000-4000-8000-000000000003',
          reason: 'Compiled parser bridge.',
        },
      }).then((receipt) => {
        if (
          JSON.stringify(receipt.authorityResult) !== '{}'
          || JSON.stringify(payload.reassignmentReceipt.authority_result) !== '{}'
        ) {
          throw new Error(
            'Triager reassignment receipt exposed target identity authority.',
          );
        }
      }).catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `
    run('node', ['-e', bridgeScript], {
      input: JSON.stringify(payload),
    })
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}

function checkRequestAssignmentAttributionBridge(payload) {
  const outputDirectory = mkdtempSync('/tmp/pathforge-request-assignment-parser-')
  try {
    run('npx', [
      'tsc',
      '--ignoreConfig',
      'src/lib/request-lifecycle.ts',
      'src/lib/request-service.ts',
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
    const serviceModule = path.join(
      outputDirectory,
      'src/lib/request-service.js',
    )
    const bridgeScript = `
      const fs = require('node:fs');
      const service = require(${JSON.stringify(serviceModule)});
      const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
      const before = service.parseRequestCaseDetailResultV1(payload.before);
      const after = service.parseRequestCaseDetailResultV1(payload.after);
      const beforeAssignments = before.assignments;
      const afterAssignments = after.assignments;
      if (
        before.visibility !== 'full'
        || after.visibility !== 'full'
        || beforeAssignments.length !== 2
        || afterAssignments.length !== 2
        || beforeAssignments[0].assignee.displayName
          !== 'Existing Subject Fence Builder'
        || beforeAssignments[0].assignee.deidentified
        || beforeAssignments[1].assignee.displayName
          !== 'Subject Fence Target'
        || beforeAssignments[1].assignee.deidentified
        || afterAssignments[0].assignee.displayName !== 'Former participant'
        || !afterAssignments[0].assignee.deidentified
        || afterAssignments[1].assignee.displayName !== 'Subject Fence Target'
        || afterAssignments[1].assignee.deidentified
      ) {
        throw new Error(
          'Historical assignment attribution did not survive compiled parsing.',
        );
      }
    `
    run('node', ['-e', bridgeScript], {
      input: JSON.stringify(payload),
    })
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}

function checkRequestMaintenanceSqlBridge(payload) {
  const outputDirectory = mkdtempSync('/tmp/pathforge-request-maintenance-parser-')
  try {
    run('npx', [
      'tsc',
      '--ignoreConfig',
      'src/lib/request-lifecycle.ts',
      'src/lib/request-service.ts',
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
    const serviceModule = path.join(
      outputDirectory,
      'src/lib/request-service.js',
    )
    const bridgeScript = `
      const fs = require('node:fs');
      const service = require(${JSON.stringify(serviceModule)});
      const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
      const page = service.parseRequestMaintenanceWorkPageV1(payload);
      const categories = new Set(page.items.map((item) => item.category));
      for (const required of [
        'raw_text_purge',
        'artifact_cleanup',
        'audit_tombstone_expiry',
        'account_deidentification_receipt_expiry',
        'delivery_revision_retirement',
      ]) {
        if (!categories.has(required)) {
          throw new Error(
            'Real PostgreSQL maintenance page omitted ' + required + '.',
          );
        }
      }
    `
    run('node', ['-e', bridgeScript], {
      input: JSON.stringify(payload),
    })
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}

function findAuthorityMigration() {
  if (process.env.PATHFORGE_REQUEST_AUTHORITY_MIGRATION) {
    return process.env.PATHFORGE_REQUEST_AUTHORITY_MIGRATION
  }
  const directory = path.join(root, 'supabase/migrations')
  const matches = readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .filter((name) => {
      const sql = readFileSync(path.join(directory, name), 'utf8')
      return sql.includes('build_request_controls')
        && sql.includes('build_request_brief_revisions')
        && sql.includes('build_request_events')
    })
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one canonical request-authority migration; found ${matches.length}.`,
    )
  }
  return `supabase/migrations/${matches[0]}`
}

function localPostgresAvailable() {
  return ['initdb', 'pg_ctl', 'psql'].every((program) => (
    run(program, ['--version'], { allowFailure: true, timeout: 3000 }).status === 0
  ))
}

function createLocalHarness(databaseUser = 'postgres') {
  const temporaryDirectory = mkdtempSync('/tmp/pathforge-request-authority-')
  const dataDirectory = path.join(temporaryDirectory, 'data')
  const port = 57000 + Number.parseInt(randomUUID().slice(0, 4), 16) % 1000
  let started = false

  try {
    run('initdb', [
      '--pgdata',
      dataDirectory,
      '--username',
      databaseUser,
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

    const psqlArgs = [
      '--no-psqlrc',
      '--set',
      'ON_ERROR_STOP=1',
      '--host',
      temporaryDirectory,
      '--port',
      String(port),
      '--username',
      databaseUser,
      '--dbname',
      'postgres',
    ]

    return {
      databaseUrl:
        `postgresql://${databaseUser}:pathforge-fixture@127.0.0.1:${port}/postgres?sslmode=disable`,
      apply(sql, allowFailure = false) {
        return run('psql', psqlArgs, { input: sql, allowFailure })
      },
      applyConcurrently(sqlInputs) {
        return Promise.all(sqlInputs.map((sql) => new Promise((resolve) => {
          const child = spawn('psql', psqlArgs, {
            cwd: root,
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          let stdout = ''
          let stderr = ''
          child.stdout.setEncoding('utf8')
          child.stderr.setEncoding('utf8')
          child.stdout.on('data', (chunk) => { stdout += chunk })
          child.stderr.on('data', (chunk) => { stderr += chunk })
          const timeout = setTimeout(() => {
            child.kill('SIGKILL')
          }, 30_000)
          child.on('error', (error) => {
            clearTimeout(timeout)
            resolve({ status: null, stdout, stderr: `${stderr}\n${error.message}` })
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
      run('pg_ctl', ['--pgdata', dataDirectory, '--mode', 'fast', 'stop'], {
        allowFailure: true,
      })
    }
    rmSync(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
}

async function createDockerHarness(databaseUser = 'postgres') {
  const container = `pathforge-request-authority-${randomUUID().slice(0, 8)}`
  run('docker', ['version'], { timeout: 5000 })
  run('docker', [
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    `POSTGRES_PASSWORD=${randomUUID()}`,
    '--env',
    `POSTGRES_USER=${databaseUser}`,
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
      databaseUser,
      '--dbname',
      'postgres',
      '--command',
      'select 1',
    ], { allowFailure: true })
    if (initialized && probe.status === 0 && probe.stdout.trim() === '1') {
      const baseArgs = [
        'exec',
        '-i',
        container,
        'psql',
        '--no-psqlrc',
        '--set',
        'ON_ERROR_STOP=1',
        '--username',
        databaseUser,
        '--dbname',
        'postgres',
      ]
      return {
        apply(sql, allowFailure = false) {
          return run('docker', baseArgs, { input: sql, allowFailure })
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
            const timeout = setTimeout(() => {
              child.kill('SIGKILL')
            }, 30_000)
            child.on('error', (error) => {
              clearTimeout(timeout)
              resolve({ status: null, stdout, stderr: `${stderr}\n${error.message}` })
            })
            child.on('close', (status) => {
              clearTimeout(timeout)
              resolve({ status, stdout, stderr })
            })
            child.stdin.end(sql)
          })))
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

const migration = findAuthorityMigration()
const migrationSql = read(migration)
const preparationReplayMigration =
  'supabase/migrations/20260730093015_request_delivery_preparation_replay_binding_v1.sql'
const preparationReplayMigrationSql = read(preparationReplayMigration)
for (const [label, pattern] of [
  [
    'detail access ends at the 90-day boundary',
    /r\.terminal_at \+ INTERVAL '90 days' >\s*clock_timestamp\(\)/,
  ],
  [
    'participant resolver closes at the 90-day boundary',
    /clock_timestamp\(\) >= v_request\.terminal_at \+ INTERVAL '90 days'/,
  ],
  [
    'service reader object closes at the 90-day boundary',
    /clock_timestamp\(\) < r\.terminal_at \+ INTERVAL '90 days'/,
  ],
  [
    'maintenance enumeration starts at the 90-day boundary',
    /request_case\.terminal_at \+ INTERVAL '90 days' <= clock_timestamp\(\)/,
  ],
  [
    'cleanup claim starts at the 90-day boundary',
    /v_request\.terminal_at \+ INTERVAL '90 days' > v_now/,
  ],
]) {
  if (!pattern.test(migrationSql)) {
    throw new Error(`Request authority lost the exact ${label} contract.`)
  }
}
checkRequestServiceWire()
const normalizedMigration = migrationSql
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .toLowerCase()
const requestServiceSource = read('src/lib/request-service.ts')
const requestLifecycleSource = read('src/lib/request-lifecycle.ts')
const forbiddenGenericDeidentificationPatterns = [
  [/\belsif\s+p_command\s*=\s*'deidentify_account'/i, 'generic SQL command branch'],
  [/\bwhen\s+'deidentify_account'\b/i, 'generic SQL command mapping'],
  [/'deidentify_account'/i, 'application command key'],
]
for (const [pattern, description] of forbiddenGenericDeidentificationPatterns) {
  const source = description === 'application command key'
    ? `${requestServiceSource}\n${requestLifecycleSource}`
    : migrationSql
  if (pattern.test(source)) {
    throw new Error(
      `Account deidentification must not expose a ${description}; only the dedicated RPC is allowed.`,
    )
  }
}
if (
  /retired_account_identity_command/i.test(migrationSql)
  || /\bv_affected_(?:request_ids|request|event_id|command_id|sequence|idempotency_key)\b/i
    .test(migrationSql)
) {
  throw new Error(
    'Canonical command RPC retains a renamed account-identity command branch, mapping, or stale declaration.',
  )
}
if (
  /\b(?:request_hash|v_hash)\s*:=\s*encode\s*\(\s*public\.digest/i
    .test(migrationSql)
) {
  throw new Error(
    'Sensitive receipt request hashes must use the private HMAC helper, not plain SHA-256.',
  )
}
if (
  !normalizedMigration.includes(
    'public.deidentify_build_request_account_v1(',
  )
  || !normalizedMigration.includes("'account_deidentified'")
  || !requestLifecycleSource.includes("'account_deidentified'")
) {
  throw new Error(
    'Dedicated account deidentification RPC and account_deidentified event projection are required.',
  )
}
const preflightLock = normalizedMigration.search(
  /lock table public\.build_requests\s*,\s*public\.build_request_responses\s*,\s*public\.build_request_votes\s+in access exclusive mode/,
)
const preflightCounts = [
  normalizedMigration.search(/count\s*\(\s*\*\s*\)[\s\S]{0,240}public\.build_requests/),
  normalizedMigration.search(/count\s*\(\s*\*\s*\)[\s\S]{0,240}public\.build_request_responses/),
  normalizedMigration.search(/count\s*\(\s*\*\s*\)[\s\S]{0,240}public\.build_request_votes/),
]
const firstPermanentAuthorityDdl = normalizedMigration.search(
  /\b(?:create(?: or replace)? (?:table|type|function|view)|alter table|drop table|drop function) (?:public|private|storage)\./,
)
if (
  preflightLock < 0
  || preflightCounts.some((index) => index < preflightLock)
  || firstPermanentAuthorityDdl < 0
  || preflightLock > firstPermanentAuthorityDdl
) {
  throw new Error(
    'Migration must lock all three legacy tables in ACCESS EXCLUSIVE mode and count exact 0/0/0 before permanent authority DDL.',
  )
}
const createHarness = localPostgresAvailable()
  ? async () => createLocalHarness()
  : createDockerHarness
const createProductionHarness = localPostgresAvailable()
  ? async () => createLocalHarness('fixture_admin')
  : async () => createDockerHarness('fixture_admin')

function assertPostgres17(harness) {
  const result = harness.apply(
    "SELECT current_setting('server_version_num');",
  )
  const versionNumber = Number.parseInt(result.stdout.match(/\d{6}/)?.[0] ?? '', 10)
  if (
    !Number.isInteger(versionNumber)
    || versionNumber < 170000
    || versionNumber >= 180000
  ) {
    throw new Error(
      `Request authority tests require PostgreSQL 17; observed ${result.stdout.trim() || 'unknown'}.`,
    )
  }
}

const blockedHarness = await createHarness()
try {
  assertPostgres17(blockedHarness)
  blockedHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  blockedHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  const blocked = blockedHarness.apply(migrationSql, true)
  const output = `${blocked.stdout}\n${blocked.stderr}`
  if (
    blocked.status === 0
    || !output.includes(
      'Request authority requires legacy 0/0/0; observed 1/0/0.',
    )
  ) {
    throw new Error(
      'The canonical migration did not explicitly abort on the nonzero legacy fixture.',
    )
  }
  blockedHarness.apply(read(`${fixtureRoot}/verify-preflight-abort.sql`))
} finally {
  blockedHarness.cleanup()
}

const decoyHarness = await createHarness()
try {
  assertPostgres17(decoyHarness)
  decoyHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  decoyHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  decoyHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  decoyHarness.apply(read(`${fixtureRoot}/preflight-decoy-dependency.sql`))
  const decoyBlocked = decoyHarness.apply(migrationSql, true)
  if (
    decoyBlocked.status === 0
    || !/depend|build_request_decoy_dependency/i.test(
      `${decoyBlocked.stdout}\n${decoyBlocked.stderr}`,
    )
  ) {
    throw new Error(
      'Migration must abort rather than cascade through an unknown legacy dependency.\n'
      + `${decoyBlocked.stdout}\n${decoyBlocked.stderr}`,
    )
  }
  decoyHarness.apply(read(`${fixtureRoot}/verify-legacy-fingerprint.sql`))
} finally {
  decoyHarness.cleanup()
}

const storagePolicyHarness = await createHarness()
try {
  assertPostgres17(storagePolicyHarness)
  storagePolicyHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  storagePolicyHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  storagePolicyHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  storagePolicyHarness.apply(read(`${fixtureRoot}/preflight-storage-policy.sql`))
  const storagePolicyBlocked = storagePolicyHarness.apply(migrationSql, true)
  if (
    storagePolicyBlocked.status === 0
    || !/storage isolation preflight failed|storage\.objects.*row policy/is.test(
      `${storagePolicyBlocked.stdout}\n${storagePolicyBlocked.stderr}`,
    )
  ) {
    throw new Error(
      'Migration must abort on an unknown storage.objects policy.',
    )
  }
  storagePolicyHarness.apply(read(`${fixtureRoot}/verify-legacy-fingerprint.sql`))
} finally {
  storagePolicyHarness.cleanup()
}

const mixedFunctionProfileHarness = await createHarness()
try {
  assertPostgres17(mixedFunctionProfileHarness)
  mixedFunctionProfileHarness.apply(
    read(`${fixtureRoot}/migration-prerequisites.sql`),
  )
  mixedFunctionProfileHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  mixedFunctionProfileHarness.apply(
    read(`${fixtureRoot}/reset-preflight-to-zero.sql`),
  )
  mixedFunctionProfileHarness.apply(
    read(`${fixtureRoot}/preflight-function-search-path-public.sql`),
  )
  const mixedFunctionBlocked = mixedFunctionProfileHarness.apply(
    migrationSql,
    true,
  )
  if (
    mixedFunctionBlocked.status === 0
    || !/catalog fingerprint mismatch|function inventory/is.test(
      `${mixedFunctionBlocked.stdout}\n${mixedFunctionBlocked.stderr}`,
    )
  ) {
    throw new Error(
      'Canonical catalog mixed with production function definitions must abort.',
    )
  }
  mixedFunctionProfileHarness.apply(
    read(`${fixtureRoot}/verify-legacy-fingerprint.sql`),
  )
} finally {
  mixedFunctionProfileHarness.cleanup()
}

for (const hostileFunctionVariant of [
  {
    fixture: 'preflight-function-search-path-hostile.sql',
    label: 'multi-schema search_path',
  },
  {
    fixture: 'preflight-function-public-qualified-hostile.sql',
    label: 'public search_path with qualified body',
  },
  {
    fixture: 'preflight-function-empty-unqualified-hostile.sql',
    label: 'empty search_path with unqualified body',
  },
  {
    fixture: 'preflight-function-definition-hostile.sql',
    label: 'definition drift',
  },
  {
    fixture: 'preflight-function-security-hostile.sql',
    label: 'security-definer drift',
  },
  {
    fixture: 'preflight-function-grant-hostile.sql',
    label: 'execute-grant drift',
  },
  {
    fixture: 'preflight-function-default-acl-hostile.sql',
    label: 'default PUBLIC execute ACL',
  },
  {
    fixture: 'preflight-function-inherited-grant-hostile.sql',
    label: 'inherited execute-grant drift',
  },
  {
    fixture: 'preflight-function-owner-hostile.sql',
    label: 'function-owner drift',
  },
]) {
  const hostileFunctionHarness = await createHarness()
  try {
    assertPostgres17(hostileFunctionHarness)
    hostileFunctionHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
    hostileFunctionHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
    hostileFunctionHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
    hostileFunctionHarness.apply(
      read(`${fixtureRoot}/${hostileFunctionVariant.fixture}`),
    )
    const hostileBlocked = hostileFunctionHarness.apply(migrationSql, true)
    if (
      hostileBlocked.status === 0
      || !/catalog fingerprint mismatch|function inventory|non-owner execute grant/is
        .test(`${hostileBlocked.stdout}\n${hostileBlocked.stderr}`)
    ) {
      throw new Error(
        `Migration must abort on legacy trigger-function ${hostileFunctionVariant.label}.`,
      )
    }
    hostileFunctionHarness.apply(
      read(`${fixtureRoot}/verify-legacy-fingerprint.sql`),
    )
  } finally {
    hostileFunctionHarness.cleanup()
  }
}

const productionExactHarness = await createProductionHarness()
try {
  assertPostgres17(productionExactHarness)
  productionExactHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  productionExactHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  productionExactHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  productionExactHarness.apply(
    read(`${fixtureRoot}/preflight-production-exact-catalog.sql`),
  )
  productionExactHarness.apply(
    read(`${fixtureRoot}/preflight-function-search-path-public.sql`),
  )
  productionExactHarness.apply(migrationSql)
  productionExactHarness.apply(`
    DO $assert_production_exact_profile$
    BEGIN
      IF to_regclass('public.build_request_controls') IS NULL
        OR to_regprocedure(
          'public.submit_build_request_v1(integer,text,jsonb)'
        ) IS NULL THEN
        RAISE EXCEPTION
          'Production-exact legacy catalog did not migrate cleanly.';
      END IF;
    END;
    $assert_production_exact_profile$;
  `)
} finally {
  productionExactHarness.cleanup()
}

const productionRollbackHarness = await createProductionHarness()
try {
  assertPostgres17(productionRollbackHarness)
  productionRollbackHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  productionRollbackHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  productionRollbackHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  productionRollbackHarness.apply(
    read(`${fixtureRoot}/preflight-production-exact-catalog.sql`),
  )
  productionRollbackHarness.apply(
    read(`${fixtureRoot}/preflight-function-search-path-public.sql`),
  )
  productionRollbackHarness.apply(`
    BEGIN;
    ${migrationSql}
    DO $assert_production_profile_inside_transaction$
    BEGIN
      IF to_regclass('public.build_request_controls') IS NULL THEN
        RAISE EXCEPTION
          'Production-exact profile was not visible inside caller transaction.';
      END IF;
    END;
    $assert_production_profile_inside_transaction$;
    ROLLBACK;
  `)
  productionRollbackHarness.apply(
    read(`${fixtureRoot}/verify-legacy-fingerprint.sql`),
  )
} finally {
  productionRollbackHarness.cleanup()
}

for (const hostileCatalogVariant of [
  {
    fixture: 'preflight-storage-force-rls-hostile.sql',
    label: 'storage FORCE RLS drift',
    profile: 'production',
  },
  {
    fixture: 'preflight-storage-policy-hostile.sql',
    label: 'unexpected storage policy',
    profile: 'production',
  },
  {
    fixture: 'preflight-storage-grantable-hostile.sql',
    label: 'grantable storage ACL drift',
    profile: 'production',
  },
  {
    fixture: 'preflight-storage-unexpected-role-hostile.sql',
    label: 'unexpected storage ACL role',
    profile: 'production',
  },
  {
    fixture: 'preflight-role-bypass-hostile.sql',
    label: 'authenticated BYPASSRLS drift',
    profile: 'production',
  },
  {
    fixture: 'preflight-request-acl-mixed-hostile.sql',
    label: 'mixed Request table ACL profile',
    profile: 'canonical',
  },
  {
    fixture: 'preflight-policy-mixed-hostile.sql',
    label: 'mixed Request policy profile',
    profile: 'canonical',
  },
]) {
  const hostileCatalogHarness = hostileCatalogVariant.profile === 'production'
    ? await createProductionHarness()
    : await createHarness()
  try {
    assertPostgres17(hostileCatalogHarness)
    hostileCatalogHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
    hostileCatalogHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
    hostileCatalogHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
    if (hostileCatalogVariant.profile === 'production') {
      hostileCatalogHarness.apply(
        read(`${fixtureRoot}/preflight-production-exact-catalog.sql`),
      )
      hostileCatalogHarness.apply(
        read(`${fixtureRoot}/preflight-function-search-path-public.sql`),
      )
    }
    hostileCatalogHarness.apply(
      read(`${fixtureRoot}/${hostileCatalogVariant.fixture}`),
    )
    const hostileBlocked = hostileCatalogHarness.apply(migrationSql, true)
    if (
      hostileBlocked.status === 0
      || !/preflight failed|catalog fingerprint mismatch|inventory|drift/is
        .test(`${hostileBlocked.stdout}\n${hostileBlocked.stderr}`)
    ) {
      throw new Error(
        `Migration must abort on ${hostileCatalogVariant.label}.`,
      )
    }
    hostileCatalogHarness.apply(
      read(`${fixtureRoot}/verify-legacy-fingerprint.sql`),
    )
  } finally {
    hostileCatalogHarness.cleanup()
  }
}

const lateFailureHarness = await createHarness()
try {
  assertPostgres17(lateFailureHarness)
  lateFailureHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  lateFailureHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  lateFailureHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  const lateFailureSql = migrationSql.replace(
    /END;\s*\$request_authority_migration\$;\s*$/i,
    "RAISE EXCEPTION 'injected_late_failure';\nEND;\n$request_authority_migration$;\n",
  )
  if (lateFailureSql === migrationSql) {
    throw new Error('Could not inject the migration late-failure fixture.')
  }
  const lateFailure = lateFailureHarness.apply(lateFailureSql, true)
  if (
    lateFailure.status === 0
    || !`${lateFailure.stdout}\n${lateFailure.stderr}`.includes(
      'injected_late_failure',
    )
  ) {
    throw new Error(
      'Injected late migration failure did not abort explicitly.\n'
      + `${lateFailure.stdout}\n${lateFailure.stderr}`,
    )
  }
  lateFailureHarness.apply(read(`${fixtureRoot}/verify-legacy-fingerprint.sql`))
} finally {
  lateFailureHarness.cleanup()
}

const lockHarness = await createHarness()
try {
  assertPostgres17(lockHarness)
  lockHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  lockHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  lockHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  const delayedMigrationSql = migrationSql.replace(
    /IN ACCESS EXCLUSIVE MODE;/i,
    'IN ACCESS EXCLUSIVE MODE;\n  PERFORM pg_sleep(2);',
  )
  if (delayedMigrationSql === migrationSql) {
    throw new Error('Could not instrument the migration preflight lock.')
  }
  const legacyInsertSql = `
    SELECT pg_sleep(0.25);
    INSERT INTO public.build_requests (title, body, author_id)
    VALUES (
      'Blocked concurrent request',
      'This insert must not land after the verified zero-state replacement.',
      '81000000-0000-4000-8000-000000000001'
    );
  `
  const [migrationResult, insertResult] = await lockHarness.applyConcurrently([
    delayedMigrationSql,
    legacyInsertSql,
  ])
  if (
    migrationResult.status !== 0
    || insertResult.status === 0
    || !/column|relation|build_requests|permission/i.test(
      `${insertResult.stdout}\n${insertResult.stderr}`,
    )
  ) {
    throw new Error(
      `Concurrent legacy insert was not blocked through replacement.\n`
      + `migration=${migrationResult.status}\n${migrationResult.stderr}\n`
      + `insert=${insertResult.status}\n${insertResult.stderr}`,
    )
  }
  const finalCount = lockHarness.apply(
    'SELECT COUNT(*) AS request_count FROM public.build_requests;',
  )
  if (!/\b0\b/.test(finalCount.stdout)) {
    throw new Error('Concurrent legacy insert landed after authority replacement.')
  }
} finally {
  lockHarness.cleanup()
}

const wrappedHarness = await createHarness()
try {
  assertPostgres17(wrappedHarness)
  wrappedHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  wrappedHarness.apply(read(`${fixtureRoot}/preflight-nonzero.sql`))
  wrappedHarness.apply(read(`${fixtureRoot}/reset-preflight-to-zero.sql`))
  wrappedHarness.apply(`
    BEGIN;
    ${migrationSql}
    DO $assert_inside_transaction$
    BEGIN
      IF to_regclass('public.build_request_controls') IS NULL
        OR to_regprocedure(
          'public.submit_build_request_v1(integer,text,jsonb)'
        ) IS NULL THEN
        RAISE EXCEPTION 'Authority migration was not visible inside caller transaction.';
      END IF;
    END;
    $assert_inside_transaction$;
    ROLLBACK;
  `)
  wrappedHarness.apply(read(`${fixtureRoot}/verify-legacy-fingerprint.sql`))
} finally {
  wrappedHarness.cleanup()
}

const runtimeHarness = await createHarness()
try {
  assertPostgres17(runtimeHarness)
  runtimeHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  runtimeHarness.apply(migrationSql)
  runtimeHarness.apply(preparationReplayMigrationSql)
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-schema-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-grant-matrix-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-authority-test.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-null-hostile-contract.sql`))
  runtimeHarness.apply(
    read(`${fixtureRoot}/runtime-text-normalization-contract.sql`),
  )
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-account-deletion-contract.sql`))
  runtimeHarness.apply(
    read(`${fixtureRoot}/runtime-sensitive-receipt-hash-contract.sql`),
  )
  runtimeHarness.apply(
    read(`${fixtureRoot}/runtime-pseudonym-receipt-contract.sql`),
  )
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-restricted-summary-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-ledger-integrity-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-triager-accountability-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-terminal-wip-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-reader-retention-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-pagination-contract.sql`))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-admission-directory-contract.sql`))
  const bridgeOutput = runtimeHarness.apply(
    read(`${fixtureRoot}/runtime-sql-parser-bridge.sql`),
  )
  const bridgeJson = bridgeOutput.stdout
    .trim()
    .split(/\r?\n/)
    .findLast((line) => line.trim().startsWith('{'))
  if (!bridgeJson) {
    throw new Error('PostgreSQL parser bridge did not emit a JSON payload.')
  }
  checkRequestSqlParserBridge(JSON.parse(bridgeJson))
  runtimeHarness.apply(read(`${fixtureRoot}/runtime-unrelated-command-contract.sql`))
} finally {
  runtimeHarness.cleanup()
}

const closeReferenceHarness = await createHarness()
try {
  assertPostgres17(closeReferenceHarness)
  closeReferenceHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  closeReferenceHarness.apply(migrationSql)
  closeReferenceHarness.apply(
    read(`${fixtureRoot}/runtime-close-reference-test.sql`),
  )
} finally {
  closeReferenceHarness.cleanup()
}

const actorRoleHarness = await createHarness()
try {
  assertPostgres17(actorRoleHarness)
  actorRoleHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  actorRoleHarness.apply(migrationSql)
  actorRoleHarness.apply(
    read(`${fixtureRoot}/runtime-actor-role-precedence-contract.sql`),
  )
} finally {
  actorRoleHarness.cleanup()
}

const maintenanceHarness = await createHarness()
try {
  assertPostgres17(maintenanceHarness)
  maintenanceHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  maintenanceHarness.apply(migrationSql)
  maintenanceHarness.apply(preparationReplayMigrationSql)
  maintenanceHarness.apply(read(`${fixtureRoot}/runtime-authority-test.sql`))
  const maintenanceOutput = maintenanceHarness.apply(
    read(`${fixtureRoot}/runtime-maintenance-work-contract.sql`),
  )
  const maintenanceJson = maintenanceOutput.stdout
    .trim()
    .split(/\r?\n/)
    .findLast((line) => line.trim().startsWith('{'))
  if (!maintenanceJson) {
    throw new Error('PostgreSQL maintenance bridge did not emit JSON.')
  }
  checkRequestMaintenanceSqlBridge(JSON.parse(maintenanceJson))
} finally {
  maintenanceHarness.cleanup()
}

const cleanupClaimRaceHarness = await createHarness()
try {
  assertPostgres17(cleanupClaimRaceHarness)
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/migration-prerequisites.sql`),
  )
  cleanupClaimRaceHarness.apply(migrationSql)
  cleanupClaimRaceHarness.apply(preparationReplayMigrationSql)
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/runtime-authority-test.sql`),
  )
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-claim-race-setup.sql`),
  )
  const cleanupClaimRaceResults =
    await cleanupClaimRaceHarness.applyConcurrently([
      read(`${fixtureRoot}/cleanup-claim-race-claim.sql`),
      read(`${fixtureRoot}/cleanup-claim-race-hold.sql`),
    ])
  if (
    cleanupClaimRaceResults[0].status !== 0
    || cleanupClaimRaceResults[1].status === 0
    || !/moderation hold is not allowed/i.test(
      `${cleanupClaimRaceResults[1].stdout}\n`
      + cleanupClaimRaceResults[1].stderr,
    )
  ) {
    throw new Error(
      'Cleanup claim and moderation hold were not mutually exclusive.\n'
      + cleanupClaimRaceResults.map((result, index) => (
        `worker ${index + 1} status=${result.status}\n`
        + `${result.stdout}\n${result.stderr}`
      )).join('\n'),
    )
  }
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-claim-race-verify.sql`),
  )
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-lease-wait-setup.sql`),
  )
  const cleanupLeaseWaitResults =
    await cleanupClaimRaceHarness.applyConcurrently([
      read(`${fixtureRoot}/cleanup-lease-wait-lock.sql`),
      read(`${fixtureRoot}/cleanup-lease-wait-abort.sql`),
    ])
  if (
    cleanupLeaseWaitResults[0].status !== 0
    || cleanupLeaseWaitResults[1].status === 0
    || !/claim lease expired/i.test(
      `${cleanupLeaseWaitResults[1].stdout}\n`
      + cleanupLeaseWaitResults[1].stderr,
    )
  ) {
    throw new Error(
      'Cleanup abort authorized from a pre-lock lease timestamp.\n'
      + cleanupLeaseWaitResults.map((result, index) => (
        `worker ${index + 1} status=${result.status}\n`
        + `${result.stdout}\n${result.stderr}`
      )).join('\n'),
    )
  }
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-lease-wait-verify.sql`),
  )
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-claim-wait-setup.sql`),
  )
  const cleanupClaimWaitResults =
    await cleanupClaimRaceHarness.applyConcurrently([
      read(`${fixtureRoot}/cleanup-claim-wait-lock.sql`),
      read(`${fixtureRoot}/cleanup-claim-wait-takeover.sql`),
    ])
  if (
    cleanupClaimWaitResults[0].status !== 0
    || cleanupClaimWaitResults[1].status !== 0
  ) {
    throw new Error(
      'Cleanup claim did not refresh its clock after a blocking wait.\n'
      + cleanupClaimWaitResults.map((result, index) => (
        `worker ${index + 1} status=${result.status}\n`
        + `${result.stdout}\n${result.stderr}`
      )).join('\n'),
    )
  }
  cleanupClaimRaceHarness.apply(
    read(`${fixtureRoot}/cleanup-claim-wait-verify.sql`),
  )
} finally {
  cleanupClaimRaceHarness.cleanup()
}

const assignmentAttributionHarness = await createHarness()
try {
  assertPostgres17(assignmentAttributionHarness)
  assignmentAttributionHarness.apply(
    read(`${fixtureRoot}/migration-prerequisites.sql`),
  )
  assignmentAttributionHarness.apply(migrationSql)
  assignmentAttributionHarness.apply(
    read(`${fixtureRoot}/subject-fence-setup.sql`),
  )
  const assignmentOutput = assignmentAttributionHarness.apply(
    read(`${fixtureRoot}/runtime-assignment-attribution-contract.sql`),
  )
  const assignmentJson = assignmentOutput.stdout
    .trim()
    .split(/\r?\n/)
    .findLast((line) => line.trim().startsWith('{'))
  if (!assignmentJson) {
    throw new Error(
      'PostgreSQL assignment-attribution bridge did not emit JSON.',
    )
  }
  checkRequestAssignmentAttributionBridge(JSON.parse(assignmentJson))
} finally {
  assignmentAttributionHarness.cleanup()
}

const deidentifyPrefixHarness = await createHarness()
try {
  assertPostgres17(deidentifyPrefixHarness)
  deidentifyPrefixHarness.apply(
    read(`${fixtureRoot}/migration-prerequisites.sql`),
  )
  deidentifyPrefixHarness.apply(migrationSql)
  deidentifyPrefixHarness.apply(
    read(`${fixtureRoot}/runtime-deidentify-prefix-collision-contract.sql`),
  )
} finally {
  deidentifyPrefixHarness.cleanup()
}

const deidentifyHarness = await createHarness()
try {
  assertPostgres17(deidentifyHarness)
  deidentifyHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  deidentifyHarness.apply(migrationSql)
  deidentifyHarness.apply(preparationReplayMigrationSql)
  deidentifyHarness.apply(read(`${fixtureRoot}/runtime-authority-test.sql`))
  deidentifyHarness.apply(
    read(`${fixtureRoot}/runtime-deep-deidentify-contract.sql`),
  )
} finally {
  deidentifyHarness.cleanup()
}

for (const terminalMode of ['completed', 'no_response']) {
  const purgeHarness = await createHarness()
  try {
    assertPostgres17(purgeHarness)
    purgeHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
    purgeHarness.apply(migrationSql)
    purgeHarness.apply(preparationReplayMigrationSql)
    purgeHarness.apply(read(`${fixtureRoot}/runtime-authority-test.sql`))
    purgeHarness.apply(
      read(`${fixtureRoot}/runtime-raw-purge-contract.sql`)
        .replaceAll('__TERMINAL_MODE__', terminalMode),
    )
  } finally {
    purgeHarness.cleanup()
  }
}

const capacityHarness = await createHarness()
try {
  assertPostgres17(capacityHarness)
  capacityHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  capacityHarness.apply(migrationSql)
  capacityHarness.apply(read(`${fixtureRoot}/capacity-race-setup.sql`))
  const raceResults = await capacityHarness.applyConcurrently([
    read(`${fixtureRoot}/capacity-race-a.sql`),
    read(`${fixtureRoot}/capacity-race-b.sql`),
  ])
  const successes = raceResults.filter(({ status }) => status === 0)
  const failures = raceResults.filter(({ status }) => status !== 0)
  if (successes.length !== 1 || failures.length !== 1) {
    const detail = raceResults
      .map((result, index) => (
        `worker ${index + 1} status=${result.status}\n${result.stdout}\n${result.stderr}`
      ))
      .join('\n')
    throw new Error(
      `Capacity race must produce exactly one success and one rejection.\n${detail}`,
    )
  }
  if (!/capacity|four|4/i.test(`${failures[0].stdout}\n${failures[0].stderr}`)) {
    throw new Error('Capacity-race loser did not receive an explicit capacity error.')
  }
  capacityHarness.apply(read(`${fixtureRoot}/capacity-race-verify.sql`))
  console.log(
    `Request authority migration ${migration} passed in disposable PostgreSQL 17.`,
  )
} finally {
  capacityHarness.cleanup()
}

const subjectFenceHarness = await createHarness()
try {
  assertPostgres17(subjectFenceHarness)
  subjectFenceHarness.apply(read(`${fixtureRoot}/migration-prerequisites.sql`))
  subjectFenceHarness.apply(migrationSql)
  subjectFenceHarness.apply(read(`${fixtureRoot}/subject-fence-setup.sql`))
  const subjectFenceResults = await subjectFenceHarness.applyConcurrently([
    read(`${fixtureRoot}/subject-fence-deidentify.sql`),
    read(`${fixtureRoot}/subject-fence-submit.sql`),
    read(`${fixtureRoot}/subject-fence-accept.sql`),
    read(`${fixtureRoot}/subject-fence-reassign-builder.sql`),
    read(`${fixtureRoot}/subject-fence-reassign-triager.sql`),
    read(`${fixtureRoot}/subject-fence-admission.sql`),
    read(`${fixtureRoot}/subject-fence-stage.sql`),
    read(`${fixtureRoot}/subject-fence-controls-actor.sql`),
    read(`${fixtureRoot}/subject-fence-admission-actor.sql`),
    read(`${fixtureRoot}/subject-fence-ack-actor.sql`),
  ])
  const [deidentificationResult, ...fencedResults] = subjectFenceResults
  if (
    deidentificationResult.status !== 0
    || fencedResults.some(({ status }) => status === 0)
  ) {
    const detail = subjectFenceResults
      .map((result, index) => (
        `worker ${index + 1} status=${result.status}\n`
        + `${result.stdout}\n${result.stderr}`
      ))
      .join('\n')
    throw new Error(
      'Subject fence must allow only deidentification and reject every '
      + `concurrent subject-scoped mutation.\n${detail}`,
    )
  }
  for (const result of fencedResults) {
    if (
      !/not admitted|not available|no longer available|not allowed|not found|invalid|stale/i.test(
        `${result.stdout}\n${result.stderr}`,
      )
    ) {
      throw new Error(
        'Subject-fence loser did not receive a fail-closed authority error.\n'
        + `${result.stdout}\n${result.stderr}`,
      )
    }
  }
  subjectFenceHarness.apply(
    read(`${fixtureRoot}/subject-fence-verify.sql`),
  )
} finally {
  subjectFenceHarness.cleanup()
}

const subjectFenceStageFirstHarness = await createHarness()
try {
  assertPostgres17(subjectFenceStageFirstHarness)
  subjectFenceStageFirstHarness.apply(
    read(`${fixtureRoot}/migration-prerequisites.sql`),
  )
  subjectFenceStageFirstHarness.apply(migrationSql)
  subjectFenceStageFirstHarness.apply(
    read(`${fixtureRoot}/subject-fence-setup.sql`),
  )
  subjectFenceStageFirstHarness.apply(
    read(`${fixtureRoot}/subject-fence-stage-first.sql`),
  )
} finally {
  subjectFenceStageFirstHarness.cleanup()
}

if (localPostgresAvailable()) {
  const cliHarness = await createHarness()
  const cliWorkspace = mkdtempSync('/tmp/pathforge-request-authority-supabase-cli-')
  try {
    assertPostgres17(cliHarness)
    const migrationDirectory = path.join(cliWorkspace, 'supabase', 'migrations')
    mkdirSync(migrationDirectory, { recursive: true })
    writeFileSync(
      path.join(
        migrationDirectory,
        '20260730040818_request_authority_prerequisites.sql',
      ),
      read(`${fixtureRoot}/migration-prerequisites.sql`).replace(
        /^\\set[^\n]*$/gm,
        '',
      ),
    )
    writeFileSync(
      path.join(migrationDirectory, path.basename(migration)),
      migrationSql,
    )
    run(
      'npx',
      [
        '--yes',
        'supabase@2.110.0',
        'db',
        'push',
        '--db-url',
        cliHarness.databaseUrl,
        '--include-all',
        '--yes',
      ],
      { cwd: cliWorkspace, timeout: 120_000 },
    )
    cliHarness.apply(`
      DO $supabase_cli_runner$
      BEGIN
        IF to_regclass('public.build_request_controls') IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM supabase_migrations.schema_migrations
            WHERE version = '${path.basename(migration).slice(0, 14)}'
          ) THEN
          RAISE EXCEPTION 'Supabase CLI db push did not atomically record the authority migration.';
        END IF;
      END;
      $supabase_cli_runner$;
    `)
  } finally {
    cliHarness.cleanup()
    rmSync(cliWorkspace, { recursive: true, force: true })
  }
}
