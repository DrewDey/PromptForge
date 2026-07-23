'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { setCommunityProjectPublicationControl } from '@/lib/community-project-actions'

export default function PublicationControlForm({
  enabled,
  operationallyReady,
}: {
  enabled: boolean
  operationallyReady: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function updateControl(nextEnabled: boolean) {
    setPending(true)
    setMessage('')
    const formData = new FormData()
    formData.set('enabled', nextEnabled ? 'yes' : 'no')
    try {
      const result = await setCommunityProjectPublicationControl(formData)
      setMessage(result.success
        ? nextEnabled
          ? enabled
            ? 'Publication readiness was freshly verified and remains enabled.'
            : 'Publication readiness was verified and publication is now enabled.'
          : 'Publication is now paused.'
        : result.error ?? 'The publication state was not confirmed.')
    } catch {
      setMessage('The request failed before PathForge could confirm the publication state. The current database state was reloaded.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateControl(enabled ? !operationallyReady : true)
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex flex-wrap gap-2">
        {(!enabled || !operationallyReady) && (
          <button
            disabled={pending}
            className="min-h-11 bg-surface-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {pending
              ? 'Checking authoritative state…'
              : enabled
                ? 'Refresh readiness and keep enabled'
                : 'Verify readiness and enable publication'}
          </button>
        )}
        {enabled && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void updateControl(false)}
            className="min-h-11 border border-red-700 bg-white px-4 py-2 text-sm font-black text-red-900 disabled:opacity-50"
          >
            {pending ? 'Updating…' : 'Pause publication'}
          </button>
        )}
      </div>
      {message && <p role="status" className="mt-2 text-xs leading-5">{message}</p>}
    </form>
  )
}
