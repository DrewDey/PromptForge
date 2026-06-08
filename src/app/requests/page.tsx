import Link from 'next/link'
import { ArrowRight, ArrowUp, CheckCircle2, ExternalLink, GitFork, MessageSquare, RadioTower } from 'lucide-react'
import BuildRequestResponseForm from '@/components/BuildRequestResponseForm'
import BuildRequestSubmitForm from '@/components/BuildRequestSubmitForm'
import { voteOnBuildRequest } from '@/lib/actions'
import { getPublicBuildRequests, getUserBuildRequestVotes } from '@/lib/data'
import type { BuildRequestWithRelations } from '@/lib/types'

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
      <section className="relative overflow-hidden border-b border-surface-200 bg-white">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:52px_52px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-surface-200 bg-surface-100 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-600">
              <RadioTower className="h-3.5 w-3.5 text-brand-orange" />
              Community build queue
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.035em] text-surface-900 sm:text-6xl">
              Request a build. Let the community answer with <span className="font-display italic font-normal text-brand-orange">real paths</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-600">
              This is separate from the Suggestion Box. Use Build Requests when you want someone to create, fork, or find a PathForge project for a specific outcome.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/paths" className="inline-flex items-center gap-2 bg-brand-orange px-4 py-3 text-sm font-bold text-white hover:bg-brand-orange-dark">
                Search build paths
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/suggestion-box" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 hover:border-surface-900">
                Give PathForge feedback
              </Link>
            </div>
          </div>

          <div className="border border-surface-200 bg-white p-5 text-surface-900 shadow-[10px_10px_0_rgba(232,122,44,0.10)] sm:p-6">
            <div className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-orange">
              What belongs here
            </div>
            <div className="space-y-4">
              {[
                ['Ask for an artifact', 'Describe the game, tool, workflow, or prompt chain you want to see built.'],
                ['Answer with a path', 'Builders respond with PathForge links, forks, or working artifacts.'],
                ['Vote for demand', 'Upvotes show which requests deserve attention before they become official seed paths.'],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-3">
                  <GitFork className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                  <div>
                    <h2 className="text-sm font-bold">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-surface-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div>
          {params.submitted && (
            <div className="mb-6 inline-flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Build request posted.
            </div>
          )}
          <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Post a request</div>
          <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Ask for the path you wish existed.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-600">
            Keep it outcome-focused. The best requests say what should exist at the end, what platform/model matters, and what would make the result useful.
          </p>
          {!viewer && (
            <div className="mt-6 border border-surface-200 bg-white p-4 text-sm text-surface-600">
              You need to log in before posting a build request or responding to one.
              <div className="mt-3">
                <Link href={loginHref('/requests')} className="font-bold text-brand-orange hover:text-brand-orange-dark">Log in</Link>
                <span className="mx-2 text-surface-300">/</span>
                <Link href={signupHref('/requests')} className="font-bold text-brand-orange hover:text-brand-orange-dark">Sign up</Link>
              </div>
            </div>
          )}
        </div>

        {viewer ? <BuildRequestSubmitForm /> : (
          <div className="border border-dashed border-surface-300 bg-white p-8 text-center text-sm text-surface-500">
            The build request form appears after login.
          </div>
        )}
      </section>

      <section className="border-t border-surface-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Open requests</div>
              <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">What people want built next.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-surface-500">
              No filler content. This board stays empty until real users ask for real builds.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="border border-dashed border-surface-300 bg-surface-50 p-10 text-center">
              <p className="text-lg font-bold text-surface-900">No build requests yet.</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-surface-500">
                The first request should be specific enough that someone can answer it with an actual project page.
              </p>
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
