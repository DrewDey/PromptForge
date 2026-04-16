import Link from 'next/link'
import { ArrowUp, Bookmark, ChevronRight, Cpu, User } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { getModelName } from '@/lib/models'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  advanced: { label: 'Advanced', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
}

export default function PromptCard({ prompt }: { prompt: PromptWithRelations }) {
  const hasSteps = prompt.steps && prompt.steps.length > 0
  const stepCount = prompt.steps?.length ?? 0
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation
  const difficulty = difficultyConfig[prompt.difficulty]

  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group block bg-white border border-gray-200 hover:border-brand-orange hover:shadow-[4px_4px_0px_0px_rgba(232,122,44,0.15)] transition-all duration-200 relative overflow-hidden"
    >
      {/* Step flow mini-visualization at top */}
      {hasSteps && (
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-1.5 overflow-hidden">
          {prompt.steps!.slice(0, 5).map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 flex items-center justify-center bg-brand-orange/10 text-brand-orange text-[10px] font-bold border border-brand-orange/20 shrink-0 group-hover:bg-brand-orange/20 transition-colors duration-200">
                {i + 1}
              </div>
              {i < Math.min(stepCount - 1, 4) && (
                <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
              )}
            </div>
          ))}
          {stepCount > 5 && (
            <span className="text-[10px] text-gray-400 font-medium ml-1 shrink-0">+{stepCount - 5} more</span>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Category + Difficulty badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {prompt.category && (
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 border border-gray-200">
              {prompt.category.icon} {prompt.category.name}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 border flex items-center gap-1.5 ${difficulty.color}`}>
            <span className={`w-1.5 h-1.5 ${difficulty.dot}`} style={{ borderRadius: '50%' }} />
            {difficulty.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 group-hover:text-brand-orange transition-colors duration-200 mb-2 leading-snug text-base">
          {prompt.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {prompt.description}
        </p>

        {/* Model + Tools row */}
        {(modelDisplay || (prompt.tools_used && prompt.tools_used.length > 0)) && (
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {modelDisplay && (
              <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 border border-gray-100">
                <Cpu className="w-3 h-3 text-gray-400" />
                {modelDisplay}
              </span>
            )}
            {prompt.tools_used && prompt.tools_used.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 border border-gray-100">
                {prompt.tools_used.slice(0, 2).join(' + ')}
                {prompt.tools_used.length > 2 && ` +${prompt.tools_used.length - 2}`}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {prompt.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 border border-gray-100">
                #{tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-[11px] text-gray-400 px-1 py-0.5">+{prompt.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: author + stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 bg-gray-100 flex items-center justify-center border border-gray-200">
              <User className="w-3 h-3 text-gray-400" />
            </span>
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
      </div>
    </Link>
  )
}
