import fs from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ExternalLink, FileCode2, GitBranch } from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'
import ProjectEngagementBar from '@/components/ProjectEngagementBar'
import ProjectCommunityPanel from '@/components/ProjectCommunityPanel'
import { HP_10BII_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'

const project = HP_10BII_SHOWCASE_PROJECT
const projectId = project.id
const artifactPath = project.artifactPath
const sourceRunUrl = project.sourceUrl
const capturedAt = 'June 1, 2026'

const responseSummary = [
  'Claude generated a working HP 10bII+ calculator as a single self-contained HTML file, including TVM, cash flows, interest conversion, statistics, amortization, memory registers, math keys, and keyboard input.',
  'A follow-up prompt removed the unwanted red/plum hue and finalized the interface with a graphite-and-silver body, green LCD, and near-black screen text. The calculator logic was kept unchanged.',
]

function getModelResponse() {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'public/artifacts/hp-10bii-financial-calculator-claude-opus-48.html'),
      'utf8',
    )
  } catch {
    return 'Artifact capture pending. The HP 10Bii+ calculator HTML response has not been saved yet.'
  }
}

function ArtifactFrame() {
  return (
    <div
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-[#141618] shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">HP 10Bii+ financial calculator</div>
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
        title="HP 10Bii+ financial calculator generated from a Claude source run"
        src={artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[1040px] w-full bg-[#141618] sm:h-[900px] lg:h-[820px]"
      />
    </div>
  )
}

function RunSummary() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model
        </div>
        <div className="mt-1 font-semibold text-surface-100">{project.modelUsed}</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run type
        </div>
        <div className="mt-1 font-semibold text-surface-100">Two-prompt HTML artifact</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Captured
        </div>
        <div className="mt-1 font-semibold text-surface-100">{capturedAt}</div>
      </div>
    </div>
  )
}

function ResponsePackage({ modelResponse }: { modelResponse: string }) {
  return (
    <details className="group border border-surface-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            Exact response collapsed
          </span>
          <span className="mt-1 block text-base font-black text-surface-900">
            Claude response package
          </span>
          <span className="mt-1 block text-sm leading-6 text-surface-600">
            The generated HTML is mounted above and kept collapsed here for inspection.
          </span>
        </span>
        <span className="shrink-0 border border-surface-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-700">
          Open
        </span>
      </summary>

      <div className="space-y-4 border-t border-surface-200 bg-white p-4">
        <div className="space-y-4 text-sm leading-7 text-surface-900">
          {responseSummary.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <a
            href={artifactPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border-b border-surface-400 font-semibold text-surface-900 transition hover:border-brand-orange hover:text-brand-orange"
          >
            Open the HP 10Bii+ calculator HTML file
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="border border-surface-200 bg-surface-50 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-surface-700">
            <FileCode2 className="h-4 w-4 text-brand-blue" />
            hp_10bii_plus.html
          </div>
        </div>

        <details className="group/code border border-surface-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
                Code block
              </span>
              <span className="mt-1 block text-sm font-bold text-surface-900">
                Full HTML response
              </span>
              <span className="mt-1 block text-xs leading-5 text-surface-500">
                Collapsed because the generated file is long.
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
            <CopyButton text={modelResponse} variant="dark" label="Copy code" visibleLabel="Copy" />
          </div>
          <pre className="max-h-[460px] overflow-auto bg-surface-900 p-4 text-xs leading-5 text-surface-100">
            <code>{modelResponse}</code>
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
    </details>
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

function BuildPath({ modelResponse }: { modelResponse: string }) {
  return (
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
          <PipeNode eyebrow="01 · Prompt" title={project.steps[0].title}>
            <PromptText text={project.steps[0].content} />
          </PipeNode>

          <PipeNode eyebrow="02 · Refinement" title={project.steps[1].title}>
            <PromptText text={project.steps[1].content} />
          </PipeNode>

          <PipeNode eyebrow="03 · Response" title="Response package" terminal>
            <ResponsePackage modelResponse={modelResponse} />
          </PipeNode>
        </div>
      </div>
    </section>
  )
}

export default function Hp10BiiCalculatorDemoPage() {
  const modelResponse = getModelResponse()

  return (
    <main className="min-h-screen bg-surface-50 text-surface-900">
      <section className="border-b border-surface-800 bg-surface-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-xs font-mono uppercase tracking-[0.18em] text-surface-400 hover:text-brand-orange"
            >
              PathForge
            </Link>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                HP 10Bii+ calculator from a Claude run.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                A Claude source run produced a working financial calculator artifact, then a quick follow-up removed
                the unwanted red hue and finalized the black, silver, and green-LCD version.
              </p>
            </div>
            <RunSummary />
          </div>

          <ProjectEngagementBar projectId={projectId} loginNextPath="/hp-10bii-calculator-demo" />
          <ArtifactFrame />
        </div>
      </section>

      <BuildPath modelResponse={modelResponse} />
      <ProjectCommunityPanel projectId={projectId} />
    </main>
  )
}
