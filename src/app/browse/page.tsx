// Iter 2026-04-20 — Browse redesign pass: hero + bookend match the new homepage
// editorial aesthetic (commit 77b94a1). Filter toolbar / grid / empty-state logic
// kept intact — the old iter-26/27 filter toolbar and iter-33 empty-state invite
// still do the functional work; only the frame around them changes so the visitor
// doesn't hit an aesthetic cliff when they click through from the homepage.
//
// Uses .pf-home design tokens from src/app/home.css (Instrument Serif accent, eyebrow
// pills with mono labels, dark surface-900 finalcta bookend, btn-primary / btn-secondary).

import Link from 'next/link'
import { Search, X, FolderOpen, SlidersHorizontal, Sparkles, Layers, ChevronDown, TrendingUp, ArrowRight } from 'lucide-react'
import { getCategories, getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'
import CategoryPopover from '@/components/CategoryPopover'
import '../home.css'

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

  const showFeatured = !hasActiveFilters && prompts.length >= 3
  const featuredPrompts = showFeatured ? prompts.slice(0, 2) : []
  const gridPrompts = showFeatured ? prompts.slice(2) : prompts

  const isEmpty = prompts.length === 0
  const suggestedPrompts = isEmpty
    ? await getPrompts({ sort: 'popular', limit: 3 })
    : []
  const suggestedCategories = isEmpty
    ? categories.filter(c => c.slug !== activeCategory).slice(0, 6)
    : []

  // Build a context-aware hero headline based on active filters.
  // Default: editorial header with Instrument Serif accent on one evocative word.
  // Filtered: lean into the filter so the hero has semantic payoff ("Finance paths," etc.)
  const filteredByCat = activeCategoryName
  const searchTerm = params.q

  return (
    <div className="pf-home">
      {/* ═══════════ HERO ═══════════ */}
      <section className="hero">
        <div
          className="hero-wrap"
          style={{ gridTemplateColumns: '1fr', textAlign: 'left', maxWidth: 920, padding: '72px 24px 56px' }}
        >
          <div>
            <div className="hero-eyebrow">
              <span className="pulse" />
              <span>
                {searchTerm
                  ? `Searching "${searchTerm}"`
                  : filteredByCat
                  ? `${filteredByCat} build paths`
                  : 'Browse every build path'}
              </span>
            </div>
            <h1 style={{ fontSize: 56, marginBottom: 18 }}>
              {searchTerm ? (
                <>
                  Results for <span className="serif">&ldquo;{searchTerm}&rdquo;</span>
                </>
              ) : filteredByCat ? (
                <>
                  <span className="serif">{filteredByCat}</span>, start to finish.
                </>
              ) : (
                <>
                  Find your next <span className="serif">build</span>.
                </>
              )}
            </h1>
            <p className="lead" style={{ maxWidth: 640, fontSize: 18, marginBottom: 0 }}>
              {hasActiveFilters
                ? `${prompts.length} ${prompts.length === 1 ? 'path matches' : 'paths match'} your filters. Fork one, swap in your context, ship by bedtime.`
                : 'Every project here shows the full chain — the prompts someone actually typed, the results they got back, and the finished artifact. Fork any of them and make it yours.'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ FILTER TOOLBAR + RESULTS ═══════════ */}
      {/* Keep the iter-26/27 filter toolbar intact — the shape is clean and
          already uses the surface-* token set. No restyling here. */}
      <section style={{ background: 'var(--color-surface-50)', borderBottom: '1px solid var(--color-surface-200)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
          {/* Filter toolbar */}
          <div className="bg-white border border-surface-200 p-3 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
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
                    placeholder="Search build paths..."
                    aria-label="Search build paths"
                    className="w-full bg-surface-50 border border-surface-200 pl-9 pr-3 py-2 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/15 transition-all duration-150"
                  />
                </div>
              </form>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:ml-auto">
                <CategoryPopover className="relative group/cat">
                  <summary
                    className={`list-none cursor-pointer select-none flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2 ${
                      activeCategory
                        ? 'bg-surface-900 text-white border-surface-900 hover:bg-surface-800'
                        : 'bg-surface-50 text-surface-700 border-surface-200 hover:border-surface-400 hover:bg-white'
                    }`}
                  >
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

                <div className="flex items-center border border-surface-200 bg-surface-50 p-0.5" role="radiogroup" aria-label="Sort build paths">
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

          {/* Result header — promoted to editorial register with mono eyebrow */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6">
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--color-brand-orange)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 1, background: 'var(--color-brand-orange)' }} />
                {hasActiveFilters ? 'Filtered results' : showFeatured ? 'All paths' : 'Results'}
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-surface-900)' }} className="flex items-baseline gap-2">
                <span className="tabular-nums">{prompts.length}</span>
                <span>{prompts.length === 1 ? 'build path' : 'build paths'}</span>
              </h2>
            </div>
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
                    aria-label="Remove search filter"
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
              <p className="text-sm text-surface-500 tabular-nums">
                Across <span className="font-semibold text-surface-700">{categories.length}</span> categories
                <span aria-hidden="true" className="text-surface-300 mx-2">·</span>
                Community-curated
              </p>
            )}
          </div>

          {/* Results */}
          {prompts.length === 0 ? (
            <div className="space-y-10">
              <div className="text-center py-10 sm:py-12 bg-white border border-dashed border-surface-300">
                <FolderOpen className="w-10 h-10 text-surface-300 mx-auto mb-4" aria-hidden="true" />
                <p className="text-base font-semibold text-surface-900 mb-1">No matches for those filters</p>
                <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
                  {params.q
                    ? `Nothing matched "${params.q}". Reset the search and try one of the paths below.`
                    : 'Nothing landed under this combination yet. Try one of the paths below.'}
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

              {suggestedCategories.length > 0 && (
                <section aria-labelledby="empty-cat-heading">
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <h3 id="empty-cat-heading" className="text-lg font-bold text-surface-900 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-surface-400" aria-hidden="true" />
                      Try a category
                    </h3>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-surface-400 tabular-nums">
                      {suggestedCategories.length} shortcuts
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {suggestedCategories.map(cat => (
                      <Link
                        key={cat.id}
                        href={`/browse?category=${cat.slug}`}
                        className="group flex items-center gap-2 text-[13px] font-medium px-3 py-2.5 bg-white border border-surface-200 text-surface-800 hover:border-brand-orange hover:bg-brand-orange/5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2"
                      >
                        <span aria-hidden="true" className="text-base leading-none">{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-auto text-surface-300 group-hover:text-brand-orange transition-colors duration-150" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {suggestedPrompts.length > 0 && (
                <section aria-labelledby="empty-pop-heading">
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <h3 id="empty-pop-heading" className="text-lg font-bold text-surface-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                      Popular right now
                    </h3>
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-surface-400 tabular-nums">
                      Top {suggestedPrompts.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {suggestedPrompts.map((prompt, idx) => (
                      <div key={prompt.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                        <PromptCard prompt={prompt} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div>
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

              {showFeatured && gridPrompts.length > 0 && (
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-surface-400" aria-hidden="true" />
                    All paths
                  </h3>
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-surface-400 tabular-nums">
                    {gridPrompts.length} total
                  </span>
                </div>
              )}

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
      </section>

      {/* ═══════════ FINAL CTA BOOKEND ═══════════ */}
      <section className="finalcta">
        <div className="sect-wrap">
          <div className="eyebrow">Didn&apos;t find it?</div>
          <h2>
            Build it yourself.<br />
            <span className="serif">Share</span> it back.
          </h2>
          <p>
            Every path in the library was built by someone who opened a chat and figured something out. If you&apos;re about to do the same — keep the receipts. Post them here when you&apos;re done.
          </p>
          <div className="finalcta-btns">
            <Link href="/prompt/new" className="btn-primary">
              Share a build path
              <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M5 12H19M13 6L19 12L13 18" /></svg>
            </Link>
            <Link href="/about" className="btn-secondary">Why PathForge</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
