'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateCommunityProjectReport } from '@/lib/community-project-actions'
import type { CommunityProjectReport } from '@/lib/data/community-projects'

export default function AdminCommunityProjectReportActions({
  reportId,
  status,
}: {
  reportId: string
  status: CommunityProjectReport['status']
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const result = await updateCommunityProjectReport(new FormData(event.currentTarget))
      setMessage(result.success ? 'Report state updated and confirmed.' : result.error ?? 'Report state was not confirmed.')
    } catch {
      setMessage('The request failed before PathForge could confirm the report state. The authoritative state was reloaded.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 border-t border-red-200 pt-3">
      <input type="hidden" name="report_id" value={reportId} />
      <label className="grid gap-1 text-xs font-bold text-red-900">
        Review state
        <select name="status" defaultValue={status === 'open' ? 'reviewing' : status} className="min-h-10 border border-red-200 bg-white px-2 font-normal text-surface-900">
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold text-red-900">
        Internal decision notes
        <textarea name="resolution_notes" minLength={10} maxLength={4000} rows={2} className="border border-red-200 bg-white p-2 font-normal text-surface-900" placeholder="Required when resolving or dismissing." />
      </label>
      <button disabled={pending} className="min-h-10 justify-self-start border border-red-400 bg-white px-3 text-xs font-black text-red-900 disabled:opacity-50">{pending ? 'Saving…' : 'Update report'}</button>
      {message && <p role="status" className="text-xs text-red-800">{message}</p>}
    </form>
  )
}
