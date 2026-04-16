'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border transition-all duration-200 ${
        copied
          ? 'bg-green-50 border-green-300 text-green-700'
          : 'text-gray-500 hover:text-brand-orange bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-brand-orange/40'
      }`}
      title={copied ? 'Copied to clipboard!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  )
}
