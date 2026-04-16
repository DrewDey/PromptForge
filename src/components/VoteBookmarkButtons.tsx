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
}: {
  promptId: string
  initialVoteCount: number
  initialBookmarkCount: number
  initialVoted: boolean
  initialBookmarked: boolean
  isLoggedIn: boolean
  size?: 'default' | 'large'
}) {
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount)
  const [voted, setVoted] = useState(initialVoted)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [votePending, setVotePending] = useState(false)
  const [bookmarkPending, setBookmarkPending] = useState(false)

  async function handleVote(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn || votePending) return

    setVotePending(true)
    setVoted(!voted)
    setVoteCount(voted ? voteCount - 1 : voteCount + 1)

    const result = await voteOnProject(promptId)
    setVoted(result.voted)
    setVoteCount(result.newCount)
    setVotePending(false)
  }

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn || bookmarkPending) return

    setBookmarkPending(true)
    setBookmarked(!bookmarked)
    setBookmarkCount(bookmarked ? bookmarkCount - 1 : bookmarkCount + 1)

    const result = await bookmarkProject(promptId)
    setBookmarked(result.bookmarked)
    setBookmarkCount(result.newCount)
    setBookmarkPending(false)
  }

  if (size === 'large') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleVote}
          disabled={!isLoggedIn}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors duration-200 ${
            voted
              ? 'bg-brand-orange/10 border-brand-orange/50 text-brand-orange'
              : 'bg-white border-gray-200 text-gray-500 hover:border-brand-orange/50 hover:text-brand-orange'
          } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isLoggedIn ? (voted ? 'Remove upvote' : 'Upvote') : 'Log in to upvote'}
        >
          <ArrowUp className={`w-4 h-4 ${voted ? 'text-primary-600' : ''}`} />
          {voteCount}
        </button>
        <button
          onClick={handleBookmark}
          disabled={!isLoggedIn}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors duration-200 ${
            bookmarked
              ? 'bg-brand-blue/10 border-brand-blue/50 text-brand-blue'
              : 'bg-white border-gray-200 text-gray-500 hover:border-brand-blue/50 hover:text-brand-blue'
          } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isLoggedIn ? (bookmarked ? 'Remove bookmark' : 'Bookmark') : 'Log in to bookmark'}
        >
          <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-500' : ''}`} />
          {bookmarkCount}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleVote}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 text-sm transition-colors duration-200 ${
          voted ? 'text-primary-600 font-medium' : 'text-gray-400 hover:text-primary-600'
        } ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <ArrowUp className={`w-3.5 h-3.5 ${voted ? 'text-primary-600' : ''}`} />
        {voteCount}
      </button>
      <button
        onClick={handleBookmark}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 text-sm transition-colors duration-200 ${
          bookmarked ? 'text-amber-600 font-medium' : 'text-gray-400 hover:text-amber-600'
        } ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-amber-500' : ''}`} />
        {bookmarkCount}
      </button>
    </div>
  )
}
