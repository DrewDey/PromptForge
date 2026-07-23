'use client'

import { useState } from 'react'
import { reportCommunityProject } from '@/lib/community-project-actions'

export default function ReportProjectForm({ promptId }: { promptId: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await reportCommunityProject(new FormData(event.currentTarget))
      if (!result.success) {
        setError(result.error ?? 'PathForge could not file this report.')
        return
      }
      setComplete(true)
    } catch {
      setError('The report connection failed and receipt was not confirmed. Retry, or use the copyright guidance for an urgent report.')
    } finally {
      setSubmitting(false)
    }
  }

  if (complete) {
    return <div role="status" className="border border-green-300 bg-green-50 p-5 text-sm leading-6 text-green-900"><strong className="block">Report received.</strong> PathForge can suspend the project immediately if continued access could cause harm.</div>
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <input type="hidden" name="prompt_id" value={promptId} />
      <label className="hidden" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-wider text-surface-600">Your email</span><input name="email" type="email" required maxLength={254} className="min-h-11 border border-surface-300 px-3 text-sm" /></label>
      <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-wider text-surface-600">Reason</span><select name="reason" required className="min-h-11 border border-surface-300 bg-white px-3 text-sm"><option value="privacy">Privacy or personal information</option><option value="copyright">Copyright or ownership</option><option value="malware">Malware or unsafe behavior</option><option value="abuse">Harassment or abusive content</option><option value="misleading">Misleading provenance or claims</option><option value="other">Other</option></select></label>
      <label className="grid gap-2"><span className="text-xs font-bold uppercase tracking-wider text-surface-600">What should PathForge review?</span><textarea name="details" required minLength={20} maxLength={4000} rows={7} className="border border-surface-300 px-3 py-2 text-sm leading-6" /></label>
      {error && <div role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <button disabled={submitting} className="min-h-12 bg-surface-900 px-5 py-3 text-sm font-black text-white disabled:bg-surface-300">{submitting ? 'Filing report…' : 'File private report'}</button>
    </form>
  )
}
