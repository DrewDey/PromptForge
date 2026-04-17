import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Fragment } from 'react'
import { ChevronRight, Tag, Cpu, Wrench, MessageSquare, ArrowRight, ArrowDown, GitFork } from 'lucide-react'
import { getPromptById, getUserVotesAndBookmarks, getPrompts } from '@/lib/data'
import { getModelName } from '@/lib/models'
import VoteBookmarkButtons from '@/components/VoteBookmarkButtons'
import PromptCard from '@/components/PromptCard'
import CodeBlock from '@/components/CodeBlock'
import Prose from '@/components/Prose'
import { detectContentKind } from '@/lib/content-kind'

/**
 * Pick the right renderer for a step's payload. PathForge step content is
 * mostly natural-language (the author's ask, the model's narrative reply),
 * so we default to the light editorial <Prose> card. CodeBlock's dark
 * mono panel is reserved for literal code/markup — snippets, JSON, HTML —
 * where monospace + line-wrap chrome actually helps readability.
 */
function StepContent({
  text,
  label,
  variant,
  meta,
}: {
  text: string
  label: string
  variant: 'prompt' | 'result'
  meta?: string
}) {
  const kind = detectContentKind(text)
  if (kind === 'code') {
    return <CodeBlock code={text} label={label} variant={variant} meta={meta} />
  }
  return <Prose text={text} label={label} variant={variant} meta={meta} />
}

const difficultyConfig = {
  beginner: { dot: 'bg-green-500' },
  intermediate: { dot: 'bg-amber-500' },
  advanced: { dot: 'bg-red-500' },
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
  const difficulty = difficultyConfig[prompt.difficulty] || difficultyConfig.beginner

  // Hero "Final output" exhibit (iter 51 — Polish #1).
  // Prefer the project-level final result_content; if absent, fall back to
  // the last step that actually produced a result. The hero is the dominant
  // first moment of the page — "look what was built" — so we only render it
  // when there is substantive output to show. When the hero sources from
  // prompt.result_content we drop the legacy bottom "The Result" section to
  // avoid duplicating the same payload twice on one page.
  const lastStepWithResult = hasSteps
    ? [...prompt.steps!].reverse().find(s => s.result_content?.trim())
    : undefined
  const heroContent = prompt.result_content?.trim() || lastStepWithResult?.result_content?.trim() || null
  const heroSource: 'project' | 'step' | null = heroContent
    ? prompt.result_content?.trim()
      ? 'project'
      : 'step'
    : null
  const heroStepIndex = heroSource === 'step' && lastStepWithResult
    ? prompt.steps!.findIndex(s => s.id === lastStepWithResult.id)
    : -1

  // Fetch related projects in the same category (for "More in this category" section)
  let relatedProjects: Awaited<ReturnType<typeof getPrompts>> = []
  if (prompt.category) {
    const allInCategory = await getPrompts({ categorySlug: prompt.category.slug, sort: 'popular', limit: 4 })
    relatedProjects = allInCategory.filter(p => p.id !== prompt.id).slice(0, 3)
  }

  let hasVoted = false
  let hasBookmarked = false
  let isLoggedIn = false
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = !!user
      if (user) {
        const { votes, bookmarks } = await getUserVotesAndBookmarks([prompt.id])
        hasVoted = votes.has(prompt.id)
        hasBookmarked = bookmarks.has(prompt.id)
      }
    }
  } catch {
    // continue with defaults
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link href="/browse" className="text-surface-400 hover:text-brand-orange transition-colors duration-200 font-medium">
              Browse
            </Link>
          </li>
          {prompt.category && (
            <>
              <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5 text-surface-300" /></li>
              <li>
                <Link
                  href={`/browse?category=${prompt.category.slug}`}
                  className="text-surface-400 hover:text-brand-orange transition-colors duration-200 font-medium"
                >
                  {prompt.category.icon} {prompt.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true"><ChevronRight className="w-3.5 h-3.5 text-surface-300" /></li>
          <li className="text-surface-700 font-semibold truncate max-w-[300px]" aria-current="page">
            {prompt.title}
          </li>
        </ol>
      </nav>

      {/* ─── Header ─── */}
      <header className="mb-10">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-surface-900 mb-3 leading-tight">{prompt.title}</h1>
        <p className="text-surface-500 text-lg leading-relaxed mb-5">{prompt.description}</p>

        {/* Byline row — single line, dot-separated, reads like a newsroom byline */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-orange to-brand-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(prompt.author?.display_name || 'A')[0].toUpperCase()}
            </div>
            <p className="text-sm text-surface-500 truncate">
              <span className="text-surface-400">by </span>
              {prompt.author?.username ? (
                <Link href={`/user/${prompt.author.username}`} className="font-semibold text-surface-900 hover:text-brand-orange transition-colors duration-200">
                  {prompt.author.display_name ?? 'Anonymous'}
                </Link>
              ) : (
                <span className="font-semibold text-surface-900">Anonymous</span>
              )}
              <span className="text-surface-300 mx-2" aria-hidden="true">·</span>
              <span className="text-surface-500">
                {prompt.created_at ? new Date(prompt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Shared on PathForge'}
              </span>
            </p>
          </div>
          <VoteBookmarkButtons
            promptId={prompt.id}
            initialVoteCount={prompt.vote_count}
            initialBookmarkCount={prompt.bookmark_count}
            initialVoted={hasVoted}
            initialBookmarked={hasBookmarked}
            isLoggedIn={isLoggedIn}
            size="large"
          />
        </div>

        {/* Metadata — unified pill spec. One orange-tinted Category (primary
            classifier + link), then neutral pills with small icons/dots for
            difficulty, model, tools. Removed the N-step chip (it duplicated
            the "N steps" label on the Build Path section header below). */}
        <div className="flex items-center gap-x-2 gap-y-2.5 flex-wrap pt-6 border-t border-surface-200 text-xs">
          {prompt.category && (
            <Link
              href={`/browse?category=${prompt.category.slug}`}
              className="inline-flex items-center gap-1.5 font-semibold bg-brand-orange/10 text-brand-orange-dark px-2.5 py-1.5 border border-brand-orange/30 hover:bg-brand-orange/15 transition-colors duration-200"
            >
              <span>{prompt.category.icon}</span>
              {prompt.category.name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5 font-medium bg-surface-50 text-surface-700 px-2.5 py-1.5 border border-surface-200">
            <span className={`w-1.5 h-1.5 ${difficulty.dot}`} aria-hidden="true" />
            <span className="capitalize">{prompt.difficulty}</span>
          </span>
          {modelDisplay && (
            <span className="inline-flex items-center gap-1.5 font-medium bg-surface-50 text-surface-700 px-2.5 py-1.5 border border-surface-200">
              <Cpu className="w-3 h-3 text-surface-400" aria-hidden="true" />
              {modelDisplay}
            </span>
          )}
          {prompt.tools_used && prompt.tools_used.length > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium bg-surface-50 text-surface-700 px-2.5 py-1.5 border border-surface-200">
              <Wrench className="w-3 h-3 text-surface-400" aria-hidden="true" />
              {prompt.tools_used.join(', ')}
            </span>
          )}
        </div>

        {/* Use-as-starting-point CTA (Polish #2 — placeholder).
            The real fork-with-prefill flow is Structural #5; until then this styles
            the affordance so the "I can build this tonight" moment has an obvious
            next action. Destination is /prompt/new (blank draft); copy is explicit
            about prefill being pending so it doesn't mislead. */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-900 text-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Inspired? Build your own version.</p>
            <p className="text-xs text-surface-400 mt-0.5">Start a new draft from this blueprint — auto-prefill coming soon.</p>
          </div>
          <Link
            href="/prompt/new"
            className="inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold px-4 py-2 transition-colors duration-200 shrink-0 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
          >
            <GitFork className="w-4 h-4" aria-hidden="true" />
            Use as starting point
          </Link>
        </div>
      </header>

      {/* ─── Final output hero (iter 51 — Polish #1) ─────────────────────────
          The case-study hero. Sits directly under the fork CTA and above The
          Story, giving the page an unmistakable "look what was built" first
          moment. Explicitly NOT styled like CodeBlock — this is an editorial
          exhibit, not a code viewer. The frame is a hairline gradient border
          (orange → neutral → blue) around a generous white interior; typeset
          at reading-prose scale, not monospace. When the project-level
          result exists this becomes the canonical display and the legacy
          bottom "The Result" section is dropped. If there is no project-
          level result, we fall back to the last step's result and tag the
          eyebrow with a step-of-N meta so the reader knows where this
          payload came from in the chain. */}
      {heroContent && (
        <section aria-labelledby="final-output-eyebrow" className="mb-12">
          <div className="relative bg-gradient-to-br from-brand-orange/55 via-surface-200 to-brand-blue/55 p-[1.5px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="bg-white px-6 py-8 sm:px-10 sm:py-12 min-h-[220px] flex flex-col">
              <div id="final-output-eyebrow" className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mb-5">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 bg-brand-blue" aria-hidden="true" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-surface-600 font-semibold">
                    Final output
                  </span>
                </span>
                {heroSource === 'step' && heroStepIndex >= 0 && (
                  <>
                    <span className="text-surface-300 text-xs" aria-hidden="true">·</span>
                    <a
                      href={`#step-${heroStepIndex + 1}`}
                      className="text-[11px] font-mono text-surface-500 hover:text-brand-blue transition-colors duration-200"
                    >
                      from step {heroStepIndex + 1} of {prompt.steps!.length}
                    </a>
                  </>
                )}
                {heroSource === 'project' && (
                  <>
                    <span className="text-surface-300 text-xs" aria-hidden="true">·</span>
                    <span className="text-[11px] font-mono text-surface-400">what they shipped</span>
                  </>
                )}
              </div>
              <p className="text-lg sm:text-xl text-surface-900 leading-[1.55] whitespace-pre-line max-w-prose font-normal">
                {heroContent}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── The Story — backstory under the hero ─── */}
      <section className="mb-12">
        <h2 className="text-xl font-black text-surface-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-orange" />
          The Story
        </h2>
        <div className="bg-primary-50/60 border-l-4 border-brand-orange p-6 sm:p-8">
          <p className="text-surface-700 text-base leading-relaxed whitespace-pre-line max-w-prose">{prompt.content}</p>
        </div>
      </section>

      {/* ─── Steps — the path (core differentiator) ─── */}
      {hasSteps && (
        <section className="mb-12">
          <div className="mb-8">
            <h2 className="text-xl font-black text-surface-900 mb-1 flex items-center gap-2">
              The Build Path
              <span className="text-sm font-medium text-surface-400">
                {prompt.steps!.length} step{prompt.steps!.length > 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-sm text-surface-500">
              See what came out of each step. Expand to reveal the prompt behind it.
            </p>
          </div>

          {/* Build-path progression strip (iter 50 — Polish #4).
              A bird's-eye of the whole journey before the reader commits to
              any single step. Each chip is an in-page anchor to its step
              card below (see scroll-mt-24 + id="step-N"). Uses the site's
              orange→blue gradient vocabulary: the leftmost chip carries the
              orange accent (origin), the rightmost carries blue (payoff),
              middle chips interpolate. Arrows between chips communicate
              chain-order; on narrow widths the flex wraps and an extra
              row-gap keeps wrapped rows readable. Hidden when there's only
              one step — no journey to summarise. */}
          {prompt.steps!.length > 1 && (
            <nav
              aria-label="Build path"
              className="mb-10 -mx-1 px-1 pt-4 pb-5 border-t border-b border-surface-200 bg-gradient-to-r from-brand-orange/[0.04] via-transparent to-brand-blue/[0.04]"
            >
              <p className="text-[11px] font-mono uppercase tracking-wider text-surface-400 mb-3 px-1">
                Journey at a glance
              </p>
              <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {prompt.steps!.map((step, idx) => {
                  const isFirst = idx === 0
                  const isLast = idx === prompt.steps!.length - 1
                  // Orange for origin, blue for payoff, neutral in between.
                  const accent = isFirst
                    ? 'border-brand-orange/50 bg-brand-orange/5 text-brand-orange-dark hover:bg-brand-orange/10 hover:border-brand-orange'
                    : isLast
                    ? 'border-brand-blue/50 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 hover:border-brand-blue'
                    : 'border-surface-200 bg-white text-surface-700 hover:border-surface-400 hover:bg-surface-50'
                  const label = step.title?.trim() || `Step ${idx + 1}`
                  return (
                    <Fragment key={`strip-${step.id}`}>
                      <li>
                        <a
                          href={`#step-${idx + 1}`}
                          className={`group inline-flex items-center gap-2 border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange max-w-[220px] ${accent}`}
                        >
                          <span className="font-mono text-[11px] opacity-70 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                          <span className="truncate">{label}</span>
                        </a>
                      </li>
                      {!isLast && (
                        <li aria-hidden="true" className="text-surface-300">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </li>
                      )}
                    </Fragment>
                  )
                })}
              </ol>
            </nav>
          )}

          <div className="relative">
            {/* Vertical pipe — gradient from orange to blue */}
            <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-brand-orange via-brand-blue to-brand-orange opacity-40" style={{ animation: 'pipeDraw 1s ease-out forwards' }} />

            <div className="space-y-5">
              {prompt.steps!.map((step, idx) => {
                const prevHadResult = idx > 0 && !!prompt.steps![idx - 1].result_content
                return (
                <Fragment key={step.id}>
                  {/* Inter-step "feeds into" cue — only when the previous step produced a result.
                      Sells the over-the-shoulder narrative: the blue result that just came out
                      of step N is what the author pasted in as step N+1's prompt. The chip
                      sits on the spine between cards so the flow reads top-to-bottom. */}
                  {prevHadResult && (
                    <div className="relative pl-16">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-surface-500 bg-white border border-surface-200 px-2 py-1 leading-none">
                        <ArrowDown className="w-3 h-3 text-brand-blue" aria-hidden="true" />
                        step {idx} result
                        <ArrowRight className="w-3 h-3 text-surface-400" aria-hidden="true" />
                        step {idx + 1} prompt
                      </div>
                    </div>
                  )}
                <div id={`step-${idx + 1}`} className="relative pl-16 scroll-mt-24">
                  {/* Step node — orange number anchor */}
                  <div className="absolute left-0 top-0 w-[48px] h-[48px] bg-brand-orange flex items-center justify-center z-10 shadow-sm">
                    <span className="text-base font-black text-white">{idx + 1}</span>
                  </div>

                  <div className="border border-surface-200 overflow-hidden bg-white">
                    {/* Step header — high contrast, gives the card its identity */}
                    <div className="bg-surface-900 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-surface-400">
                          Step {idx + 1}/{prompt.steps!.length}
                        </span>
                        {step.title && (
                          <span className="font-bold text-sm text-white">{step.title}</span>
                        )}
                      </div>
                      {step.description && (
                        <p className="text-xs text-surface-400 mt-1">{step.description}</p>
                      )}
                    </div>

                    {/* Result-first step body (iter 49 — Polish #1).
                        The RESULT is now the dominant content of each step
                        card — what came out of this step leads, because the
                        visitor is here to see what was built, not to read
                        prompts. The prompt collapses behind a native
                        <details> disclosure so it's one click away without
                        stealing the visual field. Fallback: if the step has
                        no result yet, the prompt surfaces as the primary
                        content (nothing else to lead with). */}
                    <div className="p-5 space-y-4">
                      {step.result_content ? (
                        <>
                          <StepContent
                            text={step.result_content}
                            label="result"
                            variant="result"
                            meta={`step ${idx + 1}`}
                          />
                          <details className="group border border-surface-200 bg-surface-50/60">
                            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-3.5 py-2 text-xs font-medium text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors duration-200 select-none">
                              <span className="flex items-center gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-brand-orange" aria-hidden="true" />
                                Show the prompt behind this step
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-surface-400 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
                            </summary>
                            <div className="p-3 pt-0">
                              <StepContent
                                text={step.content}
                                label="prompt"
                                variant="prompt"
                                meta={`step ${idx + 1}`}
                              />
                            </div>
                          </details>
                        </>
                      ) : (
                        <StepContent
                          text={step.content}
                          label="prompt"
                          variant="prompt"
                          meta={`step ${idx + 1}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
                </Fragment>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Single prompt (no steps) */}
      {!hasSteps && prompt.content && (
        <section className="mb-12">
          <h2 className="text-xl font-black text-surface-900 mb-4">The Prompt</h2>
          <StepContent text={prompt.content} label="prompt" variant="prompt" />
        </section>
      )}

      {/* Legacy bottom "The Result" section removed in iter 51. The hero block
          at the top of the page now serves as the canonical Final output
          display for prompt.result_content — keeping a second rendering here
          was double-showing the same payload and diluting the hero's weight. */}

      {/* ─── Tags ─── */}
      {prompt.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-6 border-t border-surface-200">
          <Tag className="w-4 h-4 text-surface-400" />
          {prompt.tags.map(tag => (
            <Link
              key={tag}
              href={`/browse?q=${encodeURIComponent(tag)}`}
              className="text-xs bg-surface-100 text-surface-500 px-2.5 py-1.5 border border-surface-200 hover:border-brand-orange/50 hover:text-brand-orange transition-colors duration-200"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* ─── More in this category ─── */}
      {relatedProjects.length > 0 && prompt.category && (
        <section className="mt-16 pt-10 border-t border-surface-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-surface-900">
              More in {prompt.category.icon} {prompt.category.name}
            </h2>
            <Link
              href={`/browse?category=${prompt.category.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:text-brand-orange-dark transition-colors duration-200 group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedProjects.map(p => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
