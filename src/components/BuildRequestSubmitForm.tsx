'use client'

import { useActionState } from 'react'
import { Hammer, Send } from 'lucide-react'
import { submitBuildRequest, type BuildRequestSubmitState } from '@/lib/actions'

const initialState: BuildRequestSubmitState = { error: null }

export default function BuildRequestSubmitForm() {
  const [state, formAction, pending] = useActionState(submitBuildRequest, initialState)

  return (
    <form action={formAction} className="bg-[#21150f]">
      <div className="border-b border-brand-orange/30 px-4 py-4">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
          <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
          Build ticket
        </div>
        <p className="mt-2 text-sm leading-6 text-surface-300">
          Write the ask like a builder is picking up a work order.
        </p>
      </div>

      <div className="p-4">
        <div className="mb-4 border border-brand-orange/30 bg-[#0f0f11] p-3">
          <label htmlFor="request-title" className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-brand-orange">
            <span>01 Request title</span>
            <span className="font-mono text-[10px] text-surface-500">max 120</span>
          </label>
          <input
            id="request-title"
            name="title"
            required
            minLength={4}
            maxLength={120}
            placeholder="Example: A one-file Tetris game I can fork"
            className="w-full border border-surface-700 bg-[#17171a] px-3 py-3 text-sm font-semibold text-white placeholder:text-surface-500 focus:border-brand-orange focus:outline-none"
          />
        </div>

        <div className="mb-4 border border-brand-orange/30 bg-[#0f0f11] p-3">
          <label htmlFor="request-body" className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-brand-orange">
            <span>02 Build spec</span>
            <span className="font-mono text-[10px] text-surface-500">artifact needed</span>
          </label>
          <textarea
            id="request-body"
            name="body"
            required
            minLength={20}
            rows={7}
            placeholder="Describe the artifact you want, the model or platform you care about, and what would count as a good finished result."
            className="w-full border border-surface-700 bg-[#17171a] px-3 py-3 text-sm leading-relaxed text-white placeholder:text-surface-500 focus:border-brand-orange focus:outline-none"
          />
        </div>

        {state.error && (
          <p className="mb-4 border border-red-300 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-100" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-brand-orange px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending ? 'Posting...' : 'Post build request'}
        </button>
      </div>
    </form>
  )
}
