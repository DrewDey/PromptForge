#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')

const shared = read('src/lib/data/shared.ts')
const server = read('src/lib/supabase/server.ts')
const promptStepCounts = read('src/lib/data/public-prompt-step-counts.ts')
const publicCatalogCache = read('src/lib/public-catalog-cache.ts')
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
]
const dataSources = [
  ['src/lib/data.ts', read('src/lib/data.ts')],
  ['src/lib/data/public-profiles.ts', read('src/lib/data/public-profiles.ts')],
]
const packageJson = read('package.json')

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
assert.match(publicCatalogCache, /PUBLIC_CATALOG_CACHE_TAG = 'public-catalog-v1'/)
assert.match(publicCatalogCache, /PUBLIC_CATALOG_REVALIDATE_SECONDS = 300/)
assert.match(
  publicCatalogCache,
  /getCachedPublicCategories = unstable_cache\([\s\S]*?getCategories[\s\S]*?revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS[\s\S]*?tags: \[PUBLIC_CATALOG_CACHE_TAG\]/,
  'public categories must use the shared five-minute catalog cache',
)
assert.match(
  publicCatalogCache,
  /getCachedPublicPrompts = unstable_cache\([\s\S]*?getPrompts[\s\S]*?revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS[\s\S]*?tags: \[PUBLIC_CATALOG_CACHE_TAG\]/,
  'public projects must use the shared five-minute catalog cache',
)

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
