import { getModelName } from './models'

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function hasToken(normalized: string, token: string) {
  return new RegExp(`(^|\\s)${token}(\\s|$)`).test(normalized)
}

function formatClaudeLabel(label: string, normalized: string) {
  const familyMatch = normalized.match(/\b(opus|sonnet|haiku)\b/)
  const versionMatch = label.match(/\b(\d+(?:\.\d+)?)\b/)
  const family = familyMatch
    ? familyMatch[1].charAt(0).toUpperCase() + familyMatch[1].slice(1)
    : ''
  const suffixes = [
    hasToken(normalized, 'extended') ? 'Extended' : '',
    hasToken(normalized, 'max') ? 'Max' : '',
  ].filter(Boolean)

  return ['Claude', family, versionMatch?.[1], ...suffixes]
    .filter(Boolean)
    .join(' ')
}

function formatChatGptLabel(label: string, normalized: string) {
  if (/gpt\s*4o/.test(normalized)) {
    return hasToken(normalized, 'mini') ? 'GPT-4o mini' : 'GPT-4o'
  }

  if (hasToken(normalized, 'instant') && /exact (?:underlying )?model not exposed/.test(label.toLowerCase())) {
    return 'ChatGPT Instant'
  }

  if (/gpt\s*5\s*5\s*thinking/.test(normalized) || /5\s*5.*thinking/.test(normalized)) {
    return hasToken(normalized, 'heavy') ? 'ChatGPT 5.5 Thinking Heavy' : 'ChatGPT 5.5 Thinking'
  }

  if (/5\s*5/.test(normalized)) {
    if (hasToken(normalized, 'instant')) return 'ChatGPT Instant'
    if (hasToken(normalized, 'heavy')) return 'ChatGPT 5.5 Heavy'
    if (hasToken(normalized, 'extended') && hasToken(normalized, 'pro')) return 'ChatGPT 5.5 Extended Pro'
    if (hasToken(normalized, 'pro')) return 'ChatGPT 5.5 Pro'
    return 'ChatGPT 5.5'
  }

  if (/5\s*4/.test(normalized)) {
    return hasToken(normalized, 'thinking') ? 'ChatGPT 5.4 Thinking' : 'ChatGPT 5.4'
  }

  if (hasToken(normalized, 'instant')) return 'ChatGPT Instant'
  return label
}

function formatGeminiLabel(normalized: string) {
  if (hasToken(normalized, 'flash')) return 'Gemini Flash'
  if (hasToken(normalized, 'pro')) return 'Gemini Pro'
  return 'Gemini'
}

export function getPublicModelLabel(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return ''

  const label = getModelName(raw)
  const normalized = normalizedText(`${raw} ${label}`)

  if (/\b(claude|opus|sonnet|haiku|anthropic)\b/.test(normalized)) {
    return formatClaudeLabel(label, normalized)
  }

  if (/\b(chatgpt|gpt|openai|latest)\b/.test(normalized)) {
    return formatChatGptLabel(label, normalized)
  }

  if (/\b(gemini|google)\b/.test(normalized)) {
    return formatGeminiLabel(normalized)
  }

  return label
}
