'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GitBranch, Link2, ShieldCheck } from 'lucide-react'
import { submitSourceRun } from '@/lib/actions'
import { trackActivationEvent } from '@/lib/activation/track'
import { markProjectForkStarted } from '@/lib/my-forge-actions'
import type { ProjectForkSource } from '@/lib/project-forks'
import { detectSourceRunProvider } from '@/lib/source-run-review'

const providerOptions = ['ChatGPT', 'Claude', 'Gemini', 'OpenRouter', 'Other']

export default function LegacySourceRunIntakeClient({
  forkSource,
}: {
  forkSource: ProjectForkSource | null
}) {
  const router = useRouter()
  const [title, setTitle] = useState(
    forkSource ? `${forkSource.sourceProjectTitle || 'Project'} fork` : '',
  )
  const [sourceUrl, setSourceUrl] = useState('')
  const [provider, setProvider] = useState('')
  const [providerTouched, setProviderTouched] = useState(false)
  const [customProvider, setCustomProvider] = useState('')
  const [model, setModel] = useState('')
  const [modelSettings, setModelSettings] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const detectedProvider = detectSourceRunProvider(sourceUrl)
  const selectedProvider = providerTouched ? provider : detectedProvider

  useEffect(() => {
    if (!forkSource?.sourceProjectId) return
    void markProjectForkStarted(forkSource)
    void trackActivationEvent({
      eventName: 'builder_action_started',
      surface: 'build',
      action: 'fork',
      projectId: forkSource.sourceProjectId,
      projectTitle: forkSource.sourceProjectTitle,
      sourceRunId: forkSource.sourceRunId,
    })
  }, [forkSource])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedProvider = selectedProvider === 'Other'
      ? customProvider.trim()
      : selectedProvider.trim()
    if (!resolvedProvider || !model.trim() || !title.trim() || !sourceUrl.trim()) {
      setError('Complete the title, public source link, AI service, and visible model.')
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
        fork_source: forkSource,
        privacy_attested: true,
        queue_only_attested: true,
      })
      if (!result.success || !result.id) {
        setError(result.error ?? 'PathForge could not create the private review record.')
        return
      }
      await trackActivationEvent({
        eventName: 'source_run_submitted',
        surface: 'build',
        action: forkSource ? 'fork' : 'share',
        projectId: forkSource?.sourceProjectId,
        projectTitle: forkSource?.sourceProjectTitle,
        sourceRunId: forkSource?.sourceRunId,
      }).catch(() => undefined)
      router.push(`/my-forge?submitted=${encodeURIComponent(result.id)}`)
      router.refresh()
    } catch {
      setError('The review record was not confirmed. Retry when the connection is stable.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-[70vh] bg-surface-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link href={forkSource ? `/prompt/${forkSource.sourceProjectId}` : '/paths'} className="inline-flex items-center gap-2 text-sm font-bold text-surface-500 hover:text-brand-orange-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {forkSource ? 'Back to source project' : 'Browse projects'}
        </Link>

        <header className="mt-6 grid gap-6 border-b border-surface-200 pb-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
              Queue-only source-run handoff
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-surface-900">
              {forkSource ? 'Continue from this project' : 'Submit a source run'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-600">
              Attach the public provider conversation and exact model to a private review record. This preserves existing PathForge fork and source-run workflows; it does not publish the conversation or create a public project automatically.
            </p>
          </div>
          <div className="border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-950">
            <ShieldCheck className="mb-2 h-5 w-5" aria-hidden="true" />
            Want to submit a complete project file and scoped evidence instead? Use the <Link href="/build" className="font-black underline">invitation-only project upload</Link>.
          </div>
        </header>

        {forkSource && (
          <section className="mt-7 border border-green-300 bg-green-50 p-4" data-legacy-fork-source>
            <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-green-800">
              <GitBranch className="h-4 w-4" aria-hidden="true" /> Exact fork source attached
            </div>
            <p className="mt-2 text-sm font-black text-green-950">
              {forkSource.sourceProjectTitle || forkSource.sourceProjectId}
            </p>
            <p className="mt-1 text-xs leading-5 text-green-800">
              {forkSource.sourceStepNumber ? `Response ${forkSource.sourceStepNumber} · ` : ''}
              lineage is stored with the queued review record.
            </p>
          </section>
        )}

        <form onSubmit={submit} className="mt-7 grid gap-5 border border-surface-200 bg-white p-5 sm:p-7">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
            Project title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" placeholder="Name the result you made" />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
            Public provider session link
            <span className="flex min-h-11 items-center border border-surface-300">
              <Link2 className="ml-3 h-4 w-4 text-surface-400" aria-hidden="true" />
              <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required className="min-w-0 flex-1 px-3 text-sm font-normal normal-case tracking-normal outline-none" placeholder="Use the provider's public share URL" />
            </span>
            <span className="font-sans text-xs font-normal normal-case tracking-normal text-surface-500">Do not paste a private account-only conversation URL.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
              AI service
              <select value={selectedProvider} onChange={(event) => { setProvider(event.target.value); setProviderTouched(Boolean(event.target.value)) }} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-surface-900">
                <option value="">Detect from link</option>
                {providerOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
              Exact visible model
              <input value={model} onChange={(event) => setModel(event.target.value)} required maxLength={160} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" placeholder="Exact label, or Not sure" />
            </label>
          </div>
          {selectedProvider === 'Other' && (
            <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
              Service name
              <input value={customProvider} onChange={(event) => setCustomProvider(event.target.value)} required maxLength={80} className="min-h-11 border border-surface-300 px-3 text-sm font-normal normal-case tracking-normal text-surface-900" />
            </label>
          )}
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
            Model settings <span className="normal-case tracking-normal text-surface-400">optional</span>
            <textarea value={modelSettings} onChange={(event) => setModelSettings(event.target.value)} maxLength={1000} rows={2} className="border border-surface-300 p-3 text-sm font-normal normal-case tracking-normal text-surface-900" placeholder="Reasoning level, tools, or other visible settings" />
          </label>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-surface-600">
            Notes for review <span className="normal-case tracking-normal text-surface-400">optional</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={4} className="border border-surface-300 p-3 text-sm font-normal normal-case tracking-normal text-surface-900" placeholder="Point review to the finished response or file and mention any known limitation." />
          </label>
          <div className="grid gap-3 border border-surface-200 bg-surface-50 p-4 text-sm leading-6 text-surface-700">
            <label className="flex items-start gap-3"><input type="checkbox" required className="mt-1" /><span>I may share this provider link with PathForge review, and I checked the notes for secrets and personal information.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" required className="mt-1" /><span>I understand this creates a private review record and does not publish the conversation or project automatically.</span></label>
          </div>
          {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          <button disabled={submitting} className="min-h-12 bg-brand-orange px-5 py-3 text-sm font-black text-surface-900 disabled:bg-surface-200">
            {submitting ? 'Creating private review record…' : 'Submit to private review queue'}
          </button>
        </form>
      </div>
    </main>
  )
}
