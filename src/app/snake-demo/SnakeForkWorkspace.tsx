'use client'

import { FormEvent, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  GitBranch,
  GitFork,
  Keyboard,
  Link2,
  Plus,
} from 'lucide-react'
import CopyButton from '@/app/prompt/[id]/CopyButton'

type IntakeMode = 'source-run' | 'manual'

type ForkStage = {
  id: string
  prompt: string
  response?: string
  artifact?: string
  createdAt: string
  source: IntakeMode
}

type SourceRunImport = {
  id: string
  label: string
  source: string
  notes?: string
  createdAt: string
}

function makeStageId() {
  return `fork-stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeImportId() {
  return `source-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function intakeCardClass(active: boolean) {
  return `border p-4 text-left transition ${
    active
      ? 'border-brand-orange bg-brand-orange/5 shadow-[0_12px_34px_rgba(247,127,0,0.12)]'
      : 'border-surface-200 bg-white hover:border-surface-400'
  }`
}

export default function SnakeForkWorkspace({
  sourcePrompt,
  initialSourceRunUrl = '',
}: {
  sourcePrompt: string
  initialSourceRunUrl?: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<IntakeMode>('source-run')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualResponse, setManualResponse] = useState('')
  const [manualArtifact, setManualArtifact] = useState('')
  const [sourceRunTitle, setSourceRunTitle] = useState('Snake fork source run')
  const [sourceRunUrl, setSourceRunUrl] = useState(initialSourceRunUrl)
  const [sourceRunNotes, setSourceRunNotes] = useState('')
  const [stages, setStages] = useState<ForkStage[]>([])
  const [sourceRunImports, setSourceRunImports] = useState<SourceRunImport[]>([])

  function addManualStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = manualPrompt.trim()
    if (!prompt) return

    setStages((current) => [
      ...current,
      {
        id: makeStageId(),
        prompt,
        response: manualResponse.trim() || undefined,
        artifact: manualArtifact.trim() || undefined,
        createdAt: 'Drafted locally',
        source: 'manual',
      },
    ])
    setManualPrompt('')
    setManualResponse('')
    setManualArtifact('')
  }

  function queueSourceRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = sourceRunTitle.trim()
    const url = sourceRunUrl.trim()
    if (!title || !url) return

    setSourceRunImports((current) => [
      ...current,
      {
        id: makeImportId(),
        label: title,
        source: url,
        notes: sourceRunNotes.trim() || undefined,
        createdAt: 'Ready for agent extraction',
      },
    ])
    setSourceRunNotes('')
  }

  return (
    <section id="fork-response-02" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="border-t border-surface-200 pt-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-surface-500">
              <GitFork className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
              Fork workspace
            </div>
            <h2 className="mt-1 text-2xl font-black text-surface-900">Fork from response 02</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">
              Start from the real source run when possible. Manual entry stays available for models and platforms that
              do not provide a clean export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex items-center justify-center gap-2 border border-surface-900 bg-surface-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-surface-800"
          >
            <GitFork className="h-4 w-4" aria-hidden="true" />
            {open ? 'Hide fork' : 'Fork this response'}
          </button>
        </div>

        {open ? (
          <div className="relative grid gap-5 lg:grid-cols-[290px_48px_minmax(0,1fr)] lg:items-start">
            <div className="relative overflow-hidden border border-surface-200 bg-white p-4 shadow-[0_16px_40px_rgba(24,24,27,0.06)] lg:max-h-[520px]">
              <div className="absolute -right-10 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white" aria-hidden="true" />
              <div className="mb-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-surface-500">
                <GitBranch className="h-3.5 w-3.5 text-[#128135]" aria-hidden="true" />
                Source chain
              </div>
              <div className="relative space-y-4 pl-8">
                <div className="absolute left-[13px] top-8 bottom-8 w-4 border-x-4 border-[#07551f] bg-[#2bd15f]" />
                <div className="relative border border-surface-200 bg-surface-50 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">01 prompt</div>
                  <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-surface-800">{sourcePrompt}</p>
                </div>
                <div className="relative border border-surface-200 bg-surface-50 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-500">02 response</div>
                  <p className="mt-2 line-clamp-4 text-xs leading-5 text-surface-700">
                    Self-contained Snake HTML file. This is the response this fork starts from.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex h-[150px] items-center justify-center">
              <div className="relative h-8 w-full border-y-4 border-[#07551f] bg-[#2bd15f] shadow-[inset_0_5px_0_rgba(255,255,255,0.18),inset_0_-5px_0_rgba(0,0,0,0.16)]">
                <ArrowRight className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#053b17]" aria-hidden="true" />
              </div>
            </div>

            <div className="border border-surface-200 bg-white shadow-[0_16px_40px_rgba(24,24,27,0.06)]">
              <div className="border-b border-surface-200 bg-surface-900 px-5 py-4 text-white">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-orange">
                  New branch
                </div>
                <h3 className="mt-1 text-xl font-black">Choose how this fork gets built</h3>
              </div>

              <div className="border-b border-surface-200 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode('source-run')}
                    className={intakeCardClass(mode === 'source-run')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center border border-brand-orange/35 bg-brand-orange/10 text-brand-orange">
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      {mode === 'source-run' && <CheckCircle2 className="h-4 w-4 text-brand-orange" aria-hidden="true" />}
                    </div>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Source run
                    </div>
                    <div className="mt-1 text-base font-black text-surface-900">Let the agent structure it</div>
                    <p className="mt-2 text-xs leading-5 text-surface-600">
                      Paste the ChatGPT run. The agent extracts prompts, exact responses, code blocks, and artifacts.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={intakeCardClass(mode === 'manual')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center border border-brand-blue/35 bg-brand-blue/10 text-brand-blue">
                        <Keyboard className="h-4 w-4" aria-hidden="true" />
                      </div>
                      {mode === 'manual' && <CheckCircle2 className="h-4 w-4 text-brand-blue" aria-hidden="true" />}
                    </div>
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Manual entry
                    </div>
                    <div className="mt-1 text-base font-black text-surface-900">Build the chain by hand</div>
                    <p className="mt-2 text-xs leading-5 text-surface-600">
                      Add each prompt, exact response, and artifact reference yourself when there is no usable source
                      link.
                    </p>
                  </button>
                </div>
              </div>

              {mode === 'source-run' ? (
                <form onSubmit={queueSourceRun} className="space-y-4 p-5">
                  <div>
                    <label htmlFor="source-run-title" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Title
                    </label>
                    <input
                      id="source-run-title"
                      name="title"
                      value={sourceRunTitle}
                      onChange={(event) => setSourceRunTitle(event.target.value)}
                      placeholder="Snake fork from ChatGPT"
                      className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="source-run-url" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Source run link
                    </label>
                    <div className="mt-2 flex items-center border border-surface-200 bg-surface-50 focus-within:border-brand-orange focus-within:bg-white">
                      <Link2 className="ml-3 h-4 w-4 shrink-0 text-surface-400" aria-hidden="true" />
                      <input
                        id="source-run-url"
                        name="source_url"
                        value={sourceRunUrl}
                        onChange={(event) => setSourceRunUrl(event.target.value)}
                        placeholder="https://chatgpt.com/c/..."
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-surface-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="source-run-notes" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Agent notes
                    </label>
                    <textarea
                      id="source-run-notes"
                      name="notes"
                      value={sourceRunNotes}
                      onChange={(event) => setSourceRunNotes(event.target.value)}
                      rows={3}
                      placeholder="Optional: tell the agent which response should be treated as the final artifact."
                      className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-surface-500">
                      This prepares the import package. The extraction agent is the next backend step.
                    </p>
                    <button
                      type="submit"
                      disabled={!sourceRunTitle.trim() || !sourceRunUrl.trim()}
                      className="inline-flex items-center gap-2 border border-brand-orange bg-brand-orange px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Prepare source run
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={addManualStage} className="space-y-4 p-5">
                  <div>
                    <label htmlFor="manual-fork-prompt" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Prompt
                    </label>
                    <textarea
                      id="manual-fork-prompt"
                      value={manualPrompt}
                      onChange={(event) => setManualPrompt(event.target.value)}
                      rows={4}
                      placeholder="Example: Make this Snake game neon, add a level selector, and keep it as one self-contained HTML file."
                      className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-fork-response" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Exact response
                    </label>
                    <textarea
                      id="manual-fork-response"
                      value={manualResponse}
                      onChange={(event) => setManualResponse(event.target.value)}
                      rows={5}
                      placeholder="Paste the exact model response here. Code blocks stay attached to this response package."
                      className="mt-2 w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-fork-artifact" className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Artifact reference
                    </label>
                    <input
                      id="manual-fork-artifact"
                      value={manualArtifact}
                      onChange={(event) => setManualArtifact(event.target.value)}
                      placeholder="/artifacts/forked-snake.html or generated artifact path"
                      className="mt-2 w-full border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-surface-500">
                      Manual stages are useful when the AI tool cannot export a source run.
                    </p>
                    <button
                      type="submit"
                      disabled={!manualPrompt.trim()}
                      className="inline-flex items-center gap-2 border border-brand-blue bg-brand-blue px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add manual stage
                    </button>
                  </div>
                </form>
              )}

              {sourceRunImports.length > 0 && (
                <div className="border-t border-surface-200 p-5">
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                    Source run import queue
                  </div>
                  <div className="space-y-3">
                    {sourceRunImports.map((item) => (
                      <article key={item.id} className="border border-brand-orange/25 bg-brand-orange/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-surface-900">{item.label}</div>
                            <div className="mt-1 truncate text-xs text-surface-500">{item.source}</div>
                          </div>
                          <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-orange">
                            {item.createdAt}
                          </div>
                        </div>
                        {item.notes && <p className="mt-3 text-sm leading-6 text-surface-700">{item.notes}</p>}
                        <div className="mt-3 grid gap-2 text-xs text-surface-600 sm:grid-cols-3">
                          <div className="border border-white/80 bg-white px-3 py-2">Extract prompt chain</div>
                          <div className="border border-white/80 bg-white px-3 py-2">Preserve exact responses</div>
                          <div className="border border-white/80 bg-white px-3 py-2">Attach HTML artifacts</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-surface-200 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                      Fork chain
                    </div>
                    <div className="mt-1 text-sm font-semibold text-surface-900">
                      {stages.length} stage{stages.length === 1 ? '' : 's'} drafted
                    </div>
                  </div>
                </div>

                {stages.length === 0 ? (
                  <div className="border border-dashed border-surface-300 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                    No fork stages yet. Add a prompt above to start a branch.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stages.map((stage, index) => (
                      <article key={stage.id} className="relative border border-surface-200 bg-white">
                        <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-4 py-3">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                              Fork prompt {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="mt-1 text-xs text-surface-500">{stage.createdAt}</div>
                          </div>
                          <CopyButton text={stage.prompt} variant="ghost" label="Copy fork prompt" visibleLabel="Copy" />
                        </div>
                        <p className="whitespace-pre-line px-4 py-4 text-sm font-semibold leading-6 text-surface-900">
                          {stage.prompt}
                        </p>
                        {stage.response && (
                          <details className="group/response border-t border-surface-200 bg-white">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-surface-900">
                              Exact response
                              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-surface-500">
                                Open
                              </span>
                            </summary>
                            <div className="border-t border-surface-200 px-4 py-4">
                              <div className="mb-3 flex items-center justify-end">
                                <CopyButton text={stage.response} variant="ghost" label="Copy response" visibleLabel="Copy" />
                              </div>
                              <p className="whitespace-pre-line text-sm leading-6 text-surface-700">{stage.response}</p>
                            </div>
                          </details>
                        )}
                        {stage.artifact && (
                          <div className="border-t border-surface-200 bg-white px-4 py-3 text-sm">
                            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                              Artifact
                            </span>
                            <div className="mt-1 font-semibold text-brand-blue">{stage.artifact}</div>
                          </div>
                        )}
                        <div className="border-t border-surface-200 bg-surface-50 px-4 py-4">
                          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                            <FileCode2 className="h-3.5 w-3.5 text-brand-blue" aria-hidden="true" />
                            {stage.response ? 'Artifact verification pending' : 'Response package pending'}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-surface-600">
                            {stage.response
                              ? 'The next step is to verify the attached artifact and decide whether it becomes the top result.'
                              : 'The next step is to run this prompt in the target AI tool, capture the exact response, and attach any new HTML artifact to this fork stage.'}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm text-surface-500">
            Forking is ready to open from response 02. Nothing is generated or counted until you add a real fork prompt.
          </div>
        )}
      </div>
    </section>
  )
}
