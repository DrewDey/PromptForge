import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  Check,
  GitFork,
  Layers3,
  MousePointerClick,
  Paperclip,
  Share2,
  UploadCloud,
} from 'lucide-react'
import CodeBlock from '@/components/CodeBlock'
import { ProjectPreview } from '@/components/ProjectPreview'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'How PathForge Works | PathForge Walkthrough',
  description: 'Find a working AI project, inspect its exact build path, fork a response, and share the finished source run with PathForge.',
  ...canonicalMetadata('/guide'),
}

const steps = [
  {
    number: '01',
    title: 'Open the result',
    body: 'Start with a working project you would actually use, play, or adapt.',
    href: '#find',
  },
  {
    number: '02',
    title: 'Read the path',
    body: 'Inspect the prompts, responses, artifact versions, and model details behind it.',
    href: '#inspect',
  },
  {
    number: '03',
    title: 'Fork or share',
    body: 'Continue from one exact response, or submit a finished source run of your own.',
    href: '#fork',
  },
] as const

const providerPanels = [
  {
    provider: 'ChatGPT',
    image: '/screenshots/guide/chatgpt-prompt-controls.jpg',
    width: 780,
    height: 56,
    note: 'Use + to attach the current artifact before asking for the change.',
  },
  {
    provider: 'Claude',
    image: '/screenshots/guide/claude-attach-controls.jpg',
    width: 690,
    height: 220,
    note: 'Use +, Code, or a file source, and keep the exact model label.',
  },
  {
    provider: 'Gemini',
    image: '/screenshots/guide/gemini-prompt-controls.jpg',
    width: 690,
    height: 92,
    note: 'Use + for the artifact, then write the fork request in the same message.',
  },
] as const

const forkTemplate = `I am continuing the attached artifact from an existing project.

Please keep the current working behavior, make this change:
[describe the change you want]

Return the complete updated artifact, not only the changed section.`

export default function GuidePage() {
  return (
    <div className="bg-white text-surface-900">
      <header className="border-b border-surface-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-end lg:px-8 lg:py-16">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">
              How PathForge works
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-[3.6rem]">
              Start with something that works. See how it got there.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-surface-600">
              PathForge keeps the finished artifact, exact source run, model results, and meaningful forks together. You can use the result first, inspect the work when it matters, and continue from a real starting point.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/paths?panel=open"
                className="inline-flex min-h-11 items-center gap-2 bg-surface-900 px-4 text-sm font-bold text-white hover:bg-brand-orange-dark"
              >
                Explore build paths
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/build"
                className="inline-flex min-h-11 items-center border border-surface-300 px-4 text-sm font-bold text-surface-900 hover:border-surface-900"
              >
                Share a finished build
              </Link>
            </div>
          </div>

          <nav className="border border-surface-200 bg-surface-50" aria-label="Walkthrough chapters">
            <p className="border-b border-surface-200 px-4 py-3 font-mono text-[9px] font-bold uppercase tracking-[0.13em] text-surface-500">
              The whole idea in three moves
            </p>
            <ol>
              {steps.map((step) => (
                <li key={step.number} className="border-b border-surface-200 last:border-b-0">
                  <a href={step.href} className="grid grid-cols-[28px_minmax(0,1fr)_16px] gap-3 px-4 py-4 hover:bg-white">
                    <span className="font-mono text-[9px] font-bold text-brand-orange-ink">{step.number}</span>
                    <span>
                      <strong className="block text-sm text-surface-900">{step.title}</strong>
                      <span className="mt-1 block text-xs leading-5 text-surface-600">{step.body}</span>
                    </span>
                    <ArrowRight className="mt-0.5 h-4 w-4 text-surface-400" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      <section id="find" className="scroll-mt-24 border-b border-surface-200 bg-surface-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,.88fr)] lg:items-center lg:px-8 lg:py-14">
          <Link
            href="/calming-sleep-sound-mixer-demo"
            className="block border border-surface-200 bg-white p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange-ink"
            aria-label="Open the Calming Sleep-Sound Mixer project"
          >
            <ProjectPreview
              artifactPath="/artifacts/sleep-sound-mixer-claude-fable-5-high-final.html"
              title="Calming Sleep-Sound Mixer"
              label="Real working artifact"
              className="h-[340px] min-h-[340px] border-0 sm:h-[420px] sm:min-h-[420px]"
            />
            <div className="flex items-center justify-between gap-4 border-t border-surface-200 px-2 pt-3 text-xs font-bold">
              <span>Calming Sleep-Sound Mixer</span>
              <span className="inline-flex items-center gap-1 text-brand-orange-ink">Open project <ArrowRight className="h-3.5 w-3.5" /></span>
            </div>
          </Link>

          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">01 / Find a result</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">The artifact is the front door.</h2>
            <p className="mt-4 text-sm leading-6 text-surface-600">
              You should not have to read a transcript to decide whether a project matters. Open the working result first. If it is useful, the complete build path is directly underneath it.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-surface-700">
              {[
                'Try the result before reading any prompts.',
                'See who built it and which model produced it.',
                'Open model runs and forks without leaving the project family.',
              ].map((item) => (
                <li key={item} className="flex gap-3 border-t border-surface-200 pt-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange-ink" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="inspect" className="scroll-mt-24 border-b border-surface-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">02 / Read the path</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">The recipe stays attached to the result.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-surface-600 lg:justify-self-end">
              A project page keeps each prompt beside its response and the artifact version it produced. Earlier real versions remain available, while the final verified artifact is selected by default.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border border-surface-200 bg-surface-50 p-4">
              <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
                <Layers3 className="h-4 w-4 text-brand-orange-ink" aria-hidden="true" />
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-surface-500">Model results</p>
                  <p className="mt-1 text-sm font-bold">Same project, separate evidence</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  ['ChatGPT', 'GPT-5.6 Luna'],
                  ['Claude', 'Fable 5 High'],
                  ['Gemini', 'Gemini 3.1 Pro'],
                ].map(([provider, model], index) => (
                  <div key={provider} className={`border px-3 py-3 ${index === 1 ? 'border-brand-orange bg-white' : 'border-surface-200 bg-white'}`}>
                    <strong className="block text-xs">{provider}</strong>
                    <span className="mt-1 block text-[10px] text-surface-500">{model}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-4 text-surface-500">
                The order stays stable when a run is selected.
              </p>
            </aside>

            <div className="border border-surface-200 bg-white p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Prompt 01', 'Build the offline mixer', 'The exact request is preserved.'],
                  ['Response 01', 'First working artifact', 'The visible model response and file stay together.'],
                  ['Prompt 02', 'Repair the controls', 'A concrete follow-up records what needed to change.'],
                  ['Response 02', 'Final verified artifact', 'This version is selected without deleting the first.'],
                ].map(([label, title, body], index) => (
                  <article
                    key={label}
                    className={`border p-4 ${index === 3 ? 'border-brand-blue bg-accent-50' : 'border-surface-200 bg-surface-50'}`}
                  >
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{label}</p>
                    <h3 className="mt-2 text-base font-black">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-surface-600">{body}</p>
                    {index % 2 === 1 && (
                      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-surface-700">
                        <GitFork className="h-3 w-3" aria-hidden="true" />
                        Fork from this response
                      </span>
                    )}
                  </article>
                ))}
              </div>
              <Link
                href="/calming-sleep-sound-mixer-demo#source-run-path"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-orange-ink"
              >
                See the real source-run path
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="fork" className="scroll-mt-24 border-b border-surface-200 bg-surface-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">03 / Fork a response</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Keep the history. Give the new direction the focus.</h2>
              <p className="mt-4 text-sm leading-6 text-surface-600">
                A fork starts from one exact response. The shared path remains visible but collapses to the left; the new prompt and response become the primary work on the forked project.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_36px_minmax(0,1fr)] sm:items-center">
              <div className="border border-surface-300 bg-white p-3">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-surface-500">Shared path</p>
                <div className="mt-3 grid gap-2 text-[10px]">
                  <span className="border border-surface-200 bg-surface-50 p-2">Prompt 01</span>
                  <span className="border border-surface-200 bg-surface-50 p-2">Response 01</span>
                  <span className="border border-surface-200 bg-surface-50 p-2">Prompt 02</span>
                  <strong className="border border-green-700 bg-green-50 p-2 text-green-800">Response 02 · fork point</strong>
                </div>
              </div>
              <div className="hidden h-px bg-green-700 sm:block" aria-hidden="true" />
              <div className="border-2 border-green-800 bg-white p-5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-green-800">New branch</p>
                <h3 className="mt-2 text-xl font-black">Prompt 03 gets the stage.</h3>
                <p className="mt-2 text-xs leading-5 text-surface-600">
                  The branch shows its new prompt, response, artifact, and author without pretending the inherited work disappeared.
                </p>
                <Link href="/hp-10bii-calculator-demo#source-run-path" className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-green-800">
                  See fork lineage
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-brand-orange-ink" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-black">Bring the current artifact into the new model chat.</h3>
                  <p className="mt-1 text-xs text-surface-600">Attach the file when possible. Otherwise paste the complete code before the change request.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {providerPanels.map((panel) => (
                  <article key={panel.provider} className="border border-surface-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm">{panel.provider}</strong>
                      <MousePointerClick className="h-4 w-4 text-brand-orange-ink" aria-hidden="true" />
                    </div>
                    <div className="mt-3 overflow-hidden border border-surface-200 bg-surface-50">
                      <Image
                        src={panel.image}
                        width={panel.width}
                        height={panel.height}
                        alt={`${panel.provider} prompt controls`}
                        className="h-auto w-full"
                      />
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-surface-600">{panel.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="border border-surface-200 bg-white p-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-brand-orange-ink">A clear fork message</p>
              <p className="mt-2 text-xs leading-5 text-surface-600">
                Plain language is fine. The model needs the current artifact and the change.
              </p>
              <div className="mt-4">
                <CodeBlock code={forkTemplate} label="fork message" variant="prompt" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="submit" className="scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:px-8 lg:py-14">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange-ink">Share the finished source run</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">Bring back the evidence, not a rewritten summary.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-600">
              After the model finishes, share the provider conversation and submit that link with the exact model label and a clue pointing review to the final artifact. Nothing publishes automatically.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [Share2, 'Copy the chat link', 'Use the provider share control after the final response is complete.'],
                [Layers3, 'Record the model', 'Copy the exact visible model label and relevant settings.'],
                [UploadCloud, 'Send it to review', 'PathForge checks the source, artifact, safety, and presentation.'],
              ].map(([Icon, title, body]) => {
                const StepIcon = Icon as typeof Share2
                return (
                  <article key={title as string} className="border border-surface-200 bg-surface-50 p-4">
                    <StepIcon className="h-5 w-5 text-brand-orange-ink" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-black">{title as string}</h3>
                    <p className="mt-2 text-xs leading-5 text-surface-600">{body as string}</p>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="border border-surface-200 bg-surface-50 p-5">
            <div className="border border-surface-200 bg-white p-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-surface-500">ChatGPT share control</p>
              <Image
                src="/screenshots/guide/chatgpt-share-button.jpg"
                width={190}
                height={68}
                alt="ChatGPT Share button at the top of a conversation"
                className="mt-3 h-auto w-[190px] max-w-full"
              />
            </div>
            <ul className="mt-5 grid gap-3 text-xs leading-5 text-surface-700">
              {[
                'Shared provider conversation link',
                'Exact model or best visible label',
                'Final artifact or clear artifact clue',
                'Short, honest review note',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange-ink" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/build" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-surface-900 px-4 text-sm font-bold text-white hover:bg-brand-orange-dark">
              Share a build
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-[10px] leading-4 text-surface-500">
              Submitted builds appear in My Forge while they are reviewed.
            </p>
          </aside>
        </div>
      </section>
    </div>
  )
}
