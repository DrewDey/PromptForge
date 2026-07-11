import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertManifestAppendLineage,
  preserveExistingReleaseDefault,
  resolveAppendReleaseLineage,
} from './project-model-variant-lineage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const launchIds = ['launch-openai', 'launch-anthropic', 'launch-google']

function manifestRun({
  sourceRunId,
  providerKey,
  capturedAt,
  isCurrent,
  runRole = 'comparison-run',
  supersedesSourceRunId,
}) {
  return {
    sourceRunId,
    providerKey,
    capturedAt,
    isCurrent,
    runRole,
    ...(supersedesSourceRunId ? { supersedesSourceRunId } : {}),
  }
}

function launchManifest() {
  return [
    manifestRun({
      sourceRunId: 'launch-openai',
      providerKey: 'openai',
      capturedAt: '2026-07-10T10:00:00Z',
      isCurrent: false,
      runRole: 'historical-baseline',
    }),
    manifestRun({
      sourceRunId: 'launch-anthropic',
      providerKey: 'anthropic',
      capturedAt: '2026-07-10T11:00:00Z',
      isCurrent: true,
    }),
    manifestRun({
      sourceRunId: 'launch-google',
      providerKey: 'google',
      capturedAt: '2026-07-10T12:00:00Z',
      isCurrent: true,
    }),
  ]
}

function expectFailure(callback, pattern) {
  assert.throws(callback, pattern)
}

assert.doesNotThrow(() =>
  assertManifestAppendLineage({
    variants: launchManifest(),
    launchSourceRunIds: launchIds,
    label: 'initial launch',
  }),
)

const validAppend = [
  ...launchManifest(),
  manifestRun({
    sourceRunId: 'openai-v2',
    providerKey: 'openai',
    capturedAt: '2026-08-01T10:00:00Z',
    isCurrent: true,
    supersedesSourceRunId: 'launch-openai',
  }),
]
assert.doesNotThrow(() =>
  assertManifestAppendLineage({
    variants: validAppend,
    launchSourceRunIds: launchIds,
    label: 'valid append',
  }),
)

expectFailure(
  () =>
    assertManifestAppendLineage({
      variants: validAppend.map((variant) =>
        variant.sourceRunId === 'openai-v2'
          ? { ...variant, supersedesSourceRunId: undefined }
          : variant,
      ),
      launchSourceRunIds: launchIds,
      label: 'missing lineage',
    }),
  /must supersede immediately prior/,
)

const validTwoStepAppend = [
  ...launchManifest(),
  manifestRun({
    sourceRunId: 'openai-v2',
    providerKey: 'openai',
    capturedAt: '2026-08-01T10:00:00Z',
    isCurrent: false,
    supersedesSourceRunId: 'launch-openai',
  }),
  manifestRun({
    sourceRunId: 'openai-v3',
    providerKey: 'openai',
    capturedAt: '2026-09-01T10:00:00Z',
    isCurrent: true,
    supersedesSourceRunId: 'openai-v2',
  }),
]
assert.doesNotThrow(() =>
  assertManifestAppendLineage({
    variants: validTwoStepAppend,
    launchSourceRunIds: launchIds,
    label: 'valid two-step append',
  }),
)
expectFailure(
  () =>
    assertManifestAppendLineage({
      variants: validTwoStepAppend.map((variant) =>
        variant.sourceRunId === 'openai-v3'
          ? { ...variant, supersedesSourceRunId: 'launch-openai' }
          : variant,
      ),
      launchSourceRunIds: launchIds,
      label: 'skipped predecessor',
    }),
  /must supersede immediately prior/,
)
expectFailure(
  () =>
    assertManifestAppendLineage({
      variants: validAppend.map((variant) =>
        variant.sourceRunId === 'launch-openai'
          ? { ...variant, isCurrent: true }
          : variant,
      ),
      launchSourceRunIds: launchIds,
      label: 'prior still current',
    }),
  /must be demoted/,
)

function databaseRow({
  id,
  sourceRunId,
  providerKey = 'openai',
  createdAt,
  runFinishedAt,
  isCurrent,
  isDefault = false,
  supersedesVariantId = null,
}) {
  return {
    id,
    source_run_id: sourceRunId,
    provider_key: providerKey,
    created_at: createdAt,
    run_finished_at: runFinishedAt,
    is_current: isCurrent,
    is_default: isDefault,
    supersedes_variant_id: supersedesVariantId,
  }
}

function releaseRow({
  sourceRunId,
  providerKey = 'openai',
  runFinishedAt,
  isCurrent,
  isDefault = false,
  supersedesSourceRunId = null,
}) {
  return {
    source_run_id: sourceRunId,
    provider_key: providerKey,
    run_finished_at: runFinishedAt,
    is_current: isCurrent,
    is_default: isDefault,
    status: 'published',
    quality_status: 'verified',
    supersedes_variant_id: null,
    _supersedesSourceRunId: supersedesSourceRunId,
  }
}

const launchDatabaseRow = databaseRow({
  id: '00000000-0000-0000-0000-000000000001',
  sourceRunId: 'launch-openai',
  createdAt: '2026-07-10T10:01:00Z',
  runFinishedAt: '2026-07-10T10:00:00Z',
  isCurrent: true,
  isDefault: true,
})
const appendRows = [
  releaseRow({
    sourceRunId: 'launch-openai',
    runFinishedAt: '2026-07-10T10:00:00Z',
    isCurrent: false,
  }),
  releaseRow({
    sourceRunId: 'openai-v2',
    runFinishedAt: '2026-08-01T10:00:00Z',
    isCurrent: true,
    isDefault: true,
    supersedesSourceRunId: 'launch-openai',
  }),
]
const replayWithDifferentManifestDefault = preserveExistingReleaseDefault({
  rows: [
    releaseRow({
      sourceRunId: 'launch-openai',
      runFinishedAt: '2026-07-10T10:00:00Z',
      isCurrent: true,
      isDefault: false,
    }),
    releaseRow({
      sourceRunId: 'launch-google',
      providerKey: 'google',
      runFinishedAt: '2026-07-10T12:00:00Z',
      isCurrent: true,
      isDefault: true,
    }),
  ],
  existingRows: [launchDatabaseRow],
  label: 'preserve selected default',
})
assert.equal(
  replayWithDifferentManifestDefault.find((row) => row.is_default)?.source_run_id,
  'launch-openai',
)

const appendWithInheritedDefault = preserveExistingReleaseDefault({
  rows: appendRows,
  existingRows: [launchDatabaseRow],
  label: 'inherit selected provider default',
})
assert.equal(
  appendWithInheritedDefault.find((row) => row.is_default)?.source_run_id,
  'openai-v2',
)

const resolved = resolveAppendReleaseLineage({
  rows: appendWithInheritedDefault,
  existingRows: [launchDatabaseRow],
  label: 'valid database append',
})
assert.equal(
  resolved.find((row) => row.source_run_id === 'openai-v2')?.supersedes_variant_id,
  launchDatabaseRow.id,
)

expectFailure(
  () =>
    resolveAppendReleaseLineage({
      rows: appendRows.map((row) =>
        row.source_run_id === 'launch-openai'
          ? { ...row, is_current: true }
          : row,
      ),
      existingRows: [launchDatabaseRow],
      label: 'missing atomic demotion',
    }),
  /atomically demoted/,
)

const secondDatabaseRow = databaseRow({
  id: '00000000-0000-0000-0000-000000000002',
  sourceRunId: 'openai-v2',
  createdAt: '2026-08-01T10:01:00Z',
  runFinishedAt: '2026-08-01T10:00:00Z',
  isCurrent: true,
  supersedesVariantId: launchDatabaseRow.id,
})
expectFailure(
  () =>
    resolveAppendReleaseLineage({
      rows: [
        releaseRow({
          sourceRunId: 'launch-openai',
          runFinishedAt: '2026-07-10T10:00:00Z',
          isCurrent: false,
        }),
        releaseRow({
          sourceRunId: 'openai-v2',
          runFinishedAt: '2026-08-01T10:00:00Z',
          isCurrent: false,
          supersedesSourceRunId: 'launch-openai',
        }),
        releaseRow({
          sourceRunId: 'openai-v3',
          runFinishedAt: '2026-09-01T10:00:00Z',
          isCurrent: true,
          supersedesSourceRunId: 'launch-openai',
        }),
      ],
      existingRows: [
        { ...launchDatabaseRow, is_current: false },
        secondDatabaseRow,
      ],
      label: 'database skipped predecessor',
    }),
  /must supersede immediately prior/,
)

expectFailure(
  () =>
    resolveAppendReleaseLineage({
      rows: [
        ...appendRows,
        releaseRow({
          sourceRunId: 'openai-v3',
          runFinishedAt: '2026-09-01T10:00:00Z',
          isCurrent: true,
          supersedesSourceRunId: 'openai-v2',
        }),
      ],
      existingRows: [launchDatabaseRow],
      label: 'two new provider runs',
    }),
  /at most one new openai run/,
)

for (const sqlPath of ['supabase/project-model-variants.sql', 'supabase/schema.sql']) {
  const sql = readFileSync(path.join(root, sqlPath), 'utf8')
  for (const required of [
    'idx_project_model_variants_one_successor',
    'must supersede the immediately prior same-provider release',
    'must be demoted in the same atomic release',
    'Release at most one new run per provider',
  ]) {
    assert(sql.includes(required), `${sqlPath} is missing lineage guard: ${required}`)
  }
}

const releaseSource = readFileSync(
  path.join(root, 'scripts/release-project-model-variants.mjs'),
  'utf8',
)
assert(releaseSource.includes('resolveAppendReleaseLineage'))
assert(releaseSource.includes("['id', 'created_at', ...RELEASE_FIELDS]"))

const cohortSource = readFileSync(
  path.join(root, 'scripts/check-project-model-variant-cohort.mjs'),
  'utf8',
)
assert(cohortSource.includes('assertManifestAppendLineage'))

console.log('Project model-variant append-lineage guard passed.')
