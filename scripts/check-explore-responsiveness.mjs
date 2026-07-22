#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isExpectedLocalActivationFailure,
  isExpectedLocalActivationResponseFailure,
  isExpectedLocalVercelScriptFailure,
  isExpectedLocalVercelScriptResponseFailure,
} from './browser-guard-errors.mjs'

const discoverySource = readFileSync('src/components/discovery/BuildPathsDiscovery.tsx', 'utf8')
const cardSource = readFileSync('src/components/discovery/BuildPathCard.tsx', 'utf8')
const navigationSource = readFileSync('src/components/discovery/DiscoveryNavigationFeedback.tsx', 'utf8')
const browserGuardSource = readFileSync('scripts/check-explore-responsiveness-browser.mjs', 'utf8')
const anchorGuardSource = readFileSync('scripts/check-mobile-anchor-stability-browser.mjs', 'utf8')
const localFailureGuardSources = [
  readFileSync('scripts/check-discovery-navigation-browser.mjs', 'utf8'),
  readFileSync('scripts/check-project-fork-page-browser.mjs', 'utf8'),
  browserGuardSource,
]

const localActivationFailure = {
  url: 'http://127.0.0.1:3012/api/activation-events',
  text: 'Failed to load resource: the server responded with a status of 503',
}
assert.equal(isExpectedLocalActivationFailure('http://127.0.0.1:3012', localActivationFailure), true)
assert.equal(isExpectedLocalActivationFailure('http://localhost:3012', {
  ...localActivationFailure,
  url: 'http://localhost:3012/api/activation-events',
}), true)
for (const hostedBaseUrl of ['https://pathforge-git-review.vercel.app', 'https://pathforge.example']) {
  assert.equal(isExpectedLocalActivationFailure(hostedBaseUrl, {
    ...localActivationFailure,
    url: `${hostedBaseUrl}/api/activation-events`,
  }), false, 'a hosted activation-event 503 must remain fatal')
}
assert.equal(isExpectedLocalActivationFailure('http://127.0.0.1:3012', {
  ...localActivationFailure,
  url: 'http://localhost:3012/api/activation-events',
}), false, 'the ignored local failure must belong to the configured base origin')
assert.equal(isExpectedLocalActivationFailure('http://127.0.0.1:3012', {
  ...localActivationFailure,
  url: 'http://127.0.0.1:3012/api/other',
}), false, 'other local endpoints must remain fatal')
assert.equal(isExpectedLocalActivationFailure('http://127.0.0.1:3012', {
  ...localActivationFailure,
  text: 'Failed to load resource: the server responded with a status of 500',
}), false, 'other local statuses must remain fatal')

const localActivationResponse = {
  url: 'http://127.0.0.1:3012/api/activation-events',
  status: 503,
}
assert.equal(
  isExpectedLocalActivationResponseFailure('http://127.0.0.1:3012', localActivationResponse),
  true,
  'the exact configured local activation-event 503 should be ignored',
)
for (const [label, baseUrl, response] of [
  ['same-origin 500', 'http://127.0.0.1:3012', { ...localActivationResponse, status: 500 }],
  ['cross-origin 503', 'http://127.0.0.1:3012', { ...localActivationResponse, url: 'http://localhost:3012/api/activation-events' }],
  ['activation-events-v2 404', 'http://127.0.0.1:3012', { url: 'http://127.0.0.1:3012/api/activation-events-v2', status: 404 }],
  ['activation-events-v2 503', 'http://127.0.0.1:3012', { url: 'http://127.0.0.1:3012/api/activation-events-v2', status: 503 }],
  ['hosted 503', 'https://pathforge-git-review.vercel.app', { url: 'https://pathforge-git-review.vercel.app/api/activation-events', status: 503 }],
]) {
  assert.equal(
    isExpectedLocalActivationResponseFailure(baseUrl, response),
    false,
    `${label} must remain fatal`,
  )
}

const localVercelScriptUrl = 'http://127.0.0.1:3012/_vercel/insights/script.js'
assert.equal(isExpectedLocalVercelScriptResponseFailure('http://127.0.0.1:3012', {
  url: localVercelScriptUrl,
  status: 404,
}), true)
assert.equal(isExpectedLocalVercelScriptFailure('http://127.0.0.1:3012', {
  url: 'http://127.0.0.1:3012/paths',
  text: `Refused to execute script from '${localVercelScriptUrl}' because of strict MIME type checking.`,
}), true)
for (const [label, baseUrl, response] of [
  ['hosted Vercel script 404', 'https://pathforge.example', { url: 'https://pathforge.example/_vercel/insights/script.js', status: 404 }],
  ['cross-origin local script 404', 'http://127.0.0.1:3012', { url: 'http://localhost:3012/_vercel/insights/script.js', status: 404 }],
  ['wrong local path 404', 'http://127.0.0.1:3012', { url: 'http://127.0.0.1:3012/_vercel/other/script.js', status: 404 }],
  ['local Vercel script 500', 'http://127.0.0.1:3012', { url: localVercelScriptUrl, status: 500 }],
]) {
  assert.equal(
    isExpectedLocalVercelScriptResponseFailure(baseUrl, response),
    false,
    `${label} must remain fatal`,
  )
}
for (const [label, baseUrl, entry] of [
  ['hosted MIME failure', 'https://pathforge.example', { text: "Refused to execute script from 'https://pathforge.example/_vercel/insights/script.js' because of strict MIME type checking." }],
  ['wrong local path MIME failure', 'http://127.0.0.1:3012', { text: "Refused to execute script from 'http://127.0.0.1:3012/_vercel/other/script.js' because of strict MIME type checking." }],
  ['wrong local error', 'http://127.0.0.1:3012', { url: localVercelScriptUrl, text: 'net::ERR_CERT_AUTHORITY_INVALID' }],
]) {
  assert.equal(isExpectedLocalVercelScriptFailure(baseUrl, entry), false, `${label} must remain fatal`)
}
for (const guardSource of localFailureGuardSources) {
  assert.match(guardSource, /isExpectedLocalActivationFailure\((?:baseUrl|options\.baseUrl), entry\)/)
  assert.doesNotMatch(
    guardSource,
    /entry\.url\?\.includes\('\/api\/activation-events'\)/,
    'browser guards must not restore a broad activation-event exception',
  )
}
assert.match(browserGuardSource, /isExpectedLocalActivationResponseFailure\(baseUrl, response\)/)
assert.doesNotMatch(browserGuardSource, /baseUrl\.startsWith\(/)
assert.doesNotMatch(browserGuardSource, /\.includes\('\/(?:_vercel|api\/activation-events)/)

assert.match(navigationSource, /export function DiscoveryNavigationLink\([\s\S]*?prefetch = false,/)
assert.match(navigationSource, /<Link[\s\S]*?prefetch=\{prefetch\}/)
assert.match(navigationSource, /if \(navigation\.preserveScroll\) \{[\s\S]*?router\.push\(navigation\.href, \{ scroll: false \}\)[\s\S]*?router\.push\(navigation\.href\)/)
assert.match(navigationSource, /beginNavigation\(\{ href, label: navigationLabel, kind: navigationKind, preserveScroll \}\)/)
assert.equal(
  discoverySource.match(/navigationLabel=\{?`?[^\n]+[\s\S]{0,120}?preserveScroll/g)?.length,
  4,
  'only the four filter-popover option groups should opt into scroll preservation',
)
assert.match(anchorGuardSource, /width: 390, height: 844/)
assert.match(anchorGuardSource, /Input\.dispatchMouseEvent/)
assert.match(anchorGuardSource, /assertAnchorStable/)
assert.match(anchorGuardSource, /history\.back\(\)/)
assert.match(anchorGuardSource, /history\.forward\(\)/)
assert.match(anchorGuardSource, /Network\.emulateNetworkConditions/)
assert.match(anchorGuardSource, /isExpectedLocalVercelScriptResponseFailure\(options\.baseUrl, response\)/)
assert.match(anchorGuardSource, /Network\.responseReceived/)
assert.doesNotMatch(anchorGuardSource, /\.includes\('\/_vercel/)
assert.match(discoverySource, /DISCOVERY_INTENTS\.map[\s\S]*?<DiscoveryNavigationLink/)
assert.match(discoverySource, /BROAD_DOMAINS\.map[\s\S]*?<DiscoveryNavigationLink/)
assert.match(discoverySource, /<DiscoverySortMenu[\s\S]*?DISCOVERY_SORT_OPTIONS\.map/)

const paginationSource = discoverySource.match(/<nav className="path-pagination"[\s\S]*?<\/nav>/)?.[0] ?? ''
assert.equal(
  paginationSource.match(/prefetch=\{false\}/g)?.length,
  2,
  'both Explore pagination links should disable automatic prefetch',
)
assert.doesNotMatch(
  cardSource,
  /prefetch=\{false\}/,
  'project-card prefetch should remain available for opening project routes',
)

assert.match(browserGuardSource, /width: 390/)
assert.match(browserGuardSource, /label: 'Newest'/)
assert.match(browserGuardSource, /label: 'Games'/)
assert.match(browserGuardSource, /acknowledgementMs/)
assert.match(browserGuardSource, /responseStartMs/)
assert.match(browserGuardSource, /completeMs/)
assert.match(browserGuardSource, /data-discovery-navigation-pending="true"/)
assert.match(browserGuardSource, /data-discovery-sort-label/)
assert.match(browserGuardSource, /summary\[aria-busy="true"\]/)
assert.match(browserGuardSource, /--require-feedback/)
assert.match(browserGuardSource, /--repeat/)
assert.match(browserGuardSource, /resourceUrl\.origin !== target\.origin/)
assert.match(browserGuardSource, /networkMeasurementAvailable: resource !== null/)
assert.match(browserGuardSource, /networkMeasurementMissingRuns/)
assert.doesNotMatch(
  browserGuardSource,
  /\|\| resources\.toSorted/,
  'network timing must never fall back to an unrelated RSC resource',
)
assert.ok(browserGuardSource.includes('currentSortLabel !== initialSortLabel'))
assert.ok(browserGuardSource.includes('/…|\\.\\.\\./.test(currentSortLabel)'))
assert.doesNotMatch(
  browserGuardSource,
  /Boolean\(currentSortLabel\)/,
  'a persistent selected sort label must not count as pending feedback',
)
assert.doesNotMatch(
  browserGuardSource,
  /entry\.text\.startsWith\('Failed to load resource:'\)/,
  'browser errors must not be ignored solely because they are resource failures',
)

console.log('Explore prefetch scope and responsiveness browser-contract guard passed.')
