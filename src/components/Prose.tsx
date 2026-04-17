import CopyButton from '@/app/prompt/[id]/CopyButton'

type Variant = 'prompt' | 'result'

type Props = {
  /** The natural-language body to render. Preserves author line breaks. */
  text: string
  /** Short label shown in the quiet top-row eyebrow, e.g. "ask", "result". */
  label?: string
  /** Accent dot color in the eyebrow (orange = input/ask, blue = output/result). */
  variant?: Variant
  /** Secondary eyebrow text (e.g. step number). */
  meta?: string
}

/**
 * Prose — the light editorial sibling of CodeBlock. Used for step content
 * that is natural language (a question the author asked, a paragraph the
 * model returned) rather than literal code. CodeBlock's dark mono panel
 * is the right chrome for snippets and JSON; using it for prose reads as
 * "this page is a code editor" and defeats the build-showcase vision.
 *
 * Shape:
 *  - White card, hairline surface-200 border — sits calmly inside step
 *    cards, distinct from the step-card header bar above it.
 *  - Quiet eyebrow row: accent dot + label + meta (same vocabulary as
 *    CodeBlock, so a visitor toggling between prose and code on the same
 *    page reads them as paired variants).
 *  - Reading-size sans body (text-[15px] / leading-[1.7]) — intentionally
 *    NOT monospace; preserves author-intended line breaks via
 *    whitespace-pre-line so paragraph structure survives.
 *  - Ghost copy button top-right — idle at low opacity, lifts on hover or
 *    keyboard focus within the block. Copyability is preserved; the
 *    visual chrome is what changes.
 */
export default function Prose({ text, label, variant = 'prompt', meta }: Props) {
  const dotClass = variant === 'prompt' ? 'bg-brand-orange' : 'bg-brand-blue'

  return (
    <div className="group/prose relative border border-surface-200 bg-white">
      {(label || meta) && (
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <span className={`inline-block w-1.5 h-1.5 flex-shrink-0 ${dotClass}`} aria-hidden="true" />
          {label && (
            <span className="shrink-0 text-[10.5px] font-mono font-semibold uppercase tracking-[0.16em] text-surface-500">
              {label}
            </span>
          )}
          {meta && (
            <>
              <span aria-hidden="true" className="text-surface-300 text-xs">·</span>
              <span className="text-[10.5px] font-mono text-surface-400 truncate">{meta}</span>
            </>
          )}
        </div>
      )}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover/prose:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <CopyButton text={text} variant="ghost" />
      </div>
      <p className="px-5 pt-2.5 pb-5 text-[15px] leading-[1.7] text-surface-800 whitespace-pre-line max-w-prose">
        {text}
      </p>
    </div>
  )
}
