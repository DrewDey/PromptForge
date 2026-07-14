'use client'

import { useState } from 'react'
import { ArrowUp, Bookmark } from 'lucide-react'
import { voteOnProject, bookmarkProject } from '@/lib/actions'

export default function VoteBookmarkButtons({
  promptId,
  initialVoteCount,
  initialBookmarkCount,
  initialVoted,
  initialBookmarked,
  isLoggedIn,
  size = 'default',
  loginNextPath,
  hideZeroCounts = false,
}: {
  promptId: string
  initialVoteCount: number
  initialBookmarkCount: number
  initialVoted: boolean
  initialBookmarked: boolean
  isLoggedIn: boolean
  size?: 'default' | 'large'
  loginNextPath: string
  hideZeroCounts?: boolean
}) {
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount)
  const [voted, setVoted] = useState(initialVoted)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [votePending, setVotePending] = useState(false)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [message, setMessage] = useState('')
  const loginHref = `/auth/login?next=${encodeURIComponent(loginNextPath)}`

  async function handleVote(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (votePending) return

    setVotePending(true)
    setMessage('')
    const previousVoted = voted
    const previousVoteCount = voteCount
    setVoted(!previousVoted)
    setVoteCount(previousVoted ? previousVoteCount - 1 : previousVoteCount + 1)

    const result = await voteOnProject(promptId)
    if ('error' in result) {
      setVoted(previousVoted)
      setVoteCount(previousVoteCount)
      setMessage(result.error)
    } else {
      setVoted(result.voted)
      setVoteCount(result.newCount)
    }
    setVotePending(false)
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (bookmarkPending) return

    setBookmarkPending(true)
    setMessage('')
    const previousBookmarked = bookmarked
    const previousBookmarkCount = bookmarkCount
    setBookmarked(!previousBookmarked)
    setBookmarkCount(previousBookmarked ? previousBookmarkCount - 1 : previousBookmarkCount + 1)

    const result = await bookmarkProject(promptId)
    if ('error' in result) {
      setBookmarked(previousBookmarked)
      setBookmarkCount(previousBookmarkCount)
      setMessage(result.error)
    } else {
      setBookmarked(result.bookmarked)
      setBookmarkCount(result.newCount)
    }
    setBookmarkPending(false)
  }

  const showVoteCount = !hideZeroCounts || voteCount > 0
  const showBookmarkCount = !hideZeroCounts || bookmarkCount > 0

  if (size === 'large') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleVote}
              disabled={votePending}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                voted
                  ? 'border-brand-orange/50 bg-brand-orange/10 text-brand-orange'
                  : 'border-surface-200 bg-white text-surface-500 hover:border-brand-orange/50 hover:text-brand-orange'
              } ${votePending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
              title={voted ? 'Remove upvote' : 'Upvote'}
              aria-label={voted ? 'Remove upvote' : 'Upvote'}
              aria-pressed={voted}
            >
              <ArrowUp className={`w-4 h-4 ${voted ? 'text-primary-600' : ''}`} />
              {showVoteCount && voteCount}
            </button>
          ) : (
            <a
              href={loginHref}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-500 transition-colors duration-150 hover:border-brand-orange/50 hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              title="Log in to upvote"
              aria-label="Log in to upvote"
            >
              <ArrowUp className="w-4 h-4" />
              {showVoteCount && voteCount}
            </a>
          )}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleBookmark}
              disabled={bookmarkPending}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                bookmarked
                  ? 'border-brand-blue/50 bg-brand-blue/10 text-brand-blue'
                  : 'border-surface-200 bg-white text-surface-500 hover:border-brand-blue/50 hover:text-brand-blue'
              } ${bookmarkPending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              aria-pressed={bookmarked}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500' : ''}`} />
              {showBookmarkCount && bookmarkCount}
            </button>
          ) : (
            <a
              href={loginHref}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-500 transition-colors duration-150 hover:border-brand-blue/50 hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              title="Log in to bookmark"
              aria-label="Log in to bookmark"
            >
              <Bookmark className="w-4 h-4" />
              {showBookmarkCount && bookmarkCount}
            </a>
          )}
        </div>
        {message && (
          <div role="status" className="max-w-[12rem] text-right text-[11px] leading-tight text-red-600">
            {message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleVote}
            disabled={votePending}
            className={`flex items-center gap-1 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
              voted ? 'font-medium text-primary-600' : 'text-surface-400 hover:text-primary-600'
            } ${votePending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
            title={voted ? 'Remove upvote' : 'Upvote'}
            aria-label={voted ? 'Remove upvote' : 'Upvote'}
            aria-pressed={voted}
          >
            <ArrowUp className={`w-3.5 h-3.5 ${voted ? 'text-primary-600' : ''}`} />
            {showVoteCount && voteCount}
          </button>
        ) : (
          <a
            href={loginHref}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1 text-sm text-surface-400 transition-colors duration-150 hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            title="Log in to upvote"
            aria-label="Log in to upvote"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {showVoteCount && voteCount}
          </a>
        )}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleBookmark}
            disabled={bookmarkPending}
            className={`flex items-center gap-1 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
              bookmarked ? 'font-medium text-amber-600' : 'text-surface-400 hover:text-amber-600'
            } ${bookmarkPending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-pressed={bookmarked}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-amber-500' : ''}`} />
            {showBookmarkCount && bookmarkCount}
          </button>
        ) : (
          <a
            href={loginHref}
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1 text-sm text-surface-400 transition-colors duration-150 hover:text-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            title="Log in to bookmark"
            aria-label="Log in to bookmark"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {showBookmarkCount && bookmarkCount}
          </a>
        )}
      </div>
      {message && (
        <div role="status" className="max-w-[10rem] text-right text-[11px] leading-tight text-red-600">
          {message}
        </div>
      )}
    </div>
  )
}
