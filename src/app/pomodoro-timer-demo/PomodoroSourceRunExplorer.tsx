'use client'

import type { ReactNode } from 'react'
import { CheckCircle2, ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'

type SourceStep = {
  id: string
  stepNumber: number
  title: string
  content: string
  resultContent: string
  description: string
}

function ArtifactFrame({ artifactPath }: { artifactPath: string }) {
  return (
    <div
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#0b1020] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">Pomodoro Focus Timer · final artifact</div>
          <div className="mt-1 text-xs text-surface-400">04 · Polished dark-theme build</div>
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
        title="Pomodoro Focus Timer generated from a GPT 5.5 Instant source run"
        src={artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[720px] w-full bg-[#0b1020] sm:h-[680px]"
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

function ResponseSummaryCard({
  step,
  isFinal,
  artifactPath,
  finalArtifactCode,
  sourceRunUrl,
}: {
  step: SourceStep
  isFinal: boolean
  artifactPath: string
  finalArtifactCode: string
  sourceRunUrl: string
}) {
  return (
    <div className="border border-surface-200 bg-white">
      <div className="space-y-4 p-4">
        <div className="space-y-3 text-sm leading-7 text-surface-900">
          <p>{step.resultContent}</p>
        </div>

        {isFinal ? (
          <>
            <div className="border border-surface-200 bg-surface-50 px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-surface-700">
                <FileCode2 className="h-4 w-4 text-brand-blue" />
                pomodoro-focus-timer.html
              </div>
              <a
                href={artifactPath}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 border-b border-surface-400 text-sm font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
              >
                Open the final artifact
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <details className="group/code border border-surface-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
                    Code block
                  </span>
                  <span className="mt-1 block text-sm font-bold text-surface-900">
                    Final self-contained HTML artifact
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-surface-500">
                    Collapsed because the generated file is long; this is the single file mounted above.
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
                <CopyButton text={finalArtifactCode} variant="dark" label="Copy code" visibleLabel="Copy" />
              </div>
              <pre className="max-h-[460px] overflow-auto bg-surface-900 p-4 text-xs leading-5 text-surface-100">
                <code>{finalArtifactCode}</code>
              </pre>
            </details>
          </>
        ) : (
          <div className="border border-surface-200 bg-surface-50 px-4 py-3 text-xs leading-5 text-surface-500">
            Same single HTML file, carried forward. The full code is collapsed under the final response below.
          </div>
        )}

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

function StepChip({ step, isFinal }: { step: SourceStep; isFinal: boolean }) {
  const stepLabel = String(step.stepNumber).padStart(2, '0')
  return (
    <div
      className={[
        'border px-4 py-3 text-left',
        isFinal
          ? 'border-brand-blue bg-brand-blue/10 text-white ring-2 ring-brand-blue/30'
          : 'border-surface-800 bg-surface-950 text-surface-300',
      ].join(' ')}
    >
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
        {isFinal && <CheckCircle2 className="h-3.5 w-3.5" />}
        {`Prompt ${stepLabel}`}
      </span>
      <span className="mt-1 block text-sm font-black">{step.title}</span>
    </div>
  )
}

export default function PomodoroSourceRunExplorer({
  sourceRunUrl,
  steps,
  artifactPath,
  finalArtifactCode,
}: {
  sourceRunUrl: string
  steps: SourceStep[]
  artifactPath: string
  finalArtifactCode: string
}) {
  const lastStepNumber = steps[steps.length - 1]?.stepNumber

  return (
    <>
      <section className="border-b border-surface-800 bg-surface-900 px-4 pb-9 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ArtifactFrame artifactPath={artifactPath} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <StepChip key={step.id} step={step} isFinal={step.stepNumber === lastStepNumber} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-surface-500">
            <GitBranch className="h-3.5 w-3.5 text-[#128135]" />
            Prompt path
          </div>
          <h2 className="mt-1 text-2xl font-black text-surface-900">The four-prompt run, locked together.</h2>
        </div>

        <div className="max-w-5xl">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const isFinal = step.stepNumber === lastStepNumber
              const promptOrder = String(index * 2 + 1).padStart(2, '0')
              const responseOrder = String(index * 2 + 2).padStart(2, '0')
              return (
                <div key={step.id} className="space-y-8">
                  <PipeNode eyebrow={`${promptOrder} · Prompt`} title={step.title}>
                    <PromptText text={step.content} />
                  </PipeNode>

                  <PipeNode
                    eyebrow={`${responseOrder} · Response package`}
                    title={isFinal ? 'Final polished response' : 'Build response'}
                    terminal={isFinal}
                  >
                    <ResponseSummaryCard
                      step={step}
                      isFinal={isFinal}
                      artifactPath={artifactPath}
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
