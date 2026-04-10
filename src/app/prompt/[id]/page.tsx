import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUp, Bookmark, Tag, Cpu, Wrench, ChevronDown } from 'lucide-react'
import { getPromptById } from '@/lib/data'
import { getModelName } from '@/lib/models'
import CopyButton from './CopyButton'

const difficultyColors = {
  beginner: 'bg-green-50 text-green-700 border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to browse
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {prompt.category && (
            <Link
              href={`/browse?category=${prompt.category.slug}`}
              className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              {prompt.category.icon} {prompt.category.name}
            </Link>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${difficultyColors[prompt.difficulty]}`}>
            {prompt.difficulty}
          </span>
          {hasSteps && (
            <span className="text-xs font-medium bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full border border-primary-200">
              {prompt.steps!.length}-step process
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">{prompt.title}</h1>
        <p className="text-gray-600 text-lg leading-relaxed">{prompt.description}</p>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 mb-8 pb-6 border-b border-gray-200">
        <span>By {prompt.author?.username ? (
          <Link href={`/user/${prompt.author.username}`} className="font-semibold text-gray-700 hover:text-primary-600 transition-colors">
            {prompt.author.display_name ?? 'Anonymous'}
          </Link>
        ) : (
          <strong className="text-gray-700">Anonymous</strong>
        )}</span>
        <span className="flex items-center gap-1">
          <ArrowUp className="w-4 h-4" /> {prompt.vote_count}
        </span>
        <span className="flex items-center gap-1">
          <Bookmark className="w-4 h-4" /> {prompt.bookmark_count}
        </span>
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

      {/* The Story — what they built and why */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">The Story</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{prompt.content}</p>
        </div>
      </section>

      {/* Steps — the process */}
      {hasSteps && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-2">
            The Process ({prompt.steps!.length} step{prompt.steps!.length > 1 ? 's' : ''})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Follow the prompts and results at each step to see how the project was built.
          </p>

          <div className="space-y-4">
            {prompt.steps!.map((step, idx) => (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {idx < prompt.steps!.length - 1 && (
                  <div className="absolute left-6 top-full w-0.5 h-4 bg-gray-200 z-10" />
                )}

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Step header */}
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-sm text-gray-900">{step.title}</span>
                        {step.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prompt section */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Prompt</span>
                      <CopyButton text={step.content} />
                    </div>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                      {step.content}
                    </pre>
                  </div>

                  {/* Result section (optional) */}
                  {step.result_content && (
                    <div className="px-5 pb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Result</span>
                        <CopyButton text={step.result_content} />
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-green-50 rounded-lg p-4 border border-green-100">
                        {step.result_content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Single prompt (no steps) */}
      {!hasSteps && prompt.content && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">The Prompt</h2>
            <CopyButton text={prompt.content} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {prompt.content}
            </pre>
          </div>
        </section>
      )}

      {/* Final Result */}
      {prompt.result_content && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">The Result</h2>
          <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl border border-primary-200 p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{prompt.result_content}</p>
          </div>
        </section>
      )}

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-6 border-t border-gray-200">
          <Tag className="w-4 h-4 text-gray-400" />
          {prompt.tags.map(tag => (
            <Link
              key={tag}
              href={`/browse?q=${encodeURIComponent(tag)}`}
              className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
