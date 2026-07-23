'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { withdrawCommunityProject } from '@/lib/community-project-actions'
import type { CommunityProjectStatus } from '@/lib/community-project-contract'

export default function OwnerCommunityProjectActions({
  id,
  status,
}: {
  id: string
  status: CommunityProjectStatus
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function withdraw() {
    if (!window.confirm('Withdraw this project? Any public page will stop immediately, and the private artifact will be purged.')) return
    const data = new FormData()
    data.set('id', id)
    setPending(true)
    setMessage('')
    try {
      const result = await withdrawCommunityProject(data)
      setMessage(result.error ?? result.warning ?? 'Project withdrawn and no longer public.')
    } catch {
      setMessage('The withdrawal connection failed. Public removal was not confirmed; retry now or contact a PathForge administrator.')
    } finally {
      setPending(false)
      router.refresh()
    }
  }
  return <div><button type="button" disabled={pending} onClick={withdraw} className="min-h-11 border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 disabled:opacity-50">{pending ? 'Withdrawing…' : status === 'published' ? 'Unpublish and purge artifact' : 'Withdraw and purge artifact'}</button>{message && <p role="status" className="mt-3 text-xs leading-5 text-surface-600">{message}</p>}</div>
}
