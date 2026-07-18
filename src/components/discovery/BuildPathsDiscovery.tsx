import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  ArrowDownWideNarrow,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { BROAD_DOMAINS, getPromptBroadDomain } from '@/lib/broad-domains'
import { getCategories, getPrompts, getUserVotesAndBookmarks } from '@/lib/data'
import {
  DISCOVERY_INTENTS,
  activeOrder,
  buildPathDiscoveryCatalog,
  forkCountOrder,
  itemMatchesIntent,
  multiModelOrder,
  newestOrder,
  recommendedOrder,
  type BuildPathDiscoveryItem,
  type DiscoveryIntent,
} from '@/lib/path-discovery'
import { ACTIVE_PROJECT_EXPLANATION } from '@/lib/discovery-activity.mjs'
import { getPublicModelFacetValue, publicModelFilterMatchesLabel } from '@/lib/public-model-labels'
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
  sort?: 'active' | 'forks' | 'models' | 'newest'
  page?: string
  panel?: 'open'
}

const PAGE_SIZE = 12
const DISCOVERY_SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'active', label: 'Active' },
  { value: 'forks', label: 'Forks' },
  { value: 'models', label: 'Multiple models' },
  { value: 'newest', label: 'Newest' },
] as const
type DiscoverySort = typeof DISCOVERY_SORT_OPTIONS[number]['value']

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
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="path-section-heading">
      <div>
        <div className="path-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
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
  const normalizedSort = rawSort === 'model-runs' ? 'models' : rawSort
  const activeSort = DISCOVERY_SORT_OPTIONS.some((option) => option.value === normalizedSort)
    ? normalizedSort as DiscoverySort
    : 'recommended'
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
    if (activeSort !== 'recommended') legacyParams.set('sort', activeSort)
    redirect(`/paths?${legacyParams.toString()}`)
  }

  const [categories, prompts] = await Promise.all([
    getCategories(),
    getPrompts({ sort: 'newest' }),
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
    if (activeCompare && item.verifiedModelCount < 2) return false
    if (activeArtifact && !item.hasWorkingArtifact) return false
    if (activeFork && !item.hasFork) return false
    return true
  })
  const ordered = activeSort === 'active'
    ? activeOrder(filtered)
    : activeSort === 'forks'
      ? forkCountOrder(filtered)
      : activeSort === 'models'
        ? multiModelOrder(filtered)
        : activeSort === 'newest'
          ? newestOrder(filtered)
          : recommendedOrder(filtered)
  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const activePage = Math.min(requestedPage, totalPages)
  const pageItems = ordered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)
  const isFiltered = Boolean(
    rawPanel === 'open' || activeSort !== 'recommended' || query || activeIntent || activeDomain || activeDifficulty || activeModel || activeCompare || activeArtifact || activeFork,
  )

  const modelCounts = new Map<string, { label: string; count: number }>()
  for (const item of catalog) {
    for (const modelLabel of item.modelLabels) {
      const value = getPublicModelFacetValue(modelLabel)
      if (!value || modelLabel === 'Unknown model') continue
      const current = modelCounts.get(value)
      modelCounts.set(value, {
        label: current?.label ?? modelLabel,
        count: (current?.count ?? 0) + 1,
      })
    }
  }
  const modelFacets = [...modelCounts.entries()]
    .map(([value, entry]) => ({ value, ...entry }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
  const normalizedActiveModel = activeModel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const activeModelFacet = modelFacets.find((model) => (
    model.value === activeModel || model.value === normalizedActiveModel
  ))

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
      sort: activeSort === 'recommended' ? undefined : activeSort,
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
            <div className="path-eyebrow">
              PathForge library · {catalog.length} published paths
            </div>
            <h1>Explore finished AI projects.</h1>
            <p>
              Open the result first. Then inspect the prompts, responses, models, and forks behind it.
            </p>
          </div>

          <form action="/paths" method="get" className="path-search" data-activation-search="explore">
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
            {activeSort !== 'recommended' && <input type="hidden" name="sort" value={activeSort} />}
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

      <section id="all-paths" className="path-catalog-section">
        <div className="path-container">
          <SectionHeading
            eyebrow={isFiltered ? 'Filtered library' : 'Complete library'}
            title={isFiltered ? `${ordered.length} ${ordered.length === 1 ? 'path matches' : 'paths match'}.` : 'All build paths.'}
            description={isFiltered
              ? 'Results stay in a stable order until you change a filter.'
              : 'Search the complete published library or narrow it by outcome, domain, model, and project features.'}
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
                        href={buildUrl({ model: activeModelFacet?.value === model.value ? undefined : model.value, page: undefined })}
                        className={activeModelFacet?.value === model.value ? 'is-active' : ''}
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

              <details className="path-sort-menu">
                <summary aria-label="Sort build paths">
                  <ArrowDownWideNarrow aria-hidden="true" />
                  <span>Sort</span>
                  <strong>{DISCOVERY_SORT_OPTIONS.find((option) => option.value === activeSort)?.label}</strong>
                </summary>
                <div className="path-sort-popover">
                  {DISCOVERY_SORT_OPTIONS.map((option) => (
                    <Link
                      key={option.value}
                      href={buildUrl({
                        sort: option.value === 'recommended' ? undefined : option.value,
                        page: undefined,
                      })}
                      className={activeSort === option.value ? 'is-active' : ''}
                      aria-current={activeSort === option.value ? 'true' : undefined}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </div>

          <details className="path-activity-explainer">
            <summary>What “Active” means</summary>
            <p>{ACTIVE_PROJECT_EXPLANATION}</p>
          </details>

          {activeFilterCount > 0 && (
            <div className="path-active-filter-bar">
              <span>{ordered.length} results</span>
              <div>
                {query && <b>Search: {query}</b>}
                {activeIntent && <b>{DISCOVERY_INTENTS.find((intent) => intent.value === activeIntent)?.label}</b>}
                {activeDomain && <b>{BROAD_DOMAINS.find((domain) => domain.slug === activeDomain)?.label}</b>}
                {activeDifficulty && <b>{activeDifficulty}</b>}
                {activeModel && <b>{activeModelFacet?.label ?? activeModel}</b>}
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

    </div>
  )
}
