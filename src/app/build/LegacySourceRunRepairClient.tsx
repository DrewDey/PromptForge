'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Link2, Wrench } from 'lucide-react'
import { submitSourceRun } from '@/lib/actions'
import { loadMyForgeRepairContext } from '@/lib/my-forge-actions'
import type { MyForgeRepairContext } from '@/lib/my-forge-types'
import { detectSourceRunProvider } from '@/lib/source-run-review'

const providerOptions = ['ChatGPT', 'Claude', 'Gemini', 'OpenRouter', 'Other']

export default function LegacySourceRunRepairClient({ repairId }: { repairId: string }) {
  const router = useRouter()
  const [context, setContext] = useState<MyForgeRepairContext | null>(null)
  const [repairSubmissionId, setRepairSubmissionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [provider, setProvider] = useState('')
  const [providerTouched, setProviderTouched] = useState(false)
  const [customProvider, setCustomProvider] = useState('')
  const [model, setModel] = useState('')
  const [modelSettings, setModelSettings] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const repairContextReady = Boolean(repairId && repairSubmissionId === repairId && context)
  const detectedProvider = detectSourceRunProvider(sourceUrl)
  const selectedProvider = providerTouched ? provider : detectedProvider

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setContext(null)
      setRepairSubmissionId(null)
      setError('')
    })
    void loadMyForgeRepairContext(repairId).then((result) => {
      if (!active) return
      if (!result.success || !result.data) {
        setError(result.error || 'That repair entry is unavailable.')
        return
      }
      setContext(result.data)
      setRepairSubmissionId(result.data.submissionId)
      setTitle(`${result.data.title} repair`)
      setNotes([
        `Repair submission for ${result.data.submissionId}.`,
        result.data.userStatusNote ? `Review issue: ${result.data.userStatusNote}` : '',
      ].filter(Boolean).join('\n\n'))
    }).catch(() => {
      if (active) setError('The repair record connection failed. Retry this page or return to My Forge.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [repairId])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (repairId && !repairContextReady) {
      setError('The repair record must load before this can be submitted. Retry the repair or return to My Forge.')
      return
    }
    const resolvedProvider = selectedProvider === 'Other'
      ? customProvider.trim()
      : selectedProvider.trim()
    if (!resolvedProvider || !model.trim() || !title.trim() || !sourceUrl.trim()) {
      setError('Complete the title, replacement source link, AI service, and visible model.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await submitSourceRun({
        title: title.trim(),
        source_url: sourceUrl.trim(),
        provider: resolvedProvider,
        model_used: model.trim(),
        model_settings: modelSettings.trim(),
        notes: notes.trim(),
        resubmission_of_id: repairContextReady ? repairSubmissionId : null,
        privacy_attested: true,
        queue_only_attested: true,
      })
      if (!result.success) {
        setError(result.error ?? 'PathForge could not submit this repair.')
        return
      }
      router.push(`/my-forge?submitted=${encodeURIComponent(result.id ?? '')}`)
      router.refresh()
    } catch {
      setError('The repair connection failed and receipt was not confirmed. Retry when the connection is stable.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-[70vh] bg-surface-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link href="/my-forge" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Forge</Link>
        <header className="mt-6 border-b border-surface-200 pb-7">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink"><Wrench className="h-4 w-4" aria-hidden="true" /> Historical source-run repair</div>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-surface-900">Replace the source evidence</h1>
          <p className="mt-3 text-sm leading-6 text-surface-600">This narrow form repairs an earlier link-based submission. New projects use the artifact-and-evidence pilot instead.</p>
        </header>

        {loading ? (
          <div role="status" className="mt-7 border border-surface-200 bg-white p-6 text-sm text-surface-600">Loading the owner-scoped repair record…</div>
        ) : repairContextReady ? (
          <form onSubmit={submit} className="mt-7 grid gap-5 border border-surface-200 bg-white p-5 sm:p-7">
            {context?.userStatusNote && <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong className="block">What review needs changed</strong>{context.userStatusNote}</div>}
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Project title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" /></label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Replacement public session link<div className="flex min-h-11 items-center border border-surface-300"><Link2 className="ml-3 h-4 w-4 text-surface-400" aria-hidden="true" /><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required className="min-w-0 flex-1 px-3 text-sm font-normal normal-case tracking-normal outline-none" placeholder="Use a corrected or newly shared provider URL" /></div></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">AI service<select value={selectedProvider} onChange={(event) => { setProvider(event.target.value); setProviderTouched(Boolean(event.target.value)) }} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-surface-900"><option value="">Detect from link</option>{providerOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Exact visible model<input value={model} onChange={(event) => setModel(event.target.value)} required maxLength={160} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" placeholder="Exact label, or Not sure" /></label>
            </div>
            {selectedProvider === 'Other' && <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Service name<input value={customProvider} onChange={(event) => setCustomProvider(event.target.value)} required maxLength={80} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" /></label>}
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Model settings <span className="normal-case tracking-normal text-surface-400">optional</span><textarea value={modelSettings} onChange={(event) => setModelSettings(event.target.value)} maxLength={1000} rows={2} className="border border-surface-300 p-3 text-sm font-normal normal-case tracking-normal text-surface-900" /></label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">Repair notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={4} className="border border-surface-300 p-3 text-sm font-normal normal-case tracking-normal text-surface-900" /></label>
            <div className="grid gap-3 border border-surface-200 bg-surface-50 p-4 text-sm leading-6 text-surface-700">
              <label className="flex items-start gap-3"><input type="checkbox" required className="mt-1" /><span>I may share this provider link with PathForge review, and I checked the notes for secrets and personal information.</span></label>
              <label className="flex items-start gap-3"><input type="checkbox" required className="mt-1" /><span>I understand this creates a private review record and does not publish the conversation or project automatically.</span></label>
            </div>
            {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm normal-case tracking-normal text-red-800">{error}</div>}
            <button disabled={submitting} className="min-h-12 bg-brand-orange px-5 py-3 text-sm font-black text-surface-900 disabled:bg-surface-200">{submitting ? 'Submitting replacement…' : 'Submit replacement source evidence'}</button>
          </form>
        ) : (
          <div role="alert" className="mt-7 border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">{error || 'That repair entry is unavailable.'}</div>
        )}
      </div>
    </main>
  )
}
