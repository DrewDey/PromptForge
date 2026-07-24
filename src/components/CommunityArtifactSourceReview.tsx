'use client'

import { useState } from 'react'
import { Code2, LoaderCircle } from 'lucide-react'

type LoadState =
  | { status: 'idle'; source: null; error: null }
  | { status: 'loading'; source: null; error: null }
  | { status: 'loaded'; source: string; error: null }
  | { status: 'failed'; source: null; error: string }

export default function CommunityArtifactSourceReview({
  submissionId,
  title,
}: {
  submissionId: string
  title: string
}) {
  const [state, setState] = useState<LoadState>({ status: 'idle', source: null, error: null })

  async function loadSource() {
    setState({ status: 'loading', source: null, error: null })
    try {
      const response = await fetch(`/api/community-artifacts/submissions/${submissionId}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('The private artifact source is unavailable.')
      const source = await response.text()
      setState({ status: 'loaded', source, error: null })
    } catch (error) {
      setState({
        status: 'failed',
        source: null,
        error: error instanceof Error ? error.message : 'The private artifact source is unavailable.',
      })
    }
  }

  return (
    <div className="border border-surface-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 bg-surface-50 p-4">
        <div>
          <strong className="block text-sm text-surface-900">{title}</strong>
          <span className="mt-1 block text-xs leading-5 text-surface-500">
            Quarantined HTML is shown only as inert source text. It is never executed on this review page.
          </span>
        </div>
        {state.status !== 'loaded' && (
          <button
            type="button"
            onClick={loadSource}
            disabled={state.status === 'loading'}
            className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2 text-xs font-black text-surface-900 disabled:cursor-wait disabled:opacity-60"
          >
            {state.status === 'loading'
              ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Code2 className="h-4 w-4" aria-hidden="true" />}
            {state.status === 'loading' ? 'Loading source…' : 'Load source text'}
          </button>
        )}
      </div>
      {state.status === 'failed' && (
        <p role="alert" className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {state.error}
        </p>
      )}
      {state.status === 'loaded' && (
        <textarea
          readOnly
          aria-label={`${title} inert HTML source`}
          value={state.source}
          spellCheck={false}
          className="block h-[34rem] w-full resize-y bg-surface-950 p-4 font-mono text-[11px] leading-5 text-surface-100 outline-none"
        />
      )}
    </div>
  )
}
