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
  resultContent: string
  description: string
}

type StepPackage = {
  id: string
  stepNumber: number
  title: string
  eyebrow: string
  artifactTitle: string
  artifactPath: string
  sourceFilePath: string
  code: string
  transcript: string[]
}

// Verbatim visible response text Claude returned for each step, captured from the
// public source-run share (https://claude.ai/share/35271fee-8723-4210-8923-16c909d9789c).
// The mounted/collapsed artifact below each transcript is the exact response — the HTML
// file Claude presented. This prose is preserved in addition to, not in place of, that code.
const responseOneTranscript = [
  `Here's your HP 10bII+ — a single self-contained HTML file, no dependencies beyond two web fonts. It's styled as a faithful hardware replica (plum body, orange shift accent, recessed green LCD) rather than a reinterpretation.`,
  `What works:`,
  `The full financial core is live. TVM (N, I/YR, PV, PMT, FV) solves any of the five given the other four, using the standard HP cash-flow sign convention and BEG/END toggle. Cash flows (CFj, Nj) feed NPV, IRR/YR, and NFV. Interest conversion (NOM%, EFF%, P/YR), single-variable statistics (Σ+, mean, Sx, σx), amortization, STO/RCL across registers 0–9, and the usual math keys (1/x, √x, x², yˣ, LN, eˣ, LOG, 10ˣ, n!, %) all function. There's a Readout panel beside the keypad that mirrors the registers, since the real device only shows one line at a time — it surfaces the TVM stack, the cash-flow list, stats, and a scrollable amortization table.`,
  `Two things to know about scope and behavior:`,
  `Only the orange ▼ shift is implemented. The blue ▲ shift on the physical unit (bond pricing, trig, depreciation, probability) is out of scope here — this covers the financial functions you'd actually use for the CFP material. And like the real calculator, NPV/IRR discount at the periodic rate, so for annual cash-flow problems set P/YR to 1 first, otherwise it'll divide your rate by the default 12.`,
  `A quick test sequence for a 30-year mortgage at 5.5% on $250k:`,
  `360 ▼N (uses xP/YR to expand 30 years × 12), then 5.5 I/YR, 250000 PV, 0 FV, then press PMT — you should get about −1,419.47. From there, ▼FV (AMORT) populates the amortization table in the side panel.`,
  `Keyboard input is wired too — digits, operators, parentheses, Enter, Backspace, Esc to clear, and "s" for shift, in case you'd rather type than click. Let me know if any key's behavior doesn't match your physical unit and I'll adjust it.`,
]

const responseTwoTranscript = [
  `Done. The plum body and every orange/warm element are gone, replaced with a neutral graphite-and-silver palette:`,
  `The body is now neutral graphite (no red cast), with white key labels and the existing silver nameplate carrying the "silver" side. The two prominent keys lost their orange — the shift key (▼) is now bright brushed silver with a dark glyph and a cool white glow when armed, and the "=" key is a darker steel/silver, both with dark text. Secondary (shifted) labels and the section accents are now a light cool silver instead of orange, so the shift layer is still legible without any warm hue.`,
  `The LCD keeps its green-ish background but I darkened the ink toward near-black for the "black writing" you wanted, and I fixed a malformed hex value in the screen gradient along the way. The side Readout panel was also pulling purple tones, so I neutralized it to slate/charcoal with cool-grey text — the only colors left in the whole interface are the greens used for solved/"set" values, which read as functional confirmation rather than decoration.`,
  `Functionally nothing changed; this was purely a recolor. If the silver reads too light or too dark against the keys on your screen, tell me which way to push it.`,
]

const stepTranscripts = [responseOneTranscript, responseTwoTranscript]

function ArtifactFrame({ selectedPackage }: { selectedPackage: StepPackage }) {
  return (
    <div
      key={selectedPackage.id}
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#141618] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-orange">
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
        title={`${selectedPackage.artifactTitle} generated from a Claude source run`}
        src={selectedPackage.artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[1040px] w-full bg-[#141618] sm:h-[900px] lg:h-[820px]"
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

        {pkg.transcript.length > 0 && (
          <div className="space-y-3 text-sm leading-7 text-surface-900">
            {pkg.transcript.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}

        <details className="group/code border border-surface-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
                Verbatim response
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
          Claude source run
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function Hp10BiiSourceRunExplorer({
  sourceRunUrl,
  steps,
  stepCodes,
}: {
  sourceRunUrl: string
  steps: SourceStep[]
  stepCodes: string[]
}) {
  const packages = useMemo<StepPackage[]>(
    () =>
      steps.map((step, index) => {
        const responseOrder = String(index * 2 + 2).padStart(2, '0')
        const isFinal = index === steps.length - 1
        return {
          id: step.id,
          stepNumber: step.stepNumber,
          title: step.title,
          eyebrow: `${responseOrder} · Response package`,
          artifactTitle: isFinal
            ? 'HP 10Bii+ calculator · approved artifact'
            : `HP 10Bii+ calculator · step ${step.stepNumber} artifact`,
          artifactPath: `/artifacts/hp-10bii-step-${step.stepNumber}.html`,
          sourceFilePath: 'hp-10bii-plus.html',
          code: stepCodes[index] ?? `Step ${step.stepNumber} HP 10Bii+ artifact capture is unavailable.`,
          transcript: stepTranscripts[index] ?? [],
        }
      }),
    [steps, stepCodes],
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
          <ArtifactFrame selectedPackage={selectedPackage} />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-surface-500">
            <GitBranch className="h-3.5 w-3.5 text-[#128135]" />
            Prompt path
          </div>
          <h2 className="mt-1 text-2xl font-black text-surface-900">The source run, locked together.</h2>
        </div>

        <div className="max-w-5xl">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const pkg = packages[index]
              const isFinal = index === steps.length - 1
              const promptOrder = String(index * 2 + 1).padStart(2, '0')
              const responseOrder = String(index * 2 + 2).padStart(2, '0')
              return (
                <div key={step.id} className="space-y-8">
                  <PipeNode
                    eyebrow={index === 0 ? `${promptOrder} · Prompt` : `${promptOrder} · Refinement`}
                    title={step.title}
                  >
                    <PromptText text={step.content} />
                  </PipeNode>

                  <PipeNode
                    eyebrow={`${responseOrder} · Response package`}
                    title={
                      isFinal
                        ? 'Final color-corrected calculator response'
                        : 'Initial generated calculator response'
                    }
                    terminal={isFinal}
                  >
                    <ResponsePackageCard
                      pkg={pkg}
                      selected={selectedPackageId === pkg.id}
                      onSelect={() => setSelectedPackageId(pkg.id)}
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
