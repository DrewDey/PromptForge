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
  // Keep it quiet at rest so the label/dot lead the eye; lift on hover.
  const darkCls = copied
    ? 'bg-green-500/10 border-green-500/40 text-green-400'
    : 'text-surface-400 hover:text-white bg-transparent hover:bg-surface-800 border-surface-700 hover:border-surface-600'

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 border transition-all duration-200 ${
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
