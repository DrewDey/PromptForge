function titleFromNotes(notes: string | null) {
  const match = notes?.match(/^Title:\s*(.+)$/m)
  return match?.[1]?.trim()
}

export type SourceRunModelMetadata = {
  provider: string
  modelUsed: string
  modelSettings: string
}

function singleLine(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function storedValue(value?: string | null) {
  const normalized = singleLine(value)
  return normalized || 'Not specified'
}

function reviewValue(value?: string | null) {
  const normalized = singleLine(value)
  return /^not specified$/i.test(normalized) ? '' : normalized
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labeledValue(notes: string | null | undefined, label: string) {
  const match = notes?.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, 'im'))
  return reviewValue(match?.[1])
}

function providerFromText(value?: string | null) {
  const raw = singleLine(value).toLowerCase()
  if (!raw) return ''
  if (raw.includes('chatgpt') || raw.includes('openai') || /\bgpt\b/.test(raw)) return 'ChatGPT'
  if (raw.includes('claude') || raw.includes('sonnet') || raw.includes('opus') || raw.includes('haiku')) return 'Claude'
  if (raw.includes('gemini')) return 'Gemini'
  if (raw.includes('openrouter')) return 'OpenRouter'
  return ''
}

export function detectSourceRunProvider(sourceUrl?: string | null) {
  const raw = singleLine(sourceUrl)
  if (!raw) return ''

  let host = ''
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    host = raw.toLowerCase()
  }

  if (host === 'chatgpt.com' || host.endsWith('.chatgpt.com')) return 'ChatGPT'
  if (host === 'chat.openai.com' || host.endsWith('.chat.openai.com')) return 'ChatGPT'
  if (host === 'claude.ai' || host.endsWith('.claude.ai')) return 'Claude'
  if (host === 'gemini.google.com' || host.endsWith('.gemini.google.com')) return 'Gemini'
  if (host === 'openrouter.ai' || host.endsWith('.openrouter.ai')) return 'OpenRouter'

  return ''
}

export function composeSourceRunReviewNotes(input: {
  sourceUrl?: string | null
  provider?: string | null
  modelUsed?: string | null
  modelSettings?: string | null
  notes?: string | null
}) {
  const provider = singleLine(input.provider) || detectSourceRunProvider(input.sourceUrl)
  const metadata = [
    `Provider: ${storedValue(provider)}`,
    `Model used: ${storedValue(input.modelUsed)}`,
    `Model settings: ${storedValue(input.modelSettings)}`,
  ].join('\n')

  const notes = input.notes?.trim() ?? ''
  return [metadata, notes].filter(Boolean).join('\n\n')
}

export function modelMetadataForSourceRunReview(input: {
  notes?: string | null
  sourceUrl?: string | null
}): SourceRunModelMetadata {
  const notes = input.notes ?? null
  const legacyProviderModel = labeledValue(notes, 'Provider/model/settings')
    || labeledValue(notes, 'Provider/model')
  const provider = labeledValue(notes, 'Provider')
    || providerFromText(legacyProviderModel)
    || detectSourceRunProvider(input.sourceUrl)
  const modelUsed = labeledValue(notes, 'Model used') || legacyProviderModel
  const modelSettings = labeledValue(notes, 'Model settings')

  return { provider, modelUsed, modelSettings }
}

export function cleanGeneratedProjectTitle(title: string) {
  return title
    .replace(
      /\s+-\s+(?=[^-]*(?:gpt|gemini|claude|openrouter|grok|llama|mistral|deepseek|copilot|o\d))[^-]*(?:basic\s+build|one[-\s]?shot|build|run|extended\s+pro|pro|flash|sonnet|opus|haiku|turbo|mini)[^-]*$/i,
      ''
    )
    .trim()
}

export function titleForSourceRunReview(input: {
  title?: string | null
  notes?: string | null
  sourceUrl?: string | null
  fileName?: string | null
}) {
  const rawTitle = input.title?.trim()
    || titleFromNotes(input.notes ?? null)
    || input.sourceUrl
    || input.fileName
    || 'Source-run intake'

  return cleanGeneratedProjectTitle(rawTitle)
}

export function agentNotesForSourceRunReview(
  notes: string | null,
  options: { hideForkMetadata?: boolean } = {},
) {
  const raw = notes?.trim() ?? ''
  if (!raw) return ''
  const hiddenMetadataPrefixes = [
    'Title:',
    'Provider:',
    'Provider/model:',
    'Provider/model/settings:',
    'Model used:',
    'Model settings:',
  ]
  const forkMetadataPrefixes = [
    'Fork source project:',
    'Fork source model variant:',
    'Fork source run:',
    'Fork source artifact:',
    'Fork source artifact SHA-256:',
    'Fork point response:',
    'Parent fork:',
    'Prompt family:',
    'Fork coordinates:',
  ]
  const withoutRedundantTitle = raw
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim()
      if (hiddenMetadataPrefixes.some((prefix) => trimmed.startsWith(prefix))) return false
      if (options.hideForkMetadata && forkMetadataPrefixes.some((prefix) => trimmed.startsWith(prefix))) return false
      return true
    })
    .join('\n')
    .trim()

  const hasLegacyGeneratedNotes = raw.includes('Let the agent structure this captured source run into a PathForge project page.')
    || raw.includes('Page shape: final artifact embedded first')
    || raw.includes('Seed package:')

  if (!hasLegacyGeneratedNotes) return withoutRedundantTitle

  const hiddenPrefixes = [
    'Title:',
    'Description:',
    'Provider/model:',
    'Provider/model/settings:',
    'Chain type:',
    'Source run:',
    'Final artifact:',
    'Verification:',
    'Seed package:',
    'Profile registry ID:',
  ]

  return withoutRedundantTitle
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (line === 'Let the agent structure this captured source run into a PathForge project page.') return false
      if (line.startsWith('Page shape: final artifact embedded first')) return false
      return !hiddenPrefixes.some((prefix) => line.startsWith(prefix))
    })
    .join('\n')
    .trim()
}
