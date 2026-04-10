import Link from 'next/link'
import { ArrowUp, Bookmark, Link2, Cpu } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { getModelName } from '@/lib/models'

const difficultyColors = {
  beginner: 'bg-green-50 text-green-700 border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
}

export default function PromptCard({ prompt }: { prompt: PromptWithRelations }) {
  const hasSteps = prompt.steps && prompt.steps.length > 0
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation

  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {prompt.category && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {prompt.category.icon} {prompt.category.name}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[prompt.difficulty]}`}>
            {prompt.difficulty}
          </span>
          {hasSteps && (
            <span className="text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {prompt.steps!.length} steps
            </span>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1.5">
        {prompt.title}
      </h3>

      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
        {prompt.description}
      </p>

      {/* Tools & Model */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {modelDisplay && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {modelDisplay}
          </span>
        )}
        {prompt.tools_used && prompt.tools_used.length > 0 && (
          <span className="text-xs text-gray-400">
            {prompt.tools_used.join(' + ')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {prompt.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {prompt.tags.length > 3 && (
          <span className="text-xs text-gray-400">+{prompt.tags.length - 3}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-gray-100">
        <span className="text-xs">
          {prompt.author?.display_name ?? 'Anonymous'}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3.5 h-3.5" />
            {prompt.vote_count}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5" />
            {prompt.bookmark_count}
          </span>
        </div>
      </div>
    </Link>
  )
}
