import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'
import ts from 'typescript'

function transpileFile(path) {
  const source = readFileSync(path, 'utf8')
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
    throw new Error(`Unable to transpile ${path}:\n${messages}`)
  }

  return outputText
}

const modelNames = new Map([
  ['claude-opus-4-8-max', 'Claude Opus 4.8 Max'],
  ['claude-sonnet-4-6', 'Claude 4.6 Sonnet'],
  ['chatgpt-5-4', 'ChatGPT 5.4'],
  ['gpt-5-5-instant', 'GPT 5.5 Instant'],
  ['gemini-2-5-flash', 'Gemini 2.5 Flash'],
  ['gemini-2-5-pro', 'Gemini 2.5 Pro'],
])

function createSandbox(module) {
  return {
    exports: module.exports,
    module,
    require(specifier) {
      if (specifier === './types') return {}
      if (specifier === './models') {
        return {
          AI_MODELS: [...modelNames.entries()].map(([id, name]) => ({
            id,
            name,
            provider: name.split(' ')[0],
          })),
          getModelName: (id) => modelNames.get(id) ?? id,
        }
      }
      if (specifier === './public-model-labels') return publicModelLabelsModule.exports
      throw new Error(`Unexpected require from prompt-comparisons.ts: ${specifier}`)
    },
    Date,
    Map,
    Math,
    RegExp,
    Set,
    String,
    console,
  }
}

const publicModelLabelsModule = { exports: {} }
const publicModelLabelsSandbox = {
  exports: publicModelLabelsModule.exports,
  module: publicModelLabelsModule,
  require(specifier) {
    if (specifier === './models') {
      return {
        AI_MODELS: [...modelNames.entries()].map(([id, name]) => ({
          id,
          name,
          provider: name.split(' ')[0],
        })),
        getModelName: (id) => modelNames.get(id) ?? id,
      }
    }
    throw new Error(`Unexpected require from public-model-labels.ts: ${specifier}`)
  },
  RegExp,
  String,
  console,
}
new Script(transpileFile('src/lib/public-model-labels.ts'), { filename: 'public-model-labels.transpiled.cjs' }).runInNewContext(publicModelLabelsSandbox)

const module = { exports: {} }
new Script(transpileFile('src/lib/prompt-comparisons.ts'), { filename: 'prompt-comparisons.transpiled.cjs' }).runInNewContext(createSandbox(module))

const { buildPromptComparisonGroups, getPromptModelLabel } = module.exports

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function prompt(overrides) {
  return {
    id: overrides.id,
    title: overrides.title,
    description: overrides.description ?? 'A captured source-run project.',
    content: overrides.content ?? 'Prompt text',
    result_content: overrides.result_content ?? 'Response text',
    category_id: overrides.category_id ?? 'tools',
    difficulty: 'beginner',
    model_used: overrides.model_used ?? null,
    model_recommendation: overrides.model_recommendation ?? null,
    tools_used: overrides.tools_used ?? [],
    tags: overrides.tags ?? [],
    status: 'approved',
    author_id: 'fixture-user',
    vote_count: overrides.vote_count ?? 0,
    bookmark_count: 0,
    prompt_family_id: overrides.prompt_family_id ?? null,
    created_at: overrides.created_at ?? '2026-06-05T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-06-05T00:00:00.000Z',
  }
}

const explicitGroups = buildPromptComparisonGroups([
  prompt({
    id: 'family-claude',
    title: 'HP calculator hardware run',
    model_used: 'claude-opus-4-8-max',
    prompt_family_id: ' calculator-family:response-2 ',
    created_at: '2026-06-05T00:00:00.000Z',
  }),
  prompt({
    id: 'family-chatgpt',
    title: 'Mortgage keypad artifact',
    model_used: 'chatgpt-5-4',
    prompt_family_id: 'calculator-family:response-2',
    created_at: '2026-06-05T00:01:00.000Z',
  }),
])
const explicitGroup = explicitGroups.find((group) => group.key === 'prompt-family:calculator-family:response-2')
assert(explicitGroup, 'explicit prompt family should produce a comparison group')
assert(explicitGroup?.matchBasis === 'prompt-family', 'explicit prompt family group should report prompt-family match basis')
assert(explicitGroup?.promptFamilyId === 'calculator-family:response-2', 'explicit prompt family id should be normalized and preserved')
assert(explicitGroup?.models.join('|') === 'ChatGPT 5.4|Claude Opus 4.8 Max' || explicitGroup?.models.length === 2, 'explicit prompt family group should keep both model labels')

const heuristicGroups = buildPromptComparisonGroups([
  prompt({
    id: 'heuristic-claude',
    title: 'Neighborhood chore planner - Claude',
    model_used: 'claude-opus-4-8-max',
    tags: ['chores', 'household', 'planner'],
    created_at: '2026-06-05T00:00:00.000Z',
  }),
  prompt({
    id: 'heuristic-gemini',
    title: 'Neighborhood chore planner - Gemini',
    model_used: 'gemini-2-5-pro',
    tags: ['chores', 'household', 'planner'],
    created_at: '2026-06-05T00:01:00.000Z',
  }),
])
const heuristicGroup = heuristicGroups.find((group) => group.key.startsWith('heuristic:'))
assert(heuristicGroup, 'similar prompts without a prompt family should still produce a heuristic comparison group')
assert(heuristicGroup?.matchBasis === 'heuristic', 'heuristic comparison group should report heuristic match basis')
assert(!heuristicGroup?.promptFamilyId, 'heuristic comparison group should not invent a prompt family id')

const publicLabelCases = [
  [
    'ChatGPT Instant visible composer setting (exact model not exposed)',
    'ChatGPT Instant',
  ],
  [
    'Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes',
    'ChatGPT 5.5 Thinking',
  ],
  [
    'Flash (visible Gemini mode picker; exact backend version not exposed)',
    'Gemini Flash',
  ],
  [
    'Sonnet 4.6 Max (visible Claude composer model label)',
    'Claude Sonnet 4.6 Max',
  ],
  [
    'gemini-2-5-pro',
    'Gemini Pro',
  ],
]
for (const [rawModel, expectedLabel] of publicLabelCases) {
  assert(
    getPromptModelLabel(prompt({
      id: `label-${expectedLabel}`,
      title: `Label case ${expectedLabel}`,
      model_used: rawModel,
    })) === expectedLabel,
    `public model label should render "${rawModel}" as "${expectedLabel}"`,
  )
}

const sameModelFamilyGroups = buildPromptComparisonGroups([
  prompt({
    id: 'single-model-family-a',
    title: 'Same family Claude A',
    model_used: 'claude-opus-4-8-max',
    prompt_family_id: 'same-model-family',
  }),
  prompt({
    id: 'single-model-family-b',
    title: 'Same family Claude B',
    model_used: 'claude-opus-4-8-max',
    prompt_family_id: 'same-model-family',
  }),
])
assert(sameModelFamilyGroups.length === 0, 'prompt family comparisons should still require at least two models')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Prompt comparison guard passed.')
