function titleFromNotes(notes: string | null) {
  const match = notes?.match(/^Title:\s*(.+)$/m)
  return match?.[1]?.trim()
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

export function agentNotesForSourceRunReview(notes: string | null) {
  const raw = notes?.trim() ?? ''
  if (!raw) return ''

  const hasLegacyGeneratedNotes = raw.includes('Let the agent structure this captured source run into a PathForge project page.')
    || raw.includes('Page shape: final artifact embedded first')
    || raw.includes('Seed package:')

  if (!hasLegacyGeneratedNotes) return raw

  const hiddenPrefixes = [
    'Title:',
    'Description:',
    'Provider/model:',
    'Chain type:',
    'Source run:',
    'Final artifact:',
    'Verification:',
    'Seed package:',
    'Profile registry ID:',
  ]

  return raw
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
