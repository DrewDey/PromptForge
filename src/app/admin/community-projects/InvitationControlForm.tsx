'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setCommunityProjectInvitationControl } from '@/lib/community-project-actions'

export default function InvitationControlForm({
  enabled,
  canAttemptEnable,
  blockReason,
}: {
  enabled: boolean
  canAttemptEnable: boolean
  blockReason: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function update(nextEnabled: boolean, formData = new FormData()) {
    setPending(true)
    setMessage('')
    formData.set('enabled', nextEnabled ? 'yes' : 'no')
    try {
      const result = await setCommunityProjectInvitationControl(formData)
      setMessage(result.success
        ? nextEnabled
          ? 'External invited-builder submissions are enabled.'
          : 'External invited-builder submissions are locked.'
        : result.error ?? 'The invitation state was not confirmed.')
    } catch {
      setMessage('The request failed before PathForge could confirm the invitation state.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await update(true, new FormData(event.currentTarget))
  }

  return (
    <div className="mt-3 grid gap-3">
      {enabled ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void update(false)}
          className="min-h-11 justify-self-start border border-red-700 bg-white px-4 py-2 text-sm font-black text-red-900 disabled:opacity-50"
        >
          {pending ? 'Locking…' : 'Lock external submissions'}
        </button>
      ) : (
        <form onSubmit={submit} className="grid max-w-2xl gap-3">
          {!canAttemptEnable && (
            <p role="alert" className="border border-red-300 bg-red-50 p-3 text-xs font-bold leading-5 text-red-950">
              {blockReason}
            </p>
          )}
          <label className="grid gap-1 text-xs font-bold">
            Private expansion-record reference
            <input
              name="launch_readiness_reference"
              required
              minLength={8}
              maxLength={200}
              autoComplete="off"
              placeholder="Non-secret record ID or date"
              className="min-h-11 border border-current bg-white px-3 font-normal text-surface-900"
            />
            <span className="font-normal leading-5">
              Store only a non-secret ID or date. The database keeps this reference with the verified gate snapshot.
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs font-bold leading-5">
            <input
              name="launch_readiness_confirmed"
              value="yes"
              type="checkbox"
              required
              className="mt-1 h-4 w-4"
            />
            <span>
              I confirmed the private record has named primary and backup coverage, tested distinct primary and
              escalation alert destinations, a healthy scheduled recovery heartbeat, policy dispositions,
              production evidence, and capacity; Supabase leaked-password protection is enabled and every current
              security-advisor warning has a reviewed disposition.
            </span>
          </label>
          <button
            disabled={pending || !canAttemptEnable}
            className="min-h-11 justify-self-start bg-surface-900 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Verifying database gates…' : 'Verify gates and enable invited-builder submissions'}
          </button>
        </form>
      )}
      {message && <p role="status" className="mt-2 text-xs leading-5">{message}</p>}
    </div>
  )
}
