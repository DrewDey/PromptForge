import Link from 'next/link'
import { Clock, LockKeyhole, MessageSquare, Send, ShieldCheck } from 'lucide-react'
import { keepSuggestionPrivate } from '@/lib/actions'
import { getMySuggestions } from '@/lib/data'
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

function formatStatus(suggestion: SuggestionWithRelations) {
  if (suggestion.moderation_status === 'pending') return 'Pending review'
  if (suggestion.moderation_status === 'declined') return 'Declined'
  if (suggestion.visibility === 'private') return suggestion.kept_private_at ? 'Kept private' : 'Private thread'
  if (
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() <= Date.now()
  ) return 'Public'
  if (suggestion.visibility === 'scheduled_public') return 'Approved, public soon'
  return 'Public'
}

function releaseCopy(suggestion: SuggestionWithRelations) {
  if (suggestion.visibility !== 'scheduled_public' || !suggestion.scheduled_publish_at) return null
  const publishAt = new Date(suggestion.scheduled_publish_at)
  const msRemaining = publishAt.getTime() - Date.now()
  if (msRemaining <= 0) return 'The public release window has ended. This suggestion can now appear on the public board.'
  const hours = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)))
  return `${hours} hour${hours === 1 ? '' : 's'} left to keep this suggestion private.`
}

function canKeepPrivate(suggestion: SuggestionWithRelations) {
  return Boolean(
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() > Date.now()
  )
}

function MySuggestionCard({ suggestion }: { suggestion: SuggestionWithRelations }) {
  const release = releaseCopy(suggestion)

  return (
    <article className="border border-surface-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="bg-surface-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          {formatStatus(suggestion)}
        </span>
        <span className="border border-surface-200 bg-surface-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface-500">
          {suggestion.public_status.replace('_', ' ')}
        </span>
      </div>

      <h2 className="text-xl font-black tracking-[-0.02em] text-surface-900">{suggestion.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-surface-600">{suggestion.body}</p>

      {release && (
        <div className="mt-5 border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-900">{release}</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                If you keep it private, PathForge can still respond here, but it will not appear on the public suggestion board.
              </p>
              {canKeepPrivate(suggestion) && (
                <form action={keepSuggestionPrivate} className="mt-3">
                  <input type="hidden" name="suggestion_id" value={suggestion.id} />
                  <button className="inline-flex items-center gap-2 bg-amber-900 px-3 py-2 text-xs font-bold text-white hover:bg-brand-orange">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Keep private
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {(suggestion.responses ?? []).length > 0 ? (
        <div className="mt-5 border-l-2 border-brand-orange bg-brand-orange/[0.04] px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-orange">
            <MessageSquare className="h-3.5 w-3.5" />
            Responses
          </div>
          <div className="space-y-3">
            {(suggestion.responses ?? []).map(response => (
              <div key={response.id}>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-surface-500">
                  {response.visibility === 'public' ? 'Public response' : 'For your box'} · {new Date(response.created_at).toLocaleDateString()}
                </div>
                <p className="text-sm leading-relaxed text-surface-700">{response.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-surface-300 bg-surface-50 p-4 text-sm text-surface-500">
          No PathForge response yet.
        </div>
      )}
    </article>
  )
}

export default async function MySuggestionBoxPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const params = await searchParams
  const [viewer, suggestions] = await Promise.all([
    getViewer(),
    getMySuggestions(),
  ])

  if (!viewer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-surface-200 bg-white p-8 text-center">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-brand-orange" />
          <h1 className="text-3xl font-black tracking-[-0.025em] text-surface-900">Log in to see your suggestion box.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-surface-600">
            Site feedback is tied to your account so PathForge can answer you directly and give you the 24-hour public/private choice.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/auth/login" className="bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange">Log in</Link>
            <Link href="/auth/signup" className="border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-900 hover:border-surface-900">Sign up</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-50">
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          {params.submitted && (
            <div className="mb-6 inline-flex items-center gap-2 border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              <ShieldCheck className="h-4 w-4" />
              Suggestion sent to review.
            </div>
          )}
          <div className="mb-4 inline-flex items-center gap-2 border border-surface-200 bg-surface-100 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-600">
            <Send className="h-3.5 w-3.5 text-brand-orange" />
            Your direct line
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-[-0.035em] text-surface-900">
            Your suggestion <span className="font-display italic font-normal text-brand-orange">box</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-surface-600">
            Track your PathForge feedback, see responses, and choose whether approved suggestions go public after the 24-hour release window.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/suggestion-box" className="bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange">Send another suggestion</Link>
            <Link href="/requests" className="border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-900 hover:border-surface-900">Build Requests</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {suggestions.length === 0 ? (
          <div className="border border-dashed border-surface-300 bg-white p-10 text-center">
            <p className="text-lg font-bold text-surface-900">No suggestions in your box yet.</p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-surface-500">
              Send one when you notice a confusing page, missing platform feature, bug, policy concern, or anything that would make PathForge more useful.
            </p>
            <Link href="/suggestion-box" className="mt-5 inline-flex bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange">
              Open suggestion box
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {suggestions.map(suggestion => (
              <MySuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
