import Link from 'next/link'
import { ArrowRight, ArrowUp, CheckCircle2, ExternalLink, Hammer, MessageSquare, RadioTower, Search } from 'lucide-react'
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
      ? 'border-[#07551f] bg-[#effdf3] text-[#07551f] hover:bg-[#daf7df]'
      : 'border-[#07551f]/30 bg-white text-[#07551f] hover:border-[#07551f]',
  ].join(' ')
}

function statusPillClass(status: string) {
  if (status === 'answered') return 'bg-brand-orange text-white'
  if (status === 'closed') return 'bg-surface-700 text-white'
  return 'bg-[#07551f] text-white'
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
    <article className="grid overflow-hidden border border-surface-200 bg-white transition hover:border-[#07551f] hover:shadow-[8px_8px_0_rgba(7,85,31,0.10)] lg:grid-cols-[118px_1fr]">
      <div className="border-b border-[#cfead4] bg-[#effdf3] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3 lg:block">
          <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusPillClass(request.status)}`}>
            {statusLabel(request.status)}
          </span>
          <div className="text-right lg:mt-6 lg:text-left">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#07551f]">Demand</div>
            <div className="mt-1 text-4xl font-black tabular-nums text-surface-900">{request.vote_count}</div>
          </div>
        </div>
        {viewer ? (
          <form action={voteOnBuildRequest} className="mt-4">
            <input type="hidden" name="request_id" value={request.id} />
            <button
              className={voteButtonClass(hasVoted)}
              aria-pressed={hasVoted}
              aria-label={hasVoted ? 'Remove vote from build request' : 'Vote for build request'}
              title={hasVoted ? 'Remove vote' : 'Vote'}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {hasVoted ? 'Voted' : 'Vote'}
            </button>
          </form>
        ) : (
          <Link href={loginHref('/requests')} className="mt-4 inline-flex items-center gap-1.5 border border-[#07551f]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#07551f] hover:border-[#07551f]">
            <ArrowUp className="h-3.5 w-3.5" />
            Log in
          </Link>
        )}
        <div className="mt-5 border-t border-[#cfead4] pt-4 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
          {responses.length} {responses.length === 1 ? 'answer' : 'answers'}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="border border-[#07551f]/25 bg-[#effdf3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
            Wanted build
          </span>
          <span className="border border-surface-200 bg-surface-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
            Community queue
          </span>
        </div>

        <h2 className="text-xl font-black text-surface-900">{request.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-surface-600">{request.body}</p>

        <div className="mt-5 border-t border-surface-100 pt-4">
          <p className="text-xs text-surface-500">
            Requested by {request.author?.display_name ?? request.author?.username ?? 'a PathForge user'} · {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>

        {responses.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
              <MessageSquare className="h-3.5 w-3.5" />
              Builder answers
            </div>
            {responses.map(response => (
              <div key={response.id} className="border border-[#d7ead9] bg-[#f8fcf7] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-surface-500">
                  {response.is_accepted && (
                    <span className="inline-flex items-center gap-1 text-[#07551f]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accepted
                    </span>
                  )}
                  <span>{new Date(response.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm leading-relaxed text-surface-700">{response.body}</p>
                {response.url && (
                  <Link href={response.url} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#07551f] hover:text-brand-orange">
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
          <div className="mt-5 border border-dashed border-[#cfead4] bg-[#f8fcf7] p-4 text-sm text-surface-500">
            <Link href={loginHref('/requests')} className="font-bold text-[#07551f] hover:text-brand-orange">Log in</Link>
            {' '}to respond with a PathForge build, fork, or source-run result.
          </div>
        )}
      </div>
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
    <div className="bg-[#f7fbf4]">
      <section className="relative overflow-hidden border-b border-[#cfead4] bg-[#effdf3]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(7,85,31,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(7,85,31,.08)_1px,transparent_1px)] [background-size:46px_46px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8 lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-[#07551f]/25 bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
              <RadioTower className="h-3.5 w-3.5" />
              Wanted build board
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] text-surface-900 sm:text-6xl">
              Build Requests
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-700">
              Post the artifact you wish existed. Builders can answer with a PathForge project, a fork, or a source-run result that solves the brief.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#post-request" className="inline-flex items-center gap-2 bg-[#07551f] px-4 py-3 text-sm font-bold text-white transition hover:bg-surface-900">
                Post a request
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/paths" className="inline-flex items-center gap-2 border border-[#07551f]/30 bg-white px-4 py-3 text-sm font-bold text-[#07551f] transition hover:border-[#07551f]">
                Search build paths
                <Search className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="border border-[#07551f] bg-white p-5 shadow-[14px_14px_0_rgba(7,85,31,0.16)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#cfead4] pb-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#07551f]">
                  Brief lifecycle
                </div>
                <h2 className="mt-1 text-xl font-black text-surface-900">From request to path</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center bg-[#07551f] text-white">
                <Hammer className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ['Brief', 'Name the artifact, workflow, game, or prompt chain.'],
                ['Demand', 'Votes show which requests have pull.'],
                ['Answer', 'Builders reply with actual PathForge links or artifacts.'],
              ].map(([title, body], index) => (
                <div key={title} className="grid grid-cols-[42px_1fr] gap-3 border border-[#d7ead9] bg-[#f8fcf7] p-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-[#07551f] font-mono text-xs font-black text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-surface-900">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-surface-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="post-request" className="border-b border-[#cfead4] bg-[#f7fbf4]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[390px_1fr] lg:px-8 lg:py-16">
        <div>
          {params.submitted && (
            <div className="mb-6 inline-flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Build request posted.
            </div>
          )}
          <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#07551f]">Post a build brief</div>
          <h2 className="text-3xl font-black text-surface-900">Ask for the path you wish existed.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-600">
            Keep it outcome-focused: what should exist at the end, what platform or model matters, and what would make the answer useful.
          </p>
          <div className="mt-6 grid gap-2 text-xs text-surface-600">
            <div className="border-l-2 border-[#07551f] bg-white px-3 py-2">This is for wanted artifacts and build paths.</div>
            <div className="border-l-2 border-brand-orange bg-white px-3 py-2">Website feedback still belongs in Suggestion Box.</div>
          </div>
          {!viewer && (
            <div className="mt-6 border border-[#cfead4] bg-white p-4 text-sm text-surface-600">
              You need to log in before posting a build request or responding to one.
              <div className="mt-3">
                <Link href={loginHref('/requests')} className="font-bold text-[#07551f] hover:text-brand-orange">Log in</Link>
                <span className="mx-2 text-surface-300">/</span>
                <Link href={signupHref('/requests')} className="font-bold text-[#07551f] hover:text-brand-orange">Sign up</Link>
              </div>
            </div>
          )}
        </div>

        {viewer ? <BuildRequestSubmitForm /> : (
          <div className="border border-dashed border-[#a8d9b0] bg-white p-8 text-center text-sm text-surface-500">
            The build request form appears after login.
          </div>
        )}
        </div>
      </section>

      <section className="border-t border-[#cfead4] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#07551f]">Open build briefs</div>
              <h2 className="text-3xl font-black text-surface-900">What people want built next.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-surface-500">
              No filler content. This board stays empty until real users ask for real builds.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="border border-dashed border-[#a8d9b0] bg-[#f8fcf7] p-10 text-center">
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
