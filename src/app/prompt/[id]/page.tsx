import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Tag, Cpu, Wrench } from 'lucide-react'
import { getPromptById, getUserVotesAndBookmarks } from '@/lib/data'
import { getModelName } from '@/lib/models'
import CopyButton from './CopyButton'
import VoteBookmarkButtons from '@/components/VoteBookmarkButtons'

const difficultyColors = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/30',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prompt = await getPromptById(id)

  if (!prompt) notFound()

  const hasSteps = prompt.steps && prompt.steps.length > 0
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation

  let hasVoted = false
  let hasBookmarked = false
  let isLoggedIn = false
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = !!user
      if (user) {
        const { votes, bookmarks } = await getUserVotesAndBookmarks([prompt.id])
        hasVoted = votes.has(prompt.id)
        hasBookmarked = bookmarks.has(prompt.id)
      }
    }
  } catch {
    // continue with defaults
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/browse" className="text-sm text-gray-500 hover:text-brand-orange flex items-center gap-1 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {prompt.category && (
            <Link
              href={`/browse?category=${prompt.category.slug}`}
              className="text-xs font-semibold bg-surface-800 text-gray-400 px-2.5 py-1 border border-surface-600 hover:border-brand-orange/50 transition-colors"
            >
              {prompt.category.icon} {prompt.category.name}
            </Link>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 border ${difficultyColors[prompt.difficulty]}`}>
            {prompt.difficulty}
          </span>
          {hasSteps && (
            <span className="text-xs font-semibold bg-brand-orange/10 text-brand-orange px-2.5 py-1 border border-brand-orange/30">
              {prompt.steps!.length}-step path
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black text-white mb-3">{prompt.title}</h1>
        <p className="text-gray-400 text-lg leading-relaxed">{prompt.description}</p>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 mb-8 pb-6 border-b border-surface-700">
        <span>By {prompt.author?.username ? (
          <Link href={`/user/${prompt.author.username}`} className="font-semibold text-gray-300 hover:text-brand-orange transition-colors">
            {prompt.author.display_name ?? 'Anonymous'}
          </Link>
        ) : (
          <strong className="text-gray-300">Anonymous</strong>
        )}</span>
        <VoteBookmarkButtons
          promptId={prompt.id}
          initialVoteCount={prompt.vote_count}
          initialBookmarkCount={prompt.bookmark_count}
          initialVoted={hasVoted}
          initialBookmarked={hasBookmarked}
          isLoggedIn={isLoggedIn}
          size="large"
        />
        {modelDisplay && (
          <span className="flex items-center gap-1">
            <Cpu className="w-4 h-4" /> {modelDisplay}
          </span>
        )}
        {prompt.tools_used && prompt.tools_used.length > 0 && (
          <span className="flex items-center gap-1">
            <Wrench className="w-4 h-4" />
            {prompt.tools_used.join(', ')}
          </span>
        )}
      </div>

      {/* The Story */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-3">The Story</h2>
        <div className="bg-surface-800 border border-surface-600 p-6">
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">{prompt.content}</p>
        </div>
      </section>

      {/* Steps — the path */}
      {hasSteps && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-2">
            The Path ({prompt.steps!.length} step{prompt.steps!.length > 1 ? 's' : ''})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Follow the prompts and results at each step.
          </p>

          <div className="relative">
            {/* Vertical pipe */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-orange via-brand-blue to-brand-orange" />

            <div className="space-y-6">
              {prompt.steps!.map((step, idx) => (
                <div key={step.id} className="relative pl-12">
                  {/* Step node on the pipe */}
                  <div className="absolute left-3 top-4 w-5 h-5 bg-surface-900 border-2 border-brand-orange flex items-center justify-center">
                    <span className="text-[10px] font-black text-brand-orange">{idx + 1}</span>
                  </div>

                  <div className="bg-surface-800 border border-surface-600 overflow-hidden">
                    {/* Step header */}
                    <div className="bg-surface-700 px-5 py-3 border-b border-surface-600">
                      <span className="font-bold text-sm text-white">{step.title}</span>
                      {step.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                      )}
                    </div>

                    {/* Prompt */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">Prompt</span>
                        <CopyButton text={step.content} />
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-surface-900 p-4 border border-surface-700">
                        {step.content}
                      </pre>
                    </div>

                    {/* Result */}
                    {step.result_content && (
                      <div className="px-5 pb-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-green-400">Result</span>
                          <CopyButton text={step.result_content} />
                        </div>
                        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-green-500/5 p-4 border border-green-500/20">
                          {step.result_content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Single prompt (no steps) */}
      {!hasSteps && prompt.content && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-orange">The Prompt</h2>
            <CopyButton text={prompt.content} />
          </div>
          <div className="bg-surface-800 border border-surface-600 p-6">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {prompt.content}
            </pre>
          </div>
        </section>
      )}

      {/* Final Result */}
      {prompt.result_content && (
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">The Result</h2>
          <div className="bg-green-500/5 border-2 border-green-500/20 p-6">
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{prompt.result_content}</p>
          </div>
        </section>
      )}

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-6 border-t border-surface-700">
          <Tag className="w-4 h-4 text-gray-600" />
          {prompt.tags.map(tag => (
            <Link
              key={tag}
              href={`/browse?q=${encodeURIComponent(tag)}`}
              className="text-xs bg-surface-800 text-gray-500 px-2.5 py-1 border border-surface-600 hover:border-brand-orange/50 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
