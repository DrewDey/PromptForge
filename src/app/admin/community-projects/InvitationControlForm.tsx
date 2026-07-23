'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setCommunityProjectInvitationControl } from '@/lib/community-project-actions'

export default function InvitationControlForm({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function update(nextEnabled: boolean) {
    if (
      nextEnabled
      && !window.confirm(
        'Enable submissions for every active invited-builder account? Confirm the private expansion record is complete, Supabase leaked-password protection is enabled, a fresh security-advisor run no longer reports that warning, and operator coverage and alerts are current. Publication remains controlled separately.',
      )
    ) return

    setPending(true)
    setMessage('')
    const formData = new FormData()
    formData.set('enabled', nextEnabled ? 'yes' : 'no')
    if (nextEnabled) formData.set('launch_readiness_confirmed', 'yes')
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

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => void update(!enabled)}
        className={enabled
          ? 'min-h-11 border border-red-700 bg-white px-4 py-2 text-sm font-black text-red-900 disabled:opacity-50'
          : 'min-h-11 bg-surface-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50'}
      >
        {pending ? 'Updating…' : enabled ? 'Lock external submissions' : 'Enable invited-builder submissions'}
      </button>
      {message && <p role="status" className="mt-2 text-xs leading-5">{message}</p>}
    </div>
  )
}
