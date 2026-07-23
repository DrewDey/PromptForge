'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  declineCommunityProject,
  publishCommunityProject,
  removeCommunityProjectAsAdmin,
  requestCommunityProjectRepair,
  type CommunityProjectActionResult,
} from '@/lib/community-project-actions'
import type { CommunityProjectStatus } from '@/lib/community-project-contract'

export default function AdminCommunityProjectActions({
  id,
  status,
  needsSourceCheck,
}: {
  id: string
  status: CommunityProjectStatus
  needsSourceCheck: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')

  async function run(name: string, action: (data: FormData) => Promise<CommunityProjectActionResult>, data: FormData) {
    setPending(name)
    setMessage('')
    try {
      const result = await action(data)
      if (!result.success) {
        setMessage(result.error ?? 'The action failed closed; no change was confirmed.')
        return
      }
      setMessage(result.warning ?? `${name} completed and was confirmed.`)
      if (result.promptId) router.push(`/prompt/${result.promptId}`)
    } catch {
      setMessage(`${name} was not confirmed because the request failed. PathForge reloaded the authoritative state below.`)
    } finally {
      setPending('')
      router.refresh()
    }
  }

  return (
    <div className="grid gap-5">
      {status === 'queued' && (
        <form action={(data) => run('Publish', publishCommunityProject, data)} className="border border-green-200 bg-green-50 p-4">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-black text-green-950">Publish reviewed bundle</h2>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-green-900">
            <label className="flex items-start gap-3"><input type="checkbox" name="artifact_reviewed" value="yes" required className="mt-1" /><span>I reviewed the inert artifact source, scanner record, and visible behavior claims without executing quarantined code.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="evidence_reviewed" value="yes" required className="mt-1" /><span>I compared the artifact, checkpoints, evidence-scope label, provider, and model claims.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="privacy_rights_reviewed" value="yes" required className="mt-1" /><span>I reviewed the bundle for secrets, personal information, obvious rights conflicts, and unrelated private material.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="public_truth_reviewed" value="yes" required className="mt-1" /><span>I verified that the public page will label builder, model, source, evidence scope, and reuse permission without exaggeration.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="moderation_reviewed" value="yes" required className="mt-1" /><span>I checked the Community Guidelines and found the project appropriate for this pilot.</span></label>
          </div>
          {needsSourceCheck && <label className="mt-3 flex items-start gap-3 text-sm leading-6 text-green-900"><input type="checkbox" name="source_access_confirmed" value="yes" required className="mt-1" /><span>I copied the source URL into a clean private/incognito browser with no provider account signed in, and confirmed that it displays the submitted run without authentication.</span></label>}
          <label className="mt-3 grid gap-1 text-xs font-bold text-green-950">Private review record<textarea name="reviewer_notes" required minLength={20} maxLength={4000} rows={4} className="border border-green-300 bg-white p-3 text-sm font-normal text-surface-900" placeholder="Record what you tested, any limitations, and why the public claims are supportable." /></label>
          <button disabled={Boolean(pending)} className="mt-4 min-h-11 bg-green-700 px-4 py-2 text-sm font-black text-white disabled:bg-green-300">{pending === 'Publish' ? 'Publishing…' : 'Publish atomically'}</button>
        </form>
      )}
      {status === 'queued' && (
        <form action={(data) => run('Repair request', requestCommunityProjectRepair, data)} className="border border-amber-200 bg-amber-50 p-4">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-black text-amber-950">Request a replacement bundle</h2>
          <textarea name="builder_note" required minLength={10} maxLength={2000} rows={3} className="mt-3 w-full border border-amber-300 bg-white p-3 text-sm" placeholder="Name the exact issue and what a safe replacement must change." />
          <button disabled={Boolean(pending)} className="mt-3 min-h-11 border border-amber-700 bg-white px-4 py-2 text-sm font-black text-amber-900 disabled:opacity-50">Request repair</button>
        </form>
      )}
      {['queued', 'needs_repair'].includes(status) && (
        <form action={(data) => run('Decline', declineCommunityProject, data)} className="border border-surface-300 bg-surface-50 p-4">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-black text-surface-900">Close without publication</h2>
          <textarea name="builder_note" required minLength={10} maxLength={2000} rows={3} className="mt-3 w-full border border-surface-300 bg-white p-3 text-sm" placeholder="Explain why this bundle is being declined." />
          <button disabled={Boolean(pending)} className="mt-3 min-h-11 border border-surface-500 bg-white px-4 py-2 text-sm font-black text-surface-800 disabled:opacity-50">Decline</button>
        </form>
      )}
      {!['withdrawn', 'removed'].includes(status) && (
        <form action={(data) => run('Removal', removeCommunityProjectAsAdmin, data)} className="border border-red-300 bg-red-50 p-4">
          <input type="hidden" name="id" value={id} />
          <h2 className="font-black text-red-950">Immediate moderation removal</h2>
          <textarea name="reason" required minLength={10} maxLength={2000} rows={3} className="mt-3 w-full border border-red-300 bg-white p-3 text-sm" placeholder="Record the reason for immediate removal." />
          <button disabled={Boolean(pending)} className="mt-3 min-h-11 bg-red-700 px-4 py-2 text-sm font-black text-white disabled:bg-red-300">Remove page and artifact access</button>
        </form>
      )}
      {message && <div role="status" className="border border-surface-300 bg-white p-3 text-sm text-surface-700">{message}</div>}
    </div>
  )
}
