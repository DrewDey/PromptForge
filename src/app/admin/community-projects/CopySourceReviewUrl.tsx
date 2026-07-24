'use client'

import { useState } from 'react'

export default function CopySourceReviewUrl({ sourceUrl }: { sourceUrl: string }) {
  const [message, setMessage] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(sourceUrl)
      setMessage('Copied. Paste it into a clean private/incognito browser with no provider account signed in.')
    } catch {
      setMessage('Copy failed. Select the read-only URL and copy it manually into a clean private/incognito browser.')
    }
  }

  return (
    <div className="mt-4 grid gap-2">
      <label className="grid gap-1 text-xs font-bold text-surface-600">
        Source URL for clean-browser verification
        <input readOnly value={sourceUrl} className="min-h-11 border border-surface-300 bg-surface-50 px-3 font-mono text-[11px] text-surface-800" />
      </label>
      <button type="button" onClick={copy} className="min-h-11 border border-surface-300 bg-white px-3 py-2 text-xs font-bold text-surface-800 hover:border-brand-orange">
        Copy source URL
      </button>
      {message && <p role="status" className="text-xs leading-5 text-surface-600">{message}</p>}
    </div>
  )
}
