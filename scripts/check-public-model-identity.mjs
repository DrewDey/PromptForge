import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { Script } from 'node:vm'
import ts from 'typescript'

function loadFormatter() {
  const source = readFileSync('src/lib/public-model-labels.ts', 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  })

  if (diagnostics?.length) {
    const messages = diagnostics.map((diagnostic) => diagnostic.messageText).join('\n')
    throw new Error(`Unable to transpile public-model-labels.ts:\n${messages}`)
  }

  const loadedModule = { exports: {} }
  new Script(outputText, { filename: 'public-model-labels.transpiled.cjs' }).runInNewContext({
    module: loadedModule,
    exports: loadedModule.exports,
    require(specifier) {
      if (specifier === './models') return { getModelName: (value) => value }
      throw new Error(`Unexpected formatter dependency: ${specifier}`)
    },
    Map,
    RegExp,
    Set,
    String,
    console,
  })

  return loadedModule.exports
}

const {
  getPublicModelFacetValue,
  getPublicModelIdentity,
  getPublicModelIdentityLabel,
  getPublicModelLabel,
} = loadFormatter()

const cases = [
  {
    name: 'Gemini versioned Flash with visible thinking level',
    input: {
      provider: 'Gemini',
      model: '3.5 Flash',
      modelSettings: 'Selected 3.5 Flash - All-around help; thinking level visible as Standard.',
    },
    expected: { provider: 'Gemini', model: '3.5 Flash', setting: 'Standard', exactness: 'exact', label: 'Gemini 3.5 Flash · Standard' },
  },
  {
    name: 'Gemini provider de-duplication',
    input: { provider: 'Gemini', model: 'Gemini 3.1 Pro', modelSettings: 'Thinking level Standard was visible.' },
    expected: { provider: 'Gemini', model: '3.1 Pro', setting: 'Standard', exactness: 'exact', label: 'Gemini 3.1 Pro · Standard' },
  },
  {
    name: 'Canonical Gemini label keeps its setting on a second pass',
    input: { model: 'Gemini 3.5 Flash · Standard' },
    expected: { provider: 'Gemini', model: '3.5 Flash', setting: 'Standard', exactness: 'exact', label: 'Gemini 3.5 Flash · Standard' },
  },
  {
    name: 'Google provider alias',
    input: { provider: 'Google', model: 'Gemini 3.1 Flash-Lite', modelSettings: 'Thinking level: Standard.' },
    expected: { provider: 'Gemini', model: '3.1 Flash Lite', setting: 'Standard', exactness: 'exact', label: 'Gemini 3.1 Flash Lite · Standard' },
  },
  {
    name: 'Gemini family with unexposed version',
    input: { provider: 'Gemini', model: 'Flash', modelSettings: 'Visible Gemini mode picker showed Flash.' },
    expected: { provider: 'Gemini', model: 'Flash', setting: '', exactness: 'version-unexposed', label: 'Gemini Flash · exact version not exposed' },
  },
  {
    name: 'Gemini already caveated family',
    input: { provider: 'Gemini', model: 'Gemini Flash (visible mode picker label: Flash; exact Gemini backend version not exposed in source UI)' },
    expected: { provider: 'Gemini', model: 'Flash', setting: '', exactness: 'version-unexposed', label: 'Gemini Flash · exact version not exposed' },
  },
  {
    name: 'Claude model with medium setting',
    input: { provider: 'Claude', model: 'Sonnet 4.6 Medium' },
    expected: { provider: 'Claude', model: 'Sonnet 4.6', setting: 'Medium', exactness: 'exact', label: 'Claude Sonnet 4.6 · Medium' },
  },
  {
    name: 'Claude model with high setting',
    input: { provider: 'Anthropic', model: 'Opus 4.8 High' },
    expected: { provider: 'Claude', model: 'Opus 4.8', setting: 'High', exactness: 'exact', label: 'Claude Opus 4.8 · High' },
  },
  {
    name: 'Claude model with extended setting',
    input: { provider: 'Claude', model: 'Haiku 4.5 Extended' },
    expected: { provider: 'Claude', model: 'Haiku 4.5', setting: 'Extended', exactness: 'exact', label: 'Claude Haiku 4.5 · Extended' },
  },
  {
    name: 'HP 10Bii Claude identity',
    input: { provider: 'Claude', model: 'Claude Opus 4.8 Max', modelSettings: 'Model identified by user as Claude 4.8 Max.' },
    expected: { provider: 'Claude', model: 'Opus 4.8', setting: 'Max', exactness: 'exact', label: 'Claude Opus 4.8 · Max' },
  },
  {
    name: 'Claude legacy version-first label',
    input: { provider: 'Claude', model: 'Claude 4.6 Sonnet' },
    expected: { provider: 'Claude', model: 'Sonnet 4.6', setting: '', exactness: 'exact', label: 'Claude Sonnet 4.6' },
  },
  {
    name: 'Claude Fable parenthetical provider',
    input: { provider: 'Claude', model: 'Fable 5 Max (Claude)' },
    expected: { provider: 'Claude', model: 'Fable 5', setting: 'Max', exactness: 'exact', label: 'Claude Fable 5 · Max' },
  },
  {
    name: 'Claude setting recovered from package evidence',
    input: { provider: 'Claude', model: 'Sonnet 4.6', modelSettings: 'Visible model button after selection: Model: Sonnet 4.6 Low.' },
    expected: { provider: 'Claude', model: 'Sonnet 4.6', setting: 'Low', exactness: 'exact', label: 'Claude Sonnet 4.6 · Low' },
  },
  {
    name: 'Selected Claude model setting wins over an earlier menu model',
    input: {
      provider: 'Claude',
      model: 'Haiku 4.5 Extended',
      modelSettings: 'Claude picker initially showed Sonnet 4.6 Medium. Haiku 4.5 was selected; composer then showed Haiku 4.5 Extended.',
    },
    expected: { provider: 'Claude', model: 'Haiku 4.5', setting: 'Extended', exactness: 'exact', label: 'Claude Haiku 4.5 · Extended' },
  },
  {
    name: 'ChatGPT version with instant setting',
    input: { provider: 'ChatGPT', model: '5.4 Instant' },
    expected: { provider: 'ChatGPT', model: '5.4', setting: 'Instant', exactness: 'exact', label: 'ChatGPT 5.4 · Instant' },
  },
  {
    name: 'OpenAI provider alias',
    input: { provider: 'OpenAI', model: 'GPT-5.5 Medium' },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Medium', exactness: 'exact', label: 'ChatGPT 5.5 · Medium' },
  },
  {
    name: 'ChatGPT setting from structured package evidence',
    input: {
      provider: 'ChatGPT',
      model: 'Latest 5.5',
      modelSettings: { selected_speed_or_reasoning_setting: 'Instant', provider_lane: 'ChatGPT normal lane' },
    },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Instant', exactness: 'exact', label: 'ChatGPT 5.5 · Instant' },
  },
  {
    name: 'ChatGPT captured model slug and visible setting',
    input: {
      provider: 'ChatGPT',
      model: 'ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking',
      modelSettings: { visible_composer_setting: 'Instant selected/visible in ChatGPT composer during the run.' },
    },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Instant', exactness: 'exact', label: 'ChatGPT 5.5 · Instant' },
  },
  {
    name: 'Visible ChatGPT setting takes precedence over response model metadata',
    input: {
      provider: 'ChatGPT',
      model: 'GPT-5.5 Thinking',
      modelSettings: 'Composer setting visible as Instant; response-level model switcher showed Used GPT-5.5 Thinking.',
    },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Instant', exactness: 'exact', label: 'ChatGPT 5.5 · Instant' },
  },
  {
    name: 'Fallback setting wins over an unused menu option',
    input: {
      provider: 'ChatGPT',
      model: 'Latest 5.5 / Thinking Heavy (ChatGPT UI)',
      modelSettings: 'Pro Extended was tried first but produced no answer. Fallback used Thinking • Heavy; the composer displayed Heavy.',
    },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Thinking Heavy', exactness: 'exact', label: 'ChatGPT 5.5 · Thinking Heavy' },
  },
  {
    name: 'ChatGPT thinking and effort setting',
    input: { provider: 'ChatGPT', model: 'Latest 5.5 / Thinking Heavy (ChatGPT UI)' },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Thinking Heavy', exactness: 'exact', label: 'ChatGPT 5.5 · Thinking Heavy' },
  },
  {
    name: 'ChatGPT pro setting',
    input: { provider: 'ChatGPT', model: 'Latest 5.5 / Extended Pro' },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Pro Extended', exactness: 'exact', label: 'ChatGPT 5.5 · Pro Extended' },
  },
  {
    name: 'ChatGPT named model with max setting',
    input: { provider: 'ChatGPT', model: '5.6 Sol Max' },
    expected: { provider: 'ChatGPT', model: '5.6 Sol', setting: 'Max', exactness: 'exact', label: 'ChatGPT 5.6 Sol · Max' },
  },
  {
    name: 'ChatGPT setting from effort evidence',
    input: { provider: 'ChatGPT', model: 'GPT-5.6 Luna', modelSettings: 'Effort: Extra High; Speed: Standard.' },
    expected: { provider: 'ChatGPT', model: '5.6 Luna', setting: 'Extra High', exactness: 'exact', label: 'ChatGPT 5.6 Luna · Extra High' },
  },
  {
    name: 'ChatGPT mode without exposed model',
    input: { provider: 'ChatGPT', model: 'High' },
    expected: { provider: 'ChatGPT', model: '', setting: 'High', exactness: 'model-unexposed', label: 'ChatGPT · High · exact model not exposed' },
  },
  {
    name: 'ChatGPT missing model with setting recovered from evidence',
    input: { provider: 'ChatGPT', model: 'Not sure', modelSettings: 'Visible composer mode/model-control text: Instant. Exact underlying model name was not exposed.' },
    expected: { provider: 'ChatGPT', model: '', setting: 'Instant', exactness: 'model-unexposed', label: 'ChatGPT · Instant · exact model not exposed' },
  },
  {
    name: 'ChatGPT missing model and setting',
    input: { provider: 'ChatGPT', model: 'ChatGPT web' },
    expected: { provider: 'ChatGPT', model: '', setting: '', exactness: 'model-unexposed', label: 'ChatGPT · exact model not exposed' },
  },
  {
    name: 'OpenRouter upstream model',
    input: { provider: 'OpenRouter', model: 'Qwen3.7 Max' },
    expected: { provider: 'OpenRouter', model: 'Qwen3.7 Max', setting: '', exactness: 'exact', label: 'Qwen3.7 Max via OpenRouter' },
  },
  {
    name: 'OpenRouter canonical label is idempotent',
    input: { provider: 'OpenRouter', model: 'Qwen3.7 Max via OpenRouter' },
    expected: { provider: 'OpenRouter', model: 'Qwen3.7 Max', setting: '', exactness: 'exact', label: 'Qwen3.7 Max via OpenRouter' },
  },
  {
    name: 'OpenRouter canonical label keeps a determined setting',
    input: { provider: 'OpenRouter', model: 'Qwen3.7 Max via OpenRouter · High' },
    expected: { provider: 'OpenRouter', model: 'Qwen3.7 Max', setting: 'High', exactness: 'exact', label: 'Qwen3.7 Max via OpenRouter · High' },
  },
  {
    name: 'OpenRouter upstream response wins over selected alias',
    input: {
      provider: 'OpenRouter',
      model: 'Anthropic Claude Haiku Latest (~anthropic/claude-haiku-latest); visible upstream response model: Claude Haiku 4.5',
    },
    expected: { provider: 'OpenRouter', model: 'Claude Haiku 4.5', setting: '', exactness: 'exact', label: 'Claude Haiku 4.5 via OpenRouter' },
  },
  {
    name: 'OpenRouter tier stays part of upstream model',
    input: { provider: 'OpenRouter', model: 'Nex AGI: Nex-N2-Pro (free)' },
    expected: { provider: 'OpenRouter', model: 'Nex AGI: Nex-N2-Pro (free)', setting: '', exactness: 'exact', label: 'Nex AGI: Nex-N2-Pro (free) via OpenRouter' },
  },
  {
    name: 'Provider inferred from a complete model',
    input: { model: 'Claude Opus 4.8 Max' },
    expected: { provider: 'Claude', model: 'Opus 4.8', setting: 'Max', exactness: 'exact', label: 'Claude Opus 4.8 · Max' },
  },
  {
    name: 'Gemini inferred from provider-less versioned Flash',
    input: { model: '3.5 Flash', modelSettings: 'Thinking level visible as Standard.' },
    expected: { provider: 'Gemini', model: '3.5 Flash', setting: 'Standard', exactness: 'exact', label: 'Gemini 3.5 Flash · Standard' },
  },
  {
    name: 'Gemini inferred from provider-less versioned Pro',
    input: { model: '3.1 Pro' },
    expected: { provider: 'Gemini', model: '3.1 Pro', setting: '', exactness: 'exact', label: 'Gemini 3.1 Pro' },
  },
  {
    name: 'Gemini inferred from provider-less Flash family',
    input: { model: 'Gemini Flash' },
    expected: { provider: 'Gemini', model: 'Flash', setting: '', exactness: 'version-unexposed', label: 'Gemini Flash · exact version not exposed' },
  },
  {
    name: 'ChatGPT inferred from provider-less latest version',
    input: { model: 'Latest 5.5 / Extended Pro' },
    expected: { provider: 'ChatGPT', model: '5.5', setting: 'Pro Extended', exactness: 'exact', label: 'ChatGPT 5.5 · Pro Extended' },
  },
  {
    name: 'Claude inferred from provider-less Sonnet label',
    input: { model: 'Sonnet 5 Max' },
    expected: { provider: 'Claude', model: 'Sonnet 5', setting: 'Max', exactness: 'exact', label: 'Claude Sonnet 5 · Max' },
  },
  {
    name: 'ChatGPT inferred from provider-less named model',
    input: { model: '5.6 Sol Max' },
    expected: { provider: 'ChatGPT', model: '5.6 Sol', setting: 'Max', exactness: 'exact', label: 'ChatGPT 5.6 Sol · Max' },
  },
  {
    name: 'Provider-less setting is never treated as an exact model',
    input: { model: 'High' },
    expected: { provider: '', model: '', setting: 'High', exactness: 'model-unexposed', label: 'High · exact model not exposed' },
  },
  {
    name: 'Empty evidence stays empty',
    input: {},
    expected: { provider: '', model: '', setting: '', exactness: 'model-unexposed', label: '' },
  },
  {
    name: 'Providerless placeholder is never treated as an exact model',
    input: { model: 'Not sure' },
    expected: { provider: '', model: '', setting: '', exactness: 'model-unexposed', label: '' },
  },
  {
    name: 'OpenRouter source-session placeholder stays honest',
    input: { provider: 'OpenRouter', model: 'OpenRouter source session' },
    expected: { provider: 'OpenRouter', model: '', setting: '', exactness: 'model-unexposed', label: 'OpenRouter · exact model not exposed' },
  },
  {
    name: 'Unknown provider remains visible',
    input: { provider: 'Mistral', model: 'Mistral Large' },
    expected: { provider: 'Mistral', model: 'Large', setting: '', exactness: 'exact', label: 'Mistral Large' },
  },
]

const failures = []

for (const testCase of cases) {
  const actual = JSON.parse(JSON.stringify(getPublicModelIdentity(testCase.input)))
  if (!isDeepStrictEqual(actual, testCase.expected)) {
    failures.push(`${testCase.name}\nexpected ${JSON.stringify(testCase.expected)}\nactual   ${JSON.stringify(actual)}`)
  }

  const label = getPublicModelIdentityLabel(testCase.input)
  if (label !== testCase.expected.label) {
    failures.push(`${testCase.name} label helper expected ${JSON.stringify(testCase.expected.label)}, got ${JSON.stringify(label)}`)
  }

  const secondPass = JSON.parse(JSON.stringify(getPublicModelIdentity({ model: label })))
  if (!isDeepStrictEqual(secondPass, testCase.expected)) {
    failures.push(`${testCase.name} second pass\nexpected ${JSON.stringify(testCase.expected)}\nactual   ${JSON.stringify(secondPass)}`)
  }
}

const legacyAdapterCases = [
  ['Gemini 3.5 Flash · Standard', 'Gemini 3.5 Flash · Standard'],
  ['Claude Sonnet 4.6 · Medium', 'Claude Sonnet 4.6 · Medium'],
  ['Claude Haiku 4.5 via OpenRouter', 'Claude Haiku 4.5 via OpenRouter'],
  ['Gemini Flash · exact version not exposed', 'Gemini Flash · exact version not exposed'],
]

for (const [input, expected] of legacyAdapterCases) {
  const actual = getPublicModelLabel(input)
  if (actual !== expected) {
    failures.push(`legacy label adapter expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

if (getPublicModelFacetValue('Gemini 3.5 Flash · Standard') !== 'gemini-3-5-flash-standard') {
  failures.push('model facet adapter must retain the canonical Gemini setting')
}

if (getPublicModelFacetValue('Claude Haiku 4.5 via OpenRouter') !== 'claude-haiku-4-5-via-openrouter') {
  failures.push('model facet adapter must retain the OpenRouter provider')
}

if (failures.length) {
  console.error(failures.join('\n\n'))
  process.exit(1)
}

console.log(`Public model-identity formatter guard passed for ${cases.length} representative cases.`)
