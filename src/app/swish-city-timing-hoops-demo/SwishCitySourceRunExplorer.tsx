'use client'

import type { ReactNode } from 'react'
import { ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'

export type SwishCitySourceStep = {
  id: string
  stepNumber: number
  title: string
  content: string
  responseNote: string
  hasArtifact: boolean
}

const artifactPath = '/artifacts/swish-city-claude-opus-4-8.html'
const artifactTitle = 'Swish City - Arcade Hoops'

function ArtifactFrame() {
  return (
    <div
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#05060d] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">{artifactTitle}</div>
          <div className="mt-1 text-xs text-surface-400">
            Prompt 03 · final complete single-file HTML
          </div>
        </div>
        <a
          href={artifactPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-300 transition hover:border-brand-orange hover:text-brand-orange"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
      <iframe
        title="Swish City arcade basketball timing game generated from a Claude source run"
        src={artifactPath}
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        className="h-[1040px] w-full bg-[#05060d] sm:h-[920px] lg:h-[820px]"
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

function ResponseNote({
  step,
  finalArtifactCode,
  sourceRunUrl,
}: {
  step: SwishCitySourceStep
  finalArtifactCode: string
  sourceRunUrl: string
}) {
  if (!step.hasArtifact) {
    return (
      <div className="border border-surface-200 bg-white p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          No artifact captured
        </div>
        <p className="mt-2 text-sm leading-6 text-surface-900">{step.responseNote}</p>
        <a
          href={sourceRunUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Claude source run
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    )
  }

  return (
    <div className="border border-surface-200 bg-white">
      <div className="space-y-4 border-b border-surface-200 bg-white p-4">
        <div className="border border-surface-200 bg-surface-50 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-surface-700">
            <FileCode2 className="h-4 w-4 text-brand-blue" />
            public/artifacts/swish-city-claude-opus-4-8.html
          </div>
          <a
            href={artifactPath}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Open final artifact
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="text-sm leading-6 text-surface-900">{step.responseNote}</p>
      </div>

      <details className="group/code bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
              <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
              Verbatim response
            </span>
            <span className="mt-1 block text-sm font-bold text-surface-900">
              Exact HTML Claude returned
            </span>
            <span className="mt-1 block text-xs leading-5 text-surface-500">
              Collapsed because the generated file is long; this is the mounted game above.
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
          <CopyButton
            text={finalArtifactCode}
            variant="dark"
            label="Copy code"
            visibleLabel="Copy"
          />
        </div>
        <pre className="max-h-[460px] overflow-auto bg-surface-900 p-4 text-xs leading-5 text-surface-100">
          <code>{finalArtifactCode}</code>
        </pre>
      </details>

      <div className="border-t border-surface-200 p-4">
        <a
          href={sourceRunUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          Claude source run
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function SwishCitySourceRunExplorer({
  sourceRunUrl,
  pathforgeSourceRunUrl,
  sourceRunId,
  steps,
  finalArtifactCode,
}: {
  sourceRunUrl: string
  pathforgeSourceRunUrl: string
  sourceRunId: string
  steps: SwishCitySourceStep[]
  finalArtifactCode: string
}) {
  return (
    <>
      <section className="border-b border-surface-800 bg-surface-900 px-4 pb-9 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ArtifactFrame />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-surface-500">
            <GitBranch className="h-3.5 w-3.5 text-[#128135]" />
            Prompt path
          </div>
          <h2 className="mt-1 text-2xl font-black text-surface-900">
            The three-prompt recovery run, locked together.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-surface-600">
            Source-run id {sourceRunId}. The first two Claude turns are preserved as failed response captures, and
            the third turn mounts the complete playable artifact.
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
            {steps.map((step, index) => {
              const isFinal = index === steps.length - 1
              const promptOrder = String(index * 2 + 1).padStart(2, '0')
              const responseOrder = String(index * 2 + 2).padStart(2, '0')
              return (
                <div key={step.id} className="space-y-8">
                  <PipeNode
                    eyebrow={index === 0 ? `${promptOrder} · Prompt` : `${promptOrder} · Recovery prompt`}
                    title={step.title}
                  >
                    <PromptText text={step.content} />
                  </PipeNode>

                  <PipeNode
                    eyebrow={`${responseOrder} · Response package`}
                    title={step.hasArtifact ? 'Final playable game response' : 'Failed response capture'}
                    terminal={isFinal}
                  >
                    <ResponseNote
                      step={step}
                      finalArtifactCode={finalArtifactCode}
                      sourceRunUrl={sourceRunUrl}
                    />
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
