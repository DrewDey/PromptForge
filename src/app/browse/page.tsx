// Iteration 26 (2026-04-16): Browse page — Linear/Raycast-style single-row filter toolbar.
// - Collapsed the prior 3-row filter stack (search / 11 category pills wall / level + sort) into one
//   horizontal toolbar (flex-col → flex-row at sm). Categories now live behind a native <details>
//   popover so the 11-wide "flag wall" is out of the default scan. No JS required — progressive
//   disclosure via HTML only.
// - Promoted the tiny orphaned "33 projects" result-count into a real section anchor
//   (text-2xl font-bold) with active-filter chips inline on the right baseline. Featured + All
//   Projects section headers get matched, louder weights.
// - Kept all existing semantics (server component, search form, Link-based filter navigation).
//
// Iteration 27 (2026-04-16): Reviewer-nit sweep on top of iter 26.
// - Active Category chip swapped from orange-tint/orange-text to dark surface-900 pill so
//   "committed filter" reads unambiguously (matches the "All categories" selected state inside
//   the popover grid).
// - Level / Sort segmented controls bumped px-2.5 py-1 → px-3 py-1.5 and text-[12px] → text-[13px]
//   to move closer to the iOS 44px tap target and get more typographic presence; inactive pills
//   now get a subtle hover:bg-white/60 for tactile feedback instead of colour-only change.
// - focus-visible outlines added to every filter interactive (summary + segmented links) so
//   keyboard users see a brand-orange ring matching the landing/auth spec.
// - Popover gets a thin CategoryPopover client wrapper (Escape + click-outside close) so the
//   a11y gap from iter 26's review is closed, plus a 150ms popoverIn fade/scale on opening that
//   matches the rest of the system's 150ms cadence. <details> remains the underlying element so
//   progressive-disclosure HTML still works if the JS fails to hydrate.

import Link from 'next/link'
import { Search, X, FolderOpen, SlidersHorizontal, Sparkles, Layers, ChevronDown } from 'lucide-react'
import { getCategories, getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'
import CategoryPopover from '@/components/CategoryPopover'

const difficulties = [
  { value: '', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string; sort?: string; q?: string }>
}) {
  const params = await searchParams
  const [categories, prompts] = await Promise.all([
    getCategories(),
    getPrompts({
      categorySlug: params.category,
      difficulty: params.difficulty,
      sort: (params.sort as 'newest' | 'popular') ?? 'newest',
      search: params.q,
    }),
  ])

  const activeCategory = params.category ?? ''
  const activeDifficulty = params.difficulty ?? ''
  const activeSort = params.sort ?? 'newest'
  const hasActiveFilters = activeCategory || activeDifficulty || params.q

  function buildUrl(overrides: Record<string, string>) {
    const p = { category: activeCategory, difficulty: activeDifficulty, sort: activeSort, q: params.q ?? '', ...overrides }
    const search = new URLSearchParams()
    if (p.category) search.set('category', p.category)
    if (p.difficulty) search.set('difficulty', p.difficulty)
    if (p.sort && p.sort !== 'newest') search.set('sort', p.sort)
    if (p.q) search.set('q', p.q)
    const qs = search.toString()
    return `/browse${qs ? `?${qs}` : ''}`
  }

  const activeCategoryObj = activeCategory ? categories.find(c => c.slug === activeCategory) : null
  const activeCategoryName = activeCategoryObj?.name ?? null
  const activeDifficultyLabel =
    difficulties.find(d => d.value === activeDifficulty)?.label ?? null

  // Split prompts for featured layout (first 2 get featured treatment if no filters active)
  // TODO: Replace with a real `is_featured` flag from the database. Currently positional (first 2 results).
  const showFeatured = !hasActiveFilters && prompts.length >= 3
  const featuredPrompts = showFeatured ? prompts.slice(0, 2) : []
  const gridPrompts = showFeatured ? prompts.slice(2) : prompts

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-semibold text-surface-900 mb-1">Browse Projects</h1>
          <p className="text-sm text-surface-500">Explore proven AI build paths — see how they were made, step by step.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/*
          Filter toolbar — single horizontal row on desktop, stacked on mobile.
          Shape: [ search ] [ Category popover ] [ Level segmented ] [ Sort segmented ]
          Total chrome ≈ 56px (was ~200px / 3 rows).
        */}
        <div className="bg-white border border-surface-200 p-3 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search — flex-1 so it grows */}
            <form className="flex-1 min-w-0 lg:max-w-sm">
              <input type="hidden" name="category" value={activeCategory} />
              <input type="hidden" name="difficulty" value={activeDifficulty} />
              <input type="hidden" name="sort" value={activeSort} />
              <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within/search:text-brand-orange transition-colors duration-150" />
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q ?? ''}
                  placeholder="Search projects..."
                  aria-label="Search projects"
                  className="w-full bg-surface-50 border border-surface-200 pl-9 pr-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/15 transition-all duration-150"
                />
              </div>
            </form>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:ml-auto">
              {/*
                Category popover — native <details>, no JS required.
                Closed state: button showing "Category" + active name (if any) + chevron.
                Open state: floating panel with the 11 category pills in a responsive grid.
              */}
              <CategoryPopover className="relative group/cat">
                <summary className={`list-none cursor-pointer select-none flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
                  activeCategory
                    ? 'bg-surface-900 text-white border-surface-900 hover:bg-surface-800'
                    : 'bg-surface-50 text-surface-700 border-surface-200 hover:border-surface-400 hover:bg-white'
                }`}>
                  <SlidersHorizontal className="w-3.5 h-3.5 opacity-70" aria-hidden="true" />
                  <span>Category{activeCategoryObj ? `: ${activeCategoryObj.name}` : ''}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70 group-open/cat:rotate-180 transition-transform duration-150" aria-hidden="true" />
                </summary>
                <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-surface-200 shadow-lg p-2 w-[min(92vw,560px)] animate-popover-in origin-top-left">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    <Link
                      href={buildUrl({ category: '' })}
                      className={`text-[13px] font-medium px-2.5 py-1.5 border transition-colors duration-150 ${
                        !activeCategory
                          ? 'bg-surface-900 text-white border-surface-900'
                          : 'bg-white text-surface-700 border-surface-200 hover:border-surface-400 hover:bg-surface-50'
                      }`}
                    >
                      All categories
                    </Link>
                    {categories.map(cat => (
                      <Link
                        key={cat.id}
                        href={buildUrl({ category: cat.slug })}
                        className={`text-[13px] font-medium px-2.5 py-1.5 border transition-colors duration-150 truncate ${
                          activeCategory === cat.slug
                            ? 'bg-surface-900 text-white border-surface-900'
                            : 'bg-white text-surface-700 border-surface-200 hover:border-surface-400 hover:bg-surface-50'
                        }`}
                      >
                        <span aria-hidden="true">{cat.icon}</span> {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </CategoryPopover>

              {/* Level — compact segmented control (inline pills). Replaces the full-row chip line. */}
              <div className="flex items-center border border-surface-200 bg-surface-50 p-0.5" role="radiogroup" aria-label="Difficulty level">
                {difficulties.map(d => (
                  <Link
                    key={d.value}
                    href={buildUrl({ difficulty: d.value })}
                    role="radio"
                    aria-checked={activeDifficulty === d.value}
                    className={`px-3 py-1.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
                      activeDifficulty === d.value
                        ? 'bg-white text-surface-900 shadow-sm border-b-2 border-b-brand-orange'
                        : 'text-surface-500 hover:text-surface-800 hover:bg-white/60 border-b-2 border-b-transparent'
                    }`}
                  >
                    {d.label}
                  </Link>
                ))}
              </div>

              {/* Sort — segmented control (unchanged shape, nudged sizes) */}
              <div className="flex items-center border border-surface-200 bg-surface-50 p-0.5" role="radiogroup" aria-label="Sort projects">
                <Link
                  href={buildUrl({ sort: 'newest' })}
                  role="radio"
                  aria-checked={activeSort === 'newest'}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
                    activeSort === 'newest' ? 'bg-white text-surface-900 shadow-sm border-b-2 border-b-brand-orange' : 'text-surface-500 hover:text-surface-800 hover:bg-white/60 border-b-2 border-b-transparent'
                  }`}
                >
                  Newest
                </Link>
                <Link
                  href={buildUrl({ sort: 'popular' })}
                  role="radio"
                  aria-checked={activeSort === 'popular'}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
                    activeSort === 'popular' ? 'bg-white text-surface-900 shadow-sm border-b-2 border-b-brand-orange' : 'text-surface-500 hover:text-surface-800 hover:bg-white/60 border-b-2 border-b-transparent'
                  }`}
                >
                  Popular
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/*
          Result header — the previous tiny orphaned "33 projects" line is promoted to a real
          section anchor. Active filter chips now live on the same baseline (right-aligned),
          which collapses the "Active:" sub-row that used to orphan below the filter bar.
        */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-surface-900 flex items-baseline gap-2">
            <span className="tabular-nums">{prompts.length}</span>
            <span>{prompts.length === 1 ? 'Project' : 'Projects'}</span>
          </h2>
          {hasActiveFilters ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Filtered by</span>
              {activeCategoryName && (
                <Link
                  href={buildUrl({ category: '' })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/30 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/50 transition-colors duration-150"
                  aria-label={`Remove category filter ${activeCategoryName}`}
                >
                  {activeCategoryName}
                  <X className="w-3 h-3 opacity-75" aria-hidden="true" />
                </Link>
              )}
              {activeDifficultyLabel && activeDifficulty && (
                <Link
                  href={buildUrl({ difficulty: '' })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/30 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/50 transition-colors duration-150"
                  aria-label={`Remove difficulty filter ${activeDifficultyLabel}`}
                >
                  {activeDifficultyLabel}
                  <X className="w-3 h-3 opacity-75" aria-hidden="true" />
                </Link>
              )}
              {params.q && (
                <Link
                  href={buildUrl({ q: '' })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/30 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/50 transition-colors duration-150"
                  aria-label={`Remove search filter`}
                >
                  &ldquo;{params.q}&rdquo;
                  <X className="w-3 h-3 opacity-75" aria-hidden="true" />
                </Link>
              )}
              <Link
                href="/browse"
                className="text-[12px] font-medium text-surface-500 hover:text-surface-800 transition-colors duration-150 underline underline-offset-2 decoration-dotted"
              >
                Clear all
              </Link>
            </div>
          ) : (
            <p className="text-sm text-surface-500">
              Curated build paths across every category.
            </p>
          )}
        </div>

        {/* Results */}
        {prompts.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-surface-50 border border-dashed border-surface-300">
            <FolderOpen className="w-10 h-10 text-surface-300 mx-auto mb-4" aria-hidden="true" />
            <p className="text-base font-semibold text-surface-900 mb-1">No projects found</p>
            <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">
              {params.q
                ? `No results for "${params.q}". Try a different search term.`
                : 'No projects match your filters. Try broadening your selection.'}
            </p>
            {hasActiveFilters && (
              <Link
                href="/browse"
                className="inline-flex items-center gap-1.5 bg-surface-900 text-white text-[13px] font-bold px-4 py-2 min-h-11 hover:bg-surface-800 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Featured projects (top 2, shown only when no filters) */}
            {showFeatured && featuredPrompts.length > 0 && (
              <section aria-labelledby="featured-heading" className="mb-10">
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h3 id="featured-heading" className="text-lg font-bold text-surface-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                    Featured
                  </h3>
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-surface-400 tabular-nums">
                    {featuredPrompts.length} highlighted
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {featuredPrompts.map((prompt, idx) => (
                    <div key={prompt.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                      <PromptCard prompt={prompt} featured />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Main grid header — matched weight to Featured */}
            {showFeatured && gridPrompts.length > 0 && (
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-surface-400" aria-hidden="true" />
                  All Projects
                </h3>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-surface-400 tabular-nums">
                  {gridPrompts.length} total
                </span>
              </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gridPrompts.map((prompt, idx) => (
                <div key={prompt.id} className="animate-card-slide-in" style={{ animationDelay: `${(idx + (showFeatured ? 2 : 0)) * 40}ms` }}>
                  <PromptCard prompt={prompt} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
