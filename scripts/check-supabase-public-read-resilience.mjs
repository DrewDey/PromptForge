#!/usr/bin/env node

import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createPublicCatalogSingleFlight } from '../src/lib/public-catalog-single-flight.mjs'

globalThis.AsyncLocalStorage ??= AsyncLocalStorage
const require = createRequire(import.meta.url)
const { unstable_cache: unstableCache } = require('next/cache')
const {
  IncrementalCache,
} = require('next/dist/server/lib/incremental-cache/index')
const {
  workAsyncStorage,
} = require('next/dist/server/app-render/work-async-storage.external')
const {
  workUnitAsyncStorage,
} = require('next/dist/server/app-render/work-unit-async-storage.external')
const {
  getImplicitTags,
} = require('next/dist/server/lib/implicit-tags')
const {
  revalidatePath,
  revalidateTag,
} = require('next/dist/server/web/spec-extension/revalidate')
const {
  executeRevalidates,
} = require('next/dist/server/revalidation-utils')
const {
  tagsManifest,
} = require('next/dist/server/lib/incremental-cache/tags-manifest.external')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')

const shared = read('src/lib/data/shared.ts')
const server = read('src/lib/supabase/server.ts')
const promptStepCounts = read('src/lib/data/public-prompt-step-counts.ts')
const publicCatalogCache = read('src/lib/public-catalog-cache.ts')
const publicCatalogSingleFlight = read('src/lib/public-catalog-single-flight.mjs')
const catalogConsumers = [
  ['src/app/page.tsx', read('src/app/page.tsx'), ['getCachedPublicCategories', 'getCachedPublicPrompts']],
  [
    'src/app/qa/path-card-concepts/page.tsx',
    read('src/app/qa/path-card-concepts/page.tsx'),
    ['getCachedPublicCategories', 'getCachedPublicPrompts'],
  ],
  [
    'src/app/what-to-build/page.tsx',
    read('src/app/what-to-build/page.tsx'),
    ['getCachedPublicPrompts'],
  ],
  [
    'src/components/discovery/BuildPathsDiscovery.tsx',
    read('src/components/discovery/BuildPathsDiscovery.tsx'),
    ['getCachedPublicCategories', 'getCachedPublicPrompts'],
  ],
  [
    'src/app/prompt/[id]/page.tsx',
    read('src/app/prompt/[id]/page.tsx'),
    ['getCachedPublicPrompts'],
  ],
]
const catalogMutators = [
  [
    'src/lib/actions.ts',
    read('src/lib/actions.ts'),
    ['approvePrompt', 'rejectPrompt', 'publishPreparedShowcaseSourceRun'],
  ],
  [
    'src/lib/community-project-actions.ts',
    read('src/lib/community-project-actions.ts'),
    ['publishCommunityProject', 'withdrawCommunityProject', 'removeCommunityProjectAsAdmin'],
  ],
  [
    'src/app/api/cron/community-project-reconcile/route.ts',
    read('src/app/api/cron/community-project-reconcile/route.ts'),
    ['GET'],
  ],
]
const dataSources = [
  ['src/lib/data.ts', read('src/lib/data.ts')],
  ['src/lib/data/public-profiles.ts', read('src/lib/data/public-profiles.ts')],
  ['src/lib/data/community-projects.ts', read('src/lib/data/community-projects.ts')],
  ['src/lib/public-catalog-cache.ts', publicCatalogCache],
]
const packageJson = read('package.json')

const runSingleFlight = createPublicCatalogSingleFlight()
let sharedExecutions = 0
const sharedResults = await Promise.all(
  Array.from({ length: 20 }, () => runSingleFlight('shared', async () => {
    sharedExecutions += 1
    await new Promise((resolve) => setTimeout(resolve, 10))
    return 'shared-result'
  })),
)
assert.equal(sharedExecutions, 1, '20 same-key cold reads must execute one cache fill per process.')
assert.deepEqual(
  [...new Set(sharedResults)],
  ['shared-result'],
  'same-key callers must share the successful result',
)
let retryExecutions = 0
await assert.rejects(
  () => runSingleFlight('retryable', async () => {
    retryExecutions += 1
    throw new Error('expected failure')
  }),
  /expected failure/,
)
assert.equal(
  await runSingleFlight('retryable', async () => {
    retryExecutions += 1
    return 'recovered'
  }),
  'recovered',
  'a rejected fill must release its key for the next request',
)
assert.equal(retryExecutions, 2)

class RuntimeProbeCacheHandler {
  constructor() {
    this.entries = new Map()
  }

  async get(key) {
    return this.entries.get(key) ?? null
  }

  async set(key, value) {
    this.entries.set(key, { value, lastModified: Date.now() })
  }

  async revalidateTag(tags) {
    const invalidatedAt = Date.now()
    for (const tag of Array.isArray(tags) ? tags : [tags]) {
      tagsManifest.set(tag, {
        ...(tagsManifest.get(tag) ?? {}),
        expired: invalidatedAt,
      })
    }
  }

  resetRequestCache() {}
}

function runtimeProbeWorkStore(incrementalCache) {
  return {
    page: '/prompt/[id]/page',
    route: '/prompt/[id]',
    incrementalCache,
    fetchCache: undefined,
    isOnDemandRevalidate: false,
    isDraftMode: false,
    isStaticGeneration: false,
    nextFetchId: 1,
    pendingRevalidatedTags: [],
    pendingRevalidates: {},
    pendingRevalidateWrites: [],
  }
}

async function runNextSoftTagRuntimeProbe() {
  const routePath = '/prompt/pathforge-cache-runtime-probe'
  const implicitTags = await getImplicitTags(
    '/prompt/[id]/page',
    routePath,
    null,
  )
  const incrementalCache = new IncrementalCache({
    fs: undefined,
    dev: false,
    flushToDisk: false,
    minimalMode: false,
    serverDistDir: undefined,
    requestHeaders: {},
    maxMemoryCacheSize: 0,
    fetchCacheKeyPrefix: '',
    CurCacheHandler: RuntimeProbeCacheHandler,
    allowedRevalidateHeaderKeys: [],
    getPrerenderManifest: () => ({
      version: 4,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: {
        previewModeId: 'runtime-probe',
        previewModeSigningKey: 'runtime-probe',
        previewModeEncryptionKey: 'runtime-probe',
      },
    }),
  })
  let executions = 0
  const cachedRead = unstableCache(
    async () => {
      executions += 1
      return executions
    },
    ['pathforge-public-catalog-soft-tag-runtime-probe'],
    { revalidate: 300, tags: ['pathforge-public-catalog-runtime-probe'] },
  )
  const renderUnitStore = {
    type: 'request',
    phase: 'render',
    implicitTags,
    url: new URL(`https://pathforge.test${routePath}`),
  }

  async function render() {
    const store = runtimeProbeWorkStore(incrementalCache)
    const value = await workAsyncStorage.run(
      store,
      () => workUnitAsyncStorage.run(renderUnitStore, cachedRead),
    )
    await executeRevalidates(store)
    return value
  }

  assert.equal(await render(), 1, 'the runtime probe must execute its cold cache fill')
  assert.equal(await render(), 1, 'the runtime probe must reuse its warm soft-tagged entry')
  assert.equal(executions, 1)

  await new Promise((resolve) => setTimeout(resolve, 5))
  const actionStore = runtimeProbeWorkStore(incrementalCache)
  await workAsyncStorage.run(
    actionStore,
    () => workUnitAsyncStorage.run(
      { ...renderUnitStore, phase: 'action' },
      async () => {
        revalidatePath(routePath)
        await executeRevalidates(actionStore)
      },
    ),
  )

  assert.equal(
    await render(),
    2,
    'Next prompt-path revalidation must be treated as a catalog-cache eviction hazard',
  )
  assert.equal(executions, 2)

  for (const tag of implicitTags.tags) tagsManifest.delete(tag)
  tagsManifest.delete('pathforge-public-catalog-runtime-probe')
}

await runNextSoftTagRuntimeProbe()

async function runNextCatalogRevisionRaceProbe() {
  const routePath = '/paths'
  const runtimeTag = 'pathforge-public-catalog-revision-race-runtime-probe'
  const implicitTags = await getImplicitTags(
    '/paths/page',
    routePath,
    null,
  )
  const incrementalCache = new IncrementalCache({
    fs: undefined,
    dev: false,
    flushToDisk: false,
    minimalMode: false,
    serverDistDir: undefined,
    requestHeaders: {},
    maxMemoryCacheSize: 0,
    fetchCacheKeyPrefix: '',
    CurCacheHandler: RuntimeProbeCacheHandler,
    allowedRevalidateHeaderKeys: [],
    getPrerenderManifest: () => ({
      version: 4,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: {
        previewModeId: 'revision-race-probe',
        previewModeSigningKey: 'revision-race-probe',
        previewModeEncryptionKey: 'revision-race-probe',
      },
    }),
  })
  let executions = 0
  let releaseOldFill
  let markOldFillStarted
  const oldFillStarted = new Promise((resolve) => {
    markOldFillStarted = resolve
  })
  const oldFillGate = new Promise((resolve) => {
    releaseOldFill = resolve
  })
  const cachedRead = unstableCache(
    async (catalogRevision) => {
      const execution = ++executions
      if (catalogRevision === '1') {
        markOldFillStarted()
        await oldFillGate
      }
      return `revision-${catalogRevision}-execution-${execution}`
    },
    ['pathforge-public-catalog-revision-race-runtime-probe'],
    { revalidate: 300, tags: [runtimeTag] },
  )
  const renderUnitStore = {
    type: 'request',
    phase: 'render',
    implicitTags,
    url: new URL(`https://pathforge.test${routePath}`),
  }

  async function render(catalogRevision) {
    const store = runtimeProbeWorkStore(incrementalCache)
    const value = await workAsyncStorage.run(
      store,
      () => workUnitAsyncStorage.run(
        renderUnitStore,
        () => cachedRead(catalogRevision),
      ),
    )
    await executeRevalidates(store)
    return value
  }

  const oldFill = render('1')
  await oldFillStarted
  await new Promise((resolve) => setTimeout(resolve, 5))

  const actionStore = runtimeProbeWorkStore(incrementalCache)
  await workAsyncStorage.run(
    actionStore,
    () => workUnitAsyncStorage.run(
      { ...renderUnitStore, phase: 'action' },
      async () => {
        revalidateTag(runtimeTag, { expire: 0 })
        await executeRevalidates(actionStore)
      },
    ),
  )

  await new Promise((resolve) => setTimeout(resolve, 5))
  releaseOldFill()
  const oldValue = await oldFill
  assert.equal(
    oldValue,
    'revision-1-execution-1',
    'the old catalog fill must complete after invalidation for this race probe',
  )
  assert.equal(
    await render('1'),
    oldValue,
    'the runtime probe must reproduce the late old-key cache write',
  )
  assert.equal(
    await render('2'),
    'revision-2-execution-2',
    'the durable revision must force the post-mutation read onto a fresh cache key',
  )
  assert.equal(
    await render('2'),
    'revision-2-execution-2',
    'the new revision must remain warm after its first fill',
  )
  assert.equal(executions, 2)

  for (const tag of implicitTags.tags) tagsManifest.delete(tag)
  tagsManifest.delete(runtimeTag)
}

await runNextCatalogRevisionRaceProbe()

assert.match(
  shared,
  /read: \(signal: AbortSignal\) => Promise<T>/,
  'fallback reads must receive an AbortSignal',
)
assert.match(shared, /const controller = new AbortController\(\)/)
assert.match(
  shared,
  /setTimeout\(\(\) => \{\s*resolve\(fallback\)\s*controller\.abort\(\)/,
  'the fallback deadline must return fallback data and abort the live read in the same tick',
)
assert.match(
  shared,
  /finally \{\s*if \(timeout\) clearTimeout\(timeout\)/,
  'fast reads must clear the fallback timer',
)

assert.match(
  server,
  /export async function createPublicReadClient\(\s*options: \{ anonymous\?: boolean \} = \{\},?\s*\)/,
  'the public-read client must support a cookie-free anonymous mode for shared cache entries',
)
assert.match(
  server,
  /if \(options\.anonymous\) \{[\s\S]*?createSupabaseClient\([\s\S]*?NEXT_PUBLIC_SUPABASE_URL[\s\S]*?NEXT_PUBLIC_SUPABASE_ANON_KEY[\s\S]*?persistSession: false/,
  'anonymous public reads must use the anon key without browser session persistence',
)
assert.match(
  server,
  /every query issued through this scoped client is guarded with retry\(false\)/,
  'the public-read client must document the installed SDK retry boundary',
)
assert.match(
  server,
  /export async function createClient\(\) \{\s*return createCookieBackedClient\(\)\s*\}/,
  'the auth/write client must retain its existing default retry behavior',
)

function functionBody(sourceFile, name) {
  let body = null
  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      body = node.body.getText(sourceFile)
    }
  })
  assert.ok(body, `expected ${name} function body`)
  return body
}

let fallbackReadCount = 0
let abortSignalCount = 0
let explicitlyInspectedErrorCount = 0
for (const [fileName, source] of dataSources) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'readWithFallback'
    ) {
      fallbackReadCount += 1
      const callback = node.arguments[1]
      assert.ok(
        callback && ts.isArrowFunction(callback),
        `${fileName}: fallback read must use an arrow-function callback`,
      )
      assert.equal(
        callback.parameters[0]?.name.getText(sourceFile),
        'signal',
        `${fileName}: fallback read must accept the shared abort signal`,
      )

      const callbackSource = callback.body.getText(sourceFile)
      assert.match(
        callbackSource,
        /createPublicReadClient\((?:\{\s*anonymous:\s*true\s*\})?\)/,
        `${fileName}: fallback read must use the scoped public-read client`,
      )
      const callbackAbortCount = (callbackSource.match(/\.abortSignal\(signal\)/g) ?? []).length
      const callbackRetryCount = (callbackSource.match(/\.retry\(false\)/g) ?? []).length
      const callbackThrowCount = (callbackSource.match(/\.throwOnError\(\)/g) ?? []).length
      const inspectsForkCompatibilityError = (
        callbackSource.includes('if (forkColumnsMissing(error)) return fallbackForks') &&
        callbackSource.includes('if (error) throw error')
      )
      const callbackInspectedErrorCount = inspectsForkCompatibilityError ? 1 : 0
      assert.ok(
        callbackAbortCount > 0,
        `${fileName}: fallback read must abort at least one PostgREST query`,
      )
      assert.equal(
        callbackRetryCount,
        callbackAbortCount,
        `${fileName}: every abortable fallback query must disable PostgREST retries`,
      )
      assert.equal(
        callbackThrowCount + callbackInspectedErrorCount,
        callbackAbortCount,
        `${fileName}: every abortable fallback query must reject or explicitly inspect fast PostgREST errors`,
      )
      if (!inspectsForkCompatibilityError) {
        assert.doesNotMatch(
          callbackSource,
          /\.abortSignal\(signal\)(?!\s*\.throwOnError\(\))/,
          `${fileName}: throwOnError must be chained directly after every abort signal`,
        )
      }
      abortSignalCount += callbackAbortCount
      explicitlyInspectedErrorCount += callbackInspectedErrorCount
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (fileName === 'src/lib/data.ts') {
    const categories = functionBody(sourceFile, 'getCategories')
    assert.match(
      categories,
      /createPublicReadClient\(\{\s*anonymous:\s*true\s*\}\)/,
      'shared category reads must not depend on request cookies',
    )
    assert.match(categories, /\.from\('categories'\)/)
    assert.match(categories, /\.abortSignal\(signal\)\s*\.throwOnError\(\)/)
    assert.match(categories, /return data \?\? \[\]/)

    const prompts = functionBody(sourceFile, 'getPrompts')
    assert.match(
      prompts,
      /createPublicReadClient\(\{\s*anonymous:\s*true\s*\}\)/,
      'shared project-list reads must not depend on request cookies',
    )
    assert.doesNotMatch(
      prompts,
      /steps:prompt_steps/,
      'public project lists must not hydrate every prompt-step body',
    )
    assert.match(
      prompts,
      /\.range\(pageStart, pageEnd\)/,
      'public project lists must page inside PostgREST',
    )
    assert.match(
      prompts,
      /read_public_prompt_step_counts/,
      'public project lists must restore exact step cardinality through the bounded projection',
    )
    assert.match(
      prompts,
      /Public prompt list exceeded \$\{maximumCheckedRows\} checked rows/,
      'public project lists must fail instead of returning a silently truncated catalog',
    )
    assert.match(
      prompts,
      /if \(options\?\.categorySlug\) \{[\s\S]*?\.from\('categories'\)[\s\S]*?\.abortSignal\(signal\)\s*\.throwOnError\(\)[\s\S]*?categoryId = cat\?\.id/,
      'category-filter lookup errors must reject the whole read so curated filtering wins',
    )

    const authorProjects = functionBody(sourceFile, 'getProjectsByAuthor')
    assert.match(authorProjects, /\.range\(pageStart, pageEnd\)/)
    assert.match(authorProjects, /read_public_prompt_step_counts/)
    assert.match(
      authorProjects,
      /Public author project list exceeded \$\{maximumCheckedRows\} checked rows/,
    )

    const forks = functionBody(sourceFile, 'getApprovedProjectForks')
    assert.match(
      forks,
      /\.abortSignal\(signal\)[\s\S]*?if \(forkColumnsMissing\(error\)\) return fallbackForks[\s\S]*?if \(error\) throw error/,
      'fork reads must preserve the missing-column compatibility fallback before throwing other errors',
    )
    assert.doesNotMatch(
      forks,
      /\.abortSignal\(signal\)\s*\.throwOnError\(\)/,
      'fork reads must inspect resolved errors so missing-column compatibility remains reachable',
    )
  } else if (fileName === 'src/lib/data/public-profiles.ts') {
    const authorProjects = functionBody(sourceFile, 'getPublicProjectsByAuthor')
    assert.doesNotMatch(
      authorProjects,
      /steps:prompt_steps/,
      'public profile project lists must not hydrate every prompt-step body',
    )
    assert.match(
      authorProjects,
      /\.range\(pageStart, pageEnd\)/,
      'public profile project lists must remain page-bounded',
    )
    assert.match(authorProjects, /read_public_prompt_step_counts/)
    assert.match(
      authorProjects,
      /Public profile project list exceeded \$\{maximumCheckedRows\} checked rows/,
      'public profile project lists must fail instead of returning silent truncation',
    )
  }
}

assert.match(publicCatalogCache, /import \{ unstable_cache \} from 'next\/cache'/)
assert.match(publicCatalogCache, /import \{ cache \} from 'react'/)
assert.match(publicCatalogCache, /PUBLIC_CATALOG_CACHE_TAG = 'public-catalog-v1'/)
assert.match(publicCatalogCache, /PUBLIC_CATALOG_REVALIDATE_SECONDS = 300/)
assert.match(
  publicCatalogCache,
  /const getPublicCatalogRevision = cache\(async \(\): Promise<string \| null> => \{[\s\S]*?rpc\('get_public_catalog_revision'\)[\s\S]*?\.retry\(false\)[\s\S]*?\.abortSignal\(signal\)[\s\S]*?\.throwOnError\(\)[\s\S]*?\^\\d\+\$/,
  'each server render must share one bounded anonymous read of the durable catalog revision',
)
assert.match(
  publicCatalogCache,
  /if \(catalogRevision === null\) return getCategories\(\)/,
  'a failed revision read must bypass the shared category cache',
)
assert.match(
  publicCatalogCache,
  /if \(catalogRevision === null\) return getPrompts\(options\)/,
  'a failed revision read must bypass the shared project cache',
)
assert.match(
  publicCatalogCache,
  /readCachedPublicCategories = unstable_cache\([\s\S]*?catalogRevision: string[\s\S]*?void catalogRevision[\s\S]*?getCategories[\s\S]*?\['public-categories-v2'\][\s\S]*?revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS[\s\S]*?tags: \[PUBLIC_CATALOG_CACHE_TAG\]/,
  'public categories must use the shared five-minute catalog cache',
)
assert.match(
  publicCatalogCache,
  /readCachedPublicPrompts = unstable_cache\([\s\S]*?catalogRevision: string[\s\S]*?void catalogRevision[\s\S]*?getPrompts\(options\)[\s\S]*?\['public-prompts-v2'\][\s\S]*?revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS[\s\S]*?tags: \[PUBLIC_CATALOG_CACHE_TAG\]/,
  'public projects must use the shared five-minute catalog cache',
)
assert.match(publicCatalogCache, /createPublicCatalogSingleFlight\(\)/)
assert.match(
  publicCatalogCache,
  /runPublicCatalogRead\(\s*`categories:\$\{catalogRevision\}`,[\s\S]*?readCachedPublicCategories\(catalogRevision\)/,
)
assert.match(
  publicCatalogCache,
  /const key = JSON\.stringify\(\[\s*'prompts',\s*catalogRevision,/,
)
assert.match(
  publicCatalogCache,
  /runPublicCatalogRead\(\s*key,[\s\S]*?readCachedPublicPrompts\(catalogRevision, options\)/,
)
assert.match(publicCatalogSingleFlight, /const pendingReads = new Map\(\)/)
assert.match(publicCatalogSingleFlight, /if \(pending\) return pending/)
assert.match(publicCatalogSingleFlight, /pendingReads\.delete\(key\)/)

for (const [fileName, source, requiredCachedReads] of catalogConsumers) {
  for (const cachedRead of requiredCachedReads) {
    assert.match(
      source,
      new RegExp(`\\b${cachedRead}\\(`),
      `${fileName}: high-traffic catalog pages must use ${cachedRead}`,
    )
  }
  assert.doesNotMatch(
    source,
    /import \{[^}]*\b(?:getCategories|getPrompts)\b[^}]*\} from ['"]@\/lib\/data['"]/,
    `${fileName}: high-traffic catalog pages must not bypass the shared cache`,
  )
}

const promptDetail = catalogConsumers.find(([fileName]) => (
  fileName === 'src/app/prompt/[id]/page.tsx'
))?.[1] ?? ''
assert.match(
  promptDetail,
  /if \(prompt\.tags\?\.includes\('community-project'\)\) \{\s*const communityProject = await getPublicCommunityProject\(prompt\.id\)/,
  'generic prompt details must not issue the community-project RPC',
)

for (const [fileName, source, mutators] of catalogMutators) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  for (const mutator of mutators) {
    assert.match(
      functionBody(sourceFile, mutator),
      /revalidateTag\(PUBLIC_CATALOG_CACHE_TAG,\s*\{\s*expire:\s*0\s*\}\)/,
      `${fileName}: ${mutator} must immediately invalidate the public catalog cache`,
    )
  }
}

const actionsSourceFile = ts.createSourceFile(
  'src/lib/actions.ts',
  catalogMutators[0][1],
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)
for (const engagementMutator of ['voteOnProject', 'bookmarkProject']) {
  const body = functionBody(actionsSourceFile, engagementMutator)
  assert.doesNotMatch(
    body,
    /revalidateTag\(PUBLIC_CATALOG_CACHE_TAG/,
    `${engagementMutator} must not let high-frequency engagement defeat the shared cache`,
  )
  assert.doesNotMatch(
    body,
    /revalidatePath\((?:'|"|`)\/(?:paths|browse)?(?:'|"|`)\)/,
    `${engagementMutator} must not invalidate a catalog route on every engagement click`,
  )
  assert.doesNotMatch(
    body,
    /revalidatePath\(\s*`\/prompt\//,
    `${engagementMutator} must not evict a prompt route's soft-tagged catalog entry`,
  )
}

assert.match(
  promptStepCounts,
  /rows\.length !== projects\.length/,
  'step-count attachment must require exact row cardinality',
)
assert.match(
  promptStepCounts,
  /counts\.has\(row\.prompt_id\)/,
  'step-count attachment must reject duplicate rows',
)

const disabledRetryCount = dataSources.reduce(
  (total, [, source]) => total + (source.match(/\.retry\(false\)/g) ?? []).length,
  0,
)
const thrownErrorCount = dataSources.reduce(
  (total, [, source]) => total + (source.match(/\.throwOnError\(\)/g) ?? []).length,
  0,
)
const sourceAbortSignalCount = dataSources.reduce(
  (total, [, source]) => total + (source.match(/\.abortSignal\(signal\)/g) ?? []).length,
  0,
)
assert.equal(
  abortSignalCount,
  sourceAbortSignalCount,
  'all abortable public reads must live inside checked fallback callbacks',
)
assert.equal(
  thrownErrorCount + explicitlyInspectedErrorCount,
  abortSignalCount,
  'every abortable fallback query must reject or explicitly inspect fast PostgREST errors',
)
assert.equal(
  disabledRetryCount,
  abortSignalCount,
  'every abortable fallback query must explicitly disable PostgREST retries',
)
assert.ok(fallbackReadCount > 0, 'expected checked public fallback reads')
assert.match(
  packageJson,
  /"prebuild": "[^"]*npm run check:supabase-public-reads/,
  'production builds must enforce the public-read saturation guard',
)

console.log(
  `Supabase public-read saturation guard passed for ${fallbackReadCount} fallback reads, ${abortSignalCount} abortable no-retry PostgREST queries, ${catalogConsumers.length} cached catalog consumers, and ${catalogMutators.reduce((total, [, , mutators]) => total + mutators.length, 0)} cache-invalidating mutations.`,
)
