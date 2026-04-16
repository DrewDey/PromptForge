// Iteration 26 (2026-04-16):
// - Featured badge upgraded from outlined "★ Featured" eyebrow to a solid brand-orange pill
//   (bg-brand-orange text-white) so the featured-vs-regular distinction is legible at grid
//   scale — the old outlined badge was near-invisible in before-screenshots.
// - Added a very subtle brand-orange wash to featured card background (bg-brand-orange/[0.025])
//   to reinforce the left-border accent without overpowering the white surface.
// - Footer declutter: dropped the decorative user-icon box; author name now uses a compact
//   "by …" prefix so the four footer elements (difficulty · model · author · votes · bookmarks)
//   read as one single typographically-consistent line instead of a chip stew.

import Link from 'next/link'
import { ArrowUp, Bookmark, ChevronRight, Cpu, Layers } from 'lucide-react'
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
      className={`group block border transition-all duration-150 relative overflow-hidden focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 active:scale-[0.98] ${
        featured
          ? 'bg-[color-mix(in_srgb,var(--color-brand-orange)_3%,white)] border-l-[3px] border-l-brand-orange border-surface-200 hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-white border-surface-200 hover:border-surface-300 hover:shadow-md hover:-translate-y-px'
      }`}
    >
      {/* Top accent line on hover (regular cards only — featured uses left border) */}
      {!featured && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-orange scale-x-0 group-hover:scale-x-100 transition-transform duration-150 origin-left" />
      )}

      <div className={featured ? 'p-6' : 'p-5'}>
        {/*
          Featured pill — solid brand-orange on white for maximum legibility at grid scale.
          Prior iteration used an outlined "★ Featured" eyebrow which pixel-review showed
          disappearing against surrounding metadata.
        */}
        {featured && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] bg-brand-orange text-white px-2 py-0.5 mb-3">
            Featured
          </span>
        )}

        {/* Title — primary focal point */}
        <h3 className={`font-semibold text-surface-900 group-hover:text-brand-orange transition-colors duration-150 leading-snug ${
          featured ? 'text-xl mb-2' : 'text-base mb-1.5'
        }`}>
          {prompt.title}
        </h3>

        {/* Description */}
        <p className={`text-surface-500 line-clamp-2 leading-relaxed ${
          featured ? 'text-sm mb-4' : 'text-[13px] mb-3'
        }`}>
          {prompt.description}
        </p>

        {/* Category + Step count — secondary metadata row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {prompt.category && (
            <span className="text-[11px] font-medium text-surface-500">
              <span aria-hidden="true">{prompt.category.icon}</span> {prompt.category.name}
            </span>
          )}
          {hasSteps && (
            <span className="text-[11px] font-medium text-surface-400 flex items-center gap-1 ml-auto">
              <Layers className="w-3 h-3" aria-hidden="true" />
              {stepCount} {stepCount === 1 ? 'step' : 'steps'}
            </span>
          )}
        </div>

        {/* Step flow visualization */}
        {hasSteps && (
          <div className="flex items-center gap-1.5 mb-4 overflow-hidden">
            {prompt.steps!.slice(0, featured ? 6 : 4).map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <div className={`flex items-center justify-center text-[10px] font-semibold border shrink-0 transition-colors duration-150 ${
                  featured
                    ? 'w-6 h-6 bg-brand-orange/10 text-brand-orange border-brand-orange/30 group-hover:bg-brand-orange/15'
                    : 'w-5 h-5 bg-surface-100 text-surface-500 border-surface-200 group-hover:bg-brand-orange/10 group-hover:text-brand-orange group-hover:border-brand-orange/20'
                }`}>
                  {i + 1}
                </div>
                {i < Math.min(stepCount - 1, featured ? 5 : 3) && (
                  <ChevronRight className="w-3 h-3 text-surface-300 shrink-0" aria-hidden="true" />
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

        {/*
          Footer — single typographic line.
          Left: difficulty chip (coloured semantic) · model.
          Right: author ('by …') · upvotes · bookmarks.
          Dropped the decorative surface-100 user-icon box — the author name is enough, and
          the icon was adding unnecessary chrome to every grid card.
        */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[11px] font-medium px-2 py-0.5 border shrink-0 ${difficulty.color}`}>
              {difficulty.label}
            </span>
            {modelDisplay && (
              <span className="text-[11px] text-surface-400 flex items-center gap-1 min-w-0">
                <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{modelDisplay}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-surface-500 shrink-0">
            <span className="hidden sm:inline text-surface-500 truncate max-w-[8rem]">
              by <span className="text-surface-700 font-medium">{prompt.author?.display_name ?? 'Anonymous'}</span>
            </span>
            <span className="flex items-center gap-1 tabular-nums" aria-label={`${prompt.vote_count} upvotes`}>
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              {prompt.vote_count}
            </span>
            <span className="flex items-center gap-1 tabular-nums text-surface-400" aria-label={`${prompt.bookmark_count} bookmarks`}>
              <Bookmark className="w-3 h-3" aria-hidden="true" />
              {prompt.bookmark_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
