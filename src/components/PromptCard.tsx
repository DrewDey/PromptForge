import Link from 'next/link'
import { ArrowUp, Bookmark, Link2, Cpu } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { getModelName } from '@/lib/models'

const difficultyColors = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/30',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export default function PromptCard({ prompt }: { prompt: PromptWithRelations }) {
  const hasSteps = prompt.steps && prompt.steps.length > 0
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation

  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group block bg-surface-800 border border-surface-600 p-5 hover:border-brand-orange/50 transition-all hover:bg-surface-700"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {prompt.category && (
            <span className="text-xs font-medium bg-surface-700 text-gray-400 px-2 py-0.5 border border-surface-600">
              {prompt.category.icon} {prompt.category.name}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 border ${difficultyColors[prompt.difficulty]}`}>
            {prompt.difficulty}
          </span>
          {hasSteps && (
            <span className="text-xs font-medium bg-brand-orange/10 text-brand-orange px-2 py-0.5 border border-brand-orange/30 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {prompt.steps!.length} steps
            </span>
          )}
        </div>
      </div>

      <h3 className="font-bold text-white group-hover:text-brand-orange transition-colors mb-1.5 leading-snug">
        {prompt.title}
      </h3>

      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
        {prompt.description}
      </p>

      <div className="flex items-center gap-3 flex-wrap mb-4">
        {modelDisplay && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {modelDisplay}
          </span>
        )}
        {prompt.tools_used && prompt.tools_used.length > 0 && (
          <span className="text-xs text-gray-600">
            {prompt.tools_used.join(' + ')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {prompt.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs text-gray-600 bg-surface-700 px-2 py-0.5 border border-surface-600">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-surface-600">
        <span className="text-xs">{prompt.author?.display_name ?? 'Anonymous'}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs">
            <ArrowUp className="w-3.5 h-3.5" />
            {prompt.vote_count}
          </span>
          <span className="flex items-center gap-1 text-xs">
            <Bookmark className="w-3.5 h-3.5" />
            {prompt.bookmark_count}
          </span>
        </div>
      </div>
    </Link>
  )
}
