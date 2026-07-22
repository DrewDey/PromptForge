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
import { Cpu } from 'lucide-react'
import { BuilderByline } from '@/components/BuilderByline'
import { PublicTruthSummary } from '@/components/PublicTruthSummary'
import { PromptWithRelations } from '@/lib/types'
import { getPromptModelLabel } from '@/lib/prompt-comparisons'
import { getPreparedProjectModelIdentity } from '@/lib/prepared-project-model-identities'
import { getProjectHref } from '@/lib/project-links'
import { deriveCanonicalPromptPublicTruth } from '@/lib/prompt-public-truth'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  advanced: { label: 'Advanced', color: 'text-red-600 bg-red-50 border-red-200' },
}

function resolveOutcome(prompt: PromptWithRelations): { text: string; source: 'top' | 'step'; stepIndex: number; stepTotal: number } | null {
  const top = prompt.result_content?.trim()
  if (top) {
    return {
      text: top,
      source: 'top',
      stepIndex: 0,
      stepTotal: prompt.prompt_step_count ?? prompt.steps?.length ?? 0,
    }
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

function promptModelIdentity(prompt: PromptWithRelations) {
  return getPreparedProjectModelIdentity(prompt.id)?.publicLabel
    ?? getPromptModelLabel(prompt)
}

export default function PromptCard({ prompt, featured = false }: { prompt: PromptWithRelations; featured?: boolean }) {
  const modelDisplay = promptModelIdentity(prompt)
  const difficulty = difficultyConfig[prompt.difficulty]
  const outcome = resolveOutcome(prompt)
  const publicTruth = deriveCanonicalPromptPublicTruth(prompt)

  return (
    <article
      className={`group block border transition-all duration-150 relative overflow-hidden ${
        featured
          ? 'bg-[color-mix(in_srgb,var(--color-brand-orange)_3%,white)] border-l-[3px] border-l-brand-orange border-surface-200 hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-white border-surface-200 hover:border-surface-300 hover:shadow-md hover:-translate-y-px'
      }`}
    >
      {/* Top accent line on hover (regular cards only — featured uses left border) */}
      {!featured && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-orange scale-x-0 group-hover:scale-x-100 transition-transform duration-150 origin-left" />
      )}

      <Link
        href={getProjectHref(prompt)}
        className={`block focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-[-2px] ${featured ? 'p-6 pb-3' : 'p-5 pb-3'}`}
      >
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

        {/* Compact footer groups wrap independently so provenance and truth stay
            visible inside narrow related-project grid cards. */}
      </Link>

      <div className={featured ? 'px-6 pb-6' : 'px-5 pb-5'}>
        <div className="border-t border-surface-100 pt-3">
          <div className="grid min-w-0 gap-2" data-related-project-footer>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`text-[11px] font-medium px-2 py-0.5 border shrink-0 ${difficulty.color}`}>
                {difficulty.label}
              </span>
              {modelDisplay && modelDisplay !== 'Unknown model' && (
                <span className="text-[11px] text-surface-400 flex items-center gap-1 min-w-0">
                  <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span className="truncate" data-public-model-identity>{modelDisplay}</span>
                </span>
              )}
            </div>
            <div
              className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-surface-500"
              data-related-project-byline-row
            >
              <BuilderByline
                name={prompt.author?.display_name || prompt.author?.username || 'Anonymous'}
                username={prompt.author?.username}
                provenanceKind={prompt.author?.provenance?.kind}
                href={prompt.author?.username ? `/user/${prompt.author.username}` : undefined}
                className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 text-surface-500 hover:text-brand-orange"
                provenanceClassName="font-medium text-surface-600"
              />
              <span aria-hidden="true" className="hidden sm:inline text-surface-300">·</span>
              <span
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
                data-related-project-engagement
              >
                <span className="tabular-nums" aria-label={`${prompt.vote_count} upvotes`}>
                  {prompt.vote_count} upvotes
                </span>
                <span aria-hidden="true" className="text-surface-300">·</span>
                <span className="tabular-nums text-surface-400" aria-label={`${prompt.bookmark_count} bookmarks`}>
                  {prompt.bookmark_count} saves
                </span>
              </span>
            </div>
          </div>
          <div data-related-project-public-truth>
            <PublicTruthSummary truth={publicTruth} className="mt-2 text-[9px] leading-4" />
          </div>
        </div>
      </div>
    </article>
  )
}
