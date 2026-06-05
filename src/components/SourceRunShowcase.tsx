'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'

export type SourceRunShowcaseCallout = {
  tone: 'warning' | 'success' | 'neutral'
  title: string
  body: string
}

export type SourceRunShowcaseStep = {
  id: string
  stepNumber: number
  title: string
  prompt: string
  response: string
  responseCopyText?: string
  notes?: string
  artifactPath?: string | null
  artifactTitle?: string
  sourceFilePath?: string | null
  code?: string | null
  artifactVersions?: SourceRunShowcaseArtifactVersion[]
  callout?: SourceRunShowcaseCallout
}

export type SourceRunShowcaseArtifactVersion = {
  id?: string
  artifactPath: string
  artifactTitle: string
  sourceFilePath: string
  code: string
  notes?: string
  isDefault?: boolean
}

type ArtifactPackage = SourceRunShowcaseStep & {
  stepId: string
  artifactPath: string
  artifactTitle: string
  sourceFilePath: string
  code: string
  artifactVersionNotes?: string
  artifactOrdinal: number
  artifactCount: number
  isDefaultArtifact: boolean
}

function ArtifactFrame({
  selectedPackage,
  providerName,
}: {
  selectedPackage: ArtifactPackage
  providerName: string
}) {
  return (
    <div
      key={selectedPackage.id}
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#111827] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">{selectedPackage.artifactTitle}</div>
          <div className="mt-1 text-xs text-surface-400">
            Prompt {String(selectedPackage.stepNumber).padStart(2, '0')} artifact from {providerName}
          </div>
        </div>
        <a
          href={selectedPackage.artifactPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-300 transition hover:border-brand-orange hover:text-brand-orange"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
      <iframe
        key={selectedPackage.id}
        title={`${selectedPackage.artifactTitle} generated from a ${providerName} source run`}
        src={selectedPackage.artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[940px] w-full bg-[#111827] sm:h-[820px] lg:h-[820px]"
      />
    </div>
  )
}

function PromptText({ text }: { text: string }) {
  return (
    <div className="group/prompt relative pr-9">
      <p className="border-l-2 border-brand-orange pl-3 font-semibold text-surface-900">
        {text}
      </p>
      <div className="absolute right-0 top-0 opacity-70 transition-opacity duration-200 group-hover/prompt:opacity-100 focus-within:opacity-100">
        <CopyButton text={text} variant="ghost" label="Copy prompt" visibleLabel="Copy" />
      </div>
    </div>
  )
}

function PipeNode({
  eyebrow,
  title,
  children,
  terminal = false,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  terminal?: boolean
}) {
  return (
    <article className="relative pl-[88px]">
      {!terminal && (
        <div className="absolute left-[22px] top-[80px] h-[calc(100%+30px)] w-8 border-x-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_5px_0_0_rgba(255,255,255,0.24),inset_-5px_0_0_rgba(0,0,0,0.2)]" />
      )}
      <div className="absolute left-0 top-8 h-16 w-12 border-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_6px_0_0_rgba(255,255,255,0.28),inset_-6px_0_0_rgba(0,0,0,0.18)]" />
      <div className="absolute left-11 top-[54px] h-7 w-12 border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)]" />
      <div className="relative border border-surface-200 bg-white p-5 shadow-[0_18px_44px_rgba(24,24,27,0.07)]">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-500">
          {eyebrow}
        </div>
        <h3 className="mt-2 text-xl font-black text-surface-900">{title}</h3>
        <div className="mt-4 text-sm leading-6 text-surface-700">{children}</div>
      </div>
    </article>
  )
}

function StepCallout({ callout }: { callout: SourceRunShowcaseCallout }) {
  const classes = {
    warning: 'border-amber-300 bg-amber-50 text-amber-950',
    success: 'border-green-300 bg-green-50 text-green-950',
    neutral: 'border-surface-200 bg-surface-50 text-surface-800',
  }[callout.tone]
  const Icon = callout.tone === 'success' ? CheckCircle2 : callout.tone === 'warning' ? AlertTriangle : FileCode2

  return (
    <div className={`flex gap-3 border px-4 py-3 text-sm leading-6 ${classes}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-bold">{callout.title}</div>
        <div className="mt-1">{callout.body}</div>
      </div>
    </div>
  )
}

function ExactResponseBlock({
  text,
  copyText,
}: {
  text: string
  copyText: string
}) {
  return (
    <div className="border border-surface-200 bg-surface-50">
      <div className="flex items-center justify-between gap-3 border-b border-surface-200 bg-white px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Verbatim response text
        </span>
        <CopyButton text={copyText} variant="ghost" label="Copy response" visibleLabel="Copy" />
      </div>
      <pre className="max-h-[360px] whitespace-pre-wrap overflow-auto p-4 text-sm leading-7 text-surface-900">
        {text}
      </pre>
    </div>
  )
}

function ArtifactCodeBlock({ pkg }: { pkg: ArtifactPackage }) {
  return (
    <details className="group/code border border-surface-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
            Verbatim artifact
          </span>
          <span className="mt-1 block text-sm font-bold text-surface-900">
            Exact HTML this response returned
          </span>
          <span className="mt-1 block text-xs leading-5 text-surface-500">
            Collapsed because the generated file is long; this is the file mounted above.
          </span>
        </span>
        <span className="shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
          Open
        </span>
      </summary>
      <div className="flex items-center justify-between gap-3 border-t border-surface-800 bg-surface-900 px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-400">
          {pkg.sourceFilePath}
        </span>
        <CopyButton text={pkg.code} variant="dark" label="Copy code" visibleLabel="Copy" />
      </div>
      <pre className="max-h-[460px] overflow-auto bg-surface-900 p-4 text-xs leading-5 text-surface-100">
        <code>{pkg.code}</code>
      </pre>
    </details>
  )
}

function SourceLink({
  sourceRunUrl,
  providerName,
}: {
  sourceRunUrl: string
  providerName: string
}) {
  return (
    <a
      href={sourceRunUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
    >
      {providerName} source run
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  )
}

function ResponsePackageCard({
  step,
  artifactPackages,
  selectedPackage,
  onSelect,
  sourceRunUrl,
  providerName,
}: {
  step: SourceRunShowcaseStep
  artifactPackages: ArtifactPackage[]
  selectedPackage?: ArtifactPackage
  onSelect?: (packageId: string) => void
  sourceRunUrl: string
  providerName: string
}) {
  const copyText = step.responseCopyText ?? step.response
  const hasArtifactPackages = artifactPackages.length > 0
  const selected = Boolean(selectedPackage)
  const detailPackage = selectedPackage ?? artifactPackages[0]
  const artifactCopy =
    artifactPackages.length === 1
      ? 'This response produced a selectable artifact version.'
      : `This response produced ${artifactPackages.length} selectable artifact versions.`
  const canSelectPackage = Boolean(detailPackage && onSelect)
  const selectLabel = selected ? 'Selected' : 'Select artifact'
  const headerContent = (
    <>
      <div className="min-w-0">
        <div className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Response package {String(step.stepNumber).padStart(2, '0')}
        </div>
        <div className="mt-1 block text-base font-black text-surface-900">{step.title}</div>
        <div className="mt-1 block text-sm leading-6 text-surface-600">
          {hasArtifactPackages
            ? artifactCopy
            : 'This response is preserved as transcript-only because no public artifact was produced.'}
        </div>
      </div>
      {detailPackage && (
        <span
          className={[
            'inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]',
            selected
              ? 'border-brand-blue bg-brand-blue text-white'
              : 'border-surface-300 bg-white text-surface-700',
          ].join(' ')}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
          {selectLabel}
        </span>
      )}
    </>
  )

  return (
    <div
      className={[
        'border bg-white transition',
        hasArtifactPackages && selected
          ? 'border-brand-blue ring-2 ring-brand-blue/25'
          : 'border-surface-200 hover:border-brand-blue/60',
      ].join(' ')}
    >
      {canSelectPackage ? (
        <button
          type="button"
          onClick={() => onSelect?.(detailPackage.id)}
          aria-pressed={selected}
          className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-brand-blue/5"
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex w-full items-start justify-between gap-4 p-4 text-left">
          {headerContent}
        </div>
      )}

      <div className="space-y-4 border-t border-surface-200 bg-white p-4">
        {step.callout && <StepCallout callout={step.callout} />}

        {detailPackage ? (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-surface-700">
              <FileCode2 className="h-4 w-4 text-brand-blue" />
              {detailPackage.sourceFilePath}
            </div>
            {artifactPackages.length > 1 && onSelect && (
              <div className="mt-3 flex flex-wrap gap-2">
                {artifactPackages.map((pkg) => {
                  const packageSelected = selectedPackage?.id === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => onSelect(pkg.id)}
                      aria-pressed={packageSelected}
                      className={[
                        'border px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.12em]',
                        packageSelected
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-surface-300 bg-white text-surface-700 hover:border-brand-blue',
                      ].join(' ')}
                    >
                      Version {pkg.artifactOrdinal}
                    </button>
                  )
                })}
              </div>
            )}
            {detailPackage.artifactVersionNotes && (
              <p className="mt-3 text-xs leading-5 text-surface-600">
                {detailPackage.artifactVersionNotes}
              </p>
            )}
            <a
              href={detailPackage.artifactPath}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
            >
              Open this artifact version
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3 text-sm leading-6 text-surface-700">
            No mountable artifact is attached to this response package.
          </div>
        )}

        <ExactResponseBlock text={step.response} copyText={copyText} />

        {detailPackage && <ArtifactCodeBlock pkg={detailPackage} />}

        {step.notes && (
          <div className="border border-surface-200 bg-white px-4 py-3 text-sm leading-6 text-surface-700">
            {step.notes}
          </div>
        )}

        <SourceLink sourceRunUrl={sourceRunUrl} providerName={providerName} />
      </div>
    </div>
  )
}

export default function SourceRunShowcase({
  sourceRunUrl,
  pathforgeSourceRunUrl,
  sourceRunId,
  providerName,
  steps,
  defaultStepNumber,
  verificationNotes,
}: {
  sourceRunUrl: string
  pathforgeSourceRunUrl?: string
  sourceRunId?: string
  providerName: string
  steps: SourceRunShowcaseStep[]
  defaultStepNumber?: number
  verificationNotes?: string
}) {
  const packages = useMemo(
    () =>
      steps.flatMap((step) => {
        const explicitVersions = (step.artifactVersions ?? []).filter((version) => (
          !!version.artifactPath &&
          !!version.sourceFilePath &&
          !!version.code &&
          !!version.artifactTitle
        ))

        if (explicitVersions.length > 0) {
          return explicitVersions.map((version, index) => ({
            ...step,
            id: version.id ?? `${step.id}-artifact-${index + 1}`,
            stepId: step.id,
            artifactPath: version.artifactPath,
            artifactTitle: version.artifactTitle,
            sourceFilePath: version.sourceFilePath,
            code: version.code,
            artifactVersionNotes: version.notes,
            artifactOrdinal: index + 1,
            artifactCount: explicitVersions.length,
            isDefaultArtifact: Boolean(version.isDefault),
          }))
        }

        if (!step.artifactPath || !step.sourceFilePath || !step.code || !step.artifactTitle) {
          return []
        }

        return [{
          ...step,
          stepId: step.id,
          artifactPath: step.artifactPath,
          artifactTitle: step.artifactTitle,
          sourceFilePath: step.sourceFilePath,
          code: step.code,
          artifactOrdinal: 1,
          artifactCount: 1,
          isDefaultArtifact: false,
        }]
      }),
    [steps],
  )
  const defaultStepPackages = packages.filter((pkg) => pkg.stepNumber === defaultStepNumber)
  const defaultPackage =
    packages.find((pkg) => pkg.isDefaultArtifact) ??
    defaultStepPackages[defaultStepPackages.length - 1] ??
    packages[packages.length - 1]
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackage?.id ?? '')
  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ?? defaultPackage ?? packages[0]

  return (
    <>
      {selectedPackage && (
        <section className="border-b border-surface-800 bg-surface-900 px-4 pb-9 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ArtifactFrame selectedPackage={selectedPackage} providerName={providerName} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-surface-500">
            <GitBranch className="h-3.5 w-3.5 text-[#07551f]" />
            Source-run path
          </div>
          <h2 className="mt-2 text-3xl font-black text-surface-900">
            Prompts, responses, and artifact versions stay tied together.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
            The final artifact loads first, earlier generated artifacts remain selectable, and every prompt is followed by
            the response package that came after it.
          </p>
        </div>

        {sourceRunId && (
          <div className="mb-6 border border-brand-blue/25 bg-brand-blue/5 px-4 py-3 text-sm leading-6 text-surface-700">
            Source-run id <code>{sourceRunId}</code>.
          </div>
        )}

        {verificationNotes && (
          <div className="mb-6 border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {verificationNotes}
          </div>
        )}

        {packages.length > 0 && (
          <div className="mb-8 grid gap-3 border border-surface-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const selected = selectedPackage?.id === pkg.id
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  aria-pressed={selected}
                  className={[
                    'min-h-[118px] border p-4 text-left transition',
                    selected
                      ? 'border-brand-blue bg-brand-blue text-white'
                      : 'border-surface-200 bg-surface-50 hover:border-brand-blue/60',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'font-mono text-[10px] uppercase tracking-[0.16em]',
                      selected ? 'text-white/70' : 'text-surface-500',
                    ].join(' ')}
                  >
                    Prompt {String(pkg.stepNumber).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-sm font-black">{pkg.artifactTitle}</div>
                  <div className={['mt-2 text-xs leading-5', selected ? 'text-white/80' : 'text-surface-600'].join(' ')}>
                    {pkg.artifactCount > 1
                      ? `Version ${pkg.artifactOrdinal} of ${pkg.artifactCount}`
                      : selected
                        ? 'Mounted above'
                        : 'Select to mount above'}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="space-y-7">
          {steps.map((step, index) => {
            const artifactPackages = packages.filter((pkg) => pkg.stepId === step.id)
            const selectedStepPackage = artifactPackages.find((pkg) => selectedPackage?.id === pkg.id)

            return (
              <PipeNode
                key={step.id}
                eyebrow={`Prompt ${String(step.stepNumber).padStart(2, '0')}`}
                title={step.title}
                terminal={index === steps.length - 1}
              >
                <PromptText text={step.prompt} />
                <div className="mt-4">
                  <ResponsePackageCard
                    step={step}
                    artifactPackages={artifactPackages}
                    selectedPackage={selectedStepPackage}
                    onSelect={artifactPackages.length > 0 ? setSelectedPackageId : undefined}
                    sourceRunUrl={sourceRunUrl}
                    providerName={providerName}
                  />
                </div>
              </PipeNode>
            )
          })}
        </div>

        {pathforgeSourceRunUrl && (
          <div className="mt-8 border border-surface-200 bg-white p-4">
            <a
              href={pathforgeSourceRunUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
            >
              PathForge source-run record
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </section>
    </>
  )
}
