import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUp, Bookmark, Copy, Tag, Cpu } from 'lucide-react'
import { getPromptById } from '@/lib/data'
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
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{prompt.title}</h1>
        <p className="text-gray-600">{prompt.description}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-6 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-200">
        <span>By <strong className="text-gray-700">{prompt.author?.display_name ?? 'Anonymous'}</strong></span>
        <span className="flex items-center gap-1">
          <ArrowUp className="w-4 h-4" /> {prompt.vote_count} upvotes
        </span>
        <span className="flex items-center gap-1">
          <Bookmark className="w-4 h-4" /> {prompt.bookmark_count} saves
        </span>
        {prompt.model_recommendation && (
          <span className="flex items-center gap-1">
            <Cpu className="w-4 h-4" /> {prompt.model_recommendation}
          </span>
        )}
      </div>

      {/* Prompt Content */}
      {hasSteps ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Prompt Chain ({prompt.steps!.length} steps)
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Follow each step in order. Use the output from each step as context for the next.
          </p>
          <div className="space-y-6">
            {prompt.steps!.map((step, idx) => (
              <div key={step.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-primary-600 mr-2">Step {idx + 1}</span>
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  <CopyButton text={step.content} />
                </div>
                {step.description && (
                  <p className="px-5 pt-3 text-sm text-gray-500">{step.description}</p>
                )}
                <pre className="px-5 py-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {step.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">The Prompt</h2>
            <CopyButton text={prompt.content} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {prompt.content}
            </pre>
          </div>
        </div>
      )}

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
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
