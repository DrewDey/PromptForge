import { getModelName } from './models'

const SETTINGS_ONLY_LABELS = new Set([
  'extra high',
  'high',
  'medium',
  'low',
  'not specified',
  'not sure',
  'unknown',
  'chosen by builder but not returned to manager',
])

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function displayText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function hasToken(normalized: string, token: string) {
  return new RegExp(`(^|\\s)${token}(\\s|$)`).test(normalized)
}

function isNonModelLabel(label: string, normalized = normalizedText(label)) {
  return (
    SETTINGS_ONLY_LABELS.has(normalized) ||
    normalized === 'chatgpt' ||
    normalized === 'chatgpt web' ||
    normalized === 'chatgpt source session' ||
    normalized === 'openrouter' ||
    normalized === 'openrouter source session' ||
    normalized === 'single file html' ||
    normalized.includes('chosen by builder but not returned')
  )
}

function isSpecificRoutedModelLabel(label: string, normalized = normalizedText(label)) {
  return (
    /\b(qwen\d|qwen)\b/.test(normalized) ||
    /\bkimi\b/.test(normalized) ||
    /\bminimax\b/.test(normalized) ||
    /\bdevstral\b/.test(normalized) ||
    /\bdeepseek\b/.test(normalized) ||
    /\bglm\b/.test(normalized) ||
    /\bnemotron\b/.test(normalized) ||
    /\bnex(?:\s+agi|\s*n\d|\s+n\d|-n\d|\b)/.test(normalized) ||
    /\bmistral\b/.test(normalized) ||
    /\bllama\b/.test(normalized) ||
    /\bgrok\b/.test(normalized) ||
    /\bstep\s*\d/.test(normalized) ||
    /^z\.?ai\b/i.test(label) ||
    /^nvidia\s*:/i.test(label) ||
    /^moonshotai\s*:/i.test(label)
  )
}

function formatClaudeLabel(label: string, normalized: string) {
  const fableMatch = label.match(/\bfable\s+(\d+(?:\.\d+)?)\s+max\b/i)
  if (fableMatch) {
    return `Claude Fable ${fableMatch[1]} Max`
  }

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

  const version = /5\s*5/.test(normalized) ? '5.5' : /5\s*4/.test(normalized) ? '5.4' : ''

  if (version) {
    const hasThinking = hasToken(normalized, 'thinking')
    const suffixes = [
      hasThinking ? 'Thinking' : '',
      hasToken(normalized, 'heavy') ? 'Heavy' : '',
      hasToken(normalized, 'extended') ? 'Extended' : '',
      hasToken(normalized, 'pro') ? 'Pro' : '',
      hasToken(normalized, 'instant') && !hasThinking ? 'Instant' : '',
      hasToken(normalized, 'medium') ? 'Medium' : '',
      hasToken(normalized, 'high') ? 'High' : '',
      hasToken(normalized, 'low') ? 'Low' : '',
    ].filter(Boolean)

    return ['ChatGPT', version, ...suffixes].join(' ')
  }

  if (hasToken(normalized, 'instant')) return 'ChatGPT Instant'
  return label
}

function formatGeminiLabel(label: string, normalized: string) {
  const explicitGemini = label.match(/\bgemini\s+(\d+(?:\.\d+)?)\s+(flash(?:[-\s]?lite)?|pro)\b/i)
  if (explicitGemini) {
    return `Gemini ${explicitGemini[1]} ${titleCaseModelSuffix(explicitGemini[2])}`
  }

  const shorthandVersion = label.match(/^\s*(\d+(?:\.\d+)?)\s+(flash(?:[-\s]?lite)?|pro)\b/i)
  if (shorthandVersion) {
    return `Gemini ${shorthandVersion[1]} ${titleCaseModelSuffix(shorthandVersion[2])}`
  }

  if (hasToken(normalized, 'flash') || /flash\s*lite/i.test(label)) {
    return /flash\s*[- ]?lite/i.test(label) ? 'Gemini Flash Lite' : 'Gemini Flash'
  }
  if (hasToken(normalized, 'pro')) return 'Gemini Pro'
  return 'Gemini'
}

function titleCaseModelSuffix(value: string) {
  return value
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function isPublicModelLabel(label: string | null | undefined) {
  const trimmed = label?.trim() ?? ''
  const normalized = normalizedText(trimmed)
  if (!trimmed || isNonModelLabel(trimmed, normalized)) return false

  return (
    /^Claude\b/.test(trimmed) ||
    /^ChatGPT\s+(?:Instant|[45](?:\.\d+)?)\b/.test(trimmed) ||
    /^GPT-/.test(trimmed) ||
    /^Gemini\b/.test(trimmed) ||
    isSpecificRoutedModelLabel(trimmed, normalized)
  )
}

export function getPublicModelLabel(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return ''

  const label = displayText(getModelName(raw))
  const normalized = normalizedText(`${raw} ${label}`)
  if (isNonModelLabel(label, normalizedText(label))) return ''

  if (/\b(claude|opus|sonnet|haiku|anthropic)\b/.test(normalized)) {
    return formatClaudeLabel(label, normalized)
  }

  if (/\b(chatgpt|gpt|openai|latest)\b/.test(normalized) || hasToken(normalized, 'instant') || /5\s*[45]/.test(normalized)) {
    return formatChatGptLabel(label, normalized)
  }

  if (isSpecificRoutedModelLabel(label, normalizedText(label))) {
    return label
  }

  if (/\b(gemini|google)\b/.test(normalized) || /^(\d+(?:\.\d+)?)\s+(flash(?:[-\s]?lite)?|pro)\b/i.test(label) || /^(flash|flash[-\s]?lite)\b/i.test(label)) {
    return formatGeminiLabel(label, normalized)
  }

  return isPublicModelLabel(label) ? label : ''
}

export function getPublicModelFacetValue(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return ''

  const label = getPublicModelLabel(raw) || raw
  return normalizedText(label).replace(/\s+/g, '-')
}

export function publicModelFilterMatchesLabel(filterValue: string, label: string) {
  const labelFacet = getPublicModelFacetValue(label)
  if (!labelFacet) return false

  const rawFilterFacet = normalizedText(filterValue).replace(/\s+/g, '-')
  const publicFilterFacet = getPublicModelFacetValue(filterValue)

  return labelFacet === rawFilterFacet || labelFacet === publicFilterFacet
}
