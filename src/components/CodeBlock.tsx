import CopyButton from '@/app/prompt/[id]/CopyButton'

type Variant = 'prompt' | 'result'

type Props = {
  code: string
  /** Short label shown in the editor header bar, e.g. "prompt", "result". */
  label?: string
  /** Controls the accent dot color in the header (orange = input, blue = output). */
  variant?: Variant
  /** Secondary text that sits right of the label (e.g. step number, filename). */
  meta?: string
  /** Show a subtle line-number gutter. Off by default — prompts are natural
   *  language and wrap, so numbers can misalign with visual rows. */
  showLineNumbers?: boolean
}

/**
 * CodeBlock — the unified "code editor panel" used to render prompts and
 * AI results on the project detail page.
 *
 * Why it exists: the previous treatment stacked a separate eyebrow label,
 * a separate copy button, and a plain <pre> (or worse, a white prose box
 * for the result). That produced two kinds of "prompt rendering" on the
 * same page and fought the design direction (Linear / Vercel / Raycast).
 * A single component with its own chrome — a proper header bar with dot,
 * label, meta and integrated copy — reads as one cohesive unit and gives
 * prompt and result visual parity.
 */
export default function CodeBlock({
  code,
  label,
  variant = 'prompt',
  meta,
  showLineNumbers = false,
}: Props) {
  const dotClass = variant === 'prompt' ? 'bg-brand-orange' : 'bg-brand-blue'
  const lines = showLineNumbers ? code.split('\n') : null

  return (
    <div className="overflow-hidden border border-surface-800 bg-surface-900 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      {/* Header chrome — traffic-light dot, label, optional meta, copy button */}
      <div className="flex items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-3.5 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-block w-2 h-2 flex-shrink-0 ${dotClass}`} aria-hidden="true" />
          {label && (
            <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-surface-300">
              {label}
            </span>
          )}
          {meta && (
            <>
              <span aria-hidden="true" className="text-surface-700 text-xs">·</span>
              <span className="text-[11px] font-mono text-surface-500 truncate">{meta}</span>
            </>
          )}
        </div>
        <CopyButton text={code} variant="dark" />
      </div>

      {/* Body — monospace on dark surface, with an optional faint line-number gutter */}
      <div className="flex text-[13px] leading-[1.65]">
        {lines && (
          <div
            aria-hidden="true"
            className="select-none text-right text-surface-600 font-mono pl-4 pr-3 py-4 border-r border-surface-800 bg-surface-900/60"
          >
            {lines.map((_, i) => (
              <div key={i} className="tabular-nums">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <pre className="flex-1 min-w-0 font-mono whitespace-pre-wrap break-words text-surface-200 px-4 py-4 overflow-x-auto">
          {code}
        </pre>
      </div>
    </div>
  )
}
