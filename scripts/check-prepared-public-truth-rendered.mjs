#!/usr/bin/env node

import assert from 'node:assert/strict'

function parseBaseUrl(argv) {
  const index = argv.indexOf('--base-url')
  if (index < 0 || !argv[index + 1]) {
    throw new Error('Usage: node scripts/check-prepared-public-truth-rendered.mjs --base-url http://127.0.0.1:PORT')
  }
  return new URL(argv[index + 1]).origin
}

function openingTagWithHook(html, hook, startIndex = 0) {
  const escapedHook = hook.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const renderedOpeningTag = html.slice(startIndex).match(new RegExp(
    `<[a-zA-Z][^>]*\\s${escapedHook}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?[^>]*>`,
  ))
  assert.ok(renderedOpeningTag?.[0] && renderedOpeningTag.index !== undefined, `rendered page must include ${hook} on a literal HTML opening tag`)
  const tag = renderedOpeningTag[0]
  const hookIndex = startIndex + renderedOpeningTag.index + tag.indexOf(hook)
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

function evidenceFooterScopes(html) {
  const footer = openingTagWithHook(html, 'data-source-run-evidence-footer')
  const note = openingTagWithHook(
    html,
    'data-source-run-access-note',
    footer.hookIndex + footer.tag.length,
  )
  assert.ok(
    note.hookIndex > footer.hookIndex,
    'source-run access note must render inside the evidence footer',
  )
  const noteEnd = html.indexOf('</p>', note.hookIndex)
  assert.ok(noteEnd > note.hookIndex, 'source-run access note must have a rendered boundary')
  return {
    footerBeforeNote: html.slice(footer.hookIndex, note.hookIndex),
    note: html.slice(note.hookIndex, noteEnd),
  }
}

function renderedText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const baseUrl = parseBaseUrl(process.argv.slice(2))
const privateProviderLocatorPattern =
  /https:\/\/(?:chatgpt\.com\/(?:c|chat)\/|chat\.openai\.com\/c\/|claude\.ai\/chat\/|gemini\.google\.com\/app\/|aistudio\.google\.com\/app\/|openrouter\.ai\/chat\/)/i
const cases = [
  {
    label: 'Fable fork',
    route: '/school-desk-hp-calculator-fork-demo',
    sourceRunId: 'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    providerLinkLabel: 'Open partial public source',
    publicShareUrl:
      'https://claude.ai/share/90e83c6e-67a0-4613-979a-4067f1b8781e',
    accessNote:
      'Anonymous provider access was verified on 2026-07-27. The public share covers only part of this run; the PathForge record preserves the complete captured evidence.',
    modelProof: 'not_confirmed',
    modelProofLabel: 'Model proof not confirmed',
    promptCount: 2,
  },
  {
    label: 'Pomodoro',
    route: '/pomodoro-timer-demo',
    sourceRunId: '6a1f9bc4-c390-832f-88a5-d978d2e42577',
    accessState: 'public_exact',
    accessLabel: 'Public source verified',
    providerLinkLabel: 'Open public source',
    publicShareUrl:
      'https://chatgpt.com/share/6a201fb5-4a20-832e-9d7d-38a4e7207a50',
    accessNote: 'Anonymous provider access was verified on 2026-07-27.',
    modelProof: 'not_confirmed',
    modelProofLabel: 'Model proof not confirmed',
    promptCount: 4,
  },
  {
    label: 'Road-trip fork',
    route: '/weekend-family-road-trip-readiness-fork-demo',
    sourceRunId: '80b083bb-4f94-4411-b071-a5da731d3e2d',
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    providerLinkLabel: 'Open partial public source',
    publicShareUrl:
      'https://chatgpt.com/share/6a669ef3-9198-83ea-bbf4-92bb4eca72e2',
    accessNote:
      'Anonymous provider access was verified on 2026-07-27. The public share covers only part of this run; the PathForge record preserves the complete captured evidence.',
    modelProof: 'not_confirmed',
    modelProofLabel: 'Model proof not confirmed',
    promptCount: 4,
    inheritedPromptCount: 3,
    forbiddenInheritedPromptCount: 6,
  },
  {
    label: 'Weekend parent',
    route: '/weekend-plan-checklist-demo',
    sourceRunId: 'f4f0e2df-58c9-4def-bb1c-7785a3989ec9',
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    providerLinkLabel: 'Open partial public source',
    publicShareUrl:
      'https://chatgpt.com/share/6a669ef3-9198-83ea-bbf4-92bb4eca72e2',
    accessNote:
      'Anonymous provider access was verified on 2026-07-27. The public share covers only part of this run; the PathForge record preserves the complete captured evidence.',
    modelProof: 'not_confirmed',
    modelProofLabel: 'Model proof not confirmed',
    promptCount: 6,
  },
  {
    label: 'Model-run public partial evidence',
    route: '/airlock-zero-reactor-run-demo',
    sourceRunId: '2e526efa-191c-48ea-9ba0-5ff073403770',
    accessState: 'public_partial',
    accessLabel: 'Partial public source',
    publicShareUrl: null,
    accessNote:
      'The checked PathForge record contains the full prompt-response run; the public ChatGPT share exposes only part.',
    modelProof: 'model_family_shown_publicly',
    modelProofLabel: 'Model family shown publicly',
    promptCount: 2,
    selector: true,
  },
  {
    label: 'Model-run private evidence',
    route: '/airlock-zero-blackout-shift-fork-demo',
    sourceRunId: 'fabb195e-18e9-4f24-8880-f6d784305bc5',
    accessState: 'provider_private',
    accessLabel: 'Provider sign-in required',
    publicShareUrl: null,
    accessNote:
      "Claude did not expose a public sharing control for this run. The provider session requires the owner's signed-in account.",
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: 'Exact model recorded by PathForge, not shown publicly',
    promptCount: 4,
    inheritedPromptCount: 10,
  },
  {
    label: 'Missing registry entry',
    route: '/trip-packing-planner-demo',
    sourceRunId: '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
    accessState: 'provider_private',
    accessLabel: 'Provider sign-in required',
    publicShareUrl: null,
    accessNote: "The Gemini link does not expose the captured conversation anonymously. Inspecting the provider session requires the owner's signed-in account.",
    modelProof: 'pathforge_recorded_not_public',
    modelProofLabel: 'Exact model recorded by PathForge, not shown publicly',
    promptCount: 5,
  },
]

for (const expected of cases) {
  const response = await fetch(`${baseUrl}${expected.route}`, {
    headers: { 'user-agent': 'PathForge prepared public truth rendered guard' },
  })
  assert.equal(response.status, 200, `${expected.label} prepared route must return HTTP 200`)
  const html = await response.text()
  assert.doesNotMatch(
    html,
    privateProviderLocatorPattern,
    `${expected.label} must not serialize an account-private provider locator`,
  )
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
  const footer = evidenceFooterScopes(html)
  if (expected.publicShareUrl) {
    assert.ok(
      footer.footerBeforeNote.includes(expected.providerLinkLabel),
      `${expected.label} must visibly render its truthful provider-link wording`,
    )
    assert.ok(
      footer.footerBeforeNote.includes(`href="${expected.publicShareUrl}"`),
      `${expected.label} must render only its separately verified public-share URL`,
    )
    assert.ok(
      renderedText(footer.note).includes(expected.accessNote),
      `${expected.label} must visibly explain the verified public-share scope`,
    )
  } else {
    assert.doesNotMatch(
      footer.footerBeforeNote,
      /<a\b[^>]*>/,
      `${expected.label} must stay usable without rendering a provider link`,
    )
    assert.ok(
      renderedText(footer.note).includes(expected.accessNote),
      `${expected.label} must retain truthful missing-link context`,
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
      renderedText(html).includes(
        `${expected.inheritedPromptCount} prompt-response pairs through the fork point`,
      ),
      `${expected.label} must keep inherited prompt-response history as a separate lineage disclosure`,
    )
  }
  if (expected.forbiddenInheritedPromptCount) {
    assert.ok(
      !renderedText(html).includes(
        `${expected.forbiddenInheritedPromptCount} prompt-response pairs through the fork point`,
      ),
      `${expected.label} must not imply that the shared provider link proves later parent continuation steps`,
    )
  }
}

console.log(
  `Rendered legacy public-source checks passed for verified, partial, and missing-link routes at ${baseUrl}.`,
)
