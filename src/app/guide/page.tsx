import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  GitFork,
  Link2,
  MousePointerClick,
  Paperclip,
  Share2,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import CodeBlock from '@/components/CodeBlock'
import { canonicalMetadata } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'How to Submit a PathForge Build | PathForge',
  description: 'A friendly walkthrough for copying an AI session link, attaching fork context, and submitting a source run to PathForge review.',
  ...canonicalMetadata('/guide'),
}

const captureSteps = [
  {
    label: '1',
    title: 'Copy the AI session link',
    body: 'Open the finished ChatGPT, Claude, or Gemini conversation and use the share control for that chat. PathForge needs the original session, not a rewritten summary.',
    icon: Share2,
  },
  {
    label: '2',
    title: 'Keep the artifact with the fork prompt',
    body: 'For forks, start the next provider chat with your new prompt plus the newest artifact file, or paste the newest artifact code directly into the message.',
    icon: Paperclip,
  },
  {
    label: '3',
    title: 'Submit the run to PathForge',
    body: 'Paste the session link into Build, add the model details and notes, then send it into review. Nothing publishes automatically.',
    icon: UploadCloud,
  },
]

const providerPanels = [
  {
    provider: 'ChatGPT',
    image: '/screenshots/guide/chatgpt-prompt-controls.jpg',
    imageWidth: 780,
    imageHeight: 56,
    action: 'Use the + button for a file, or paste artifact code before your fork prompt.',
    note: 'The top-right Share button is what you copy after the run is finished.',
  },
  {
    provider: 'Claude',
    image: '/screenshots/guide/claude-attach-controls.jpg',
    imageWidth: 690,
    imageHeight: 220,
    action: 'Use +, Code, or From Drive when the fork needs the latest artifact file or code.',
    note: 'Claude often makes the model name visible in the composer. Copy that into PathForge too.',
  },
  {
    provider: 'Gemini',
    image: '/screenshots/guide/gemini-prompt-controls.jpg',
    imageWidth: 690,
    imageHeight: 92,
    action: 'Use + for files, then write the fork prompt in the same message.',
    note: 'Copy the visible model label, such as Flash or Pro, into the model field.',
  },
]

const buildFields = [
  ['Title', 'A short name for the thing you built'],
  ['AI session link', 'Paste the shared ChatGPT, Claude, or Gemini conversation link'],
  ['AI service', 'Pick the provider or let PathForge detect it from the link'],
  ['Exact model', 'Copy the model shown in the provider UI, or type Not sure'],
  ['Notes for review', 'Mention the final response, the latest artifact, and any caveat'],
]

const forkMessageTemplate = `I am forking an existing artifact. First, read the current artifact, then make the requested change and return the full updated artifact.

CURRENT ARTIFACT:
[Attach the latest artifact file, or paste the latest artifact code here.]

FORK REQUEST:
[Describe the exact change you want.]

PATHFORGE NOTE:
This forks [project name] from response [number]. The latest artifact is attached or pasted in this new run.`

function StepCard({
  step,
}: {
  step: typeof captureSteps[number]
}) {
  const Icon = step.icon

  return (
    <article className="border border-surface-200 bg-white p-5 shadow-[8px_8px_0_rgba(24,24,27,0.05)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-surface-900 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            Step {step.label}
          </div>
          <h3 className="mt-1 text-xl font-black text-surface-900">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-surface-600">{step.body}</p>
        </div>
      </div>
    </article>
  )
}

function ProviderPanel({
  panel,
}: {
  panel: typeof providerPanels[number]
}) {
  return (
    <article className="border border-surface-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            Provider
          </div>
          <h3 className="mt-1 text-lg font-black text-surface-900">{panel.provider}</h3>
        </div>
        <div className="flex h-9 w-9 items-center justify-center bg-primary-50 text-brand-orange ring-1 ring-primary-200">
          <MousePointerClick className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="overflow-hidden border border-surface-200 bg-surface-50">
        <Image
          src={panel.image}
          width={panel.imageWidth}
          height={panel.imageHeight}
          alt={`${panel.provider} prompt controls showing where to attach or paste artifact context`}
          className="h-auto w-full"
        />
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-surface-900">{panel.action}</p>
      <p className="mt-2 text-xs leading-5 text-surface-500">{panel.note}</p>
    </article>
  )
}

function BuildField({ label, body, wide = false }: { label: string; body: string; wide?: boolean }) {
  return (
    <div className={`border border-surface-200 bg-surface-50 px-3 py-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
        {label}
      </div>
      <p className="mt-1 text-sm leading-5 text-surface-700">{body}</p>
    </div>
  )
}

export default function GuidePage() {
  return (
    <main className="bg-surface-50 text-surface-900">
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:px-8 lg:py-18">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-brand-orange/35 bg-brand-orange/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Submission walkthrough
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-surface-900 sm:text-5xl lg:text-6xl">
              Upload a PathForge build without guessing what to click.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-surface-600">
              This guide shows the small pieces that matter: where the provider link comes from, how to bring an artifact into a fork, and what to paste into PathForge so review has the real source run.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/build"
                className="inline-flex items-center gap-2 bg-brand-orange px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-orange-dark"
              >
                Open Build
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/paths"
                className="inline-flex items-center gap-2 border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 transition hover:border-surface-900"
              >
                Browse examples
              </Link>
            </div>
          </div>

          <aside className="border border-surface-200 bg-primary-50 p-5 shadow-[12px_12px_0_rgba(232,122,44,0.12)] lg:self-start">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              What you need before submitting
            </div>
            <div className="mt-5 grid gap-3">
              {[
                'The shared AI conversation link',
                'The exact model or best visible model label',
                'The newest artifact file or artifact code for forks',
                'A short note pointing review to the final response',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 border border-primary-200 bg-white px-3 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                  <span className="text-sm leading-6 text-surface-700">{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7 max-w-3xl">
          <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            The whole flow
          </div>
          <h2 className="text-3xl font-black text-surface-900">Three clicks worth teaching clearly.</h2>
          <p className="mt-3 text-sm leading-6 text-surface-600">
            Users should not need to know PathForge vocabulary before they contribute. They just need to know what to copy, what to attach, and where it goes.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {captureSteps.map((step) => (
            <StepCard key={step.label} step={step} />
          ))}
        </div>
      </section>

      <section className="border-y border-surface-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div>
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                First click
              </div>
              <h2 className="text-3xl font-black text-surface-900">Copy the conversation link.</h2>
              <p className="mt-3 text-sm leading-6 text-surface-600">
                The cleanest source run starts from the provider chat itself. In ChatGPT, the Share button sits in the top-right of the finished conversation.
              </p>
              <div className="mt-5 border border-surface-200 bg-surface-50 p-4">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
                  ChatGPT share area
                </div>
                <div className="mt-3 inline-block border border-surface-200 bg-white p-2">
                  <Image
                    src="/screenshots/guide/chatgpt-share-button.jpg"
                    width={190}
                    height={68}
                    alt="ChatGPT top-right Share button"
                    className="h-auto w-[190px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Open the finished chat', 'Use the actual run that produced the artifact.'],
                ['Click Share or the provider equivalent', 'Copy the link to the session, not a screenshot of the chat.'],
                ['Paste that link into PathForge', 'The Build form keeps it attached for review.'],
              ].map(([title, body]) => (
                <article key={title} className="border border-surface-200 bg-surface-50 p-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center bg-brand-blue text-white">
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-black text-surface-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-surface-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              Forking
            </div>
            <h2 className="text-3xl font-black text-surface-900">Give the model the artifact and the change.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-600">
              A fork works best when the new chat can see the thing it is continuing. Attach the newest artifact file when the provider supports files. If it does not, paste the artifact code into the same message as the fork request.
            </p>
          </div>
          <div className="border border-[#07551f]/30 bg-[#effdf3] p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              PathForge fork rule
            </div>
            <p className="mt-2 text-sm leading-6 text-surface-700">
              Click Fork on the response you want to continue, then start the new provider chat with the latest artifact and the change you want.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {providerPanels.map((panel) => (
            <ProviderPanel key={panel.provider} panel={panel} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="border border-surface-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                  Copy-ready fork message
                </div>
                <p className="mt-2 text-sm leading-6 text-surface-600">
                  Use this shape when the model needs the current artifact and a new direction in one message.
                </p>
              </div>
            </div>
            <CodeBlock code={forkMessageTemplate} label="fork message" variant="prompt" />
          </div>

          <div className="border border-surface-200 bg-primary-50 p-5 lg:self-start">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              If there is no upload button
            </div>
            <ol className="grid gap-3 text-sm leading-6 text-surface-700">
              <li className="border border-primary-200 bg-white p-3">
                Paste the latest artifact code into the chat.
              </li>
              <li className="border border-primary-200 bg-white p-3">
                Add the fork request under it, not in a separate chat.
              </li>
              <li className="border border-primary-200 bg-white p-3">
                After the run finishes, copy the new chat link into Build.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-surface-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start lg:px-8">
          <div>
            <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              PathForge Build
            </div>
            <h2 className="text-3xl font-black text-surface-900">Paste the evidence into the Build form.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-600">
              Build collects source link, model info, and notes for the normal review queue. It is not a public post until review decides what should be published.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {buildFields.map(([label, body]) => (
                <BuildField key={label} label={label} body={body} wide={label === 'Notes for review'} />
              ))}
            </div>
          </div>

          <aside className="border border-surface-200 bg-surface-50 p-5 lg:self-start">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
              Review note example
            </div>
            <div className="mt-4 border border-surface-200 bg-white p-4 text-sm leading-6 text-surface-700">
              This is a fork of Weekend Checklist from response 03. I attached the latest HTML artifact to the new ChatGPT run. The final artifact is in the last response. Please keep the original source path attached.
            </div>
            <Link
              href="/build"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-brand-orange px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-orange-dark"
            >
              Submit a source run
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
    </main>
  )
}
