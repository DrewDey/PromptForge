// Iteration 53 (2026-04-17) — Result-first Browse card (Polish #1):
// The dominant visual block on every card is now a "what got built" panel at the top —
// hairline orange→neutral→blue gradient frame around a white inner surface, quiet eyebrow
// ("Outcome · what they shipped") and 3-line prose preview sourced from `result_content`
// (falls back to the last step's `result_content`). Title, description, and category
// metadata now live BELOW the hero as supporting scaffolding, not above it as the hook.
// The step-flow number/chevron chip strip and the "N steps" count chip were removed —
// iter 50's journey strip covers that vocabulary on the detail page, and the Browse card
// should sell the project, not the build's process-diagram.
//
// When no outcome payload exists (legacy/partial seeds), the card falls back to a
// title-led layout so it still composes — no empty gradient frame.

import Link from 'next/link'
import { ArrowUp, Bookmark, Cpu } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { getModelName } from '@/lib/models'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50 border-red-200' },
}

function resolveOutcome(prompt: PromptWithRelations): { text: string; source: 'top' | 'step'; stepIndex: number; stepTotal: number } | null {
  const top = prompt.result_content?.trim()
  if (top) {
    return { text: top, source: 'top', stepIndex: 0, stepTotal: prompt.steps?.length ?? 0 }
  }
  const steps = prompt.steps ?? []
  for (let i = steps.length - 1; i >= 0; i--) {
    const stepResult = steps[i].result_content?.trim()
    if (stepResult) {
      return { text: stepResult, source: 'step', stepIndex: i + 1, stepTotal: steps.length }
    }
  }
  return null
}

export default function PromptCard({ prompt, featured = false }: { prompt: PromptWithRelations; featured?: boolean }) {
  const modelDisplay = prompt.model_used ? getModelName(prompt.model_used) : prompt.model_recommendation
  const difficulty = difficultyConfig[prompt.difficulty]
  const outcome = resolveOutcome(prompt)

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
          Featured pill stays at the very top — it's a status badge, it belongs above
          the exhibit frame (like a gallery label), not layered onto the exhibit itself.
        */}
        {featured && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] bg-brand-orange text-white px-2 py-0.5 mb-3">
            Featured
          </span>
        )}

        {/*
          OUTCOME HERO — the dominant block. Hairline orange→neutral→blue gradient frame
          borrows from iter 51's detail-page hero vocabulary so the two surfaces speak the
          same visual language. Rendered only when an outcome payload exists; otherwise
          the card falls back to title-led scaffolding below.
        */}
        {outcome && (
          <div className={`bg-gradient-to-br from-brand-orange/55 via-surface-200 to-brand-blue/55 p-[1.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
            featured ? 'mb-5' : 'mb-4'
          }`}>
            <div className={`bg-white flex flex-col ${
              featured ? 'px-5 py-4 sm:px-6 sm:py-5 min-h-[140px]' : 'px-4 py-3.5 min-h-[120px]'
            }`}>
              <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mb-2">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0"
                />
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-surface-900">
                  Outcome
                </span>
                <span aria-hidden="true" className="text-surface-300 text-[10px]">·</span>
                <span className="text-[10px] text-surface-500 tracking-wide">
                  {outcome.source === 'top'
                    ? 'what they shipped'
                    : `from step ${outcome.stepIndex} of ${outcome.stepTotal}`}
                </span>
              </div>
              <p
                className={`text-surface-900 leading-[1.55] line-clamp-3 whitespace-pre-line ${
                  featured ? 'text-[15px] sm:text-[16px]' : 'text-[14px]'
                }`}
              >
                {outcome.text}
              </p>
            </div>
          </div>
        )}

        {/*
          Supporting scaffolding below the hero — category eyebrow, title, description.
          When no outcome exists the title steps back into dominant size so the card
          doesn't collapse into a meta-only block.
        */}
        {prompt.category && (
          <div className={`text-[11px] font-medium text-surface-500 ${outcome ? 'mb-1.5' : 'mb-2'}`}>
            <span aria-hidden="true">{prompt.category.icon}</span>{' '}
            <span className="group-hover:text-brand-orange transition-colors duration-150">
              {prompt.category.name}
            </span>
          </div>
        )}

        <h3
          className={`font-semibold text-surface-900 group-hover:text-brand-orange transition-colors duration-150 leading-snug line-clamp-2 ${
            outcome
              ? featured
                ? 'text-base mb-1.5'
                : 'text-[15px] mb-1'
              : featured
                ? 'text-xl mb-2'
                : 'text-base mb-1.5'
          }`}
        >
          {prompt.title}
        </h3>

        <p
          className={`text-surface-500 line-clamp-2 leading-relaxed ${
            outcome
              ? featured
                ? 'text-[13px] mb-4'
                : 'text-[12px] mb-3.5'
              : featured
                ? 'text-sm mb-5'
                : 'text-[13px] mb-4'
          }`}
        >
          {prompt.description}
        </p>

        {/*
          Footer — single typographic line. Difficulty · model on the left; author ·
          votes · bookmarks on the right. Step-flow chips and N-step count removed —
          the outcome hero carries the "there's a build behind this" signal now.
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
          <div className="flex items-center gap-2 text-[11px] text-surface-500 shrink-0">
            <span className="hidden sm:inline text-surface-500 truncate max-w-[8rem]">
              by <span className="text-surface-700 font-medium">{prompt.author?.display_name ?? 'Anonymous'}</span>
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-surface-300">·</span>
            <span className="flex items-center gap-1 tabular-nums" aria-label={`${prompt.vote_count} upvotes`}>
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              {prompt.vote_count}
            </span>
            <span aria-hidden="true" className="text-surface-300">·</span>
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
