import Link from 'next/link'
import { getPromptStats, getPrompts } from '@/lib/data'
import AdminPromptRow from './AdminPromptRow'

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const tab = params.tab ?? 'overview'

  const [stats, pendingPrompts, allPrompts] = await Promise.all([
    getPromptStats(),
    getPrompts({ status: 'pending' }),
    getPrompts({ status: 'all' }),
  ])

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
      </div>

      {/* Stats Cards */}
      {(tab === 'overview' || tab === 'pending' || tab === 'all') && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Prompts" value={stats.total} />
          <StatCard label="Pending Review" value={stats.pending} highlight={stats.pending > 0} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Rejected" value={stats.rejected} />
          <StatCard label="Categories" value={stats.categories} />
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
