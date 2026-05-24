import fs from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ExternalLink, FileCode2, Gamepad2, GitBranch, ShieldCheck } from 'lucide-react'

const prompt = 'Make me a playable Snake game as a single self-contained HTML file.'
const artifactPath = '/artifacts/snake-gpt55-pro-oneshot.html'
const chatUrl = 'https://chatgpt.com/c/6a122064-6094-832a-9228-e239ce31e79b'
const capturedAt = 'May 23, 2026, 6:00 PM ET'

function getModelResponse() {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), 'public/artifacts/snake-gpt55-pro-oneshot.html'),
      'utf8',
    )
  } catch {
    return 'Artifact capture pending. The page is ready; the real ChatGPT HTML response has not been saved yet.'
  }
}

function ArtifactFrame() {
  return (
    <div
      id="final-result"
      className="overflow-hidden border border-surface-800 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-800 bg-surface-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-brand-orange">
            Mounted response artifact
          </div>
          <div className="truncate text-sm font-semibold">Playable Snake game</div>
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
        title="Playable Snake game generated from one ChatGPT prompt"
        src={artifactPath}
        sandbox="allow-scripts allow-same-origin"
        className="h-[620px] w-full bg-black lg:h-[760px]"
      />
    </div>
  )
}

function RunSummary() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Model setting
        </div>
        <div className="mt-1 font-semibold text-surface-100">Latest 5.5 / Extended Pro</div>
      </div>
      <div className="border border-surface-800 bg-surface-900 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Run time
        </div>
        <div className="mt-1 font-semibold text-surface-100">Thought for 10m 57s</div>
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

function AttachmentLink({
  href,
  label,
  meta,
}: {
  href: string
  label: string
  meta: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center justify-between gap-3 border border-surface-200 bg-surface-50 px-3 py-2 text-surface-900 transition hover:border-brand-orange hover:bg-primary-50"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">
          {meta}
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
    </a>
  )
}

function ResponsePackage({ modelResponse }: { modelResponse: string }) {
  return (
    <details className="group border border-surface-200 bg-surface-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            Exact response collapsed
          </span>
          <span className="mt-1 block text-base font-black text-surface-900">
            Verbatim ChatGPT HTML file, attachments, and verification
          </span>
          <span className="mt-1 block text-sm leading-6 text-surface-600">
            Contains the exact downloaded response, generated HTML file, screenshots, and top embed link.
          </span>
        </span>
        <span className="shrink-0 border border-surface-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-700">
          Open
        </span>
      </summary>

      <div className="space-y-4 border-t border-surface-200 bg-white p-4">
        <p>
          Exact response captured from ChatGPT: a self-contained HTML file and live preview. The
          verbatim file content is attached below and mounted as the playable result at the top.
        </p>

        <div className="grid gap-3 border border-surface-900 bg-surface-900 p-4 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
              Mounted at top
            </div>
            <p className="mt-1 text-sm font-semibold leading-6 text-surface-100">
              The playable game is this response&apos;s attached HTML file rendered in the top embed.
            </p>
          </div>
          <a
            href="#final-result"
            className="inline-flex items-center justify-center border border-brand-orange px-3 py-2 text-xs font-bold text-brand-orange transition hover:bg-brand-orange hover:text-white"
          >
            View embed
          </a>
        </div>

        <div className="border border-surface-200 bg-surface-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
            Verification summary
          </div>
          <p className="text-sm font-semibold leading-6 text-surface-900">
            Playable Snake game, embedded above, verified from the generated HTML file. No external
            URLs were found in the captured artifact.
          </p>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
            Exact response attachments
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <AttachmentLink
              href={artifactPath}
              label="snake-gpt55-pro-oneshot.html"
              meta="Generated file"
            />
            <AttachmentLink
              href="/screenshots/snake-demo-game-running.png"
              label="Game running"
              meta="Verification screenshot"
            />
            <AttachmentLink
              href="/screenshots/snake-demo-desktop-full.png"
              label="Full page"
              meta="Page screenshot"
            />
          </div>
        </div>

        <details className="group border border-surface-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />
                Exact response
              </span>
              <span className="mt-1 block text-sm font-bold text-surface-900">
                Verbatim ChatGPT HTML file
              </span>
              <span className="mt-1 block text-xs leading-5 text-surface-500">
                This is the exact downloaded response content, collapsed because it is long.
              </span>
            </span>
            <span className="shrink-0 border border-surface-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-600">
              Open
            </span>
          </summary>
          <pre className="max-h-[460px] overflow-auto border-t border-surface-200 bg-surface-900 p-4 text-xs leading-5 text-surface-100">
            <code>{modelResponse}</code>
          </pre>
        </details>

        <a
          href={chatUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border border-surface-200 bg-white px-4 py-3 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark"
        >
          ChatGPT source run
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

function BuildPath({ modelResponse }: { modelResponse: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 border-l-4 border-[#2bd15f] pl-4">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-surface-500">
          <GitBranch className="h-3.5 w-3.5 text-[#128135]" />
          Prompt path
        </div>
        <h2 className="mt-1 text-2xl font-black text-surface-900">The one-shot run, locked together.</h2>
      </div>

      <div className="max-w-5xl">
        <div className="space-y-8">
          <PipeNode eyebrow="01 · Prompt" title="One sentence">
            <p className="border-l-2 border-brand-orange pl-3 font-semibold text-surface-900">{prompt}</p>
          </PipeNode>

          <PipeNode eyebrow="02 · Response" title="Response package" terminal>
            <ResponsePackage modelResponse={modelResponse} />
          </PipeNode>
        </div>
      </div>
    </section>
  )
}

export default function SnakeDemoPage() {
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
            <div className="inline-flex items-center gap-2 border border-brand-orange/40 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.16em] text-brand-orange">
              <Gamepad2 className="h-3.5 w-3.5" />
              One-sentence build
            </div>
          </div>

          <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-end">
            <div>
              <div className="mb-3 inline-flex border border-brand-orange/40 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-brand-orange">
                Final artifact first
              </div>
              <h1 className="max-w-4xl text-3xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                One plain prompt. One playable Snake game.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300">
                The embedded result sits at the top. The prompt chain below shows the real path that produced it.
              </p>
            </div>
            <RunSummary />
          </div>

          <ArtifactFrame />
        </div>
      </section>

      <BuildPath modelResponse={modelResponse} />
    </main>
  )
}
