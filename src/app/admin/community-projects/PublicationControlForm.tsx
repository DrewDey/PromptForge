'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setCommunityProjectPublicationControl } from '@/lib/community-project-actions'

export default function PublicationControlForm({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage('')
    const formData = new FormData()
    formData.set('enabled', enabled ? 'no' : 'yes')
    try {
      const result = await setCommunityProjectPublicationControl(formData)
      setMessage(result.success
        ? `Publication is now ${enabled ? 'disabled' : 'enabled after fresh readiness checks'}.`
        : result.error ?? 'The publication state was not confirmed.')
    } catch {
      setMessage('The request failed before PathForge could confirm the publication state. The current database state was reloaded.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <button
        disabled={pending}
        className={`min-h-11 px-4 py-2 text-sm font-black disabled:opacity-50 ${enabled ? 'border border-red-700 bg-white text-red-900' : 'bg-surface-900 text-white'}`}
      >
        {pending
          ? 'Checking authoritative state…'
          : enabled
            ? 'Pause publication'
            : 'Verify readiness and enable publication'}
      </button>
      {message && <p role="status" className="mt-2 text-xs leading-5">{message}</p>}
    </form>
  )
}
