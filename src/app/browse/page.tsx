import Link from 'next/link'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-orange mb-2 block">Explore</span>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Build Paths</h1>
        <p className="text-gray-600">Browse proven AI build paths across every category.</p>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="flex gap-2">
          <input type="hidden" name="category" value={activeCategory} />
          <input type="hidden" name="difficulty" value={activeDifficulty} />
          <input type="hidden" name="sort" value={activeSort} />
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search build paths..."
            className="flex-1 bg-white border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors"
          />
          <button type="submit" className="bg-brand-orange text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-orange-dark transition-colors">
            Search
          </button>
        </div>
      </form>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={buildUrl({ category: '' })}
          className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
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
            className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
              activeCategory === cat.slug
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange/50'
            }`}
          >
            {cat.icon} {cat.name}
          </Link>
        ))}
      </div>

      {/* Difficulty + Sort */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex gap-2">
          {difficulties.map(d => (
            <Link
              key={d.value}
              href={buildUrl({ difficulty: d.value })}
              className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
                activeDifficulty === d.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-gray-500 text-xs">Sort:</span>
          <Link
            href={buildUrl({ sort: 'newest' })}
            className={`px-2 py-1 text-xs font-semibold ${activeSort === 'newest' ? 'text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Newest
          </Link>
          <Link
            href={buildUrl({ sort: 'popular' })}
            className={`px-2 py-1 text-xs font-semibold ${activeSort === 'popular' ? 'text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Popular
          </Link>
        </div>
      </div>

      {/* Results */}
      {prompts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No build paths found</p>
          <p className="text-sm">Try adjusting your filters or search query.</p>
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
