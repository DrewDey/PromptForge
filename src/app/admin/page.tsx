import Link from 'next/link'
import { getAllSuggestionsForAdmin, getPromptStats, getPrompts, getSuggestionStats } from '@/lib/data'
import AdminPromptRow from './AdminPromptRow'
import AdminSuggestionRow from './AdminSuggestionRow'

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab ?? 'overview'

  const [stats, suggestionStats, pendingPrompts, allPrompts, allSuggestions] = await Promise.all([
    getPromptStats(),
    getSuggestionStats(),
    getPrompts({ status: 'pending' }),
    getPrompts({ status: 'all' }),
    getAllSuggestionsForAdmin(),
  ])

  const pendingSuggestions = allSuggestions.filter(suggestion => suggestion.moderation_status === 'pending')
  const reviewedSuggestions = allSuggestions.filter(suggestion => suggestion.moderation_status !== 'pending')

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
          Review ({stats.pending})
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
          <StatCard label="Pending Review" value={stats.pending} highlight={stats.pending > 0} />
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
            {stats.pending > 0 && (
              <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5">
                {stats.pending}
              </span>
            )}
          </h2>
          {pendingPrompts.length === 0 ? (
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
                Approve requests, respond to users, and decide what becomes public after the 24-hour release window.
              </p>
            </div>
            <Link href="/suggestion-box" className="text-sm font-semibold text-brand-orange hover:text-brand-orange-dark">
              View public board
            </Link>
          </div>
          {allSuggestions.length === 0 ? (
            <div className="bg-white border border-gray-200 p-8 text-center text-gray-500 text-sm">
              No suggestions yet. When users send requests, they will appear here for review.
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

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`border p-4 ${highlight ? 'border-amber-300 bg-amber-50' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
