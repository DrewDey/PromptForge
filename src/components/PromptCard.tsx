// Iteration 26 (2026-04-16):
// - Featured badge upgraded from outlined "★ Featured" eyebrow to a solid brand-orange pill
//   (bg-brand-orange text-white) so the featured-vs-regular distinction is legible at grid
//   scale — the old outlined badge was near-invisible in before-screenshots.
// - Added a very subtle brand-orange wash to featured card background (bg-brand-orange/[0.025])
//   to reinforce the left-border accent without overpowering the white surface.
// - Footer declutter: dropped the decorative user-icon box; author name now uses a compact
//   "by …" prefix so the four footer elements (difficulty · model · author · votes · bookmarks)
//   read as one single typographically-consistent line instead of a chip stew.
//
// Iteration 27 (2026-04-16):
// - Added middle-dot (U+00B7) separators between author / upvotes / bookmarks in the footer
//   right cluster so the three items read as one typographic string, not three groups. The
//   iter 26 reviewer specifically flagged that the promise of "one single line" was not yet
//   visually delivered. Separators are `text-surface-300` (subtle but present) and hidden on
//   mobile where the author span is also hidden so we don't get a leading orphaned dot.
//
// Iteration 29 (2026-04-16):
// - Cards now surface the project OUTCOME — a 2-line line-clamp preview of `result_content`
//   rendered as a left-bordered pull-quote with an "OUTCOME" orange eyebrow. Before, cards
//   showed only the author's story (description) + metadata, so a scanner could see WHO
//   built it but never got a glimpse of WHAT got built. With the iter-28 seed-content
//   overhaul landing real outcomes in result_content ("$48,200 MRR", "closed $1.8M",
//   "Warm Wheat #D4A843", "8% → 14% conversion"), this preview is the single biggest unlock
//   for "cards need to sell the project" (BACKLOG #1). Only renders when `result_content`
//   is present — gracefully omitted for seeds that don't have it, so the card still composes.
// - Left-border + eyebrow mirrors the Featured card's left-border accent pattern, so cards
//   without a Featured status still get a structural "spine" that differentiates the hook
//   from the rest of the card.

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

        {/*
          OUTCOME preview (iter 29) — the hook. Gives scanners a glimpse of WHAT got built,
          not just WHO built it or WHAT model they used. Renders only when result_content
          is populated so legacy/partial seeds don't render an empty frame.
        */}
        {prompt.result_content && (
          <div className={`border-l-2 border-brand-orange/50 bg-brand-orange/[0.03] pl-3 pr-2 py-1.5 ${
            featured ? 'mb-4' : 'mb-3'
          }`}>
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-brand-orange mb-0.5">
              Outcome
            </span>
            <p className={`text-surface-700 leading-snug line-clamp-2 ${
              featured ? 'text-[13px]' : 'text-[12px]'
            }`}>
              {prompt.result_content}
            </p>
          </div>
        )}

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
