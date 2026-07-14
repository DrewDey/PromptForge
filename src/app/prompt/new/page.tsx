'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, LogIn, FileText, GitBranch, Check, Keyboard, Link2, Wrench } from 'lucide-react'
import { submitSourceRun } from '@/lib/actions'
import { detectSourceRunProvider } from '@/lib/source-run-review'
import {
  PROJECT_FORK_MAX_DEPTH,
  PROJECT_FORK_MAX_WIDTH,
  parseProjectForkSearchParams,
  serializeProjectForkSourceForNotes,
  type ProjectForkSource,
} from '@/lib/project-forks'
import { loadMyForgeRepairContext, markProjectForkStarted } from '@/lib/my-forge-actions'

const sourceRunProviderOptions = ['ChatGPT', 'Claude', 'Gemini', 'OpenRouter', 'Other']

function RequiredDot() {
  return <span className="ml-0.5 text-brand-orange-ink">*</span>
}

function ForkCapacityDots({
  value,
  max,
}: {
  value: number
  max: number
}) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={[
            'h-2 border',
            index < value ? 'border-[#07551f] bg-[#2bd15f]' : 'border-surface-200 bg-white',
          ].join(' ')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function ForkSourcePanel({ forkSource }: { forkSource: ProjectForkSource }) {
  const depthValue = Math.min(forkSource.depth + 1, PROJECT_FORK_MAX_DEPTH)
  const branchValue = Math.min(forkSource.branchIndex + 1, PROJECT_FORK_MAX_WIDTH)

  return (
    <div className="mb-8 overflow-hidden border border-[#07551f] bg-white shadow-[0_18px_44px_rgba(7,85,31,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative p-5 sm:p-6">
          <div className="absolute left-0 top-0 h-full w-3 border-x-2 border-[#07551f] bg-[#2bd15f] shadow-[inset_3px_0_0_rgba(255,255,255,0.24),inset_-3px_0_0_rgba(0,0,0,0.18)]" aria-hidden="true" />
          <div className="pl-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Fork source attached
            </div>
            <h2 className="mt-2 text-2xl font-black text-surface-900">
              {forkSource.sourceProjectTitle
                ? `Forking from ${forkSource.sourceProjectTitle}`
                : 'Forking from an existing PathForge project'}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
              {forkSource.sourceStepNumber && (
                <span className="border border-[#07551f]/30 bg-[#effdf3] px-2 py-1 text-[#07551f]">
                  Response {String(forkSource.sourceStepNumber).padStart(2, '0')}
                </span>
              )}
              {forkSource.sourceStepId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Step id locked
                </span>
              )}
              {forkSource.sourceRunId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Model run locked
                </span>
              )}
              {forkSource.sourceModelVariantId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Model variant locked
                </span>
              )}
              {forkSource.sourceArtifactPath && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Artifact version locked
                </span>
              )}
              {forkSource.promptFamilyId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Prompt family attached
                </span>
              )}
              {forkSource.parentForkId && (
                <span className="border border-surface-200 bg-surface-50 px-2 py-1">
                  Parent fork attached
                </span>
              )}
            </div>
          </div>
        </div>

        <aside className="border-t border-[#07551f] bg-[#effdf3] p-5 lg:border-l lg:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#07551f]">
            Branch coordinates
          </div>
          <div className="mt-3 grid gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-surface-700">
                <span>Depth</span>
                <span>{depthValue} / {PROJECT_FORK_MAX_DEPTH}</span>
              </div>
              <ForkCapacityDots value={depthValue} max={PROJECT_FORK_MAX_DEPTH} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-surface-700">
                <span>Branch</span>
                <span>{branchValue} / {PROJECT_FORK_MAX_WIDTH}</span>
              </div>
              <ForkCapacityDots value={branchValue} max={PROJECT_FORK_MAX_WIDTH} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function BuildLoggedOutLanding({
  forkSource,
  loginHref,
  signupHref,
  isCheckingAccount = false,
}: {
  forkSource: ProjectForkSource | null
  loginHref: string
  signupHref: string
  isCheckingAccount?: boolean
}) {
  return (
    <div className="bg-surface-50">
      <section className="border-b border-surface-200 bg-white text-surface-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-16">
          <div>
            <Link href="/paths" className="mb-7 inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-brand-orange-ink">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Build Paths
            </Link>
            <div className="mb-4 inline-flex items-center gap-2 border border-brand-orange/35 bg-brand-orange/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Build intake
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.03em] sm:text-5xl">
              Turn a real AI session into a review-ready Build Path.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-surface-600">
              Build is where PathForge collects the original ChatGPT, Claude, Gemini, or OpenRouter run behind a project. Signed-in builders paste the source link, add model details, and send it to review before anything becomes public.
            </p>
            {isCheckingAccount && (
              <div className="mt-5 inline-flex items-center gap-2 border border-primary-200 bg-primary-50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-orange-ink">
                <span className="h-2 w-2 animate-pulse bg-brand-orange" aria-hidden="true" />
                Checking account
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/paths" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                Browse paths
              </Link>
              <Link href={loginHref} className="inline-flex items-center gap-2 bg-brand-orange px-5 py-3 text-sm font-extrabold text-surface-900 transition hover:bg-brand-orange-light">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to share
              </Link>
              <Link href={signupHref} className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                Create account
              </Link>
              <Link href="/guide" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-brand-orange">
                <FileText className="h-4 w-4 text-brand-orange-ink" aria-hidden="true" />
                See the walkthrough
              </Link>
            </div>
          </div>

          <div className="border border-surface-200 bg-primary-50 p-5 shadow-[10px_10px_0_rgba(232,122,44,0.10)]">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">
              What sharing does
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['01', 'Start with the source run', 'Paste the original AI session link instead of rebuilding the project by hand.'],
                ['02', 'Keep model details attached', 'Provider, exact model, settings, and review notes stay with the submission.'],
                ['03', 'Queue it for review', 'The entry waits for admin review and never publishes itself automatically.'],
              ].map(([number, title, body]) => (
                <div key={number} className="grid grid-cols-[42px_1fr] gap-3 border border-primary-200 bg-white px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center bg-brand-orange font-mono text-xs font-black text-surface-900">
                    {number}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-surface-900">{title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-surface-600">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {forkSource && <ForkSourcePanel forkSource={forkSource} />}
        <div className="max-w-2xl border border-surface-200 bg-white p-5">
          <h2 className="text-xl font-black text-surface-900">Sign in when you are ready to share</h2>
          <p className="mt-2 text-sm leading-6 text-surface-600">
            Browse existing paths without an account. To submit a run, PathForge needs a profile so review can keep source links, notes, and publish decisions attached to the right builder.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SubmitProjectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const urlForkSource = useMemo(() => parseProjectForkSearchParams(searchParams), [searchParams])
  const repairId = searchParams.get('repair')
  const [repairForkSource, setRepairForkSource] = useState<ProjectForkSource | null>(null)
  const [repairSubmissionId, setRepairSubmissionId] = useState<string | null>(null)
  const [repairAttemptedId, setRepairAttemptedId] = useState<string | null>(null)
  const [repairLoading, setRepairLoading] = useState(false)
  const repairContextReady = Boolean(repairId && repairSubmissionId === repairId)
  const forkSource = repairId
    ? repairContextReady ? repairForkSource : null
    : urlForkSource
  const [authReturnPath, setAuthReturnPath] = useState('/build')

  // Source-run intake state
  const [sourceRunTitle, setSourceRunTitle] = useState('')
  const [sourceRunUrl, setSourceRunUrl] = useState('')
  const [sourceRunProvider, setSourceRunProvider] = useState('')
  const [sourceRunCustomProvider, setSourceRunCustomProvider] = useState('')
  const [sourceRunProviderTouched, setSourceRunProviderTouched] = useState(false)
  const [sourceRunModel, setSourceRunModel] = useState('')
  const [sourceRunModelSettings, setSourceRunModelSettings] = useState('')
  const [sourceRunNotes, setSourceRunNotes] = useState('')
  const [sourceRunSubmitting, setSourceRunSubmitting] = useState(false)
  const [sourceRunError, setSourceRunError] = useState('')

  useEffect(() => {
    setAuthReturnPath(`${window.location.pathname}${window.location.search}`)
    if (!forkSource) return

    setSourceRunTitle(current => (
      current.trim() ? current : `${forkSource.sourceProjectTitle || 'Forked Path'} fork`
    ))
    setSourceRunNotes(current => (
      current.trim() ? current : serializeProjectForkSourceForNotes(forkSource)
    ))
  }, [forkSource])

  useEffect(() => {
    if (isLoggedIn !== true || !forkSource?.sourceProjectId) return
    void markProjectForkStarted(forkSource)
  }, [forkSource, isLoggedIn])

  useEffect(() => {
    if (isLoggedIn !== true || !repairId || repairAttemptedId === repairId) return

    let active = true
    setRepairAttemptedId(repairId)
    setRepairSubmissionId(null)
    setRepairForkSource(null)
    setSourceRunError('')
    setRepairLoading(true)
    void loadMyForgeRepairContext(repairId).then((result) => {
      if (!active) return
      setRepairLoading(false)
      if (!result.success || !result.data) {
        setSourceRunError(result.error || 'That repair entry is unavailable.')
        return
      }

      const context = result.data
      setRepairSubmissionId(context.submissionId)
      setSourceRunTitle((current) => current.trim() ? current : `${context.title} repair`)
      setSourceRunNotes((current) => current.trim()
        ? current
        : [
          `Repair submission for ${context.submissionId}.`,
          context.userStatusNote ? `Review issue: ${context.userStatusNote}` : '',
        ].filter(Boolean).join('\n\n'))

      if (context.forkSourceProjectId) {
        setRepairForkSource({
          sourceProjectId: context.forkSourceProjectId,
          sourceProjectTitle: context.forkSourceProjectTitle || undefined,
          sourceModelVariantId: context.forkSourceModelVariantId || undefined,
          sourceRunId: context.forkSourceRunId || undefined,
          sourceStepId: context.forkSourceStepId || undefined,
          sourceStepNumber: context.forkSourceStepNumber || undefined,
          sourceArtifactPath: context.forkSourceArtifactPath || undefined,
          sourceArtifactSha256: context.forkSourceArtifactSha256 || undefined,
          parentForkId: context.forkParentSubmissionId || undefined,
          promptFamilyId: context.promptFamilyId || undefined,
          depth: context.forkDepth,
          branchIndex: context.forkBranchIndex,
        })
      }
    })

    return () => {
      active = false
    }
  }, [isLoggedIn, repairAttemptedId, repairId])

  useEffect(() => {
    if (repairId) return
    setRepairSubmissionId(null)
    setRepairForkSource(null)
    setRepairAttemptedId(null)
    setRepairLoading(false)
    setSourceRunTitle('')
    setSourceRunNotes('')
    setSourceRunError('')
  }, [repairId])

  useEffect(() => {
    if (sourceRunProviderTouched) return
    setSourceRunProvider(detectSourceRunProvider(sourceRunUrl))
  }, [sourceRunUrl, sourceRunProviderTouched])

  // Check auth
  useEffect(() => {
    let active = true
    const finishAuthCheck = (value: boolean) => {
      if (!active) return
      setIsLoggedIn(value)
    }
    const authTimeout = window.setTimeout(() => finishAuthCheck(false), 3000)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      finishAuthCheck(false)
      window.clearTimeout(authTimeout)
      return () => {
        active = false
      }
    }
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        window.clearTimeout(authTimeout)
        finishAuthCheck(!!user)
      }).catch(() => {
        window.clearTimeout(authTimeout)
        finishAuthCheck(false)
      })
    }).catch(() => {
      window.clearTimeout(authTimeout)
      finishAuthCheck(false)
    })

    return () => {
      active = false
      window.clearTimeout(authTimeout)
    }
  }, [])

  async function prepareSourceRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (repairId && !repairContextReady) {
      setSourceRunError('The repair record must load before this can be submitted. Retry the repair or return to My Forge.')
      return
    }
    const title = sourceRunTitle.trim()
    const url = sourceRunUrl.trim()
    if (!title || !url) return
    const providerSelection = sourceRunProvider.trim() || detectSourceRunProvider(url)
    const provider = providerSelection === 'Other'
      ? sourceRunCustomProvider.trim()
      : providerSelection
    const modelUsed = sourceRunModel.trim()
    const modelSettings = sourceRunModelSettings.trim()

    if (!provider) {
      setSourceRunError('Pick the AI service for this source run.')
      return
    }

    if (!modelUsed) {
      setSourceRunError('Add the exact model shown for this source run, or type Not sure.')
      return
    }

    setSourceRunSubmitting(true)
    setSourceRunError('')

    const result = await submitSourceRun({
      title,
      source_url: url,
      provider,
      model_used: modelUsed,
      model_settings: modelSettings,
      notes: sourceRunNotes,
      fork_source: forkSource,
      resubmission_of_id: repairContextReady ? repairSubmissionId : null,
    })

    setSourceRunSubmitting(false)

    if (!result.success) {
      setSourceRunError(result.error ?? 'Failed to submit entry')
      return
    }

    router.push(`/my-forge?submitted=${encodeURIComponent(result.id ?? '')}`)
    router.refresh()
  }

  const loginHref = `/auth/login?next=${encodeURIComponent(authReturnPath)}`
  const signupHref = `/auth/signup?next=${encodeURIComponent(authReturnPath)}`

  // Not logged in
  if (isLoggedIn === false) {
    return <BuildLoggedOutLanding forkSource={forkSource} loginHref={loginHref} signupHref={signupHref} />
  }

  // Loading auth state
  if (isLoggedIn === null) {
    return <BuildLoggedOutLanding forkSource={forkSource} loginHref={loginHref} signupHref={signupHref} isCheckingAccount />
  }

  const detectedSourceRunProvider = detectSourceRunProvider(sourceRunUrl)
  const selectedSourceRunProvider = sourceRunProvider.trim() || detectedSourceRunProvider
  const resolvedSourceRunProvider = selectedSourceRunProvider === 'Other'
    ? sourceRunCustomProvider.trim()
    : selectedSourceRunProvider
  const modelPlaceholder = selectedSourceRunProvider === 'OpenRouter'
    ? 'Paste the exact routed model, e.g. anthropic/claude-sonnet-4.6'
    : 'Exact model shown, or Not sure'
  const canSubmitSourceRun = Boolean(
    (!repairId || repairContextReady) &&
    !repairLoading &&
    sourceRunTitle.trim() &&
    sourceRunUrl.trim() &&
    resolvedSourceRunProvider &&
    sourceRunModel.trim()
  )
  const sourceRunReadiness = [
    { label: 'Project title', ready: Boolean(sourceRunTitle.trim()) },
    { label: 'Shared session link', ready: Boolean(sourceRunUrl.trim()) },
    { label: 'AI service', ready: Boolean(resolvedSourceRunProvider) },
    { label: 'Exact model', ready: Boolean(sourceRunModel.trim()) },
  ]
  const sourceRunReadyCount = sourceRunReadiness.filter((item) => item.ready).length

  return (
    <div className="bg-surface-50">
      <section className="border-b border-surface-200 bg-white text-surface-900">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-11">
          <Link href="/paths" className="inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-brand-orange-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Build Paths
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange-ink">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Share a finished AI build
              </div>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl">
                Bring the source. Keep the work trustworthy.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-surface-600">
                Paste the real provider conversation, identify the model, and point review to the finished result. Your source link, model info, and notes only enter the review queue; nothing publishes automatically.
              </p>
            </div>
            <aside className="border-l-2 border-brand-orange bg-primary-50 px-4 py-3 text-xs leading-5 text-surface-600">
              <strong className="block text-sm text-surface-900">Is this the right place?</strong>
              <p className="mt-1">
                Need someone to make it? <Link href="/requests" className="font-bold text-brand-orange-ink hover:underline">Post a request</Link>.
                {' '}Have site feedback? <Link href="/suggestion-box" className="font-bold text-brand-orange-ink hover:underline">Use Suggestion Box</Link>.
                {' '}Adapting a path? Fork the exact response first.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">

      {repairId && (
        <div className="mb-6 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black">
              {repairLoading
                ? 'Loading repair context…'
                : repairContextReady
                  ? 'Repair submission attached'
                  : 'Repair context could not be attached'}
            </div>
            <p className="mt-1 text-xs leading-5">
              {repairContextReady
                ? 'Continue the original work in a new source session, paste that new URL below, and keep the prior review issue in your notes.'
                : 'PathForge will not create an unrelated intake from this repair link. Retry the record or return to your workspace.'}
            </p>
            {!repairLoading && !repairContextReady && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceRunError('')
                    setRepairAttemptedId(null)
                  }}
                  className="inline-flex min-h-9 items-center border border-amber-500 bg-white px-3 py-2 text-xs font-bold hover:border-amber-700"
                >
                  Retry repair
                </button>
                <Link
                  href="/my-forge"
                  className="inline-flex min-h-9 items-center bg-surface-900 px-3 py-2 text-xs font-bold text-white hover:bg-primary-700"
                >
                  Return to My Forge
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {forkSource && <ForkSourcePanel forkSource={forkSource} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="overflow-hidden border border-surface-200 bg-white shadow-[10px_10px_0_rgba(24,24,27,0.05)]">
          <div className="border-b border-surface-200 px-5 py-5 sm:px-6">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">Source-run intake</div>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.02em] text-surface-900">Submit the original session</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
              Use the shared ChatGPT, Claude, Gemini, OpenRouter, or other provider run. Review preserves the evidence and decides whether the result belongs in the public library.
            </p>
          </div>

          <div>
              <form onSubmit={prepareSourceRun} className="space-y-6 p-5 sm:p-6">
              <fieldset className="space-y-5">
                <legend className="mb-1 flex w-full items-center gap-3 border-b border-surface-100 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center bg-surface-900 font-mono text-[10px] font-black text-white">01</span>
                  <span>
                    <strong className="block text-sm text-surface-900">Source conversation</strong>
                    <span className="block text-xs text-surface-500">Name the result and attach its real provider session.</span>
                  </span>
                </legend>

                <div>
                <label htmlFor="project-source-run-title" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Project title<RequiredDot />
                </label>
                <input
                  id="project-source-run-title"
                  name="title"
                  value={sourceRunTitle}
                  onChange={(event) => setSourceRunTitle(event.target.value)}
                  placeholder="Decision matrix from Gemini Flash"
                  required
                  className="mt-2 min-h-11 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="project-source-run-url" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  AI session link<RequiredDot />
                </label>
                <div className="mt-2 flex min-h-11 items-center border border-surface-200 bg-surface-50 focus-within:border-brand-orange focus-within:bg-white">
                  <Link2 className="ml-3 h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
                  <input
                    type="url"
                    id="project-source-run-url"
                    name="source_url"
                    value={sourceRunUrl}
                    onChange={(event) => setSourceRunUrl(event.target.value)}
                    placeholder="https://chatgpt.com/c/... or another supported session link"
                    required
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-surface-900 outline-none"
                  />
                </div>
                <p className="mt-1 text-xs leading-5 text-surface-500">Use the provider&apos;s shared conversation URL, not a link to the final file by itself.</p>
              </div>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="mb-1 flex w-full items-center gap-3 border-b border-surface-100 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center bg-surface-900 font-mono text-[10px] font-black text-white">02</span>
                  <span>
                    <strong className="block text-sm text-surface-900">Model identity</strong>
                    <span className="block text-xs text-surface-500">Record what the provider actually shows.</span>
                  </span>
                </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="project-source-run-provider" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    AI service<RequiredDot />
                  </label>
                  <select
                    id="project-source-run-provider"
                    name="provider"
                    value={sourceRunProvider}
                    onChange={(event) => {
                      setSourceRunProvider(event.target.value)
                      setSourceRunProviderTouched(Boolean(event.target.value))
                    }}
                    className="mt-2 min-h-11 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  >
                    <option value="">Auto-detect from link</option>
                    {sourceRunProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                  {detectedSourceRunProvider && (
                    <p className="mt-1 text-xs text-surface-500">
                      Detected from link: {detectedSourceRunProvider}
                    </p>
                  )}
                  {selectedSourceRunProvider === 'OpenRouter' && (
                    <p className="mt-1 text-xs text-surface-500">
                      OpenRouter is the service/router. Put the actual model in the model field.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="project-source-run-model" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Exact model<RequiredDot />
                  </label>
                  <input
                    id="project-source-run-model"
                    name="model_used"
                    value={sourceRunModel}
                    onChange={(event) => setSourceRunModel(event.target.value)}
                    placeholder={modelPlaceholder}
                    required
                    className="mt-2 min-h-11 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  />
                  <p className="mt-1 text-xs text-surface-500">
                    Copy the visible model label exactly. Type Not sure if the session does not show the exact model.
                  </p>
                </div>
              </div>

              {selectedSourceRunProvider === 'Other' && (
                <div>
                  <label htmlFor="project-source-run-custom-provider" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Service name<RequiredDot />
                  </label>
                  <input
                    id="project-source-run-custom-provider"
                    name="custom_provider"
                    value={sourceRunCustomProvider}
                    onChange={(event) => setSourceRunCustomProvider(event.target.value)}
                    placeholder="Name the app or site used"
                    className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label htmlFor="project-source-run-model-settings" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Model settings <span className="font-sans normal-case tracking-normal text-surface-400">(optional)</span>
                </label>
                <textarea
                  id="project-source-run-model-settings"
                  name="model_settings"
                  value={sourceRunModelSettings}
                  onChange={(event) => setSourceRunModelSettings(event.target.value)}
                  rows={2}
                  placeholder="Thinking mode, reasoning level, temperature, tools, or any other setting visible in the session."
                  className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                />
              </div>
              </fieldset>

              <fieldset className="space-y-4 border border-brand-orange/30 bg-brand-orange/[0.035] p-4 sm:p-5">
                <legend className="flex items-center gap-3 bg-white px-2">
                  <span className="flex h-7 w-7 items-center justify-center bg-brand-orange font-mono text-[10px] font-black text-surface-900">03</span>
                  <span>
                    <strong className="block text-sm text-surface-900">Review handoff</strong>
                    <span className="block text-xs text-surface-500">Help review find the finished thing quickly.</span>
                  </span>
                </legend>
                <div className="border-l-2 border-brand-orange pl-3 text-xs leading-5 text-surface-600">
                  <strong className="text-surface-900">Where is the final result?</strong>{' '}
                  Name the final response, file, code block, or screenshot. Add any privacy caveat or known limitation.
                </div>
                <div>
                  <label htmlFor="project-source-run-notes" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Notes for review <span className="font-sans normal-case tracking-normal text-surface-400">(recommended)</span>
                  </label>
                <textarea
                  id="project-source-run-notes"
                  name="notes"
                  value={sourceRunNotes}
                  onChange={(event) => setSourceRunNotes(event.target.value)}
                  rows={3}
                  placeholder="Example: The complete working artifact is in response 03 as app.html. Response 02 is an earlier version. No private information is included."
                  className="mt-2 w-full resize-y border border-brand-orange/30 bg-white px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange"
                />
              </div>
              </fieldset>

              <div className="border-t border-surface-200 pt-5">
                <button
                  type="submit"
                  disabled={sourceRunSubmitting || !canSubmitSourceRun}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-brand-orange px-5 py-3 text-sm font-black text-surface-900 transition hover:bg-brand-orange-light disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-surface-500"
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {sourceRunSubmitting ? 'Submitting...' : 'Submit to queue'}
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-surface-500">
                  {canSubmitSourceRun
                    ? 'Ready to send. It does not create a public project page.'
                    : `${sourceRunReadyCount} of 4 required details complete. Finish the checklist to submit.`}
                </p>
              </div>
            </form>

            {sourceRunError && (
              <div className="mx-5 mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {sourceRunError}
              </div>
            )}

              <div className="border-t border-surface-200 bg-surface-50 p-4 sm:px-6">
                <button
                  type="button"
                  disabled
                  className="relative flex w-full cursor-not-allowed items-center gap-3 overflow-hidden border border-red-200 bg-white px-4 py-3 text-left opacity-75"
                  aria-disabled="true"
                >
                  <Keyboard className="h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
                  <span className="min-w-0 pr-32">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">Manual entry</span>
                    <span className="mt-0.5 block text-xs leading-5 text-surface-600">No usable source link? Manual reconstruction is closed.</span>
                  </span>
                  <span className="pointer-events-none absolute -right-4 top-1/2 flex h-7 w-40 -translate-y-1/2 -rotate-6 items-center justify-center bg-red-600 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white" aria-hidden="true">
                    Not available for now
                  </span>
                </button>
              </div>
            </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="border border-surface-200 bg-surface-900 p-5 text-white shadow-[8px_8px_0_rgba(232,122,44,0.13)]" aria-labelledby="submission-packet-title">
            <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange-light">Submission packet</div>
                <h2 id="submission-packet-title" className="mt-1 text-xl font-black">{sourceRunReadyCount} / 4 ready</h2>
              </div>
              <span className="flex h-9 w-9 items-center justify-center bg-brand-orange text-surface-900">
                <Link2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <ul className="mt-4 space-y-2" aria-label="Required submission details">
              {sourceRunReadiness.map((item) => (
                <li key={item.label} className="flex items-center gap-3 border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${item.ready ? 'bg-emerald-500 text-white' : 'border border-white/25 text-surface-400'}`} aria-hidden="true">
                    {item.ready ? <Check className="h-3 w-3" /> : '·'}
                  </span>
                  <span className={item.ready ? 'text-white' : 'text-surface-300'}>{item.label}</span>
                </li>
              ))}
            </ul>
            <div className={`mt-3 border px-3 py-3 text-xs leading-5 ${sourceRunNotes.trim() ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100' : 'border-brand-orange/45 bg-brand-orange/10 text-primary-100'}`}>
              <strong className="block text-white">Final-result clue {sourceRunNotes.trim() ? 'added' : 'recommended'}</strong>
              {sourceRunNotes.trim() ? 'Review has a handoff note.' : 'Tell review which response or file is the finished artifact.'}
            </div>
          </section>

          <section className="border border-surface-200 bg-white p-5">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-500">After submission</div>
            <ol className="mt-4 space-y-4">
              {[
                ['01', 'Received in My Forge', 'The source link and model evidence get a durable status record.'],
                ['02', 'Source and result reviewed', 'The conversation, artifact, safety, and presentation are checked.'],
                ['03', 'A clear decision', 'Useful work can publish; close work may return with a repair note; weak work can be declined.'],
              ].map(([number, title, body]) => (
                <li key={number} className="grid grid-cols-[28px_1fr] gap-3">
                  <span className="flex h-7 w-7 items-center justify-center bg-primary-50 font-mono text-[9px] font-black text-brand-orange-ink">{number}</span>
                  <span>
                    <strong className="block text-sm text-surface-900">{title}</strong>
                    <span className="mt-0.5 block text-xs leading-5 text-surface-500">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-surface-200 pt-4 text-xs font-bold leading-5 text-surface-700">Nothing is public until an explicit publish step.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/my-forge" className="inline-flex min-h-10 items-center justify-center border border-surface-300 px-3 text-xs font-bold text-surface-900 hover:border-brand-orange">Open My Forge</Link>
              <Link href="/guide#submit" className="inline-flex min-h-10 items-center justify-center border border-surface-300 px-3 text-xs font-bold text-surface-900 hover:border-brand-orange">See the walkthrough</Link>
            </div>
          </section>
        </aside>
      </div>

      </div>
    </div>
  )
}
