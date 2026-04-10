export type AIModel = {
  id: string
  name: string
  provider: string
}

export const AI_MODELS: AIModel[] = [
  // Anthropic
  { id: 'claude-opus-4-6-ext', name: 'Claude 4.6 Opus Extended', provider: 'Anthropic' },
  { id: 'claude-opus-4-6', name: 'Claude 4.6 Opus', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', name: 'Claude 4.6 Sonnet', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', name: 'Claude 4.5 Haiku', provider: 'Anthropic' },
  { id: 'claude-sonnet-3-5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },

  // OpenAI
  { id: 'chatgpt-5-4-thinking', name: 'ChatGPT 5.4 Thinking', provider: 'OpenAI' },
  { id: 'chatgpt-5-4', name: 'ChatGPT 5.4', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI' },
  { id: 'o4-mini', name: 'o4-mini', provider: 'OpenAI' },
  { id: 'o3', name: 'o3', provider: 'OpenAI' },
  { id: 'o3-mini', name: 'o3-mini', provider: 'OpenAI' },

  // Google
  { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },

  // Meta
  { id: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
  { id: 'llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },

  // xAI
  { id: 'grok-3', name: 'Grok 3', provider: 'xAI' },
  { id: 'grok-3-mini', name: 'Grok 3 mini', provider: 'xAI' },

  // Other providers
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral' },
  { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere' },

  // Custom
  { id: 'other', name: 'Other', provider: '' },
]

export function getModelName(id: string): string {
  const model = AI_MODELS.find(m => m.id === id)
  return model?.name ?? id
}

export function getModelsByProvider(): Record<string, AIModel[]> {
  const grouped: Record<string, AIModel[]> = {}
  for (const model of AI_MODELS) {
    if (model.id === 'other') continue
    const provider = model.provider
    if (!grouped[provider]) grouped[provider] = []
    grouped[provider].push(model)
  }
  return grouped
}
