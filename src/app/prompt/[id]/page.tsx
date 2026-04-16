import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Tag, Cpu, Wrench, MessageSquare, ArrowRight } from 'lucide-react'
import { getPromptById, getUserVotesAndBookmarks, getPrompts } from '@/lib/data'
import { getModelName } from '@/lib/models'
import CopyButton from './CopyButton'
import VoteBookmarkButtons from '@/components/VoteBookmarkButtons'
import PromptCard from '@/components/PromptCard'

const difficultyConfig = {
  beginner: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  intermediate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  advanced: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
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
  const difficulty = difficultyConfig[prompt.difficulty] || difficultyConfig.beginner

  // Fetch related projects in the same category (for "More in this category" section)
  let relatedProjects: Awaited<ReturnType<typeof getPrompts>> = []
  if (prompt.category) {
    const allInCategory = await getPrompts({ categorySlug: prompt.category.slug, sort: 'popular', limit: 4 })
    relatedProjects = allInCategory.filter(p => p.id !== prompt.id).slice(0, 3)
  }

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
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link href="/browse" className="text-gray-400 hover:text-brand-orange transition-colors duration-200 font-medium">
              Browse
            </Link>
          </li>
          {prompt.category && (
            <>
              <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5 text-gray-300" /></li>
              <li>
                <Link
                  href={`/browse?category=${prompt.category.slug}`}
                  className="text-gray-400 hover:text-brand-orange transition-colors duration-200 font-medium"
                >
                  {prompt.category.icon} {prompt.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5 text-gray-300" /></li>
          <li className="text-gray-700 font-semibold truncate max-w-[300px]" aria-current="page">
            {prompt.title}
          </li>
        </ol>
      </nav>

      {/* ─── Header ─── */}
      <header className="mb-10">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 leading-tight">{prompt.title}</h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-4">{prompt.description}</p>

        {/* Author row — immediately after title for human connection */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-orange to-brand-blue flex items-center justify-center text-white text-sm font-bold">
              {(prompt.author?.display_name || 'A')[0].toUpperCase()}
            </div>
            <div>
              {prompt.author?.username ? (
                <Link href={`/user/${prompt.author.username}`} className="text-sm font-semibold text-gray-900 hover:text-brand-orange transition-colors duration-200">
                  {prompt.author.display_name ?? 'Anonymous'}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-gray-900">Anonymous</span>
              )}
              <p className="text-xs text-gray-400">
                {prompt.created_at ? new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Shared on PathForge'}
              </p>
            </div>
          </div>
          <VoteBookmarkButtons
            promptId={prompt.id}
            initialVoteCount={prompt.vote_count}
            initialBookmarkCount={prompt.bookmark_count}
            initialVoted={hasVoted}
            initialBookmarked={hasBookmarked}
            isLoggedIn={isLoggedIn}
            size="large"
          />
        </div>

        {/* Metadata — grouped into context + technical */}
        <div className="flex items-start gap-6 flex-wrap pt-5 border-t border-gray-200">
          {/* Context group */}
          <div className="flex items-center gap-2 flex-wrap">
            {prompt.category && (
              <Link
                href={`/browse?category=${prompt.category.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-600 px-3 py-1.5 border border-gray-200 hover:border-brand-orange/50 hover:text-brand-orange transition-colors duration-200"
              >
                <span>{prompt.category.icon}</span>
                {prompt.category.name}
              </Link>
            )}
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border ${difficulty.bg} ${difficulty.text} ${difficulty.border}`}>
              <span className={`w-1.5 h-1.5 ${difficulty.dot}`} />
              {prompt.difficulty}
            </span>
            {hasSteps && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-orange/10 text-brand-orange px-3 py-1.5 border border-brand-orange/30">
                {prompt.steps!.length}-step path
              </span>
            )}
          </div>
          {/* Technical specs group */}
          {(modelDisplay || (prompt.tools_used && prompt.tools_used.length > 0)) && (
            <div className="flex items-center gap-2 flex-wrap">
              {modelDisplay && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent-50 text-brand-blue px-3 py-1.5 border border-accent-200">
                  <Cpu className="w-3 h-3" />
                  {modelDisplay}
                </span>
              )}
              {prompt.tools_used && prompt.tools_used.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-600 px-3 py-1.5 border border-gray-200">
                  <Wrench className="w-3 h-3" />
                  {prompt.tools_used.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─── The Story — most prominent content section ─── */}
      <section className="mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-orange" />
          The Story
        </h2>
        <div className="bg-primary-50 border-l-4 border-brand-orange p-6 sm:p-8">
          <p className="text-gray-700 text-base leading-relaxed whitespace-pre-line">{prompt.content}</p>
        </div>
      </section>

      {/* ─── Steps — the path (core differentiator) ─── */}
      {hasSteps && (
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-brand-blue" />
              The Path
              <span className="text-sm font-normal text-gray-400">
                ({prompt.steps!.length} step{prompt.steps!.length > 1 ? 's' : ''})
              </span>
            </h2>
            <p className="text-sm text-gray-500 ml-7">
              Follow along with the prompts used and results at each step.
            </p>
          </div>

          <div className="relative">
            {/* Vertical pipe — animated on load */}
            <div className="absolute left-[23px] top-2 bottom-2 w-[3px] bg-gradient-to-b from-brand-orange via-brand-blue to-brand-orange opacity-50" style={{ animation: 'pipeDraw 1s ease-out forwards' }} />

            <div className="space-y-10">
              {prompt.steps!.map((step, idx) => (
                <div key={step.id} className="relative pl-16">
                  {/* Step node — large number as visual anchor */}
                  <div className="absolute left-0 top-3 w-[48px] h-[48px] bg-brand-orange flex items-center justify-center z-10 shadow-sm">
                    <span className="text-base font-black text-white">{idx + 1}</span>
                  </div>

                  <div className="border border-gray-200 overflow-hidden">
                    {/* Step header with inline step count */}
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Step {idx + 1} of {prompt.steps!.length}
                      </span>
                      {step.title && (
                        <span className="font-bold text-sm text-gray-900 ml-2">— {step.title}</span>
                      )}
                      {step.description && (
                        <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                      )}
                    </div>

                    {/* Prompt section — orange accent */}
                    <div className="p-5 border-l-4 border-brand-orange bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-orange">
                          <span className="w-2 h-2 bg-brand-orange" />
                          Prompt
                        </span>
                        <CopyButton text={step.content} />
                      </div>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-primary-50/40 p-4 border border-primary-100">
                        {step.content}
                      </pre>
                    </div>

                    {/* Result section — green accent */}
                    {step.result_content && (
                      <div className="p-5 border-l-4 border-l-green-500 bg-green-50/30 border-t border-t-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-700">
                            <span className="w-2 h-2 bg-green-500" />
                            Result
                          </span>
                          <CopyButton text={step.result_content} />
                        </div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-green-50 p-4 border border-green-200">
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
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">The Prompt</h2>
            <CopyButton text={prompt.content} />
          </div>
          <div className="bg-primary-50/40 border-l-4 border-brand-orange p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {prompt.content}
            </pre>
          </div>
        </section>
      )}

      {/* ─── Final Result ─── */}
      {prompt.result_content && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">The Result</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{prompt.result_content}</p>
          </div>
        </section>
      )}

      {/* ─── Tags ─── */}
      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-6 border-t border-gray-200">
          <Tag className="w-4 h-4 text-gray-400" />
          {prompt.tags.map(tag => (
            <Link
              key={tag}
              href={`/browse?q=${encodeURIComponent(tag)}`}
              className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 border border-gray-200 hover:border-brand-orange/50 hover:text-brand-orange transition-colors duration-200"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* ─── More in this category ─── */}
      {relatedProjects.length > 0 && prompt.category && (
        <section className="mt-16 pt-10 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              More in {prompt.category.icon} {prompt.category.name}
            </h2>
            <Link
              href={`/browse?category=${prompt.category.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-orange-dark transition-colors duration-200 group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedProjects.map(p => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
