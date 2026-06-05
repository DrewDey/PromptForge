import Link from 'next/link'
import { ArrowUp, CheckCircle2, ExternalLink, Hammer, MessageSquare, RadioTower, Search, Target } from 'lucide-react'
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
    'inline-flex min-h-10 items-center justify-center gap-1.5 border px-3 py-2 text-xs font-black',
    hasVoted
      ? 'border-brand-orange bg-brand-orange text-white hover:bg-brand-orange-dark'
      : 'border-brand-orange/40 bg-white text-surface-900 hover:border-brand-orange hover:bg-primary-50',
  ].join(' ')
}

function statusPillClass(status: string) {
  if (status === 'answered') return 'border-brand-orange bg-brand-orange text-white'
  if (status === 'closed') return 'border-surface-700 bg-surface-700 text-white'
  return 'border-[#2bd15f] bg-[#123923] text-[#8ee29b]'
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
    <article className="grid border border-surface-800 bg-[#17171a] text-white transition hover:border-brand-orange lg:grid-cols-[132px_1fr]">
      <div className="border-b border-surface-800 bg-[#0f0f11] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-3 lg:block">
          <span className={`inline-flex border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusPillClass(request.status)}`}>
            {statusLabel(request.status)}
          </span>
          <div className="text-right lg:mt-6 lg:text-left">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-brand-orange">Demand</div>
            <div className="mt-1 text-5xl font-black tabular-nums text-white">{request.vote_count}</div>
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
          <Link href={loginHref('/requests')} className="mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 border border-brand-orange/50 bg-white px-3 py-2 text-xs font-black text-surface-900 hover:border-brand-orange">
            <ArrowUp className="h-3.5 w-3.5" />
            Log in
          </Link>
        )}
        <div className="mt-5 border-t border-surface-800 pt-4 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-400">
          {responses.length} {responses.length === 1 ? 'answer' : 'answers'}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="bg-brand-orange px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            Build brief
          </span>
          <span className="border border-surface-700 bg-surface-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-400">
            Needs artifact
          </span>
        </div>

        <h2 className="text-xl font-black text-white">{request.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-surface-300">{request.body}</p>

        <div className="mt-5 border-t border-surface-800 pt-4">
          <p className="text-xs text-surface-500">
            Requested by {request.author?.display_name ?? request.author?.username ?? 'a PathForge user'} · {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>

        {responses.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <MessageSquare className="h-3.5 w-3.5" />
              Builder answers
            </div>
            {responses.map(response => (
              <div key={response.id} className="border border-surface-700 bg-[#111113] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-surface-500">
                  {response.is_accepted && (
                    <span className="inline-flex items-center gap-1 text-[#8ee29b]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accepted
                    </span>
                  )}
                  <span>{new Date(response.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm leading-relaxed text-surface-300">{response.body}</p>
                {response.url && (
                  <Link href={response.url} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange hover:text-white">
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
          <div className="mt-5 border border-dashed border-surface-700 bg-[#111113] p-4 text-sm text-surface-400">
            <Link href={loginHref('/requests')} className="font-bold text-brand-orange hover:text-white">Log in</Link>
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
  const openRequestCount = requests.filter(request => request.status === 'open').length
  const answeredRequestCount = requests.filter(request => request.status === 'answered').length
  const responseCount = requests.reduce((count, request) => count + (request.responses?.length ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#111113] text-white">
      <section className="border-b border-surface-800 bg-[#0f0f11]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div className="border-l-4 border-brand-orange pl-5">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange">
              <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
              Build queue
            </div>
            <h1 className="mt-3 text-4xl font-black leading-none text-white sm:text-6xl">Build Requests</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-surface-300">
              A dispatch board for wanted artifacts. Post the thing that should exist, then let builders answer with real PathForge projects, forks, or source-run results.
            </p>
          </div>

          <div className="grid grid-cols-3 border border-surface-800 bg-[#17171a]">
            {[
              ['Open', openRequestCount],
              ['Answered', answeredRequestCount],
              ['Replies', responseCount],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-surface-800 p-4 last:border-r-0">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">{label}</div>
                <div className="mt-2 text-4xl font-black tabular-nums text-brand-orange">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#3b2817] bg-[#f7efe6] text-surface-900">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ['1. Brief', 'Describe the missing artifact, workflow, game, or prompt chain.'],
            ['2. Demand', 'Votes push the requests that people actually want built.'],
            ['3. Build answer', 'Responses should link to a real build, fork, or source-run result.'],
          ].map(([title, body]) => (
            <div key={title} className="border border-[#d8b48a] bg-white px-4 py-3">
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange">{title}</div>
              <p className="mt-1 text-sm leading-6 text-surface-700">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)_360px] lg:px-8">
        <aside className="space-y-4">
          <div className="border border-surface-800 bg-[#17171a]">
            <div className="border-b border-surface-800 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              Request lanes
            </div>
            <div className="divide-y divide-surface-800">
              <div className="flex items-center justify-between px-4 py-4">
                <span className="text-sm font-semibold text-surface-300">Needs build</span>
                <span className="bg-[#123923] px-2.5 py-1 font-mono text-xs font-black text-[#8ee29b]">{openRequestCount}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <span className="text-sm font-semibold text-surface-300">Has answer</span>
                <span className="bg-brand-orange px-2.5 py-1 font-mono text-xs font-black text-white">{answeredRequestCount}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-4">
                <span className="text-sm font-semibold text-surface-300">Builder replies</span>
                <span className="bg-white px-2.5 py-1 font-mono text-xs font-black text-surface-900">{responseCount}</span>
              </div>
            </div>
          </div>

          <div className="border border-brand-orange bg-[#21150f] p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              Not feedback
            </div>
            <p className="mt-2 text-sm leading-6 text-surface-300">
              This page is for wanted finished artifacts. Site bugs, UX confusion, and product feedback still go to Suggestion Box.
            </p>
            <Link href="/suggestion-box" className="mt-4 inline-flex min-h-10 items-center border border-brand-orange/50 px-3 py-2 text-sm font-black text-brand-orange hover:bg-brand-orange hover:text-white">
              Open Suggestion Box
            </Link>
          </div>

          <Link href="/paths" className="inline-flex w-full min-h-11 items-center justify-center gap-2 border border-surface-700 bg-[#17171a] px-4 py-3 text-sm font-black text-white hover:border-brand-orange">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search existing paths
          </Link>
        </aside>

        <main className="min-h-[640px] border border-surface-800 bg-[#17171a]">
          <div className="flex flex-col gap-3 border-b border-surface-800 bg-[#0f0f11] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                Active docket
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">Wanted builds waiting for makers</h2>
            </div>
            <Link href="#post-request" className="inline-flex min-h-10 items-center justify-center gap-2 bg-brand-orange px-4 py-2 text-sm font-black text-white hover:bg-brand-orange-dark">
              <Hammer className="h-4 w-4" aria-hidden="true" />
              Add brief
            </Link>
          </div>

          {params.submitted && (
            <div className="m-4 inline-flex items-center gap-2 border border-[#2bd15f] bg-[#123923] px-3 py-2 text-sm font-semibold text-[#8ee29b]">
              <CheckCircle2 className="h-4 w-4" />
              Build request posted.
            </div>
          )}

          {requests.length === 0 ? (
            <div className="grid min-h-[500px] place-items-center bg-[linear-gradient(rgba(232,122,44,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(232,122,44,.12)_1px,transparent_1px)] [background-size:34px_34px] p-6">
              <div className="w-full max-w-lg border border-brand-orange bg-[#0f0f11] p-6 shadow-[12px_12px_0_rgba(232,122,44,0.20)]">
                <div className="flex items-center justify-between border-b border-surface-800 pb-4">
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-brand-orange">No tickets loaded</div>
                  <Hammer className="h-5 w-5 text-brand-orange" aria-hidden="true" />
                </div>
                <p className="mt-5 text-2xl font-black text-white">No open build briefs yet.</p>
                <p className="mt-3 text-sm leading-7 text-surface-300">
                  The first request should be concrete enough for a builder to answer with an actual PathForge project page.
                </p>
                <div className="mt-5 grid gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-400">
                  <div className="border border-surface-800 bg-[#17171a] px-3 py-2">Artifact wanted</div>
                  <div className="border border-surface-800 bg-[#17171a] px-3 py-2">Source-run accepted</div>
                  <div className="border border-surface-800 bg-[#17171a] px-3 py-2">Forks welcome</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 p-4 xl:grid-cols-2">
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
        </main>

        <aside id="post-request" className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="border border-brand-orange bg-[#21150f]">
            <div className="border-b border-brand-orange/40 px-4 py-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
                Brief intake
              </div>
              <h2 className="mt-1 text-xl font-black text-white">Request the artifact.</h2>
            </div>
            <div className="border-b border-brand-orange/20 px-4 py-3 text-sm leading-6 text-surface-300">
              Name the result, the constraints, and what would make a builder's answer useful.
            </div>
            {viewer ? <BuildRequestSubmitForm /> : (
              <div className="p-4">
                <div className="border border-dashed border-brand-orange/60 bg-[#0f0f11] p-4 text-sm leading-6 text-surface-300">
                  The request composer unlocks after login so a builder can reply to the right account.
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={loginHref('/requests')} className="inline-flex min-h-10 items-center bg-brand-orange px-3 py-2 text-sm font-black text-white hover:bg-brand-orange-dark">Log in</Link>
                    <Link href={signupHref('/requests')} className="inline-flex min-h-10 items-center border border-brand-orange/50 px-3 py-2 text-sm font-black text-brand-orange hover:bg-brand-orange hover:text-white">Sign up</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}
