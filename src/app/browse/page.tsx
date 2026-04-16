import Link from 'next/link'
import { Search, X, FolderOpen, SlidersHorizontal, Sparkles } from 'lucide-react'
import { getCategories, getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

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

  const activeCategoryName = activeCategory
    ? categories.find(c => c.slug === activeCategory)?.name
    : null

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
        {/* Search + Filters toolbar */}
        <div className="bg-white border border-surface-200 p-5 mb-6">
          {/* Search bar */}
          <form className="mb-4">
            <input type="hidden" name="category" value={activeCategory} />
            <input type="hidden" name="difficulty" value={activeDifficulty} />
            <input type="hidden" name="sort" value={activeSort} />
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within/search:text-brand-orange transition-colors duration-200" />
              <input
                type="text"
                name="q"
                defaultValue={params.q ?? ''}
                placeholder="Search projects..."
                className="w-full bg-surface-50 border border-surface-200 pl-10 pr-4 py-2.5 text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:border-brand-orange focus:bg-white focus:shadow-[0_0_0_3px_rgba(232,122,44,0.08)] transition-all duration-200"
              />
            </div>
          </form>

          {/* Filters row */}
          <div className="flex flex-col gap-4">
            {/* Categories */}
            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-surface-400 shrink-0" />
              <Link
                href={buildUrl({ category: '' })}
                className={`text-[12px] font-medium px-2.5 py-1.5 border transition-all duration-200 ${
                  !activeCategory
                    ? 'bg-surface-900 text-white border-surface-900'
                    : 'bg-surface-50 text-surface-600 border-surface-200 hover:border-surface-400 hover:bg-white'
                }`}
              >
                All
              </Link>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={buildUrl({ category: cat.slug })}
                  className={`text-[12px] font-medium px-2.5 py-1.5 border transition-all duration-200 ${
                    activeCategory === cat.slug
                      ? 'bg-surface-900 text-white border-surface-900'
                      : 'bg-surface-50 text-surface-600 border-surface-200 hover:border-surface-400 hover:bg-white'
                  }`}
                >
                  {cat.icon} {cat.name}
                </Link>
              ))}
            </div>

            {/* Difficulty + Sort row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-surface-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Level</span>
                {difficulties.map(d => (
                  <Link
                    key={d.value}
                    href={buildUrl({ difficulty: d.value })}
                    className={`text-[12px] font-medium px-2.5 py-1.5 border transition-all duration-200 ${
                      activeDifficulty === d.value
                        ? 'bg-surface-900 text-white border-surface-900'
                        : 'bg-surface-50 text-surface-500 border-surface-200 hover:border-surface-400 hover:bg-white'
                    }`}
                  >
                    {d.label}
                  </Link>
                ))}
              </div>

              <div className="sm:ml-auto flex items-center gap-3">
                {hasActiveFilters && (
                  <Link
                    href="/browse"
                    className="text-[12px] font-medium text-surface-500 hover:text-surface-700 transition-colors duration-200 flex items-center gap-1 px-2 py-1 hover:bg-surface-50"
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </Link>
                )}
                <div className="flex items-center gap-0.5 border border-surface-200 bg-surface-50 p-0.5">
                  <Link
                    href={buildUrl({ sort: 'newest' })}
                    className={`px-3 py-1 text-[12px] font-medium transition-all duration-200 ${
                      activeSort === 'newest' ? 'text-surface-900 bg-white shadow-sm' : 'text-surface-400 hover:text-surface-700'
                    }`}
                  >
                    Newest
                  </Link>
                  <Link
                    href={buildUrl({ sort: 'popular' })}
                    className={`px-3 py-1 text-[12px] font-medium transition-all duration-200 ${
                      activeSort === 'popular' ? 'text-surface-900 bg-white shadow-sm' : 'text-surface-400 hover:text-surface-700'
                    }`}
                  >
                    Popular
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">Active:</span>
            {activeCategoryName && (
              <Link
                href={buildUrl({ category: '' })}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/8 text-brand-orange border border-brand-orange/15 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/30 transition-all duration-200"
              >
                {activeCategoryName}
                <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </Link>
            )}
            {activeDifficulty && (
              <Link
                href={buildUrl({ difficulty: '' })}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/8 text-brand-orange border border-brand-orange/15 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/30 transition-all duration-200"
              >
                {activeDifficulty.charAt(0).toUpperCase() + activeDifficulty.slice(1)}
                <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </Link>
            )}
            {params.q && (
              <Link
                href={buildUrl({ q: '' })}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-brand-orange/8 text-brand-orange border border-brand-orange/15 px-2.5 py-1 hover:bg-brand-orange/15 hover:border-brand-orange/30 transition-all duration-200"
              >
                &ldquo;{params.q}&rdquo;
                <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </Link>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] text-surface-500">
            <span className="font-semibold text-surface-700">{prompts.length}</span>{' '}
            {prompts.length === 1 ? 'project' : 'projects'}
            {activeCategoryName && (
              <span> in <span className="font-medium text-surface-600">{activeCategoryName}</span></span>
            )}
            {activeDifficulty && (
              <span> at <span className="font-medium text-surface-600">{activeDifficulty}</span> level</span>
            )}
            {params.q && (
              <span> matching &ldquo;<span className="font-medium text-surface-600">{params.q}</span>&rdquo;</span>
            )}
          </p>
        </div>

        {/* Results */}
        {prompts.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white border border-dashed border-surface-300">
            <FolderOpen className="w-10 h-10 text-surface-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-surface-700 mb-1">No projects found</p>
            <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">
              {params.q
                ? `No results for "${params.q}". Try a different search term.`
                : 'No projects match your filters. Try broadening your selection.'}
            </p>
            {hasActiveFilters && (
              <Link
                href="/browse"
                className="inline-flex items-center gap-1.5 bg-surface-900 text-white text-[13px] font-medium px-4 py-2 hover:bg-surface-800 transition-colors duration-200"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Featured projects (top 2, shown only when no filters) */}
            {showFeatured && featuredPrompts.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                  <h2 className="text-sm font-semibold text-surface-700">Featured Projects</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredPrompts.map((prompt, idx) => (
                    <div key={prompt.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                      <PromptCard prompt={prompt} featured />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section label for regular grid when featured is shown */}
            {showFeatured && gridPrompts.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-surface-700">All Projects</h2>
              </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
