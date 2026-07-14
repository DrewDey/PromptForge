import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { BROAD_DOMAINS, getPromptBroadDomain } from '@/lib/broad-domains'
import { getCategories, getPrompts, getUserVotesAndBookmarks } from '@/lib/data'
import {
  DISCOVERY_INTENTS,
  MODEL_COMPARISON_PROJECT_IDS,
  START_HERE_PROJECT_IDS,
  buildPathDiscoveryCatalog,
  itemMatchesIntent,
  newestOrder,
  recommendedOrder,
  selectCuratedItems,
  type BuildPathDiscoveryItem,
  type DiscoveryIntent,
} from '@/lib/path-discovery'
import { getPublicModelFacetValue, getPublicModelLabel, publicModelFilterMatchesLabel } from '@/lib/public-model-labels'
import { isPersistableProjectId } from '@/lib/project-engagement'
import { BuildPathCard } from './BuildPathCard'

type SearchParamValue = string | string[] | undefined

export type BuildPathsSearchParams = {
  q?: SearchParamValue
  category?: SearchParamValue
  domain?: SearchParamValue
  difficulty?: SearchParamValue
  model?: SearchParamValue
  intent?: SearchParamValue
  compare?: SearchParamValue
  artifact?: SearchParamValue
  fork?: SearchParamValue
  sort?: SearchParamValue
  page?: SearchParamValue
  panel?: SearchParamValue
}

type BuildPathsUrlParams = {
  q?: string
  intent?: string
  domain?: string
  difficulty?: string
  model?: string
  compare?: 'models'
  artifact?: 'working'
  fork?: 'available'
  sort?: 'newest'
  page?: string
  panel?: 'open'
}

const PAGE_SIZE = 12

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function matchesQuery(item: BuildPathDiscoveryItem, query: string) {
  if (!query) return true
  const needle = query.toLocaleLowerCase()
  return [
    item.title,
    item.description,
    item.outcome ?? '',
    item.categoryLabel,
    item.modelLabel,
    item.authorName,
    ...item.prompt.tags,
    ...item.prompt.tools_used,
  ].join(' ').toLocaleLowerCase().includes(needle)
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <header className="path-section-heading">
      <div>
        <div className="path-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && (
        <Link href={action.href} className="path-section-action">
          {action.label} <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </header>
  )
}

export async function BuildPathsDiscovery({
  searchParams,
}: {
  searchParams: Promise<BuildPathsSearchParams>
}) {
  const params = await searchParams
  const rawIntent = firstParam(params.intent)
  const rawDomain = firstParam(params.domain)
  const rawDifficulty = firstParam(params.difficulty)
  const rawModel = firstParam(params.model)
  const rawCategory = firstParam(params.category)
  const rawCompare = firstParam(params.compare)
  const rawArtifact = firstParam(params.artifact)
  const rawFork = firstParam(params.fork)
  const rawSort = firstParam(params.sort)
  const rawPanel = firstParam(params.panel)
  const query = firstParam(params.q).trim()
  const activeIntent = DISCOVERY_INTENTS.some((intent) => intent.value === rawIntent)
    ? rawIntent as DiscoveryIntent
    : ''
  const activeDomain = BROAD_DOMAINS.some((domain) => domain.slug === rawDomain)
    ? rawDomain
    : ''
  const activeDifficulty = ['beginner', 'intermediate', 'advanced'].includes(rawDifficulty)
    ? rawDifficulty
    : ''
  const activeModel = rawModel
  const activeCompare = rawCompare === 'models'
  const activeArtifact = rawArtifact === 'working'
  const activeFork = rawFork === 'available'
  const activeSort = rawSort === 'newest' ? 'newest' : 'recommended'
  const requestedPage = Math.max(1, Number.parseInt(firstParam(params.page) || '1', 10) || 1)

  if (rawCategory && !rawDomain) {
    const domain = rawCategory === 'personal' ? 'games' : 'productivity'
    const legacyParams = new URLSearchParams()
    if (query) legacyParams.set('q', query)
    legacyParams.set('domain', domain)
    if (activeDifficulty) legacyParams.set('difficulty', activeDifficulty)
    if (activeModel) legacyParams.set('model', activeModel)
    if (activeCompare) legacyParams.set('compare', 'models')
    if (activeArtifact) legacyParams.set('artifact', 'working')
    if (activeFork) legacyParams.set('fork', 'available')
    redirect(`/paths?${legacyParams.toString()}`)
  }

  const [categories, prompts] = await Promise.all([
    getCategories(),
    getPrompts({ sort: 'newest', limit: 300 }),
  ])
  const catalog = buildPathDiscoveryCatalog(prompts, categories)
  let isLoggedIn = false
  let votedPromptIds = new Set<string>()
  let bookmarkedPromptIds = new Set<string>()

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && catalog.length > 0) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = Boolean(user)
      if (user) {
        const userState = await getUserVotesAndBookmarks(catalog.map((item) => item.id))
        votedPromptIds = userState.votes
        bookmarkedPromptIds = userState.bookmarks
      }
    }
  } catch {
    // Discovery still renders when viewer-specific engagement state is unavailable.
  }

  const filtered = catalog.filter((item) => {
    if (!matchesQuery(item, query)) return false
    if (activeIntent && !itemMatchesIntent(item, activeIntent)) return false
    if (activeDomain && getPromptBroadDomain(item.prompt, categories)?.slug !== activeDomain) return false
    if (activeDifficulty && item.difficulty !== activeDifficulty) return false
    if (activeModel && !item.modelLabels.some((label) => publicModelFilterMatchesLabel(activeModel, label))) return false
    if (activeCompare && item.comparisonCount < 2) return false
    if (activeArtifact && !item.hasWorkingArtifact) return false
    if (activeFork && !item.hasFork) return false
    return true
  })
  const ordered = activeSort === 'newest' ? newestOrder(filtered) : recommendedOrder(filtered)
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const activePage = Math.min(requestedPage, totalPages)
  const pageItems = ordered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)
  const isFiltered = Boolean(
    rawPanel === 'open' || activeSort === 'newest' || query || activeIntent || activeDomain || activeDifficulty || activeModel || activeCompare || activeArtifact || activeFork,
  )

  const modelCounts = new Map<string, { label: string; count: number }>()
  for (const item of catalog) {
    for (const modelLabel of item.modelLabels) {
      const value = getPublicModelFacetValue(modelLabel)
      if (!value || modelLabel === 'Unknown model') continue
      const current = modelCounts.get(value)
      modelCounts.set(value, {
        label: current?.label ?? (getPublicModelLabel(modelLabel) || modelLabel),
        count: (current?.count ?? 0) + 1,
      })
    }
  }
  const modelFacets = [...modelCounts.entries()]
    .map(([value, entry]) => ({ value, ...entry }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))

  function buildUrl(overrides: Partial<BuildPathsUrlParams>) {
    const next: Record<string, string | undefined> = {
      q: query || undefined,
      intent: activeIntent || undefined,
      domain: activeDomain || undefined,
      difficulty: activeDifficulty || undefined,
      model: activeModel || undefined,
      compare: activeCompare ? 'models' : undefined,
      artifact: activeArtifact ? 'working' : undefined,
      fork: activeFork ? 'available' : undefined,
      sort: activeSort === 'newest' ? 'newest' : undefined,
      page: activePage > 1 ? String(activePage) : undefined,
      panel: rawPanel === 'open' ? 'open' : undefined,
      ...Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, value === undefined ? undefined : String(value)])),
    }
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === 'false') delete next[key]
    }
    const search = new URLSearchParams(next as Record<string, string>).toString()
    return `/paths${search ? `?${search}` : ''}`
  }

  const usedIds = new Set<string>()
  const startHere = selectCuratedItems(catalog, START_HERE_PROJECT_IDS, 3, usedIds)
  startHere.forEach((item) => usedIds.add(item.id))
  const compareModels = selectCuratedItems(
    catalog.filter((item) => item.comparisonCount > 1),
    MODEL_COMPARISON_PROJECT_IDS,
    4,
    usedIds,
  )

  const activeFilterCount = [
    query,
    activeIntent,
    activeDomain,
    activeDifficulty,
    activeModel,
    activeCompare,
    activeArtifact,
    activeFork,
  ].filter(Boolean).length

  return (
    <div className="pf-paths">
      <section className="path-hero">
        <div className="path-hero-inner">
          <div className="path-hero-copy">
            <div className="path-eyebrow path-eyebrow-light">
              <Sparkles aria-hidden="true" /> PathForge library · {catalog.length} verified paths
            </div>
            <h1>Find something <span>worth building.</span></h1>
            <p>
              Start with a working project, then inspect the prompts, responses, models, and forks that made it possible.
            </p>
          </div>

          <form action="/paths" method="get" className="path-search">
            <Search aria-hidden="true" />
            <label>
              <span>Search the library</span>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="What do you want to make or solve?"
                autoComplete="off"
              />
            </label>
            {activeIntent && <input type="hidden" name="intent" value={activeIntent} />}
            {activeDomain && <input type="hidden" name="domain" value={activeDomain} />}
            {activeDifficulty && <input type="hidden" name="difficulty" value={activeDifficulty} />}
            {activeModel && <input type="hidden" name="model" value={activeModel} />}
            {activeCompare && <input type="hidden" name="compare" value="models" />}
            {activeArtifact && <input type="hidden" name="artifact" value="working" />}
            {activeFork && <input type="hidden" name="fork" value="available" />}
            <button type="submit">Find paths <ArrowRight aria-hidden="true" /></button>
          </form>

          <nav className="path-intent-nav" aria-label="Browse by goal">
            {DISCOVERY_INTENTS.map((intent) => (
              <Link
                key={intent.value}
                href={buildUrl({ intent: activeIntent === intent.value ? undefined : intent.value, page: undefined })}
                className={activeIntent === intent.value ? 'is-active' : ''}
              >
                {intent.shortLabel}
              </Link>
            ))}
            <Link
              href={buildUrl({ artifact: activeArtifact ? undefined : 'working', page: undefined })}
              className={activeArtifact ? 'is-active' : ''}
            >
              <CheckCircle2 aria-hidden="true" /> Working artifacts
            </Link>
          </nav>
        </div>
      </section>

      {!isFiltered && activePage === 1 && startHere.length > 0 && (
        <section id="start-here" className="path-section path-start-section">
          <div className="path-container">
            <SectionHeading
              eyebrow="Staff picks · 3 paths"
              title="Start with three projects worth opening."
              description="Real working results first, with the prompts, model runs, and forks available when you want the build story."
              action={{ href: '#all-paths', label: 'Browse every path' }}
            />
            <div className="path-start-grid">
              <BuildPathCard item={startHere[0]} featured />
              <div className="path-start-supporting">
                {startHere.slice(1).map((item) => <BuildPathCard key={item.id} item={item} compact />)}
              </div>
            </div>
          </div>
        </section>
      )}

      <section id="all-paths" className="path-catalog-section">
        <div className="path-container">
          <SectionHeading
            eyebrow={isFiltered ? 'Filtered library' : 'Complete library'}
            title={isFiltered ? `${ordered.length} ${ordered.length === 1 ? 'path matches' : 'paths match'}.` : 'All build paths.'}
            description={isFiltered
              ? 'Results stay in a stable order until you change a filter.'
              : 'Recommended starts with editorial quality and working artifacts—not empty popularity numbers.'}
          />

          <div className="path-catalog-toolbar">
            <div className="path-filter-row" aria-label="Filter by type">
              <Link href={buildUrl({ domain: undefined, page: undefined })} className={!activeDomain ? 'is-active' : ''}>All</Link>
              {BROAD_DOMAINS.map((domain) => (
                <Link
                  key={domain.slug}
                  href={buildUrl({ domain: activeDomain === domain.slug ? undefined : domain.slug, page: undefined })}
                  className={activeDomain === domain.slug ? 'is-active' : ''}
                >
                  {domain.label}
                </Link>
              ))}
              <Link
                href={buildUrl({ compare: activeCompare ? undefined : 'models', page: undefined })}
                className={activeCompare ? 'is-active' : ''}
              >
                Compare models
              </Link>
            </div>

            <div className="path-toolbar-actions">
              <details className="path-filter-menu">
                <summary><SlidersHorizontal aria-hidden="true" /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</summary>
                <div className="path-filter-popover">
                  <div>
                    <strong>Difficulty</strong>
                    {['beginner', 'intermediate', 'advanced'].map((difficulty) => (
                      <Link
                        key={difficulty}
                        href={buildUrl({ difficulty: activeDifficulty === difficulty ? undefined : difficulty, page: undefined })}
                        className={activeDifficulty === difficulty ? 'is-active' : ''}
                      >
                        {difficulty}
                      </Link>
                    ))}
                  </div>
                  <div>
                    <strong>Model</strong>
                    {modelFacets.map((model) => (
                      <Link
                        key={model.value}
                        href={buildUrl({ model: activeModel === model.value ? undefined : model.value, page: undefined })}
                        className={getPublicModelFacetValue(activeModel) === model.value ? 'is-active' : ''}
                      >
                        <span>{model.label}</span><small>{model.count}</small>
                      </Link>
                    ))}
                  </div>
                  <div>
                    <strong>Path features</strong>
                    <Link
                      href={buildUrl({ artifact: activeArtifact ? undefined : 'working', page: undefined })}
                      className={activeArtifact ? 'is-active' : ''}
                    >
                      Working artifact
                    </Link>
                    <Link
                      href={buildUrl({ fork: activeFork ? undefined : 'available', page: undefined })}
                      className={activeFork ? 'is-active' : ''}
                    >
                      Fork available
                    </Link>
                  </div>
                  {activeFilterCount > 0 && <Link href="/paths#all-paths" className="path-clear-filters">Clear all filters</Link>}
                </div>
              </details>

              <div className="path-sort" aria-label="Sort build paths">
                <span>Sort</span>
                <Link href={buildUrl({ sort: undefined, page: undefined })} className={activeSort === 'recommended' ? 'is-active' : ''}>Recommended</Link>
                <Link href={buildUrl({ sort: 'newest', page: undefined })} className={activeSort === 'newest' ? 'is-active' : ''}>Newest</Link>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="path-active-filter-bar">
              <span>{ordered.length} results</span>
              <div>
                {query && <b>Search: {query}</b>}
                {activeIntent && <b>{DISCOVERY_INTENTS.find((intent) => intent.value === activeIntent)?.label}</b>}
                {activeDomain && <b>{BROAD_DOMAINS.find((domain) => domain.slug === activeDomain)?.label}</b>}
                {activeDifficulty && <b>{activeDifficulty}</b>}
                {activeModel && <b>{getPublicModelLabel(activeModel)}</b>}
                {activeCompare && <b>Model comparisons</b>}
                {activeArtifact && <b>Working artifacts</b>}
                {activeFork && <b>Fork available</b>}
              </div>
              <Link href="/paths#all-paths">Reset</Link>
            </div>
          )}

          {pageItems.length > 0 ? (
            <div className="path-card-grid path-catalog-grid">
              {pageItems.map((item) => (
                <BuildPathCard
                  key={item.id}
                  item={item}
                  engagement={isPersistableProjectId(item.id) ? {
                    isLoggedIn,
                    initialVoted: votedPromptIds.has(item.id),
                    initialBookmarked: bookmarkedPromptIds.has(item.id),
                    loginNextPath: buildUrl({}),
                  } : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="path-empty-state">
              <Search aria-hidden="true" />
              <h3>No paths match that combination yet.</h3>
              <p>Try a broader goal, clear one filter, or ask the community for the project you need.</p>
              <div>
                <Link href="/paths#all-paths">Clear filters</Link>
                <Link href="/requests">Request a build</Link>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="path-pagination" aria-label="Build path pages">
              {activePage > 1 ? (
                <Link href={buildUrl({ page: String(activePage - 1) })}><ChevronLeft aria-hidden="true" /> Previous</Link>
              ) : <span><ChevronLeft aria-hidden="true" /> Previous</span>}
              <strong>Page {activePage} of {totalPages}</strong>
              {activePage < totalPages ? (
                <Link href={buildUrl({ page: String(activePage + 1) })}>Next <ChevronRight aria-hidden="true" /></Link>
              ) : <span>Next <ChevronRight aria-hidden="true" /></span>}
            </nav>
          )}
        </div>
      </section>

      {!isFiltered && activePage === 1 && compareModels.length > 0 && (
        <section className="path-compare-section" aria-labelledby="model-comparison-title">
          <div className="path-container path-compare-inner">
            <div className="path-compare-copy">
              <div className="path-eyebrow path-eyebrow-blue"><GitCompareArrows aria-hidden="true" /> Model comparisons</div>
              <h2 id="model-comparison-title">See what changed when the model changed.</h2>
              <p>
                Open the same brief across ChatGPT, Claude, and Gemini, then compare the working results and build decisions.
              </p>
              <Link href="/paths?compare=models#all-paths">Browse every comparison <ArrowRight aria-hidden="true" /></Link>
            </div>
            <div className="path-compare-list">
              {compareModels.map((item) => (
                <Link key={item.id} href={item.href}>
                  <span>{item.categoryLabel}</span>
                  <strong>{item.title}</strong>
                  <small>{item.comparisonCount} verified model runs</small>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
