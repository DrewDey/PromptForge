'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'

type SourceStep = {
  id: string
  stepNumber: number
  title: string
  content: string
  responseExact: string
  responseSummary: string
  notes: string
  artifactPath: string | null
  sourceFilePath: string | null
  code: string | null
}

type StepPackage = SourceStep & {
  artifactPath: string
  sourceFilePath: string
  code: string
  eyebrow: string
  artifactTitle: string
  visibleResponse: string
}

function visibleResponseText(step: SourceStep) {
  if (!step.artifactPath) return step.responseExact

  const htmlStart = step.responseExact.indexOf('<!DOCTYPE html>')
  if (htmlStart === -1) return step.responseExact

  return step.responseExact.slice(0, htmlStart).trimEnd()
}

function ArtifactFrame({ selectedPackage }: { selectedPackage: StepPackage }) {
  return (
    <div
      key={selectedPackage.id}
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#07111f] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">{selectedPackage.artifactTitle}</div>
          <div className="mt-1 text-xs text-surface-400">{selectedPackage.eyebrow}</div>
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
        title={`${selectedPackage.artifactTitle} generated from a ChatGPT source run`}
        src={selectedPackage.artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[760px] w-full bg-[#07111f] sm:h-[720px] lg:h-[820px]"
      />
    </div>
  )
}

function PromptText({ text }: { text: string }) {
  return (
    <div className="group/prompt relative pr-9">
      <p className="border-l-2 border-brand-orange pl-3 font-semibold text-surface-900">{text}</p>
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
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-surface-500">{eyebrow}</div>
        <h3 className="mt-2 text-xl font-black text-surface-900">{title}</h3>
        <div className="mt-4 text-sm leading-6 text-surface-700">{children}</div>
      </div>
    </article>
  )
}

function ExactResponseBlock({ text, copyLabel = 'Copy response' }: { text: string; copyLabel?: string }) {
  return (
    <div className="border border-surface-200 bg-surface-50">
      <div className="flex items-center justify-between gap-3 border-b border-surface-200 bg-white px-4 py-3">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Exact visible response text
        </span>
        <CopyButton text={text} variant="ghost" label={copyLabel} visibleLabel="Copy" />
      </div>
      <pre className="max-h-[360px] whitespace-pre-wrap overflow-auto p-4 text-sm leading-7 text-surface-900">
        {text}
      </pre>
    </div>
  )
}

function ResponsePackageCard({
  pkg,
  selected,
  onSelect,
  sourceRunUrl,
}: {
  pkg: StepPackage
  selected: boolean
  onSelect: () => void
  sourceRunUrl: string
}) {
  return (
    <div
      className={[
        'border bg-white transition',
        selected
          ? 'border-brand-blue ring-2 ring-brand-blue/25'
          : 'border-surface-200 hover:border-brand-blue/60',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            {pkg.eyebrow}
          </span>
          <span className="mt-1 block text-base font-black text-surface-900">{pkg.title}</span>
          <span className="mt-1 block text-sm leading-6 text-surface-600">
            Selecting this step mounts its exact artifact version above.
          </span>
        </span>
        <span
          className={[
            'inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]',
            selected
              ? 'border-brand-blue bg-brand-blue text-white'
              : 'border-surface-300 bg-white text-surface-700',
          ].join(' ')}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
          {selected ? 'Selected' : 'Select'}
        </span>
      </button>

      <div className="space-y-4 border-t border-surface-200 bg-white p-4">
        <div className="border border-surface-200 bg-surface-50 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-surface-700">
            <FileCode2 className="h-4 w-4 text-brand-blue" />
            {pkg.sourceFilePath}
          </div>
          <a
            href={pkg.artifactPath}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Open this artifact version
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <ExactResponseBlock text={pkg.visibleResponse} />

        <details className="group/code border border-surface-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
                Verbatim response artifact
              </span>
              <span className="mt-1 block text-sm font-bold text-surface-900">
                Exact HTML this step returned
              </span>
              <span className="mt-1 block text-xs leading-5 text-surface-500">
                Collapsed because the generated file is long; this is the single file mounted above, verbatim.
              </span>
            </span>
            <span className="shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
              Open
            </span>
          </summary>
          <div className="flex items-center justify-between gap-3 border-t border-surface-800 bg-surface-900 px-4 py-3">
            <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-surface-400">
              Full self-contained HTML
            </span>
            <CopyButton text={pkg.code} variant="dark" label="Copy code" visibleLabel="Copy" />
          </div>
          <pre className="max-h-[460px] overflow-auto bg-surface-900 p-4 text-xs leading-5 text-surface-100">
            <code>{pkg.code}</code>
          </pre>
        </details>

        <a
          href={sourceRunUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          ChatGPT source run
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

function ResponseOnlyCard({ step, sourceRunUrl }: { step: SourceStep; sourceRunUrl: string }) {
  return (
    <div className="space-y-4 border border-surface-200 bg-white p-4">
      <ExactResponseBlock text={step.responseExact} />

      <div className="border border-surface-200 bg-surface-50 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Artifact status
        </div>
        <p className="mt-2 text-sm leading-6 text-surface-700">
          No artifact file was produced for this response, so this step is preserved as source-run text only.
        </p>
        {step.notes && <p className="mt-2 text-xs leading-5 text-surface-500">{step.notes}</p>}
      </div>

      <a
        href={sourceRunUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
      >
        ChatGPT source run
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

export default function NeonBlockPatrolSourceRunExplorer({
  sourceRunUrl,
  pathforgeSourceRunUrl,
  sourceRunId,
  steps,
}: {
  sourceRunUrl: string
  pathforgeSourceRunUrl: string
  sourceRunId: string
  steps: SourceStep[]
}) {
  const packages = useMemo<StepPackage[]>(
    () =>
      steps
        .filter((step): step is SourceStep & { artifactPath: string; sourceFilePath: string; code: string } =>
          Boolean(step.artifactPath && step.sourceFilePath && step.code),
        )
        .map((step) => {
          const responseOrder = String(step.stepNumber * 2).padStart(2, '0')
          const isFinal = step.stepNumber === 5
          return {
            ...step,
            eyebrow: `${responseOrder} · Response package`,
            artifactTitle: isFinal
              ? 'Neon Block Patrol v3 · final inline artifact'
              : `Neon Block Patrol · step ${step.stepNumber} artifact`,
            visibleResponse: visibleResponseText(step),
          }
        }),
    [steps],
  )

  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    packages[packages.length - 1]?.id ?? packages[0]?.id,
  )
  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ?? packages[packages.length - 1]

  return (
    <>
      <section className="border-b border-surface-800 bg-surface-900 px-4 pb-9 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {selectedPackage && <ArtifactFrame selectedPackage={selectedPackage} />}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {packages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id
              const stepLabel = String(pkg.stepNumber).padStart(2, '0')
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  aria-pressed={isSelected}
                  className={[
                    'border px-4 py-3 text-left transition',
                    isSelected
                      ? 'border-brand-blue bg-brand-blue/10 text-white ring-2 ring-brand-blue/30'
                      : 'border-surface-800 bg-surface-950 text-surface-300 hover:border-brand-blue/70',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {`Prompt ${stepLabel}`}
                  </span>
                  <span className="mt-1 block text-sm font-black">{pkg.artifactTitle}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-surface-500">
            <GitBranch className="h-3.5 w-3.5 text-[#128135]" />
            Prompt path
          </div>
          <h2 className="mt-1 text-2xl font-black text-surface-900">The five-prompt run, locked together.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
            Source-run id {sourceRunId}. Steps 1, 2, and 5 produced mounted artifact files; steps 3 and 4 are preserved
            as exact source-run response text.
          </p>
        </div>

        <div className="mb-8 max-w-5xl">
          <a
            href={pathforgeSourceRunUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
          >
            PathForge source-run record
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="max-w-5xl">
          <div className="space-y-8">
            {steps.map((step) => {
              const pkg = packages.find((candidate) => candidate.id === step.id)
              const isFinal = step.stepNumber === steps[steps.length - 1]?.stepNumber
              const promptOrder = String(step.stepNumber * 2 - 1).padStart(2, '0')
              const responseOrder = String(step.stepNumber * 2).padStart(2, '0')
              return (
                <div key={step.id} className="space-y-8">
                  <PipeNode
                    eyebrow={step.stepNumber === 1 ? `${promptOrder} · Prompt` : `${promptOrder} · Refinement`}
                    title={step.title}
                  >
                    <PromptText text={step.content} />
                  </PipeNode>

                  <PipeNode
                    eyebrow={`${responseOrder} · Response package`}
                    title={isFinal ? 'Final pasted HTML response' : 'Source-run response'}
                    terminal={isFinal}
                  >
                    {pkg ? (
                      <ResponsePackageCard
                        pkg={pkg}
                        selected={selectedPackageId === pkg.id}
                        onSelect={() => setSelectedPackageId(pkg.id)}
                        sourceRunUrl={sourceRunUrl}
                      />
                    ) : (
                      <ResponseOnlyCard step={step} sourceRunUrl={sourceRunUrl} />
                    )}
                  </PipeNode>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
