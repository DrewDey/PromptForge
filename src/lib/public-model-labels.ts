import { getModelName } from './models'

export type PublicModelIdentityInput = {
  provider?: string | null
  model?: string | null
  modelSettings?: string | Record<string, unknown> | null
}

export type PublicModelExactness = 'exact' | 'version-unexposed' | 'model-unexposed'

export type PublicModelIdentity = {
  label: string
  provider: string
  model: string
  setting: string
  exactness: PublicModelExactness
}

const SETTINGS_ONLY_LABELS = new Set([
  'extra high',
  'high',
  'medium',
  'low',
  'not specified',
  'not sure',
  'unknown',
  'other',
  'not available',
  'n a',
  'source session',
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
    normalized.endsWith(' source session') ||
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
    /^(?:Claude|ChatGPT|Gemini|Meta|xAI|DeepSeek|Mistral|Cohere)(?:\b|\s*·)/.test(trimmed) ||
    /\bvia\s+OpenRouter\b/i.test(trimmed) ||
    /^GPT-/.test(trimmed) ||
    isSpecificRoutedModelLabel(trimmed, normalized)
  )
}

export function getPublicModelLabel(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return ''

  const label = displayText(getModelName(raw))
  if (isNonModelLabel(label, normalizedText(label))) return ''

  const identity = getPublicModelIdentity({ model: label })
  if (identity.provider) return identity.label

  const normalized = normalizedText(`${raw} ${label}`)

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

const MODEL_SETTING_LABELS = [
  'Pro Extended',
  'Thinking Heavy',
  'Extra High',
  'Standard',
  'Medium',
  'High',
  'Low',
  'Max',
  'Instant',
  'Thinking',
  'Extended',
  'Heavy',
] as const

function canonicalProviderLabel(provider: string | null | undefined, model: string) {
  const raw = displayText(provider ?? '')
  const normalizedProvider = normalizedText(raw)
  if (normalizedProvider === 'openrouter') return 'OpenRouter'
  if (/\b(claude|anthropic)\b/.test(normalizedProvider)) return 'Claude'
  if (/\b(chatgpt|openai)\b/.test(normalizedProvider)) return 'ChatGPT'
  if (/\b(gemini|google)\b/.test(normalizedProvider)) return 'Gemini'
  if (raw) return raw

  const evidence = normalizedText(model)
  if (/\bopenrouter\b/.test(evidence)) return 'OpenRouter'
  if (/\b(claude|anthropic|opus|sonnet|haiku|fable)\b/.test(evidence)) return 'Claude'
  if (/\bllama\b/.test(evidence)) return 'Meta'
  if (/\bgrok\b/.test(evidence)) return 'xAI'
  if (/\bdeepseek\b/.test(evidence)) return 'DeepSeek'
  if (/\bmistral\b/.test(evidence)) return 'Mistral'
  if (/\bcommand\s+r\b/.test(evidence)) return 'Cohere'
  if (/\b(qwen|kimi|minimax|devstral|glm|nemotron|nex|step\s*\d)\b/.test(evidence)) return ''
  if (
    /\b(gemini|google)\b/.test(evidence) ||
    /^\d+\s+\d+\s+(?:flash(?:\s*lite)?|pro)\b/.test(evidence) ||
    /^flash(?:\s*lite)?\b/.test(evidence)
  ) return 'Gemini'
  if (
    /\b(chatgpt|openai|gpt|latest)\b/.test(evidence) ||
    /\bo[134](?:\s+mini)?\b/.test(evidence) ||
    /\b[45](?:\s|[.-])\d+(?:\s+(?:sol|luna))?\b/.test(evidence)
  ) return 'ChatGPT'

  return ''
}

function titleCaseSetting(value: string) {
  const normalized = normalizedText(value)
  if (normalized === 'pro extended' || normalized === 'extended pro') return 'Pro Extended'
  if (normalized === 'thinking heavy') return 'Thinking Heavy'
  if (normalized === 'extra high') return 'Extra High'

  return MODEL_SETTING_LABELS.find((candidate) => normalized === normalizedText(candidate)) ?? ''
}

function settingFromModelLabel(provider: string, model: string) {
  const normalized = normalizedText(model)

  const canonicalSetting = model.match(
    /\s·\s*(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\s*$/i,
  )?.[1]
  if (canonicalSetting) return titleCaseSetting(canonicalSetting)

  if (provider === 'OpenRouter' || (provider !== 'Claude' && provider !== 'ChatGPT')) return ''

  if (/visible\s+composer\s+setting/.test(normalized) && hasToken(normalized, 'instant')) {
    return 'Instant'
  }

  if (provider === 'ChatGPT' && /\bnot\s+sure\b/.test(normalized)) return ''
  if (/\b(?:pro\s*(?:[•/]\s*)?extended|extended\s+pro)\b/.test(model.toLowerCase())) return 'Pro Extended'
  if (/\bthinking\s*(?:[•/]\s*)?heavy\b/i.test(model)) return 'Thinking Heavy'
  if (/\bextra[\s-]+high\b/i.test(model)) return 'Extra High'

  const ordered = ['Instant', 'Thinking', 'Extended', 'Standard', 'Medium', 'High', 'Low', 'Max', 'Heavy']
  for (const candidate of ordered) {
    if (new RegExp(`\\b${candidate}\\b`, 'i').test(model)) return candidate
  }

  return ''
}

function flattenedSettingsText(value: PublicModelIdentityInput['modelSettings']) {
  if (!value) return ''
  if (typeof value === 'string') return displayText(value)

  return Object.entries(value)
    .flatMap(([key, entry]) => {
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return [`${key}: ${String(entry)}`]
      }
      return []
    })
    .join('; ')
}

function settingFromEvidence(
  value: PublicModelIdentityInput['modelSettings'],
  includeModelFallback = true,
): string {
  if (!value) return ''

  if (typeof value === 'object') {
    const preferredKeys = [
      'selected_speed_or_reasoning_setting',
      'selected_or_visible_setting',
      'visible_composer_setting',
      'reasoning_effort',
      'thinking_level',
      'effort',
      'intelligence',
    ]

    for (const key of preferredKeys) {
      const entry = value[key]
      if (typeof entry !== 'string') continue
      const leadingSetting = entry.match(
        /^\s*(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
      )?.[1]
      const match: string = titleCaseSetting(leadingSetting ?? '') || settingFromEvidence(entry, false)
      if (match) return match
    }
  }

  const text = flattenedSettingsText(value)
  const directSetting = titleCaseSetting(text)
  if (directSetting) return directSetting

  const explicitPatterns = [
    /thinking\s+level(?:\s+(?:menu\s+)?visible)?(?:\s+as)?\s*[:=-]?\s*(standard|medium|high|low|max)\b/i,
    /reasoning\s+effort\s*[:=-]?\s*(extra\s+high|standard|medium|high|low|max)\b/i,
    /\beffort\s*[:=-]?\s*(extra\s+high|standard|medium|high|low|max)\b/i,
    /\bintelligence(?:\s+(?:set|selected))?(?:\s+to)?\s*[:=-]?\s*(instant|medium|high|extra\s+high)\b/i,
    /selected[_\s-]*(?:speed|reasoning|visible|composer|or)+[_\s-]*setting\s*[:=-]?\s*(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
    /\bfallback\s+used\s+(pro\s*[•·/]?\s*extended|thinking\s*[•·/]?\s*heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
    /(?:composer|model\s+button|model\s+control)(?:[^.;]{0,60})(?:showed|displayed|selected|visible)(?:[^.;]{0,12})\b(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
    /(?:composer|model\s+button|model\s+control)(?:[^.;]{0,80})\b(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
    /\b(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\s+(?:was\s+)?(?:selected|checked)\b/i,
  ]

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern)
    const setting = titleCaseSetting(match?.[1] ?? '')
    if (setting) return setting
  }

  if (!includeModelFallback) return ''

  const modelFallbackPatterns = [
    /\b(?:opus|sonnet|haiku|fable)\s+\d+(?:\.\d+)?\s+(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
    /\b(?:chatgpt|gpt)?[-\s]*[45](?:[.\s-]\d+)?(?:\s+(?:sol|luna))?\s+(pro\s+extended|thinking\s+heavy|extra\s+high|instant|thinking|standard|medium|high|low|max|extended|heavy)\b/i,
  ]

  for (const pattern of modelFallbackPatterns) {
    const match = text.match(pattern)
    const setting = titleCaseSetting(match?.[1] ?? '')
    if (setting) return setting
  }

  return ''
}

function removeTrailingSetting(model: string, setting: string) {
  if (!setting) return displayText(model)

  const alternatives = setting === 'Pro Extended'
    ? '(?:Pro\\s*[•/]?\\s*Extended|Extended\\s+Pro)'
    : setting === 'Thinking Heavy'
      ? 'Thinking\\s*[•/]?\\s*Heavy'
      : setting.replace(/\s+/g, '\\s+')

  return displayText(model
    .replace(new RegExp(`(?:\\s*[•·/]\\s*|\\s+)${alternatives}(?:\\s*\\([^)]*\\))?\\s*$`, 'i'), '')
    .replace(new RegExp(`\\s+${alternatives}(?:\\s*\\([^)]*\\))?\\s*$`, 'i'), ''))
}

function canonicalClaudeModel(model: string, setting: string) {
  const withoutSetting = removeTrailingSetting(model, setting)
    .replace(/\s*\(\s*Claude\s*\)\s*$/i, '')
    .replace(/^\s*(?:Claude|Anthropic)\s+/i, '')
    .trim()
  const familyFirst = withoutSetting.match(/\b(opus|sonnet|haiku|fable)\s+(\d+(?:\.\d+)?)\b/i)
  const versionFirst = withoutSetting.match(/\b(\d+(?:\.\d+)?)\s+(opus|sonnet|haiku|fable)\b/i)
  const match = familyFirst ?? versionFirst
  if (!match) return ''

  const family = familyFirst ? match[1] : match[2]
  const version = familyFirst ? match[2] : match[1]
  return `${titleCaseModelSuffix(family)} ${version}`
}

function canonicalChatGptModel(model: string, setting: string) {
  const withoutSetting = removeTrailingSetting(model, setting)
  if (/\bgpt\s*[- ]?4o\b/i.test(withoutSetting)) {
    return /\bmini\b/i.test(withoutSetting) ? 'GPT-4o mini' : 'GPT-4o'
  }

  const oSeries = withoutSetting.match(/\bo([134])(?:[-\s]+(mini))?\b/i)
  if (oSeries) return `o${oSeries[1]}${oSeries[2] ? '-mini' : ''}`

  const slugVersion = withoutSetting.match(/\bgpt[-\s]*(\d)[-.\s](\d)\b/i)
  const decimalVersion = withoutSetting.match(/\b([45]\.\d+)\b/)
  const version = decimalVersion?.[1] ?? (slugVersion ? `${slugVersion[1]}.${slugVersion[2]}` : '')
  if (!version) return ''

  const namedFamily = withoutSetting.match(new RegExp(`${version.replace('.', '[.\\s-]')}\\s+(Sol|Luna)\\b`, 'i'))?.[1]
  return [version, namedFamily ? titleCaseModelSuffix(namedFamily) : ''].filter(Boolean).join(' ')
}

function canonicalGeminiModel(model: string, setting: string) {
  const withoutSetting = removeTrailingSetting(model, setting)
    .replace(/^\s*(?:Gemini|Google)\s+/i, '')
    .trim()
  const exact = withoutSetting.match(/\b(\d+(?:\.\d+)?)\s+(flash(?:[-\s]?lite)?|pro)\b/i)
  if (exact) return `${exact[1]} ${titleCaseModelSuffix(exact[2])}`
  if (/\bflash\s*[- ]?lite\b/i.test(withoutSetting)) return 'Flash Lite'
  if (/\bflash\b/i.test(withoutSetting)) return 'Flash'
  if (/\bpro\b/i.test(withoutSetting)) return 'Pro'
  return ''
}

function canonicalRoutedModel(model: string, setting: string) {
  const upstream = model.match(/visible\s+upstream\s+response\s+model\s*:\s*([^;]+)/i)?.[1]
  const selected = removeTrailingSetting(displayText(upstream ?? model), setting)
    .replace(/^\s*OpenRouter\s*[:·-]?\s*/i, '')
    .replace(/\s+via\s+OpenRouter\s*$/i, '')
    .trim()

  return isNonModelLabel(selected) ? '' : selected
}

function canonicalOtherModel(provider: string, model: string, setting: string) {
  const withoutSetting = removeTrailingSetting(displayText(getModelName(model)), setting)
  if (isNonModelLabel(withoutSetting, normalizedText(withoutSetting))) return ''
  if (!provider) return withoutSetting
  return withoutSetting.replace(new RegExp(`^${provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i'), '')
}

function composeIdentityLabel(identity: Omit<PublicModelIdentity, 'label'>) {
  if (!identity.provider && !identity.model && !identity.setting) return ''

  const settingSuffix = identity.setting ? ` · ${identity.setting}` : ''

  if (identity.provider === 'OpenRouter') {
    const routed = identity.model ? `${identity.model} via OpenRouter` : 'OpenRouter'
    const disclosure = identity.exactness === 'model-unexposed' ? ' · exact model not exposed' : ''
    return `${routed}${settingSuffix}${disclosure}`
  }

  const identityPrefix = [identity.provider, identity.model].filter(Boolean).join(' ')
  const disclosure = identity.exactness === 'version-unexposed'
    ? ' · exact version not exposed'
    : identity.exactness === 'model-unexposed'
      ? ' · exact model not exposed'
      : ''

  return `${identityPrefix}${settingSuffix}${disclosure}`.replace(/^\s*·\s*/, '').trim()
}

/**
 * Builds the public provider/model/setting identity from preserved source evidence.
 * This never mutates or rewrites the archival package fields.
 */
export function getPublicModelIdentity(input: PublicModelIdentityInput): PublicModelIdentity {
  const rawModel = displayText(getModelName(input.model ?? ''))
    .replace(/\s*·\s*exact\s+(?:model|version)\s+not\s+exposed\s*$/i, '')
    .trim()
  const provider = canonicalProviderLabel(input.provider, rawModel)
  const modelSetting = settingFromModelLabel(provider, rawModel)
  const explicitEvidenceSetting = settingFromEvidence(input.modelSettings, false)
  const evidenceSetting = settingFromEvidence(input.modelSettings)
  const standaloneSetting = /^(?:extra\s+high|high|medium|low|standard|instant)$/i.test(rawModel)
    ? titleCaseSetting(rawModel)
    : ''
  const setting = explicitEvidenceSetting || modelSetting || evidenceSetting || standaloneSetting

  let model = ''
  let exactness: PublicModelExactness = 'exact'

  if (provider === 'Claude') {
    model = canonicalClaudeModel(rawModel, setting)
  } else if (provider === 'ChatGPT') {
    model = canonicalChatGptModel(rawModel, setting)
  } else if (provider === 'Gemini') {
    model = canonicalGeminiModel(rawModel, setting)
    if (model === 'Flash' || model === 'Flash Lite' || model === 'Pro') exactness = 'version-unexposed'
  } else if (provider === 'OpenRouter') {
    model = canonicalRoutedModel(rawModel, setting)
  } else if (!provider && standaloneSetting) {
    model = ''
  } else {
    model = canonicalOtherModel(provider, rawModel, setting)
  }

  if (!model) exactness = 'model-unexposed'

  const identity = { provider, model, setting, exactness }
  return { ...identity, label: composeIdentityLabel(identity) }
}

export function getPublicModelIdentityLabel(input: PublicModelIdentityInput) {
  return getPublicModelIdentity(input).label
}
