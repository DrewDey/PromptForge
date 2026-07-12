import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ArrowUp, CheckCircle2, ExternalLink, GitFork, MessageSquare, RadioTower } from 'lucide-react'
import BuildRequestResponseForm from '@/components/BuildRequestResponseForm'
import BuildRequestSubmitForm from '@/components/BuildRequestSubmitForm'
import { voteOnBuildRequest } from '@/lib/actions'
import { getPublicBuildRequests, getUserBuildRequestVotes } from '@/lib/data'
import { canonicalMetadata } from '@/lib/site-url'
import type { BuildRequestWithRelations } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Request an AI Build Path | PathForge',
  description: 'Ask the PathForge community for a real AI build path, fork, or finished artifact for the project you want to see built.',
  ...canonicalMetadata('/requests'),
}

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function getViewer() {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

function statusLabel(status: string) {
  if (status === 'answered') return 'Answered'
  if (status === 'closed') return 'Closed'
  return 'Open'
}

function loginHref(next: string) {
  return `/auth/login?next=${encodeURIComponent(next)}`
}

function signupHref(next: string) {
  return `/auth/signup?next=${encodeURIComponent(next)}`
}

const EMPTY_REQUEST_EXAMPLES = [
  ['One-file tool', 'A calculator, timer, tracker, or planner someone can open and use right away.'],
  ['Messy workflow', 'Turn a rough process into a checklist, prompt chain, or repeatable build path.'],
  ['Teaching game', 'A simple game or quiz that explains a concept while the user plays.'],
  ['Find or fork a path', 'Point to an existing PathForge project and ask how to adapt it for your case.'],
]

function voteButtonClass(hasVoted: boolean) {
  return [
    'inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold',
    hasVoted
      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange hover:border-brand-orange-dark hover:text-brand-orange-dark'
      : 'border-surface-300 text-surface-700 hover:border-surface-900 hover:text-surface-900',
  ].join(' ')
}

function BuildRequestCard({
  request,
  viewer,
  hasVoted,
}: {
  request: BuildRequestWithRelations
  viewer: Awaited<ReturnType<typeof getViewer>>
  hasVoted: boolean
}) {
  const responses = request.responses ?? []

  return (
    <article className="border border-surface-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange ring-1 ring-primary-200">
          {statusLabel(request.status)}
        </span>
        <span className="border border-surface-200 bg-surface-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
          {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </span>
      </div>

      <h2 className="text-xl font-black tracking-[-0.02em] text-surface-900">{request.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-surface-600">{request.body}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-4">
        <p className="text-xs text-surface-500">
          Requested by {request.author?.display_name ?? request.author?.username ?? 'a PathForge user'} · {new Date(request.created_at).toLocaleDateString()}
        </p>
        {viewer ? (
          <form action={voteOnBuildRequest}>
            <input type="hidden" name="request_id" value={request.id} />
            <button
              className={voteButtonClass(hasVoted)}
              aria-pressed={hasVoted}
              aria-label={hasVoted ? 'Remove vote from build request' : 'Vote for build request'}
              title={hasVoted ? 'Remove vote' : 'Vote'}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {request.vote_count}
            </button>
          </form>
        ) : (
          <Link href={loginHref('/requests')} className="inline-flex items-center gap-1.5 border border-surface-300 px-3 py-1.5 text-xs font-bold text-surface-500 hover:border-brand-orange hover:text-brand-orange">
            <ArrowUp className="h-3.5 w-3.5" />
            Log in to vote
          </Link>
        )}
      </div>

      {responses.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            <MessageSquare className="h-3.5 w-3.5" />
            Builder responses
          </div>
          {responses.map(response => (
            <div key={response.id} className="border border-surface-100 bg-surface-50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-surface-500">
                {response.is_accepted && (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Accepted
                  </span>
                )}
                <span>{new Date(response.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm leading-relaxed text-surface-700">{response.body}</p>
              {response.url && (
                <Link href={response.url} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:text-brand-orange-dark">
                  Open linked build
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {viewer ? (
        <BuildRequestResponseForm requestId={request.id} />
      ) : (
        <div className="mt-5 border border-dashed border-surface-300 bg-surface-50 p-4 text-sm text-surface-500">
          <Link href={loginHref('/requests')} className="font-bold text-brand-orange hover:text-brand-orange-dark">Log in</Link>
          {' '}to respond with a PathForge build, fork, or source-run result.
        </div>
      )}
    </article>
  )
}

export default async function BuildRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const [viewer, requests] = await Promise.all([
    getViewer(),
    getPublicBuildRequests(),
  ])
  const votedRequestIds = viewer
    ? await getUserBuildRequestVotes(requests.map(request => request.id))
    : new Set<string>()

  return (
    <div className="bg-surface-50">
      <section id="post-request" className="relative overflow-hidden border-b border-surface-200 bg-white">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:52px_52px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-7 px-4 py-9 sm:px-6 sm:py-11 lg:grid-cols-[minmax(0,0.82fr)_minmax(460px,1.18fr)] lg:items-start lg:px-8 lg:py-12">
          <div className="min-w-0">
          {params.submitted && (
            <div className="mb-5 inline-flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Build request posted.
            </div>
          )}
            <div className="inline-flex items-center gap-2 border border-surface-200 bg-surface-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-surface-600">
              <RadioTower className="h-3.5 w-3.5 text-brand-orange" aria-hidden="true" />
              Community build queue
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-surface-900 sm:text-5xl lg:text-6xl">
              Ask for the build you wish <span className="font-display font-normal italic text-brand-orange">existed</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-surface-600 sm:text-lg">
              Describe the useful thing you want at the end. A builder can answer with a real PathForge project, fork, or working artifact.
            </p>

            <div className="mt-6 border-l-2 border-brand-orange bg-primary-50 px-4 py-3 text-sm leading-6 text-surface-700">
              <strong className="text-surface-900">Use this for a build outcome.</strong>{' '}
              Site feedback and bug reports still belong in the{' '}
              <Link href="/suggestion-box" className="font-bold text-brand-orange hover:text-brand-orange-dark">Suggestion Box</Link>.
            </div>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/paths?panel=open"
                className="inline-flex min-h-11 items-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                Browse existing paths
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-7 hidden grid-cols-2 gap-px border border-surface-200 bg-surface-200 sm:grid">
              {[
                ['1', 'Name the result'],
                ['2', 'Define useful'],
                ['3', 'Let builders answer'],
                ['4', 'Vote on demand'],
              ].map(([number, label]) => (
                <div key={number} className="bg-white p-3">
                  <span className="font-mono text-[9px] font-bold text-brand-orange">{number}</span>
                  <p className="mt-1 text-xs font-bold text-surface-700">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 border border-surface-200 bg-white p-1.5 shadow-[8px_8px_0_rgba(232,122,44,0.10)]">
            <div className="border-b border-surface-200 px-4 py-3 sm:px-5">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">Post a request</div>
              <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-surface-900">Give builders a concrete finish line.</h2>
              <p className="mt-1 text-xs leading-5 text-surface-500">Say what should exist, who it is for, and what would make the result good.</p>
            </div>

            {viewer ? (
              <BuildRequestSubmitForm />
            ) : (
              <div className="p-4 sm:p-5">
                <div className="border border-dashed border-surface-300 bg-surface-50 p-5">
                  <h3 className="text-base font-black text-surface-900">Sign in to post a real request.</h3>
                  <p className="mt-2 text-sm leading-6 text-surface-600">
                    Requests and votes stay attached to real PathForge accounts so the queue reflects genuine demand.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <Link href={loginHref('/requests')} className="inline-flex min-h-11 items-center bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                      Log in
                    </Link>
                    <Link href={signupHref('/requests')} className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                      Create an account
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-surface-200 bg-surface-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-surface-800 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ['Ask for an artifact', 'Describe the game, tool, workflow, or prompt chain you want to see built.'],
            ['Answer with a path', 'Builders respond with a PathForge link, fork, or working artifact.'],
            ['Vote for demand', 'Real account votes show which requests deserve attention next.'],
          ].map(([title, body]) => (
            <article key={title} className="flex min-w-0 gap-3 bg-surface-900 px-4 py-5 sm:px-5">
              <GitFork className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange-light" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-surface-400">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                {requests.length > 0 ? 'Open requests' : 'Community queue'}
              </div>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.035em] text-surface-900">
                {requests.length > 0 ? 'What people want built next.' : 'The next request starts with a real need.'}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-surface-500">
              {requests.length > 0
                ? 'Vote for the outcomes worth solving, or answer one with a project you already built.'
                : 'PathForge does not invent demand or fill this board with fake activity.'}
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="border border-dashed border-surface-300 bg-surface-50 p-5 sm:p-7 lg:p-8">
              <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
                <div>
                  <p className="text-lg font-black text-surface-900">No public build requests are open right now.</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-surface-600">
                    That is a truthful empty queue, not a broken one. A useful first request can be small, specific, and easy for another builder to understand.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {viewer ? (
                      <Link href="#post-request" className="inline-flex min-h-11 items-center gap-2 bg-brand-orange px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                        Request a build
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : (
                      <Link href={loginHref('/requests')} className="inline-flex min-h-11 items-center gap-2 bg-brand-orange px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                        Log in to request
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                    <Link href="/paths?panel=open" className="inline-flex min-h-11 items-center border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 transition-colors hover:border-brand-orange hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                      Browse paths first
                    </Link>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {EMPTY_REQUEST_EXAMPLES.map(([title, body]) => (
                    <div key={title} className="border border-surface-200 bg-white p-4 text-left">
                      <h3 className="text-sm font-black text-surface-900">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-surface-600">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {requests.map(request => (
                <BuildRequestCard
                  key={request.id}
                  request={request}
                  viewer={viewer}
                  hasVoted={votedRequestIds.has(request.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
