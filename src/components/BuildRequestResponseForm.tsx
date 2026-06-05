import { respondToBuildRequest } from '@/lib/actions'

export default function BuildRequestResponseForm({ requestId }: { requestId: string }) {
  return (
    <form action={respondToBuildRequest} className="mt-5 border-t border-[#f0dfcc] pt-4">
      <input type="hidden" name="request_id" value={requestId} />
      <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
        Attach build answer
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
        <label htmlFor={`build-request-url-${requestId}`} className="sr-only">
          Link to a PathForge build or fork
        </label>
        <input
          id={`build-request-url-${requestId}`}
          name="url"
          type="url"
          placeholder="Link to a PathForge build or fork"
          className="border border-[#d8b48a] bg-white px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-orange focus:outline-none"
        />
        <label htmlFor={`build-request-note-${requestId}`} className="sr-only">
          Short note about what you made
        </label>
        <input
          id={`build-request-note-${requestId}`}
          name="body"
          placeholder="Short note about what you made"
          className="border border-[#d8b48a] bg-white px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-orange focus:outline-none"
        />
        <button type="submit" className="bg-brand-orange px-4 py-2.5 text-sm font-black text-white hover:bg-brand-orange-dark">
          Respond
        </button>
      </div>
    </form>
  )
}
