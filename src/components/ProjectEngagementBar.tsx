import { getPromptById, getUserVotesAndBookmarks } from '@/lib/data'
import { isPersistableProjectId } from '@/lib/project-engagement'
import VoteBookmarkButtons from './VoteBookmarkButtons'

export default async function ProjectEngagementBar({
  projectId,
  loginNextPath,
}: {
  projectId: string
  loginNextPath: string
}) {
  const project = await getPromptById(projectId)
  if (!project) return null

  const canPersistEngagement = isPersistableProjectId(project.id)
  let isLoggedIn = false
  let hasVoted = false
  let hasBookmarked = false

  if (canPersistEngagement && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = Boolean(user)

      if (user) {
        const { votes, bookmarks } = await getUserVotesAndBookmarks([project.id])
        hasVoted = votes.has(project.id)
        hasBookmarked = bookmarks.has(project.id)
      }
    } catch {
      isLoggedIn = false
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-800 pt-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
          Community signal
        </div>
      </div>

      {canPersistEngagement ? (
        <VoteBookmarkButtons
          promptId={project.id}
          initialVoteCount={project.vote_count}
          initialBookmarkCount={project.bookmark_count}
          initialVoted={hasVoted}
          initialBookmarked={hasBookmarked}
          isLoggedIn={isLoggedIn}
          size="large"
          loginNextPath={loginNextPath}
        />
      ) : (
        <div className="flex items-center gap-3 text-sm text-surface-400">
          <span>{project.vote_count} upvotes</span>
          <span aria-hidden="true">·</span>
          <span>{project.bookmark_count} saves</span>
        </div>
      )}
    </div>
  )
}
