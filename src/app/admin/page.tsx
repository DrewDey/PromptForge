import Link from 'next/link'
import { dismissSourceRun } from '@/lib/actions'
import { getAllPromptsForAdmin, getAllSourceRunSubmissionsForAdmin, getAllSuggestionsForAdmin } from '@/lib/data'
import type { SourceRunSubmissionWithRelations } from '@/lib/types'
import AdminPromptRow from './AdminPromptRow'
import AdminSuggestionRow from './AdminSuggestionRow'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const requestedTab = params.tab ?? 'overview'
  const tab = requestedTab === 'source-runs' ? 'pending' : requestedTab

  const [allPrompts, allSuggestions, sourceRuns] = await Promise.all([
    getAllPromptsForAdmin(),
    getAllSuggestionsForAdmin(),
    getAllSourceRunSubmissionsForAdmin(),
  ])

  const pendingPrompts = allPrompts.filter(prompt => prompt.status === 'pending')
  const approvedPrompts = allPrompts.filter(prompt => prompt.status === 'approved')
  const pendingSuggestions = allSuggestions.filter(suggestion => (
    suggestion.moderation_status === 'pending' && suggestion.public_status === 'under_review'
  ))
  const reviewedSuggestions = allSuggestions.filter(suggestion => !pendingSuggestions.includes(suggestion))
  const publicSuggestions = allSuggestions.filter(suggestion => {
    if (suggestion.moderation_status !== 'approved') return false
    if (suggestion.visibility === 'public') return true
    return Boolean(
      suggestion.visibility === 'scheduled_public' &&
      suggestion.scheduled_publish_at &&
      new Date(suggestion.scheduled_publish_at).getTime() <= Date.now()
    )
  })

  const stats = {
    total: allPrompts.length,
    pending: pendingPrompts.length,
    approved: approvedPrompts.length,
  }

  const suggestionStats = {
    total: allSuggestions.length,
    pending: pendingSuggestions.length,
    public: publicSuggestions.length,
  }

  const intakeItems = sourceRuns.filter(sourceRun => (
    (sourceRun.status === 'queued' || sourceRun.status === 'extracting') &&
    !sourceRun.extracted_prompt_id
  ))
  const reviewCount = pendingPrompts.length + intakeItems.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage prompts, review submissions, and monitor the platform.</p>
      </div>

      {/* Mobile tab nav */}
      <div className="flex gap-2 mb-6 md:hidden">
        <Link href="/admin" className={`text-xs font-medium px-3 py-1.5 border ${tab === 'overview' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200'}`}>
          Overview
        </Link>
        <Link href="/admin?tab=pending" className={`text-xs font-medium px-3 py-1.5 border ${tab === 'pending' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200'}`}>
          Review ({reviewCount})
        </Link>
        <Link href="/admin?tab=all" className={`text-xs font-medium px-3 py-1.5 border ${tab === 'all' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200'}`}>
          All
        </Link>
        <Link href="/admin?tab=suggestions" className={`text-xs font-medium px-3 py-1.5 border ${tab === 'suggestions' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200'}`}>
          Suggestions ({suggestionStats.pending})
        </Link>
      </div>

      {/* Stats Cards */}
      {(tab === 'overview' || tab === 'pending' || tab === 'all' || tab === 'suggestions') && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Prompts" value={stats.total} />
          <StatCard label="Pending Review" value={reviewCount} highlight={reviewCount > 0} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Pending Suggestions" value={suggestionStats.pending} highlight={suggestionStats.pending > 0} />
          <StatCard label="Public Suggestions" value={suggestionStats.public} />
        </div>
      )}

      {/* Pending Review */}
      {(tab === 'overview' || tab === 'pending') && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Pending Review
            {reviewCount > 0 && (
              <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5">
                {reviewCount}
              </span>
            )}
          </h2>
          {reviewCount === 0 ? (
            <div className="bg-white border border-gray-200 p-8 text-center text-gray-500 text-sm">
              No prompts pending review. All caught up!
            </div>
          ) : (
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Difficulty</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Author</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPrompts.map(prompt => (
                      <AdminPromptRow key={prompt.id} prompt={prompt} />
                    ))}
                    {intakeItems.map(sourceRun => (
                      <SourceRunIntakeRow key={sourceRun.id} sourceRun={sourceRun} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* All Prompts */}
      {tab === 'all' && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Prompts ({allPrompts.length})</h2>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Votes</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Author</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allPrompts.map(prompt => (
                    <AdminPromptRow key={prompt.id} prompt={prompt} showStatus />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === 'suggestions' && (
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Suggestion Box ({allSuggestions.length})</h2>
              <p className="mt-1 text-sm text-gray-500">
                Approve PathForge feedback, respond to users, and decide what becomes public after the 24-hour release window.
              </p>
            </div>
            <Link href="/suggestion-box" className="text-sm font-semibold text-brand-orange hover:text-brand-orange-dark">
              View public board
            </Link>
          </div>
          {allSuggestions.length === 0 ? (
            <div className="bg-white border border-gray-200 p-8 text-center text-gray-500 text-sm">
              No suggestions yet. When users send PathForge feedback, it will appear here for review.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSuggestions.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">
                    Pending review
                  </h3>
                  <div className="space-y-4">
                    {pendingSuggestions.map(suggestion => (
                      <AdminSuggestionRow key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Reviewed suggestions
                </h3>
                {reviewedSuggestions.length === 0 ? (
                  <div className="bg-white border border-gray-200 p-6 text-sm text-gray-500">
                    No reviewed suggestions yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewedSuggestions.map(suggestion => (
                      <AdminSuggestionRow key={suggestion.id} suggestion={suggestion} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function titleFromNotes(notes: string | null) {
  const match = notes?.match(/^Title:\s*(.+)$/m)
  return match?.[1]?.trim()
}

function SourceRunIntakeRow({ sourceRun }: { sourceRun: SourceRunSubmissionWithRelations }) {
  const title = sourceRun.title?.trim() || titleFromNotes(sourceRun.notes) || sourceRun.source_url || sourceRun.file_name || 'Source-run intake'
  const sourceLabel = sourceRun.source_url ?? sourceRun.file_name ?? 'Source run'

  return (
    <tr
      className="border-b border-gray-100 bg-amber-50/30 hover:bg-amber-50"
      data-source-run-id={sourceRun.id}
      data-source-url={sourceRun.source_url ?? undefined}
    >
      <td className="px-4 py-3 align-top">
        <div className="mb-1 inline-flex items-center gap-1.5 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
          Let the agent structure it
        </div>
        <Link
          href={`/admin/source-runs/${sourceRun.id}`}
          className="block font-medium text-gray-900 hover:text-brand-orange"
        >
          {title}
        </Link>
        <p className="mt-1 break-all text-xs text-gray-500">{sourceLabel}</p>
        {sourceRun.notes && (
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-600">
            <span className="font-semibold text-gray-700">Agent notes:</span> {sourceRun.notes}
          </p>
        )}
        <p className="mt-2 text-xs leading-5 text-gray-500">
          Draft a final-artifact-first project page from the source run, preserve exact prompts and responses, and keep
          generated code inside collapsed response packages.
        </p>
      </td>
      <td className="px-4 py-3 align-top text-gray-600">Source run</td>
      <td className="px-4 py-3 align-top text-gray-600">{sourceRun.status.replace('_', ' ')}</td>
      <td className="px-4 py-3 align-top text-gray-600">
        {sourceRun.author?.display_name ?? sourceRun.author?.username ?? 'Anonymous'}
      </td>
      <td className="px-4 py-3 align-top text-xs text-gray-500">
        {new Date(sourceRun.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/admin/source-runs/${sourceRun.id}`}
            className="inline-flex items-center justify-center bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            Review intake
          </Link>
          <form action={dismissSourceRun}>
            <input type="hidden" name="source_run_id" value={sourceRun.id} />
            <button type="submit" className="text-xs font-medium text-gray-500 hover:text-red-700">
              Dismiss
            </button>
          </form>
        </div>
      </td>
    </tr>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border p-4 ${highlight ? 'border-amber-300 bg-amber-50' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
