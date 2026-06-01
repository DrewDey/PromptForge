import { MessageSquare } from 'lucide-react'

export default function ProjectCommunityPanel({
  projectId,
}: {
  projectId: string
}) {
  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8 lg:pb-14"
      data-project-id={projectId}
    >
      <div className="border-t border-surface-200 pt-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
                  Discussion
                </div>
                <h2 className="text-2xl font-black text-surface-900">Comments and replies</h2>
              </div>
            </div>

            <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm text-surface-500">
              No comments yet.
            </div>
          </div>

          <aside className="border border-surface-200 bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
              Discussion signal
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-200 pt-4 text-sm">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">Comments</div>
                <div className="mt-1 text-xl font-black text-surface-900">0</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">Forks</div>
                <div className="mt-1 text-xl font-black text-surface-900">0</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
