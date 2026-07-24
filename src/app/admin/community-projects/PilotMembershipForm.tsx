'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setCommunityProjectPilotMember } from '@/lib/community-project-actions'

export default function PilotMembershipForm({
  externalInvitationsEnabled,
}: {
  externalInvitationsEnabled: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setMessage('')
    try {
      const result = await setCommunityProjectPilotMember(new FormData(form))
      setMessage(result.success ? 'Pilot access updated and confirmed.' : result.error ?? 'Pilot access was not confirmed.')
      if (result.success) form.reset()
    } catch {
      setMessage('The request failed before PathForge could confirm the access state. The current database state was reloaded below.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border border-surface-200 bg-white p-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="grid gap-1.5 text-xs font-bold text-surface-600">
        PathForge username
        <input name="username" required maxLength={80} className="min-h-11 border border-surface-300 px-3 text-sm font-normal text-surface-900" placeholder="username" />
      </label>
      <label className="grid gap-1.5 text-xs font-bold text-surface-600">
        Access lane
        <select name="member_kind" defaultValue="internal_acceptance" className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal text-surface-900">
          <option value="internal_acceptance">Owner-operated acceptance account</option>
          <option value="invited_builder" disabled={!externalInvitationsEnabled}>External invited builder{externalInvitationsEnabled ? '' : ' — locked'}</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold text-surface-600">
        Access note
        <input name="note" maxLength={1000} className="min-h-11 border border-surface-300 px-3 text-sm font-normal text-surface-900" placeholder="Pilot cohort or reason" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:pb-0.5">
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-surface-700">
          <input type="checkbox" name="active" value="yes" defaultChecked /> Active
        </label>
        <button disabled={pending} className="min-h-11 bg-surface-900 px-4 py-2 text-sm font-black text-white disabled:bg-surface-300">
          {pending ? 'Saving…' : 'Save access'}
        </button>
      </div>
      {message && <p role="status" className="text-xs text-surface-600 sm:col-span-2 lg:col-span-4">{message}</p>}
    </form>
  )
}
