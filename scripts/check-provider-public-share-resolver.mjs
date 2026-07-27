#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  isAllowlistedProviderEvidenceLocatorCore,
  normalizeProviderPublicShareRegistryEntryCore,
  providerPublicShareProjectionMatchesCore,
  providerPublicShareProviderKeyCore,
  resolveProviderPublicShareSourceRunIdCore,
} from '../src/lib/provider-public-share-core.mjs'

const sourceRunId = 'd9fa40e7-7725-4387-ad5b-14f25cf744ce'
const projectId = 'f25f83df-29c5-4d07-97b8-e7f6d2a902b8'
const nowMs = Date.parse('2026-07-27T00:00:00.000Z')
const exactEntry = {
  project_id: projectId,
  public_share_url:
    'https://claude.ai/share/90e83c6e-67a0-4613-979a-4067f1b8781e',
  provider_key: 'anthropic',
  consent_obtained_at: '2026-07-26T20:00:00.000Z',
  anonymous_access_verified_at: '2026-07-26T20:05:00.000Z',
  access_state: 'public_exact',
}

for (const locator of [
  'https://chatgpt.com/c/6a208694-1e78-8327-8ec7-3b231b18169d',
  'https://chat.openai.com/c/private-account-session',
  'https://claude.ai/chat/private-account-session',
  'https://gemini.google.com/app/private-account-session',
  'https://aistudio.google.com/app/prompts/private-account-session',
  'https://share.gemini.google/69yFlHoCf4Cl',
  'https://g.co/gemini/share/example_share-1',
  'https://openrouter.ai/chat/private-account-session?model=openai#turn-4',
  'https://chatgpt.com/share/6a201fb5-4a20-832e-9d7d-38a4e7207a50',
]) {
  assert.equal(
    isAllowlistedProviderEvidenceLocatorCore(locator),
    true,
    `${locator} must remain valid as private immutable evidence`,
  )
}

for (const locator of [
  'http://chatgpt.com/c/not-secure',
  'https://example.com/c/unapproved-host',
  'https://user:secret@chatgpt.com/c/credentialed',
  'https://chatgpt.com:443/c/explicit-port',
  'https://chatgpt.com/',
  ' https://chatgpt.com/c/surrounded-by-space',
  'https://chatgpt.com/c/contains whitespace',
]) {
  assert.equal(
    isAllowlistedProviderEvidenceLocatorCore(locator),
    false,
    `${locator} must not enter immutable provider evidence`,
  )
}

for (const [url, provider] of [
  ['https://chatgpt.com/share/6a201fb5-4a20-832e-9d7d-38a4e7207a50', 'openai'],
  ['https://chatgpt.com/s/example_share-1', 'openai'],
  ['https://claude.ai/share/example_share-1', 'anthropic'],
  ['https://share.gemini.google/example_share-1', 'google'],
  ['https://g.co/gemini/share/example_share-1', 'google'],
  ['https://gemini.google.com/share/example_share-1', 'google'],
]) {
  assert.equal(providerPublicShareProviderKeyCore(url), provider)
}

for (const rejected of [
  'https://chatgpt.com/c/private-account-session',
  'https://chat.openai.com/c/private-account-session',
  'https://claude.ai/chat/private-account-session',
  'https://gemini.google.com/app/private-account-session',
  'https://openrouter.ai/chat/private-account-session',
  'http://chatgpt.com/share/not-https',
  'https://chatgpt.com/share/has-query?token=private',
  'https://chatgpt.com/share/has-fragment#private',
  'https://user:secret@chatgpt.com/share/credentialed',
  'https://chatgpt.com:443/share/explicit-port',
  ' https://chatgpt.com/share/surrounded-by-space',
  'https://www.chatgpt.com/share/unapproved-host',
]) {
  assert.equal(
    providerPublicShareProviderKeyCore(rejected),
    null,
    `${rejected} must fail closed`,
  )
}

assert.equal(
  resolveProviderPublicShareSourceRunIdCore({ source_run_id: sourceRunId }),
  sourceRunId,
)
assert.equal(
  resolveProviderPublicShareSourceRunIdCore({
    source_run_id: sourceRunId,
    source_run_submission_id: sourceRunId,
    pathforge_pending_id: sourceRunId,
  }),
  sourceRunId,
)
for (const aliases of [
  {},
  { source_run_id: 'private-provider-conversation-id' },
  { source_run_id: ` ${sourceRunId}` },
  { source_run_id: sourceRunId, source_run_submission_id: projectId },
  { sourceRunId: sourceRunId },
]) {
  assert.equal(resolveProviderPublicShareSourceRunIdCore(aliases), null)
}

const resolved = normalizeProviderPublicShareRegistryEntryCore({
  sourceRunId,
  projectId,
  entry: exactEntry,
  nowMs,
})
assert.deepEqual(resolved, {
  source_run_id: sourceRunId,
  project_id: projectId,
  ...exactEntry,
})

for (const entry of [
  null,
  { ...exactEntry, project_id: '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40' },
  { ...exactEntry, public_share_url: 'https://claude.ai/chat/private' },
  { ...exactEntry, provider_key: 'openai' },
  { ...exactEntry, consent_obtained_at: null },
  {
    ...exactEntry,
    consent_obtained_at: '2026-07-26T20:10:00.000Z',
    anonymous_access_verified_at: '2026-07-26T20:05:00.000Z',
  },
  {
    ...exactEntry,
    anonymous_access_verified_at: '2026-07-27T00:00:01.000Z',
  },
  { ...exactEntry, access_state: 'provider_private' },
  { ...exactEntry, private_source_url: 'https://claude.ai/chat/private' },
]) {
  assert.equal(
    normalizeProviderPublicShareRegistryEntryCore({
      sourceRunId,
      projectId,
      entry,
      nowMs,
    }),
    null,
  )
}

assert.equal(
  providerPublicShareProjectionMatchesCore(resolved, {
    ...resolved,
    consent_obtained_at: '2026-07-26T16:00:00-04:00',
    anonymous_access_verified_at: '2026-07-26T16:05:00-04:00',
  }),
  true,
)
assert.equal(
  providerPublicShareProjectionMatchesCore(resolved, {
    ...resolved,
    project_id: '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
  }),
  false,
)
assert.equal(
  providerPublicShareProjectionMatchesCore(resolved, {
    ...resolved,
    public_share_url: 'https://claude.ai/share/different',
  }),
  false,
)

const [
  preparedPage,
  forkHydrator,
  resolver,
  publicModelVariantReader,
  sourceEvidenceFooter,
] = await Promise.all([
  readFile('src/components/PreparedSourceRunPage.tsx', 'utf8'),
  readFile('src/lib/data.ts', 'utf8'),
  readFile('src/lib/provider-public-share-resolver.ts', 'utf8'),
  readFile('src/lib/data/model-variants.ts', 'utf8'),
  readFile('src/components/SourceRunEvidenceFooter.tsx', 'utf8'),
])

assert.doesNotMatch(preparedPage, /sourceRun\.source_url|project\.sourceUrl/)
assert.match(preparedPage, /resolvedPublicShare\?\.public_share_url \?\? null/)
assert.match(preparedPage, /if \(!await preparedProjectIsPublic\(project\.id\)\) notFound\(\)/)
assert.match(forkHydrator, /childSourceUrl: null/)
assert.doesNotMatch(
  resolver,
  /source_url|sourceUrl/,
  'the resolver interface must never accept legacy source locators',
)
assert.match(resolver, /process\.env\.VERCEL_ENV !== 'production'/)
assert.match(resolver, /providerPublicShareProjectionMatches/)
assert.doesNotMatch(
  publicModelVariantReader.split('getProjectModelVariantsForAdmin')[0],
  /model_settings, source_url,/,
)
assert.match(sourceEvidenceFooter, /providerPublicShareHref/)

console.log('Provider public-share resolver checks passed.')
