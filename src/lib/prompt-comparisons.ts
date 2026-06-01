import type { PromptWithRelations } from './types'
import { AI_MODELS, getModelName } from './models'

export type PromptModelEra = 'newer' | 'older' | 'reference'

export type PromptComparisonGroup = {
  key: string
  label: string
  prompts: PromptWithRelations[]
  models: string[]
  latestCreatedAt: number
  totalVotes: number
}

const BASE_STOP_WORDS = new Set([
  'about',
  'across',
  'after',
  'again',
  'against',
  'and',
  'any',
  'are',
  'ask',
  'based',
  'browser',
  'build',
  'built',
  'can',
  'create',
  'created',
  'demo',
  'file',
  'for',
  'from',
  'generate',
  'generated',
  'html',
  'into',
  'make',
  'model',
  'one',
  'path',
  'polished',
  'prompt',
  'prompts',
  'project',
  'run',
  'self',
  'shot',
  'single',
  'that',
  'the',
  'this',
  'tool',
  'using',
  'with',
  'working',
  'your',
])

const MODEL_STOP_WORDS = new Set(
  AI_MODELS
    .flatMap((model) => [model.id, model.name, model.provider])
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .concat([
      'anthropic',
      'chatgpt',
      'claude',
      'deepseek',
      'extended',
      'flash',
      'gemini',
      'gpt',
      'latest',
      'llama',
      'mistral',
      'openai',
      'opus',
      'pro',
      'sonnet',
    ]),
)

function cleanTitleRoot(title: string) {
  return title
    .replace(/\s+[-–—]\s+(?:chatgpt|claude|gemini|gpt|llama|mistral|grok|deepseek|latest|o\d).*/i, '')
    .replace(/\s+[-–—]\s+\w+\s+\d.*/i, '')
    .trim()
}

function titleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => (
      token.length >= 3 &&
      !/^\d+$/.test(token) &&
      !BASE_STOP_WORDS.has(token) &&
      !MODEL_STOP_WORDS.has(token)
    ))
}

function addTokenScores(scores: Map<string, number>, text: string | null | undefined, weight: number) {
  for (const token of tokenize(text ?? '')) {
    scores.set(token, (scores.get(token) ?? 0) + weight)
  }
}

function familyKey(prompt: PromptWithRelations) {
  const scores = new Map<string, number>()
  addTokenScores(scores, cleanTitleRoot(prompt.title), 4)
  addTokenScores(scores, prompt.title, 2)
  addTokenScores(scores, prompt.description, 1)
  addTokenScores(scores, prompt.tags.join(' '), 3)

  const tokens = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([token]) => token)

  if (tokens.length < 2) return null
  return `${prompt.category_id}:${tokens.join('-')}`
}

function modelCompareKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeModelForLooseMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !/^\d+$/.test(token))
    .join(' ')
}

function modelSearchBlob(prompt: PromptWithRelations) {
  return [
    prompt.model_used,
    prompt.model_recommendation,
    ...prompt.tools_used,
  ]
    .filter(Boolean)
    .join(' ')
}

export function getPromptModelLabel(prompt: PromptWithRelations) {
  if (prompt.model_used) return getModelName(prompt.model_used)
  if (prompt.model_recommendation) return prompt.model_recommendation

  const toolModel = prompt.tools_used.find((tool) => (
    /chatgpt|claude|gemini|gpt|llama|mistral|grok|deepseek|o\d/i.test(tool)
  ))
  return toolModel ?? 'Unknown model'
}

export function promptMatchesModel(prompt: PromptWithRelations, modelId: string) {
  if (!modelId) return true
  if (prompt.model_used === modelId || prompt.model_recommendation === modelId) return true

  const selectedLabel = getModelName(modelId)
  const exactNeedles = [
    modelId,
    selectedLabel,
  ].map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
  const exactHaystack = modelSearchBlob(prompt).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

  if (exactNeedles.some((needle) => needle && exactHaystack.includes(needle))) return true
  if (/\d/.test(`${modelId} ${selectedLabel}`) && /\d/.test(exactHaystack)) return false

  const looseNeedle = normalizeModelForLooseMatch(`${modelId} ${selectedLabel}`)
  const looseHaystack = normalizeModelForLooseMatch(modelSearchBlob(prompt))
  const looseTokens = looseNeedle.split(/\s+/).filter(Boolean)
  return looseTokens.length > 0 && looseTokens.every((token) => looseHaystack.includes(token))
}

export function getPromptModelEra(prompt: PromptWithRelations): PromptModelEra {
  const label = getPromptModelLabel(prompt).toLowerCase()

  if (/(gpt[-\s]*4o|gpt\s*4|claude\s*3|gemini\s*2\.?0|\bo3\b|\bo4\b)/i.test(label)) {
    return 'older'
  }

  if (/(5\.?5|chatgpt\s*5|claude\s*4\.?[67]|gemini\s*2\.?5|llama\s*4|grok\s*3|latest)/i.test(label)) {
    return 'newer'
  }

  return 'reference'
}

export function buildPromptComparisonGroups(prompts: PromptWithRelations[]): PromptComparisonGroup[] {
  const buckets = new Map<string, PromptWithRelations[]>()

  for (const prompt of prompts) {
    const key = familyKey(prompt)
    if (!key) continue

    const bucket = buckets.get(key) ?? []
    bucket.push(prompt)
    buckets.set(key, bucket)
  }

  const groups: PromptComparisonGroup[] = []

  for (const [key, bucket] of buckets) {
    const modelLabels = new Map<string, string>()
    for (const prompt of bucket) {
      const label = getPromptModelLabel(prompt)
      if (label === 'Unknown model') continue
      modelLabels.set(modelCompareKey(label), label)
    }

    if (bucket.length < 2 || modelLabels.size < 2) continue

    const sortedPrompts = [...bucket].sort((a, b) => (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ))
    const rootLabels = sortedPrompts.map((prompt) => cleanTitleRoot(prompt.title)).filter(Boolean)
    const label = rootLabels[0] ? titleCase(rootLabels[0]) : 'Comparable Prompt Family'

    groups.push({
      key,
      label,
      prompts: sortedPrompts,
      models: [...modelLabels.values()],
      latestCreatedAt: Math.max(...bucket.map((prompt) => new Date(prompt.created_at).getTime())),
      totalVotes: bucket.reduce((sum, prompt) => sum + prompt.vote_count, 0),
    })
  }

  return groups.sort((a, b) => (
    b.models.length - a.models.length ||
    b.prompts.length - a.prompts.length ||
    b.latestCreatedAt - a.latestCreatedAt
  ))
}
