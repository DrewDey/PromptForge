import { getPromptById, getUserVotesAndBookmarks } from '@/lib/data'
import { isPersistableProjectId } from '@/lib/project-engagement'
import VoteBookmarkButtons from './VoteBookmarkButtons'

function formatCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function getEngagementSignal(voteCount: number, bookmarkCount: number) {
  const parts: string[] = []

  if (voteCount > 0) {
    parts.push(formatCount(voteCount, 'upvote'))
  }

  if (bookmarkCount > 0) {
    parts.push(formatCount(bookmarkCount, 'save'))
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

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
  const engagementSignal = getEngagementSignal(project.vote_count, project.bookmark_count)
  if (!canPersistEngagement && !engagementSignal) return null

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
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-4">
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
          hideZeroCounts
        />
      ) : (
        <div className="flex items-center gap-3 text-sm text-surface-400">
          {engagementSignal}
        </div>
      )}
    </div>
  )
}
