/**
 * Heuristic classifier: is a step's content literal code/markup, or
 * natural-language prose? PathForge step content is *mostly* prose (the
 * author describing what they asked or what the model returned), so the
 * default is 'prose'. Switch to 'code' only when the payload has enough
 * programmer-ish signals that a monospace/dark-panel treatment genuinely
 * helps readability — think snippets pasted into the prompt, or raw JSON
 * returned by the model.
 *
 * Signals that flip the verdict to 'code':
 *   - Fenced code block present (```…```), anywhere in the payload.
 *   - HTML-ish tags (`<div>`, `</Button>`, `<img />`) — structured markup.
 *   - Dense `;` line-endings — C/JS/Java style statement terminators.
 *   - Dense `{ }` lines — JSON / block-scoped code shapes.
 *   - Dense leading-whitespace indentation — pasted-in source files.
 *
 * Each signal is measured as a ratio against total non-empty lines so a
 * prose block that happens to mention "`if (x) { y }`" once doesn't trip
 * the detector.
 */
export type ContentKind = 'prose' | 'code'

export function detectContentKind(raw: string | null | undefined): ContentKind {
  const text = (raw ?? '').trim()
  if (!text) return 'prose'

  if (text.includes('```')) return 'code'

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length === 0) return 'prose'

  const htmlTagLines = lines.filter(l => /<\/?[a-zA-Z][\w:-]*[^<>]*>/.test(l)).length
  if (htmlTagLines / lines.length > 0.25) return 'code'

  const semicolonEndLines = lines.filter(l => /[;]\s*$/.test(l)).length
  if (semicolonEndLines / lines.length > 0.3) return 'code'

  const braceOnlyLines = lines.filter(l => /^[{}\[\],]+$/.test(l)).length
  if (braceOnlyLines / lines.length > 0.15) return 'code'

  const indentedLines = lines.filter(l => /^(?:\s{2,}|\t)/.test(l.replace(/^\s+$/, ''))).length
  const rawLines = text.split('\n').filter(l => l.trim().length > 0)
  const rawIndented = rawLines.filter(l => /^(?:\s{2,}|\t)/.test(l)).length
  if (rawLines.length >= 4 && rawIndented / rawLines.length > 0.5) return 'code'

  void indentedLines
  return 'prose'
}
