import { respondToBuildRequest } from '@/lib/actions'

export default function BuildRequestResponseForm({ requestId }: { requestId: string }) {
  return (
    <form action={respondToBuildRequest} className="mt-5 border-t border-surface-100 pt-4">
      <input type="hidden" name="request_id" value={requestId} />
      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
        <label htmlFor={`build-request-url-${requestId}`} className="sr-only">
          Link to a PathForge build or fork
        </label>
        <input
          id={`build-request-url-${requestId}`}
          name="url"
          type="url"
          placeholder="Link to a PathForge build or fork"
          className="border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-[#07551f] focus:outline-none"
        />
        <label htmlFor={`build-request-note-${requestId}`} className="sr-only">
          Short note about what you made
        </label>
        <input
          id={`build-request-note-${requestId}`}
          name="body"
          placeholder="Short note about what you made"
          className="border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-[#07551f] focus:outline-none"
        />
        <button type="submit" className="bg-[#07551f] px-4 py-2.5 text-sm font-bold text-white hover:bg-surface-900">
          Respond
        </button>
      </div>
    </form>
  )
}
