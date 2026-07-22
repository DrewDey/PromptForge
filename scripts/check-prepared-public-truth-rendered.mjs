#!/usr/bin/env node

import assert from 'node:assert/strict'

function parseBaseUrl(argv) {
  const index = argv.indexOf('--base-url')
  if (index < 0 || !argv[index + 1]) {
    throw new Error('Usage: node scripts/check-prepared-public-truth-rendered.mjs --base-url http://127.0.0.1:PORT')
  }
  return new URL(argv[index + 1]).origin
}

function openingTagWithHook(html, hook) {
  const escapedHook = hook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const renderedOpeningTag = html.match(new RegExp(
    `<[a-zA-Z][^>]*\\s${escapedHook}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?[^>]*>`,
  ))
  assert.ok(renderedOpeningTag?.[0] && renderedOpeningTag.index !== undefined, `rendered page must include ${hook} on a literal HTML opening tag`)
  const tag = renderedOpeningTag[0]
  const hookIndex = renderedOpeningTag.index + tag.indexOf(hook)
  return {
    hookIndex,
    tag,
  }
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null
}

function assertTruthTag(tag, expected, label) {
  for (const [name, value] of Object.entries({
    'data-source-run-id': expected.sourceRunId,
    'data-source-access': expected.accessState,
    'data-pathforge-record': 'true',
    'data-model-proof': expected.modelProof,
    'data-selected-run-prompt-count': String(expected.promptCount),
  })) {
    assert.equal(attribute(tag, name), value, `${label} must render ${name}=${value}`)
  }
}

function summaryScope(html, headerHookIndex) {
  const summaryHookIndex = html.indexOf('data-public-truth-summary', headerHookIndex)
  assert.ok(summaryHookIndex > headerHookIndex, 'prepared header must contain PublicTruthSummary')
  const summaryEnd = html.indexOf('</div>', summaryHookIndex)
  assert.ok(summaryEnd > summaryHookIndex, 'prepared header truth summary must have a rendered boundary')
  return html.slice(summaryHookIndex, summaryEnd)
}

function renderedText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const baseUrl = parseBaseUrl(process.argv.slice(2))
const cases = [
  {
    label: 'Reactor',
    route: '/airlock-zero-reactor-run-demo',
    sourceRunId: '2e526efa-191c-48ea-9ba0-5ff073403770',
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    modelProof: 'model_family_shown_publicly',
    modelProofLabel: 'Model family shown publicly',
    promptCount: 2,
    selector: true,
  },
  {
    label: 'Trip',
    route: '/trip-packing-planner-demo',
    sourceRunId: '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
    accessState: 'provider_private',
    accessLabel: 'Provider sign-in required',
    providerLinkLabel: 'Open provider session',
    accessNote: "The Gemini link does not expose the captured conversation anonymously. Inspecting the provider session requires the owner's signed-in account.",
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: 'Exact model recorded by PathForge, not shown publicly',
    promptCount: 5,
  },
  {
    label: 'Blackout',
    route: '/airlock-zero-blackout-shift-fork-demo',
    sourceRunId: 'fabb195e-18e9-4f24-8880-f6d784305bc5',
    accessState: 'provider_private',
    accessLabel: 'Provider sign-in required',
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: 'Exact model recorded by PathForge, not shown publicly',
    promptCount: 4,
    inheritedPromptCount: 10,
  },
]

for (const expected of cases) {
  const response = await fetch(`${baseUrl}${expected.route}`, {
    headers: { 'user-agent': 'PathForge prepared public truth rendered guard' },
  })
  assert.equal(response.status, 200, `${expected.label} prepared route must return HTTP 200`)
  const html = await response.text()
  const header = openingTagWithHook(html, 'data-prepared-header-public-truth')
  assertTruthTag(header.tag, expected, `${expected.label} prepared header`)

  const headerSummary = summaryScope(html, header.hookIndex)
  for (const label of [expected.accessLabel, 'PathForge record', expected.modelProofLabel]) {
    assert.ok(headerSummary.includes(label), `${expected.label} prepared header must visibly render ${label}`)
  }
  assert.ok(
    headerSummary.includes(`${expected.promptCount} ${expected.promptCount === 1 ? 'prompt' : 'prompts'}`),
    `${expected.label} prepared header must visibly render its canonical selected-run prompt count`,
  )
  assert.doesNotMatch(
    headerSummary,
    /PathForge record only|Model proof not confirmed|Public access not confirmed/,
    `${expected.label} curated prepared header cannot fall back to unconfirmed truth`,
  )

  if (expected.providerLinkLabel) {
    const pageText = renderedText(html)
    assert.ok(
      pageText.includes(expected.providerLinkLabel),
      `${expected.label} must visibly render its truthful provider-link wording`,
    )
    assert.ok(
      pageText.includes(expected.accessNote),
      `${expected.label} must visibly explain its anonymous provider-access limitation`,
    )
  }

  if (expected.selector) {
    const selected = openingTagWithHook(html, 'data-selected-model-public-truth')
    assertTruthTag(selected.tag, expected, `${expected.label} selected default model panel`)
    for (const name of [
      'data-source-run-id',
      'data-source-access',
      'data-pathforge-record',
      'data-model-proof',
      'data-selected-run-prompt-count',
    ]) {
      assert.equal(
        attribute(selected.tag, name),
        attribute(header.tag, name),
        `${expected.label} prepared header and selected default model panel must share ${name}`,
      )
    }
    const selectedEnd = html.indexOf('</span>', selected.hookIndex)
    const selectedScope = html.slice(selected.hookIndex, selectedEnd)
    for (const label of [expected.accessLabel, 'PathForge record', expected.modelProofLabel]) {
      assert.ok(selectedScope.includes(label), `${expected.label} selected default model panel must visibly render ${label}`)
    }
  }

  if (expected.inheritedPromptCount) {
    assert.ok(
      renderedText(html).includes(`${expected.inheritedPromptCount} prompt-response pairs through the fork point`),
      `${expected.label} must keep inherited prompt-response history as a separate lineage disclosure`,
    )
  }
}

console.log(`Rendered prepared public truth checks passed for Reactor, Trip, and Blackout at ${baseUrl}.`)
