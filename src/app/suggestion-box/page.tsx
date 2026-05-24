import Link from 'next/link'
import { ArrowUp, Clock, Inbox, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react'
import SuggestionSubmitForm from '@/components/SuggestionSubmitForm'
import { getPublicSuggestions, SUGGESTION_PUBLIC_DELAY_HOURS } from '@/lib/data'
import { voteOnSuggestion } from '@/lib/actions'
import type { SuggestionWithRelations } from '@/lib/types'

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

function SuggestionCard({ suggestion, canVote }: { suggestion: SuggestionWithRelations; canVote: boolean }) {
  const publicResponses = (suggestion.responses ?? []).filter(response => response.visibility === 'public')

  return (
    <article className="border border-surface-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="bg-surface-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          {statusLabel(suggestion.public_status)}
        </span>
        <span className="border border-surface-200 bg-surface-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
          Public request
        </span>
      </div>

      <h2 className="text-xl font-black tracking-[-0.02em] text-surface-900">{suggestion.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-surface-600">{suggestion.body}</p>

      {publicResponses.length > 0 && (
        <div className="mt-5 border-l-2 border-brand-orange bg-brand-orange/[0.04] px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
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

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-100 pt-4">
        <p className="text-xs text-surface-500">
          Requested by {suggestion.author?.display_name ?? suggestion.author?.username ?? 'a PathForge user'} · {new Date(suggestion.created_at).toLocaleDateString()}
        </p>
        {canVote ? (
          <form action={voteOnSuggestion}>
            <input type="hidden" name="suggestion_id" value={suggestion.id} />
            <button className="inline-flex items-center gap-1.5 border border-surface-300 px-3 py-1.5 text-xs font-bold text-surface-700 hover:border-surface-900 hover:text-surface-900">
              <ArrowUp className="h-3.5 w-3.5" />
              {suggestion.vote_count}
            </button>
          </form>
        ) : (
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 border border-surface-300 px-3 py-1.5 text-xs font-bold text-surface-500 hover:border-brand-orange hover:text-brand-orange">
            <ArrowUp className="h-3.5 w-3.5" />
            Log in to vote
          </Link>
        )}
      </div>
    </article>
  )
}

export default async function SuggestionBoxPage() {
  const [viewer, suggestions] = await Promise.all([
    getViewer(),
    getPublicSuggestions(),
  ])

  return (
    <div className="bg-surface-50">
      <section className="relative overflow-hidden border-b border-surface-200 bg-white">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(var(--color-surface-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-surface-100)_1px,transparent_1px)] [background-size:52px_52px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-surface-200 bg-surface-100 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-600">
              <Inbox className="h-3.5 w-3.5 text-brand-orange" />
              Community signal
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.035em] text-surface-900 sm:text-6xl">
              Suggest what PathForge should <span className="font-display italic font-normal text-brand-orange">make</span> next.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-surface-600">
              Drop ideas, concerns, missing pages, or project requests. PathForge can respond directly to your box, and approved public suggestions help steer what gets built next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/suggestion-box/mine" className="inline-flex items-center gap-2 bg-surface-900 px-4 py-3 text-sm font-bold text-white hover:bg-brand-orange">
                My suggestion box
              </Link>
              <Link href="/what-to-build" className="inline-flex items-center gap-2 border border-surface-300 bg-white px-4 py-3 text-sm font-bold text-surface-900 hover:border-surface-900">
                See what to build
              </Link>
            </div>
          </div>

          <div className="border border-surface-200 bg-surface-900 p-5 text-white sm:p-6">
            <div className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-orange">
              How public posting works
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <div>
                  <h2 className="text-sm font-bold">Everything starts private.</h2>
                  <p className="mt-1 text-sm leading-relaxed text-surface-400">You must be logged in. New suggestions go to review first, not straight to the public board.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <div>
                  <h2 className="text-sm font-bold">{SUGGESTION_PUBLIC_DELAY_HOURS}-hour release window.</h2>
                  <p className="mt-1 text-sm leading-relaxed text-surface-400">After approval, you get 24 hours to keep the suggestion private before it appears publicly.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <div>
                  <h2 className="text-sm font-bold">Responses can stay personal.</h2>
                  <p className="mt-1 text-sm leading-relaxed text-surface-400">PathForge can reply to your suggestion box even if the idea never appears on the public page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div>
          <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Send one in</div>
          <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Your box to PathForge.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-surface-600">
            Use this for project ideas, site improvements, categories you want, quality concerns, or anything that would make the platform more useful.
          </p>
          {!viewer && (
            <div className="mt-6 border border-surface-200 bg-white p-4 text-sm text-surface-600">
              You need to log in before sending suggestions so PathForge can respond to your personal box.
              <div className="mt-3">
                <Link href="/auth/login" className="font-bold text-brand-orange hover:text-brand-orange-dark">Log in</Link>
                <span className="mx-2 text-surface-300">/</span>
                <Link href="/auth/signup" className="font-bold text-brand-orange hover:text-brand-orange-dark">Sign up</Link>
              </div>
            </div>
          )}
        </div>

        {viewer ? <SuggestionSubmitForm /> : (
          <div className="border border-dashed border-surface-300 bg-white p-8 text-center text-sm text-surface-500">
            The suggestion form appears after login.
          </div>
        )}
      </section>

      <section className="border-t border-surface-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-brand-orange">Public board</div>
              <h2 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Approved requests people can rally around.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-surface-500">
              This stays quiet until real approved requests exist. Public suggestions only appear after review and the 24-hour privacy window.
            </p>
          </div>

          {suggestions.length === 0 ? (
            <div className="border border-dashed border-surface-300 bg-surface-50 p-10 text-center">
              <p className="text-lg font-bold text-surface-900">No public suggestions yet.</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-surface-500">
                That is intentional. The board only fills with approved, user-confirmed suggestions instead of fake launch content.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {suggestions.map(suggestion => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} canVote={Boolean(viewer)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
