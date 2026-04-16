import Link from 'next/link'
import { ArrowUp, Bookmark, ChevronRight, Cpu, User, Layers, Star } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { getModelName } from '@/lib/models'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function PromptCard({ prompt, featured = false }: { prompt: PromptWithRelations; featured?: boolean }) {
  const hasSteps = prompt.steps && prompt.steps.length > 0
  const stepCount = prompt.steps?.length ?? 0
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation
  const difficulty = difficultyConfig[prompt.difficulty]

  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className={`group block border transition-all duration-200 relative overflow-hidden focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 active:scale-[0.98] ${
        featured
          ? 'bg-white border-l-[3px] border-l-brand-orange border-surface-200 hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-white border-surface-200 hover:border-surface-300 hover:shadow-md hover:-translate-y-px'
      }`}
    >
      {/* Top accent line on hover (regular cards only — featured uses left border) */}
      {!featured && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-orange scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
      )}

      <div className={featured ? 'p-6' : 'p-5'}>
        {/* Featured badge */}
        {featured && (
          <div className="flex items-center gap-1.5 mb-3">
            <Star className="w-3 h-3 text-brand-orange fill-brand-orange" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-orange">Featured</span>
          </div>
        )}

        {/* Top row: Category + Step count */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {prompt.category && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
              {prompt.category.icon} {prompt.category.name}
            </span>
          )}
          {hasSteps && (
            <span className="text-[11px] font-medium text-surface-400 flex items-center gap-1 ml-auto">
              <Layers className="w-3 h-3" />
              {stepCount} {stepCount === 1 ? 'step' : 'steps'}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`font-semibold text-surface-900 group-hover:text-brand-orange transition-colors duration-200 mb-1.5 leading-snug ${
          featured ? 'text-xl' : 'text-[15px]'
        }`}>
          {prompt.title}
        </h3>

        {/* Description */}
        <p className={`text-surface-500 line-clamp-2 leading-relaxed ${
          featured ? 'text-sm mb-5' : 'text-[13px] mb-4'
        }`}>
          {prompt.description}
        </p>

        {/* Step flow visualization */}
        {hasSteps && (
          <div className="flex items-center gap-1.5 mb-4 overflow-hidden">
            {prompt.steps!.slice(0, featured ? 6 : 4).map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <div className={`flex items-center justify-center text-[10px] font-semibold border shrink-0 transition-colors duration-200 ${
                  featured
                    ? 'w-6 h-6 bg-brand-orange/5 text-brand-orange border-brand-orange/20 group-hover:bg-brand-orange/10'
                    : 'w-5 h-5 bg-surface-100 text-surface-500 border-surface-200 group-hover:bg-brand-orange/10 group-hover:text-brand-orange group-hover:border-brand-orange/20'
                }`}>
                  {i + 1}
                </div>
                {i < Math.min(stepCount - 1, featured ? 5 : 3) && (
                  <ChevronRight className="w-3 h-3 text-surface-300 shrink-0" />
                )}
              </div>
            ))}
            {stepCount > (featured ? 6 : 4) && (
              <div className={`flex items-center justify-center bg-surface-100 text-surface-500 text-[10px] font-semibold border border-surface-200 shrink-0 ${
                featured ? 'w-6 h-6' : 'w-5 h-5'
              }`}>
                +{stepCount - (featured ? 6 : 4)}
              </div>
            )}
          </div>
        )}

        {/* Footer: difficulty + model + author + stats */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium px-2 py-0.5 border ${difficulty.color}`}>
              {difficulty.label}
            </span>
            {modelDisplay && (
              <span className="text-[11px] text-surface-400 flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {modelDisplay}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-surface-400">
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-4 h-4 bg-surface-100 flex items-center justify-center border border-surface-200">
                <User className="w-2.5 h-2.5 text-surface-400" />
              </span>
              <span className="text-surface-500">{prompt.author?.display_name ?? 'Anonymous'}</span>
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              {prompt.vote_count}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              {prompt.bookmark_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
