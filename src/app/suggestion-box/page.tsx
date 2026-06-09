import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUp, Clock, Inbox, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react'
import SuggestionSubmitForm from '@/components/SuggestionSubmitForm'
import { getPublicSuggestions, getUserSuggestionVotes, SUGGESTION_PUBLIC_DELAY_HOURS } from '@/lib/data'
import { voteOnSuggestion } from '@/lib/actions'
import { canonicalMetadata } from '@/lib/site-url'
import type { SuggestionWithRelations } from '@/lib/types'

export const metadata: Metadata = {
  title: 'PathForge Suggestion Box',
  description: 'Send PathForge product feedback, vote on approved suggestions, and help improve the way real AI builds are captured and shared.',
  ...canonicalMetadata('/suggestion-box'),
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
  return status.replace('_', ' ')
}

function loginHref(next: string) {
  return `/auth/login?next=${encodeURIComponent(next)}`
}

function signupHref(next: string) {
  return `/auth/signup?next=${encodeURIComponent(next)}`
}

const EMPTY_SUGGESTION_EXAMPLES = [
  ['Confusing page or copy', 'Tell PathForge where the wording, layout, or next step is hard to understand.'],
  ['Missing control', 'Ask for a filter, toggle, sort, status, or small workflow control the site needs.'],
  ['Bug report', 'Share what broke, where it happened, and what you expected instead.'],
  ['Pricing or account idea', 'Suggest a plan, permission, privacy, or account setting that would make PathForge easier to use.'],
]

function voteButtonClass(hasVoted: boolean) {
  return [
    'inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold',
    hasVoted
      ? 'border-brand-blue bg-accent-100 text-brand-blue-dark hover:border-brand-blue-dark'
      : 'border-brand-blue/30 bg-white text-brand-blue-dark hover:border-brand-blue',
  ].join(' ')
}

function SuggestionCard({
  suggestion,
  canVote,
  hasVoted,
}: {
  suggestion: SuggestionWithRelations
  canVote: boolean
  hasVoted: boolean
}) {
  const publicResponses = (suggestion.responses ?? []).filter(response => response.visibility === 'public')

  return (
    <article className="grid overflow-hidden border border-surface-200 bg-white transition hover:border-surface-900 hover:shadow-[8px_8px_0_rgba(24,24,27,0.08)] sm:grid-cols-[88px_1fr]">
      <div className="flex items-center justify-between border-b border-surface-200 bg-accent-50 px-5 py-4 sm:flex-col sm:items-center sm:justify-start sm:border-b-0 sm:border-r sm:px-3 sm:py-5">
        <div className="text-center">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">Votes</div>
          <div className="mt-1 text-3xl font-black tabular-nums text-surface-900">{suggestion.vote_count}</div>
        </div>
        {canVote ? (
          <form action={voteOnSuggestion} className="sm:mt-4">
            <input type="hidden" name="suggestion_id" value={suggestion.id} />
            <button
              className={voteButtonClass(hasVoted)}
              aria-pressed={hasVoted}
              aria-label={hasVoted ? 'Remove vote from suggestion' : 'Vote for suggestion'}
              title={hasVoted ? 'Remove vote' : 'Vote'}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {hasVoted ? 'Voted' : 'Vote'}
            </button>
          </form>
        ) : (
          <Link href={loginHref('/suggestion-box')} className="inline-flex items-center gap-1.5 border border-brand-blue/30 bg-white px-3 py-1.5 text-xs font-bold text-brand-blue-dark hover:border-brand-blue">
            <ArrowUp className="h-3.5 w-3.5" />
            Log in
          </Link>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="bg-brand-blue px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            {statusLabel(suggestion.public_status)}
          </span>
          <span className="border border-surface-200 bg-surface-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
            Product feedback
          </span>
        </div>

        <h2 className="text-xl font-black tracking-[-0.02em] text-surface-900">{suggestion.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-surface-600">{suggestion.body}</p>

        {publicResponses.length > 0 && (
          <div className="mt-5 border-l-2 border-brand-blue bg-accent-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">
              <MessageSquare className="h-3.5 w-3.5" />
              PathForge response
            </div>
            <div className="space-y-3">
              {publicResponses.map(response => (
                <p key={response.id} className="text-sm leading-relaxed text-surface-700">{response.body}</p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-surface-100 pt-4">
          <p className="text-xs text-surface-500">
            Sent by {suggestion.author?.display_name ?? suggestion.author?.username ?? 'a PathForge user'} · {new Date(suggestion.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </article>
  )
}

export default async function SuggestionBoxPage() {
  const [viewer, suggestions] = await Promise.all([
    getViewer(),
    getPublicSuggestions(),
  ])
  const votedSuggestionIds = viewer
    ? await getUserSuggestionVotes(suggestions.map(suggestion => suggestion.id))
    : new Set<string>()

  return (
    <div className="bg-[#f8fbff]">
      <section className="relative overflow-hidden border-b border-accent-100 bg-white">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(var(--color-accent-50)_1px,transparent_1px),linear-gradient(90deg,var(--color-accent-50)_1px,transparent_1px)] [background-size:48px_48px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-accent-200 bg-accent-50 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">
              <Inbox className="h-3.5 w-3.5 text-brand-blue" />
              Product feedback
            </div>
            <h1 className="text-5xl font-black leading-[1.02] tracking-[-0.035em] text-surface-900 sm:text-6xl">
              Suggestion Box
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-600">
              Send feedback about PathForge itself: confusing pages, missing controls, bugs, moderation concerns, pricing ideas, or anything that would make the site better.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/suggestion-box/mine" className="inline-flex items-center gap-2 bg-brand-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-dark">
                <Inbox className="h-4 w-4" aria-hidden="true" />
                My suggestion box
              </Link>
              <Link href="/requests" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 transition hover:border-surface-900">
                Request a build
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            <div className="border border-accent-200 bg-accent-50 p-5">
              <ShieldCheck className="h-5 w-5 text-brand-blue" aria-hidden="true" />
              <h2 className="mt-3 text-base font-black text-surface-900">Private inbox first</h2>
              <p className="mt-2 text-sm leading-6 text-surface-600">You must be logged in. New feedback goes to review before it can appear on the board.</p>
            </div>
            <div className="border border-surface-200 bg-white p-5">
              <Clock className="h-5 w-5 text-brand-orange" aria-hidden="true" />
              <h2 className="mt-3 text-base font-black text-surface-900">{SUGGESTION_PUBLIC_DELAY_HOURS}-hour release window</h2>
              <p className="mt-2 text-sm leading-6 text-surface-600">After approval, you have time to keep it private before it appears publicly.</p>
            </div>
            <div className="border border-primary-200 bg-primary-50 p-5 text-surface-900">
              <LockKeyhole className="h-5 w-5 text-brand-orange" aria-hidden="true" />
              <h2 className="mt-3 text-base font-black">Personal replies stay possible</h2>
              <p className="mt-2 text-sm leading-6 text-surface-600">PathForge can respond to your private box even when the public board never sees the note.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="send-feedback" className="border-b border-accent-100 bg-[#f8fbff]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8 lg:py-16">
        <div>
          <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">Send feedback</div>
          <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Private note to PathForge.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-600">
            Use this for website feedback only. For a game, workflow, prompt chain, or artifact you want built, use Build Requests instead.
          </p>
          {!viewer && (
            <div className="mt-6 border border-accent-200 bg-white p-4 text-sm text-surface-600">
              You need to log in before sending suggestions so PathForge can respond to your personal box.
              <div className="mt-3">
                <Link href={loginHref('/suggestion-box')} className="font-bold text-brand-blue-dark hover:text-brand-blue">Log in</Link>
                <span className="mx-2 text-surface-300">/</span>
                <Link href={signupHref('/suggestion-box')} className="font-bold text-brand-blue-dark hover:text-brand-blue">Sign up</Link>
              </div>
            </div>
          )}
        </div>

        {viewer ? <SuggestionSubmitForm /> : (
          <div className="border border-dashed border-accent-200 bg-white p-8 text-center text-sm text-surface-500">
            The suggestion form appears after login.
          </div>
        )}
        </div>
      </section>

      <section className="border-t border-surface-200 bg-white">
        <div id="public-suggestions" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-blue-dark">Public board</div>
              <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Approved feedback people can vote on.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-surface-500">
              This stays quiet until real approved feedback exists. Public suggestions only appear after review and the 24-hour privacy window.
            </p>
          </div>

          {suggestions.length === 0 ? (
            <div className="border border-dashed border-accent-200 bg-accent-50 p-6 sm:p-8 lg:p-10">
              <p className="text-lg font-bold text-surface-900">No public suggestions yet.</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-surface-500">
                That is intentional. The board only fills with approved, user-confirmed suggestions instead of fake launch content.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {EMPTY_SUGGESTION_EXAMPLES.map(([title, body]) => (
                  <div key={title} className="border border-accent-200 bg-white p-4 text-left">
                    <h3 className="text-sm font-bold text-surface-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-surface-600">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {viewer ? (
                  <Link href="#send-feedback" className="inline-flex items-center gap-2 bg-brand-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-dark">
                    Send feedback
                  </Link>
                ) : (
                  <Link href={loginHref('/suggestion-box')} className="inline-flex items-center gap-2 bg-brand-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-dark">
                    Log in to suggest
                  </Link>
                )}
                {!viewer && (
                  <Link href={signupHref('/suggestion-box')} className="inline-flex items-center gap-2 border border-accent-200 bg-white px-4 py-3 text-sm font-bold text-brand-blue-dark transition hover:border-brand-blue">
                    Sign up
                  </Link>
                )}
                <Link href="/requests" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 transition hover:border-surface-900">
                  Request a build
                </Link>
                <Link href="/paths" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 transition hover:border-surface-900">
                  Browse paths
                </Link>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-surface-500">
                Use Build Requests for artifacts or forks. Use this box for feedback about PathForge itself.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {suggestions.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  canVote={Boolean(viewer)}
                  hasVoted={votedSuggestionIds.has(suggestion.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
