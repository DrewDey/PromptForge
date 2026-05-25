'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Bookmark, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react'

type VoteState = 'up' | 'down' | null

type CommentItem = {
  id: string
  author: string
  body: string
  createdAt: string
  replies: CommentReply[]
}

type CommentReply = {
  id: string
  author: string
  body: string
  createdAt: string
}

type StoredCommunityState = {
  vote: VoteState
  saved: boolean
  comments: CommentItem[]
}

const EMPTY_STATE: StoredCommunityState = {
  vote: null,
  saved: false,
  comments: [],
}

function nowLabel() {
  return 'Just now'
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ProjectCommunityPanel({
  projectId,
  viewerName = 'You',
}: {
  projectId: string
  viewerName?: string
}) {
  const storageKey = useMemo(() => `pathforge-community:v1:${projectId}`, [projectId])
  const [state, setState] = useState<StoredCommunityState>(EMPTY_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored) setState(JSON.parse(stored) as StoredCommunityState)
    } catch {
      setState(EMPTY_STATE)
    } finally {
      setHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Local preview state is best effort until database-backed comments ship.
    }
  }, [hydrated, state, storageKey])

  const upvotes = state.vote === 'up' ? 1 : 0
  const downvotes = state.vote === 'down' ? 1 : 0
  const saves = state.saved ? 1 : 0
  const replyCount = state.comments.reduce((sum, comment) => sum + comment.replies.length, 0)
  const totalComments = state.comments.length + replyCount

  function setVote(nextVote: VoteState) {
    setState((current) => ({
      ...current,
      vote: current.vote === nextVote ? null : nextVote,
    }))
  }

  function toggleSaved() {
    setState((current) => ({
      ...current,
      saved: !current.saved,
    }))
  }

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body) return

    setState((current) => ({
      ...current,
      comments: [
        {
          id: makeId('comment'),
          author: viewerName,
          body,
          createdAt: nowLabel(),
          replies: [],
        },
        ...current.comments,
      ],
    }))
    setCommentBody('')
  }

  function addReply(event: FormEvent<HTMLFormElement>, commentId: string) {
    event.preventDefault()
    const body = replyBody.trim()
    if (!body) return

    setState((current) => ({
      ...current,
      comments: current.comments.map((comment) => (
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: makeId('reply'),
                  author: viewerName,
                  body,
                  createdAt: nowLabel(),
                },
              ],
            }
          : comment
      )),
    }))
    setReplyBody('')
    setReplyTarget(null)
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8 lg:pb-14">
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

            <form onSubmit={addComment} className="border border-surface-200 bg-white p-4">
              <label htmlFor="project-comment" className="sr-only">
                Add a comment
              </label>
              <textarea
                id="project-comment"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                rows={4}
                placeholder="Add a question, idea, bug report, or fork suggestion..."
                className="w-full resize-y border border-surface-200 bg-surface-50 px-3 py-2 text-sm leading-6 text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-surface-500">
                  Starts at zero. No seeded comments or fake activity.
                </p>
                <button
                  type="submit"
                  className="border border-surface-900 bg-surface-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!commentBody.trim()}
                >
                  Post
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {state.comments.length === 0 ? (
                <div className="border border-dashed border-surface-300 bg-white px-4 py-6 text-sm text-surface-500">
                  No comments yet.
                </div>
              ) : (
                state.comments.map((comment) => (
                  <article key={comment.id} className="border border-surface-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-surface-900">{comment.author}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                        {comment.createdAt}
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-surface-700">{comment.body}</p>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(replyTarget === comment.id ? null : comment.id)}
                      className="mt-3 text-xs font-semibold text-brand-blue transition hover:text-brand-blue-dark"
                    >
                      Reply
                    </button>

                    {comment.replies.length > 0 && (
                      <div className="mt-4 space-y-3 border-l-2 border-surface-200 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="bg-surface-50 px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-surface-900">{reply.author}</div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">
                                {reply.createdAt}
                              </div>
                            </div>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-surface-700">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyTarget === comment.id && (
                      <form onSubmit={(event) => addReply(event, comment.id)} className="mt-4 flex gap-2">
                        <label htmlFor={`reply-${comment.id}`} className="sr-only">
                          Reply to comment
                        </label>
                        <input
                          id={`reply-${comment.id}`}
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          placeholder="Write a reply..."
                          className="min-w-0 flex-1 border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition focus:border-brand-orange focus:bg-white"
                        />
                        <button
                          type="submit"
                          className="border border-surface-900 bg-surface-900 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-surface-800 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!replyBody.trim()}
                        >
                          Reply
                        </button>
                      </form>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="border border-surface-200 bg-white p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-surface-500">
              Community signal
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVote('up')}
                className={`flex flex-col items-center gap-1 border px-2 py-3 text-xs font-semibold transition ${
                  state.vote === 'up'
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                    : 'border-surface-200 text-surface-600 hover:border-brand-orange hover:text-brand-orange'
                }`}
              >
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                <span>{upvotes}</span>
              </button>
              <button
                type="button"
                onClick={() => setVote('down')}
                className={`flex flex-col items-center gap-1 border px-2 py-3 text-xs font-semibold transition ${
                  state.vote === 'down'
                    ? 'border-surface-900 bg-surface-900 text-white'
                    : 'border-surface-200 text-surface-600 hover:border-surface-500 hover:text-surface-900'
                }`}
              >
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>{downvotes}</span>
              </button>
              <button
                type="button"
                onClick={toggleSaved}
                className={`flex flex-col items-center gap-1 border px-2 py-3 text-xs font-semibold transition ${
                  state.saved
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-surface-200 text-surface-600 hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${state.saved ? 'fill-current' : ''}`} aria-hidden="true" />
                <span>{saves}</span>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-200 pt-4 text-sm">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-surface-400">Comments</div>
                <div className="mt-1 text-xl font-black text-surface-900">{totalComments}</div>
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
