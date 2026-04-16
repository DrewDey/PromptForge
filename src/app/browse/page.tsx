import Link from 'next/link'
import { Search, X, FolderOpen } from 'lucide-react'
import { getCategories, getPrompts } from '@/lib/data'
import PromptCard from '@/components/PromptCard'

const difficulties = [
  { value: '', label: 'All Levels' },
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2 block">Explore</span>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Build Paths</h1>
        <p className="text-gray-600">Browse proven AI build paths across every category.</p>
      </div>

      {/* Search */}
      <form className="mb-8">
        <div className="flex gap-2">
          <input type="hidden" name="category" value={activeCategory} />
          <input type="hidden" name="difficulty" value={activeDifficulty} />
          <input type="hidden" name="sort" value={activeSort} />
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Search build paths..."
              className="w-full bg-white border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25 transition-colors duration-200"
            />
          </div>
          <button type="submit" className="bg-brand-orange text-white px-4 py-2.5 hover:bg-brand-orange-dark transition-colors duration-200" aria-label="Search">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Category filters */}
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Category</span>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUrl({ category: '' })}
            className={`text-xs font-semibold px-3 py-1.5 border transition-colors duration-200 ${
              !activeCategory
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange/50'
            }`}
          >
            All
          </Link>
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={buildUrl({ category: cat.slug })}
              className={`text-xs font-semibold px-3 py-1.5 border transition-colors duration-200 ${
                activeCategory === cat.slug
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange/50'
              }`}
            >
              {cat.icon} {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Difficulty + Sort + Clear filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block sm:hidden">Level</span>
          <div className="flex gap-2 flex-wrap">
            {difficulties.map(d => (
              <Link
                key={d.value}
                href={buildUrl({ difficulty: d.value })}
                className={`text-xs font-semibold px-3 py-1.5 border transition-colors duration-200 ${
                  activeDifficulty === d.value
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-orange/50'
                }`}
              >
                {d.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="sm:ml-auto flex items-center gap-3">
          {hasActiveFilters && (
            <Link
              href="/browse"
              className="text-xs font-semibold text-gray-600 border border-gray-300 px-3 py-1.5 hover:border-gray-400 hover:text-gray-800 transition-colors duration-200 flex items-center gap-1.5"
            >
              <X className="w-3 h-3" />
              Clear all
            </Link>
          )}
          <div className="flex items-center gap-1 text-sm border-l border-gray-200 pl-3">
            <span className="text-gray-400 text-xs">Sort:</span>
            <Link
              href={buildUrl({ sort: 'newest' })}
              className={`px-2 py-1 text-xs font-semibold transition-colors duration-200 ${activeSort === 'newest' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-700'}`}
            >
              Newest
            </Link>
            <Link
              href={buildUrl({ sort: 'popular' })}
              className={`px-2 py-1 text-xs font-semibold transition-colors duration-200 ${activeSort === 'popular' ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-700'}`}
            >
              Popular
            </Link>
          </div>
        </div>
      </div>

      {/* Active filter summary chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Filtered by:</span>
          {activeCategoryName && (
            <Link
              href={buildUrl({ category: '' })}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-2.5 py-1 hover:bg-brand-orange/20 transition-colors duration-200"
            >
              {activeCategoryName}
              <X className="w-3 h-3" />
            </Link>
          )}
          {activeDifficulty && (
            <Link
              href={buildUrl({ difficulty: '' })}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-2.5 py-1 hover:bg-brand-orange/20 transition-colors duration-200"
            >
              {activeDifficulty.charAt(0).toUpperCase() + activeDifficulty.slice(1)}
              <X className="w-3 h-3" />
            </Link>
          )}
          {params.q && (
            <Link
              href={buildUrl({ q: '' })}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-2.5 py-1 hover:bg-brand-orange/20 transition-colors duration-200"
            >
              &ldquo;{params.q}&rdquo;
              <X className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Result count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{prompts.length}</span>{' '}
          {prompts.length === 1 ? 'path' : 'paths'}
          {activeCategoryName && (
            <span> in <span className="font-medium text-gray-600">{activeCategoryName}</span></span>
          )}
          {activeDifficulty && (
            <span> at <span className="font-medium text-gray-600">{activeDifficulty}</span> level</span>
          )}
          {params.q && (
            <span> matching &ldquo;<span className="font-medium text-gray-600">{params.q}</span>&rdquo;</span>
          )}
        </p>
      </div>

      {/* Results */}
      {prompts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 bg-gray-50/50">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">No build paths found</p>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            {params.q
              ? `No results for "${params.q}". Try a different search term or adjust your filters.`
              : 'No paths match your current filters. Try broadening your selection.'}
          </p>
          {hasActiveFilters && (
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-orange-dark transition-colors duration-200"
            >
              <X className="w-4 h-4" />
              Clear all filters
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prompts.map((prompt, idx) => (
            <div key={prompt.id} className="animate-card-slide-in" style={{ animationDelay: `${idx * 50}ms` }}>
              <PromptCard prompt={prompt} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
