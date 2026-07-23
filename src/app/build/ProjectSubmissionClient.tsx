'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, FileCode2, GitBranch, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { submitCommunityProject } from '@/lib/community-project-actions'
import {
  COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES,
  communityProjectCategories,
  communityProjectProviders,
  evidenceScopeLabels,
  type CommunityProjectBuildStep,
  type CommunityProjectEvidenceScope,
  type CommunityProjectReusePermission,
  type CommunityProjectSubmission,
} from '@/lib/community-project-contract'
import { parseProjectForkSearchParams } from '@/lib/project-forks'
import { trackActivationEvent } from '@/lib/activation/track'

const blankStep = (number: number): CommunityProjectBuildStep => ({
  title: `Checkpoint ${number}`,
  prompt: '',
  response: '',
})

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600">
      {children}{required && <span className="ml-1 text-brand-orange-ink">*</span>}
    </span>
  )
}

export default function ProjectSubmissionClient({
  repairSubmission,
  requestedRepairId,
  publicContributorName,
}: {
  repairSubmission: CommunityProjectSubmission | null
  requestedRepairId: string | null
  publicContributorName: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlFork = useMemo(() => parseProjectForkSearchParams(searchParams), [searchParams])
  const repairedProviderIsListed = repairSubmission
    ? communityProjectProviders.some((item) => item === repairSubmission.provider)
    : true
  const [title, setTitle] = useState(repairSubmission?.title ?? (urlFork ? `${urlFork.sourceProjectTitle || 'Project'} fork` : ''))
  const [summary, setSummary] = useState(repairSubmission?.summary ?? '')
  const [category, setCategory] = useState(repairSubmission?.category_slug ?? '')
  const [difficulty, setDifficulty] = useState(repairSubmission?.difficulty ?? '')
  const [provider, setProvider] = useState(repairSubmission
    ? repairedProviderIsListed ? repairSubmission.provider : 'Other'
    : '')
  const [customProvider, setCustomProvider] = useState(
    repairSubmission && !repairedProviderIsListed ? repairSubmission.provider : '',
  )
  const [model, setModel] = useState(repairSubmission?.model ?? '')
  const [modelSettings, setModelSettings] = useState(repairSubmission?.model_settings ?? '')
  const [evidenceScope, setEvidenceScope] = useState<CommunityProjectEvidenceScope | ''>(repairSubmission?.evidence_scope ?? '')
  const [sourceUrl, setSourceUrl] = useState(repairSubmission?.source_url ?? '')
  const [sourceVisibility, setSourceVisibility] = useState(repairSubmission?.source_visibility ?? 'review_only')
  const [reusePermission, setReusePermission] = useState<CommunityProjectReusePermission | ''>(repairSubmission?.reuse_permission ?? '')
  const [steps, setSteps] = useState<CommunityProjectBuildStep[]>(repairSubmission?.build_steps ?? [blankStep(1)])
  const [artifact, setArtifact] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const artifactTooLarge = Boolean(artifact && artifact.size > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES)

  const effectiveFork = repairSubmission?.fork_source_project_id
    ? {
        source_project_id: repairSubmission.fork_source_project_id,
        source_project_title: repairSubmission.fork_source_project_title ?? '',
        source_step_id: repairSubmission.fork_source_step_id ?? '',
        source_step_number: repairSubmission.fork_source_step_number,
      }
    : urlFork
      ? {
          source_project_id: urlFork.sourceProjectId,
          source_project_title: urlFork.sourceProjectTitle ?? '',
          source_step_id: urlFork.sourceStepId ?? '',
          source_step_number: urlFork.sourceStepNumber ?? null,
        }
      : null

  function updateStep(index: number, field: keyof CommunityProjectBuildStep, value: string) {
    setSteps((current) => current.map((step, stepIndex) => (
      stepIndex === index ? { ...step, [field]: value } : step
    )))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!artifact) {
      setError('Choose the self-contained HTML artifact.')
      return
    }
    if (artifactTooLarge) {
      setError('Choose an HTML artifact that is 2 MB or smaller.')
      return
    }
    const formData = new FormData(event.currentTarget)
    formData.set('build_steps_json', JSON.stringify(steps))
    formData.set('fork_json', effectiveFork ? JSON.stringify({
      source_project_id: effectiveFork.source_project_id,
      source_step_id: effectiveFork.source_step_id,
      source_step_number: effectiveFork.source_step_number,
    }) : '')
    formData.set('repair_id', repairSubmission?.id ?? '')
    setSubmitting(true)
    try {
      const result = await submitCommunityProject(formData)
      if (!result.success || !result.id) {
        setError(result.error ?? 'PathForge could not submit this project.')
        return
      }
      await trackActivationEvent({
        eventName: 'community_project_submitted',
        surface: 'build',
        action: effectiveFork ? 'fork' : 'share',
        projectId: effectiveFork?.source_project_id,
        projectTitle: effectiveFork?.source_project_title,
        dedupeKey: `community-project-submitted:${result.id}`,
      }).catch(() => undefined)
      router.push(`/my-forge/community-projects/${result.id}?submitted=1`)
      router.refresh()
    } catch {
      setError('The submission connection failed. Your project was not confirmed; retry when the connection is stable.')
    } finally {
      setSubmitting(false)
    }
  }

  if (requestedRepairId && !repairSubmission) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-black text-surface-900">That repair is unavailable</h1>
        <p className="mt-3 text-surface-600">Only the owner can replace a project after an administrator requests changes.</p>
        <Link href="/my-forge/community-projects" className="mt-6 inline-flex border border-surface-300 px-4 py-2 text-sm font-bold">Return to pilot projects</Link>
      </main>
    )
  }

  return (
    <main className="bg-surface-50 pb-20">
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/my-forge/community-projects" className="inline-flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-orange-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My pilot projects
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">
                {repairSubmission ? `Repair version ${repairSubmission.submission_version + 1}` : 'Invitation-only pilot'}
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-surface-900">
                {repairSubmission ? 'Replace the review bundle' : 'Submit a project'}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-surface-600">
                Lead with the finished result. Then include only the build evidence you are comfortable asking PathForge to review and, if approved, publish exactly as labeled.
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
              <ShieldCheck className="mb-2 h-5 w-5" aria-hidden="true" />
              Nothing publishes on submit. The file stays private until automated checks and human review both pass.
            </div>
          </div>
          {repairSubmission?.user_status_note && (
            <div role="note" className="mt-6 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong className="block">Reviewer requested this correction</strong>
              {repairSubmission.user_status_note}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="min-w-0 space-y-7" encType="multipart/form-data">
          {effectiveFork && (
            <section className="border border-green-300 bg-green-50 p-4" data-community-fork-source>
              <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-green-800">
                <GitBranch className="h-4 w-4" aria-hidden="true" /> Fork source preserved
              </div>
              <p className="mt-2 text-sm font-semibold text-green-950">{effectiveFork.source_project_title || effectiveFork.source_project_id}</p>
              <p className="mt-1 text-xs leading-5 text-green-800">PathForge will resolve the title, step, reuse permission, family, depth, and branch from the published database record when you submit.</p>
            </section>
          )}

          <fieldset className="min-w-0 border border-surface-200 bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">1. Show the result</legend>
            <div className="mt-2 grid gap-5">
              <label className="grid gap-2">
                <FieldLabel required>Project title</FieldLabel>
                <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={120} className="min-h-11 border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-orange" placeholder="Tiny neighborhood potluck planner" />
              </label>
              <label className="grid gap-2">
                <FieldLabel required>What does it do?</FieldLabel>
                <textarea name="summary" value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={20} maxLength={2000} rows={4} className="border border-surface-300 px-3 py-2 text-sm leading-6 outline-none focus:border-brand-orange" placeholder="Describe the finished result, who it helps, and what a visitor can do with it." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <FieldLabel required>Category</FieldLabel>
                  <select name="category_slug" value={category} onChange={(event) => setCategory(event.target.value)} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm">
                    <option value="" disabled>Choose a category</option>
                    {communityProjectCategories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2">
                  <FieldLabel required>Difficulty</FieldLabel>
                  <select name="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm">
                    <option value="" disabled>Choose a difficulty</option>
                    <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 border border-brand-orange/30 bg-brand-orange/[0.035] p-4">
                <FieldLabel required>Self-contained HTML artifact</FieldLabel>
                <input id="community-project-artifact" name="artifact" type="file" accept=".html,.htm,text/html" required aria-describedby="community-project-artifact-help community-project-artifact-status" aria-invalid={artifactTooLarge || undefined} onChange={(event) => setArtifact(event.target.files?.[0] ?? null)} className="min-h-11 min-w-0 w-full text-sm file:mr-3 file:border-0 file:bg-surface-900 file:px-3 file:py-2 file:font-bold file:text-white" />
                <span id="community-project-artifact-help" className="text-xs leading-5 text-surface-600">One UTF-8 .html or .htm file, up to 2 MB. Outbound links, remote dependencies, network calls, secrets, and personal information are rejected. Inline data images are allowed.</span>
                {artifact && (
                  <span id="community-project-artifact-status" role={artifactTooLarge ? 'alert' : 'status'} className={`text-xs font-semibold ${artifactTooLarge ? 'text-red-700' : 'text-green-800'}`}>
                    {artifact.name} · {(artifact.size / 1024).toFixed(1)} KB{artifactTooLarge ? ' — too large; choose a file no larger than 2 MB.' : ' — within the 2 MB limit.'}
                  </span>
                )}
              </label>
            </div>
          </fieldset>

          <fieldset className="min-w-0 border border-surface-200 bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">2. Explain how it was built</legend>
            <div className="mt-2 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <FieldLabel required>AI service</FieldLabel>
                  <select name="provider" value={provider} onChange={(event) => setProvider(event.target.value)} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm">
                    <option value="" disabled>Choose the AI service</option>
                    {communityProjectProviders.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                {provider === 'Other' && (
                  <label className="grid gap-2"><FieldLabel required>Service name</FieldLabel><input name="custom_provider" value={customProvider} onChange={(event) => setCustomProvider(event.target.value)} required className="min-h-11 border border-surface-300 px-3 text-sm" /></label>
                )}
                <label className="grid gap-2">
                  <FieldLabel required>Model shown</FieldLabel>
                  <input name="model" value={model} onChange={(event) => setModel(event.target.value)} required maxLength={160} className="min-h-11 border border-surface-300 px-3 text-sm" placeholder="Exact label, or Not sure" />
                </label>
              </div>
              <label className="grid gap-2"><FieldLabel>Model settings</FieldLabel><textarea name="model_settings" value={modelSettings} onChange={(event) => setModelSettings(event.target.value)} maxLength={1000} rows={2} className="border border-surface-300 px-3 py-2 text-sm" placeholder="Reasoning level, tools, temperature, or other visible settings." /></label>
              <label className="grid gap-2">
                <FieldLabel required>How complete is this evidence?</FieldLabel>
                <select name="evidence_scope" value={evidenceScope} onChange={(event) => setEvidenceScope(event.target.value as typeof evidenceScope)} required className="min-h-11 border border-surface-300 bg-white px-3 text-sm">
                  <option value="" disabled>Choose the evidence scope</option>
                  {Object.entries(evidenceScopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <span className="text-xs leading-5 text-surface-500">This label appears publicly. Choose reconstructed notes if you do not have the exact full run.</span>
              </label>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <fieldset key={index} className="min-w-0 border border-surface-200 bg-surface-50 p-4">
                    <legend className="px-2 text-sm font-black text-surface-900">Checkpoint {index + 1}</legend>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-surface-500">Public checkpoint {index + 1} of {steps.length}</span>
                      {steps.length > 1 && <button type="button" aria-label={`Remove checkpoint ${index + 1}`} onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-red-700"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove checkpoint {index + 1}</button>}
                    </div>
                    <div className="grid gap-4">
                      <label className="grid gap-2"><FieldLabel required>Checkpoint {index + 1} name</FieldLabel><input value={step.title} onChange={(event) => updateStep(index, 'title', event.target.value)} required maxLength={120} className="min-h-11 border border-surface-300 bg-white px-3 text-sm" /></label>
                      <label className="grid gap-2"><FieldLabel required>Checkpoint {index + 1} prompt or instruction</FieldLabel><textarea value={step.prompt} onChange={(event) => updateStep(index, 'prompt', event.target.value)} required rows={4} className="border border-surface-300 bg-white px-3 py-2 text-sm leading-6" /></label>
                      <label className="grid gap-2"><FieldLabel required>Checkpoint {index + 1} response or result</FieldLabel><textarea value={step.response} onChange={(event) => updateStep(index, 'response', event.target.value)} required rows={5} className="border border-surface-300 bg-white px-3 py-2 text-sm leading-6" /></label>
                    </div>
                  </fieldset>
                ))}
                {steps.length < 5 && <button type="button" onClick={() => setSteps((current) => [...current, blankStep(current.length + 1)])} className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2 text-sm font-bold hover:border-brand-orange"><Plus className="h-4 w-4" aria-hidden="true" /> Add checkpoint</button>}
              </div>
            </div>
          </fieldset>

          <fieldset className="min-w-0 border border-surface-200 bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">3. Add optional source evidence</legend>
            <div className="mt-2 grid gap-5">
              <label className="grid gap-2"><FieldLabel>Public provider share link</FieldLabel><input name="source_url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="min-h-11 border border-surface-300 px-3 text-sm" placeholder="https://chatgpt.com/share/..." /><span className="text-xs leading-5 text-surface-500">Optional. Use a public ChatGPT, Claude, or Gemini share URL with no query string or fragment—not a private /c/ or account link. PathForge never logs into your provider account.</span></label>
              {sourceUrl && (
                <div className="grid gap-2">
                  <FieldLabel required>Who may see the source link?</FieldLabel>
                  <label className="flex min-h-11 items-start gap-3 border border-surface-200 p-3 text-sm"><input type="radio" name="source_visibility" value="review_only" checked={sourceVisibility === 'review_only'} onChange={() => setSourceVisibility('review_only')} className="mt-1" /><span><strong className="block">Review team only</strong><span className="text-surface-500">The link never appears on the public project.</span></span></label>
                  <label className="flex min-h-11 items-start gap-3 border border-surface-200 p-3 text-sm"><input type="radio" name="source_visibility" value="public" checked={sourceVisibility === 'public'} onChange={() => setSourceVisibility('public')} className="mt-1" /><span><strong className="block">Public after verification</strong><span className="text-surface-500">An administrator must confirm anonymous access before publication.</span></span></label>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="min-w-0 border border-surface-200 bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">4. Choose credit and reuse</legend>
            <div className="mt-2 grid min-w-0 gap-5">
              <input type="hidden" name="submitter_role" value="builder" />
              <label className="flex min-w-0 items-start gap-3 border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <input type="checkbox" name="builder_attested" value="yes" required className="mt-1" />
                <span className="min-w-0"><strong className="block">I personally built this project.</strong>The pilot does not accept projects submitted on someone else&apos;s behalf.</span>
              </label>
              <label className="grid min-w-0 gap-2">
                <FieldLabel required>Reuse permission</FieldLabel>
                <select name="reuse_permission" value={reusePermission} onChange={(event) => setReusePermission(event.target.value as typeof reusePermission)} required className="min-h-11 min-w-0 w-full max-w-full border border-surface-300 bg-white px-3 text-sm">
                  <option value="" disabled>Choose what visitors may do</option>
                  <option value="view_only">View only — no reuse license</option>
                  <option value="allow_pathforge_remix">Allow PathForge remixes with attribution</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="min-w-0 border-2 border-brand-orange bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">5. Review everything that may become public</legend>
            <div className="mt-2">
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">Pre-publication consent preview</div>
              <h2 className="mt-2 text-2xl font-black text-surface-900">{title || 'Your project title'}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-surface-600">{summary || 'Your complete public description will appear here.'}</p>
              <dl className="mt-5 grid gap-3 border-t border-surface-200 pt-4 text-sm sm:grid-cols-2">
                <div><dt className="font-bold text-surface-500">Creator credit</dt><dd className="mt-1 text-surface-900">Builder-reported · built and submitted by {publicContributorName}</dd></div>
                <div><dt className="font-bold text-surface-500">Category and difficulty</dt><dd className="mt-1 text-surface-900">{communityProjectCategories.find((item) => item.slug === category)?.label || 'Choose a category'} · {difficulty || 'choose a difficulty'}</dd></div>
                <div><dt className="font-bold text-surface-500">Complete artifact file</dt><dd className="mt-1 text-surface-900">{artifact?.name || 'Choose the HTML file'} · the complete scanned file becomes a script-disabled public preview after approval. Its public build evidence remains available for visitors to study.</dd></div>
                <div><dt className="font-bold text-surface-500">Evidence scope</dt><dd className="mt-1 text-surface-900">{evidenceScope ? evidenceScopeLabels[evidenceScope] : 'Choose the evidence scope'} · every checkpoint below is public verbatim.</dd></div>
                <div><dt className="font-bold text-surface-500">Builder-reported model claim</dt><dd className="mt-1 text-surface-900">{provider === 'Other' ? customProvider || 'Name the service' : provider || 'Choose the service'} · {model || 'Add the visible model label'}{modelSettings ? ` · ${modelSettings}` : ' · no settings supplied'}</dd></div>
                <div><dt className="font-bold text-surface-500">Source link</dt><dd className="mt-1 break-all text-surface-900">{!sourceUrl || sourceVisibility === 'review_only' ? 'Not public' : `${sourceUrl} · public only after an anonymous access check`}</dd></div>
                <div><dt className="font-bold text-surface-500">Reuse</dt><dd className="mt-1 text-surface-900">{reusePermission === 'view_only' ? 'View only — no reuse license' : reusePermission === 'allow_pathforge_remix' ? 'PathForge remix allowed with attribution' : 'Choose a reuse permission'}</dd></div>
                <div><dt className="font-bold text-surface-500">Version</dt><dd className="mt-1 text-surface-900">{repairSubmission ? repairSubmission.submission_version + 1 : 1}</dd></div>
              </dl>

              <div className="mt-6 space-y-3" aria-label="Public checkpoint preview">
                {steps.map((step, index) => (
                  <details key={index} open={index === 0} className="border border-surface-200 bg-surface-50 p-4">
                    <summary className="cursor-pointer font-bold text-surface-900">Public checkpoint {index + 1}: {step.title || 'Untitled checkpoint'}</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div><div className="text-xs font-bold uppercase tracking-wider text-brand-orange-ink">Prompt or instruction</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-surface-700">{step.prompt || 'Add the exact public prompt or instruction.'}</p></div>
                      <div><div className="text-xs font-bold uppercase tracking-wider text-brand-blue">Response or result</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-surface-700">{step.response || 'Add the exact public response or result.'}</p></div>
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-5 border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <strong className="block">What stays private</strong>
                Review-only source links, scanner details, original filenames, reviewer notes, report contact information, and withdrawn bundle contents do not appear publicly.
              </div>
            </div>
          </fieldset>

          <fieldset className="min-w-0 border border-surface-200 bg-white p-5 sm:p-6">
            <legend className="px-2 text-lg font-black text-surface-900">6. Consent and submit for private review</legend>
            <div className="mt-2 grid gap-5">
              <div className="grid gap-3 border border-surface-200 bg-surface-50 p-4 text-sm leading-6">
                <label className="flex items-start gap-3"><input type="checkbox" name="profile_attribution_attested" value="yes" required className="mt-1" /><span>I confirm that my public PathForge profile, shown above as <strong>{publicContributorName}</strong>, may be credited as the builder and submitter.</span></label>
                <label className="flex items-start gap-3"><input type="checkbox" name="rights_attested" value="yes" required className="mt-1" /><span>I have the rights needed to submit and publicly display the complete material previewed above.</span></label>
                <label className="flex items-start gap-3"><input type="checkbox" name="privacy_attested" value="yes" required className="mt-1" /><span>I reviewed the complete artifact and every checkpoint above and removed secrets, personal information, and private third-party material.</span></label>
                <label className="flex items-start gap-3"><input type="checkbox" name="publication_consent" value="yes" required className="mt-1" /><span>I authorize PathForge to privately review this bundle and, only after approval, publicly display the full artifact file, profile credit, metadata, model claims, source choice, reuse choice, and every checkpoint previewed above.</span></label>
              </div>
              <p className="text-xs leading-5 text-surface-500">By submitting, you agree to the <Link href="/terms" target="_blank" className="font-semibold underline">pilot terms</Link>, <Link href="/privacy" target="_blank" className="font-semibold underline">privacy notice</Link>, and <Link href="/community-guidelines" target="_blank" className="font-semibold underline">community guidelines</Link>.</p>
            </div>
          </fieldset>

          {error && <div role="alert" className="border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</div>}
          <button type="submit" disabled={submitting || artifactTooLarge} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-brand-orange px-5 py-3 text-sm font-black text-surface-900 hover:bg-brand-orange-light disabled:cursor-not-allowed disabled:bg-surface-200">
            <FileCode2 className="h-4 w-4" aria-hidden="true" /> {submitting ? 'Scanning and submitting…' : repairSubmission ? 'Submit replacement bundle' : 'Submit private review bundle'}
          </button>
        </form>
      </div>
    </main>
  )
}
