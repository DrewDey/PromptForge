import Link from 'next/link'
import { ArrowRight, CheckCircle2, ExternalLink, FileCode2, GitFork, ShieldCheck } from 'lucide-react'
import { BuilderByline } from '@/components/BuilderByline'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import { ProtectedArtifactFrame, type ArtifactPackage } from '@/components/SourceRunShowcase'
import { evidenceScopeLabels, type PublicCommunityProject } from '@/lib/community-project-contract'
import {
  buildProjectResponseForkHref,
  projectForkSourceFromSubmissionFields,
  reconcileProjectForkFinalArtifactProvenance,
  type ProjectForkContinuationStep,
} from '@/lib/project-forks'
import type { ProjectForkLineageTruth } from '@/lib/project-forks'
import type { PromptWithRelations } from '@/lib/types'

function evidenceExplanation(scope: PublicCommunityProject['evidence_scope']) {
  if (scope === 'full_run') return 'The contributor states that the checkpoints below represent the complete run.'
  if (scope === 'selected_excerpts') return 'The contributor selected these checkpoints from a larger run.'
  return 'The contributor reconstructed these checkpoints from memory or notes.'
}

export default function CommunityProjectPage({
  prompt,
  capsule,
  lineageTruth,
}: {
  prompt: PromptWithRelations
  capsule: PublicCommunityProject
  lineageTruth: ProjectForkLineageTruth | null
}) {
  const firstStep = prompt.steps?.[0]
  const artifactPackage: ArtifactPackage = {
    id: `community-project:${capsule.submission_id}:v${capsule.submission_version}`,
    stepId: firstStep?.id ?? `${capsule.submission_id}:result`,
    stepNumber: firstStep?.step_number ?? 1,
    title: prompt.title,
    prompt: firstStep?.content ?? prompt.content,
    response: firstStep?.result_content ?? prompt.result_content ?? 'Interactive HTML artifact.',
    responseCopyText: firstStep?.result_content ?? undefined,
    artifactPath: `/api/community-artifacts/${prompt.id}`,
    artifactTitle: `${prompt.title} artifact`,
    artifactOrdinal: 1,
    artifactCount: 1,
    artifactSha256: capsule.artifact_sha256,
    providerName: capsule.provider,
    isDefaultArtifact: true,
    callout: {
      tone: 'success',
      title: 'Reviewed community preview',
      body: 'PathForge re-verifies these reviewed bytes and shows them as a script-disabled static preview during the community pilot.',
    },
  }
  const currentForkSource = projectForkSourceFromSubmissionFields(prompt)
  const currentGenerations = lineageTruth?.generations.filter(
    (generation) => generation.isCurrent,
  ) ?? []
  const currentGeneration = currentGenerations.length === 1 &&
    currentGenerations[0].projectId === prompt.id &&
    lineageTruth?.integrity.kind === 'complete'
    ? currentGenerations[0]
    : null
  const displayedStep: ProjectForkContinuationStep | null = firstStep
    ? {
        id: firstStep.id,
        stepNumber: firstStep.step_number,
        promptTitle: firstStep.title || `Prompt ${firstStep.step_number}`,
        promptText: firstStep.content,
        responseText: firstStep.result_content,
        responsePackageId: firstStep.id,
        artifactPath: artifactPackage.artifactPath,
        artifactSha256: artifactPackage.artifactSha256,
        artifactVersions: [{
          id: artifactPackage.id,
          artifactPath: artifactPackage.artifactPath,
          artifactTitle: artifactPackage.artifactTitle,
          artifactSha256: artifactPackage.artifactSha256,
          isDefault: true,
        }],
      }
    : null
  const reconciledArtifact = reconcileProjectForkFinalArtifactProvenance(
    displayedStep ? [displayedStep] : [],
    currentGeneration?.presentation.localSteps.at(-1),
  ).matchedArtifact
  const forkHref = (
    capsule.reuse_permission === 'allow_pathforge_remix' &&
    lineageTruth?.eligibility.allowed === true &&
    currentGeneration &&
    reconciledArtifact
  )
    ? buildProjectResponseForkHref({
        sourceProjectId: prompt.id,
        sourceProjectTitle: prompt.title,
        sourceModelVariantId: reconciledArtifact.sourceModelVariantId,
        sourceRunId: reconciledArtifact.sourceRunId,
        sourceStepId: reconciledArtifact.sourceStepId,
        sourceStepNumber: reconciledArtifact.sourceStepNumber,
        sourceArtifactPath: reconciledArtifact.sourceArtifactPath,
        sourceArtifactSha256: reconciledArtifact.artifactSha256,
        currentForkSource: currentGeneration.forkSource ?? currentForkSource,
        promptFamilyId: prompt.prompt_family_id ?? undefined,
        destination: '/build',
      })
    : null
  const forkActionReason = forkHref
    ? 'eligible'
    : lineageTruth?.eligibility.allowed === true
      ? 'exact-artifact-unavailable'
      : lineageTruth?.eligibility.reason ?? 'unavailable'

  return (
    <main data-community-project={prompt.id}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-surface-500">
          <Link href="/paths" className="font-semibold hover:text-brand-orange-ink">Build Paths</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span aria-current="page">Community pilot</span>
        </nav>

        <header className="mt-7 grid gap-8 border-b border-surface-200 pb-9 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Invitation-only community project</div>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-[-0.035em] text-surface-900 sm:text-5xl">{prompt.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-surface-600">{prompt.description}</p>
            <div className="mt-5 text-sm text-surface-500">
              <BuilderByline
                name={prompt.author?.display_name || prompt.author?.username || 'PathForge contributor'}
                username={prompt.author?.username}
                href={prompt.author?.username ? `/user/${prompt.author.username}` : undefined}
                prefix="Builder-reported: built and submitted by"
                className="font-bold text-surface-900 hover:text-brand-orange-ink"
              />
              <span className="mx-2" aria-hidden="true">·</span>
              Version {capsule.submission_version} · {new Date(capsule.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <aside className="border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-sm font-black text-green-950"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Evidence scope</div>
            <div className="mt-2 text-lg font-black text-green-950">{evidenceScopeLabels[capsule.evidence_scope]}</div>
            <p className="mt-2 text-sm leading-6 text-green-900">{evidenceExplanation(capsule.evidence_scope)}</p>
          </aside>
        </header>

        <section aria-labelledby="artifact-title" className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-blue">Finished result</div>
              <h2 id="artifact-title" className="mt-1 text-2xl font-black text-surface-900">Preview the submitted project</h2>
            </div>
            <div className="font-mono text-[10px] text-surface-500">SHA-256 {capsule.artifact_sha256.slice(0, 16)}… · {(capsule.artifact_size_bytes / 1024).toFixed(1)} KB</div>
          </div>
          <ProtectedArtifactFrame
            selectedPackage={artifactPackage}
            providerName={capsule.provider}
            showOpenAction
            allowArtifactDownloads={false}
            allowArtifactScripts={false}
            allowArtifactInteraction
            contextLabel="Community project artifact"
          />
          <p className="mt-3 text-sm leading-6 text-surface-600" data-community-static-preview>
            Community pilot previews are script-disabled: uploaded scripts, active forms, and preview-initiated downloads do not run. You can scroll a taller static result, and the reviewed source remains available separately as a non-executable text download. The public build evidence below explains how the project was made.
          </p>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-3" aria-labelledby="truth-title">
          <h2 id="truth-title" className="sr-only">What PathForge verified</h2>
          <div className="border border-surface-200 bg-white p-5">
            <CheckCircle2 className="h-5 w-5 text-green-700" aria-hidden="true" />
            <h3 className="mt-3 font-black text-surface-900">Artifact hash verified</h3>
            <p className="mt-2 text-sm leading-6 text-surface-600">PathForge serves only the reviewed, hash-verified bytes while the live database manifest still authorizes public access.</p>
          </div>
          <div className="border border-surface-200 bg-white p-5">
            <FileCode2 className="h-5 w-5 text-brand-orange-ink" aria-hidden="true" />
            <h3 className="mt-3 font-black text-surface-900">Builder reported</h3>
            <p className="mt-2 text-sm leading-6 text-surface-600">{capsule.provider} · {capsule.model}{capsule.model_settings ? ` · ${capsule.model_settings}` : ''}. The builder relationship and model identity are contributor-supplied claims, not independent authorship or exact-model proof.</p>
          </div>
          <div className="border border-surface-200 bg-white p-5">
            <GitFork className="h-5 w-5 text-brand-blue" aria-hidden="true" />
            <h3 className="mt-3 font-black text-surface-900">Reuse permission</h3>
            <p className="mt-2 text-sm leading-6 text-surface-600">{capsule.reuse_permission === 'allow_pathforge_remix' ? 'The contributor allows PathForge remixes with attribution.' : 'The contributor permits viewing, but grants no reuse license.'}</p>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-4xl" aria-labelledby="build-evidence-title">
          <div className="mb-6">
            <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Scoped build evidence</div>
            <h2 id="build-evidence-title" className="mt-2 text-3xl font-black text-surface-900">How it came together</h2>
          </div>
          <div className="space-y-5">
            {(prompt.steps ?? []).map((step, index) => (
              <article key={step.id} className="border border-surface-200 bg-white">
                <header className="flex items-center justify-between gap-4 bg-surface-900 px-5 py-3 text-white">
                  <h3 className="font-bold">{step.title}</h3>
                  <span className="font-mono text-[10px] text-surface-400">{String(index + 1).padStart(2, '0')}</span>
                </header>
                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <div><div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">Prompt or instruction</div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-surface-700">{step.content}</p></div>
                  <div><div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue">Response or result</div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-surface-700">{step.result_content}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 flex max-w-4xl flex-col gap-4 border border-surface-200 bg-surface-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-surface-900">Supporting source</h2>
            {capsule.source_url && capsule.source_checked_at ? (
              <p className="mt-1 text-sm text-surface-600">Anonymous access checked {new Date(capsule.source_checked_at).toLocaleDateString()}. This does not prove ownership or future availability.</p>
            ) : (
              <p className="mt-1 text-sm text-surface-600">No public provider source link is attached to this project.</p>
            )}
          </div>
          {capsule.source_url && <a href={capsule.source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2 text-sm font-bold hover:border-brand-orange"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Open checked source</a>}
        </section>

        <div
          className="mx-auto mt-8 flex max-w-4xl flex-wrap gap-3"
          data-community-fork-eligibility={forkHref ? 'allowed' : 'denied'}
          data-community-fork-reason={forkActionReason}
        >
          {forkHref && <Link href={forkHref} data-community-fork-action className="inline-flex min-h-11 items-center gap-2 bg-[#2bd15f] px-4 py-2 text-sm font-black text-[#063b17]"><GitFork className="h-4 w-4" aria-hidden="true" /> Fork with attribution <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
          <Link href={`/report/project/${prompt.id}`} className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-4 py-2 text-sm font-bold text-surface-700 hover:border-red-300 hover:text-red-700">Report this project</Link>
        </div>
      </div>

      <ProjectCommunityPanel
        projectId={prompt.id}
        project={prompt}
        lineageTruth={lineageTruth}
      />
    </main>
  )
}
