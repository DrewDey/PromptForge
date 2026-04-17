'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

type Variant = 'light' | 'dark'

export default function CopyButton({
  text,
  variant = 'light',
}: {
  text: string
  variant?: Variant
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Light variant — for white card backgrounds (legacy path)
  const lightCls = copied
    ? 'bg-green-50 border-green-300 text-green-700'
    : 'text-surface-500 hover:text-brand-orange bg-surface-50 hover:bg-surface-100 border-surface-200 hover:border-brand-orange/60'

  // Dark variant — sits inside the CodeBlock header chrome.
  // Matches the label spec exactly (surface-300, tracking-[0.14em]) so the
  // dot + label + copy button read as one row at rest; lifts on hover.
  const darkCls = copied
    ? 'bg-green-500/10 border-green-500/40 text-green-400'
    : 'text-surface-300 hover:text-white bg-transparent hover:bg-surface-800 border-surface-700 hover:border-surface-600'

  // Copy button width is fixed; label/meta in the header are free to shrink.
  const trackingCls = variant === 'dark' ? 'tracking-[0.14em]' : 'tracking-wider'
  const shrinkCls = variant === 'dark' ? 'shrink-0' : ''
  // Focus ring matches the surface: brand-orange on light cards, white on the
  // dark CodeBlock header where orange-on-orange would disappear.
  const focusCls = variant === 'dark'
    ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
    : 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange'

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase ${trackingCls} ${shrinkCls} ${focusCls} px-2.5 py-1 border transition-all duration-200 ${
        variant === 'dark' ? darkCls : lightCls
      }`}
      title={copied ? 'Copied to clipboard!' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy
        </>
      )}
    </button>
  )
}
