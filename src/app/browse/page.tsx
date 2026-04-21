// Iter 2026-04-21 — Browse v2 (Direction A) from handoff bundle PathForge 2.
// Persistent AI search band at top, Path of the Week split card, 4-card shelf,
// collapsible "Browse build paths" panel (B-pattern facets + ranked list),
// domain grid, and "The Loop" lettered walkthrough.
//
// Panel state is URL-driven: ?q=... auto-opens (search mode); ?panel=open opens
// manually (filter mode). Facets link to URL updates; filters narrow results.
// AI-ranked UI is wired visually but uses the existing keyword search for now
// (no claude-sonnet call + embedding index yet — that's Phase 2 per the memo).
//
// Styles scoped under .pf-browse in src/app/browse.css.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCategories, getPrompts } from '@/lib/data'
import type { PromptWithRelations } from '@/lib/types'
import { AI_MODELS } from '@/lib/models'
import '../browse.css'

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const

// Most popular models for the facet list (keep it short — 4-6 options)
const FACET_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'chatgpt-5-4',
  'gpt-4o',
  'gemini-2-5-pro',
]

const SUGGESTION_QUERIES = [
  'Weekly cashflow forecast from my Stripe CSVs',
  'Study plan for AWS cert in 2 weeks',
  'Turn a long article into a week of LinkedIn posts',
  'Daily PR review summary for my team',
]

type SearchParams = {
  q?: string
  category?: string
  difficulty?: string
  model?: string
  sort?: 'newest' | 'popular'
  panel?: 'open'
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim()
  const activeCategory = params.category ?? ''
  const activeDifficulty = params.difficulty ?? ''
  const activeModel = params.model ?? ''
  const activeSort = params.sort ?? 'newest'
  const panelOpen = Boolean(q) || params.panel === 'open' || Boolean(activeCategory || activeDifficulty || activeModel)

  // Redirect empty-string query to canonical /browse to avoid ?q= litter
  if (params.q !== undefined && q === '' && params.panel !== 'open' && !activeCategory && !activeDifficulty && !activeModel) {
    redirect('/browse')
  }

  const [categories, allPrompts] = await Promise.all([
    getCategories(),
    // Pull everything (up to 200) so we can compute facet counts client-side-ish.
    // For production scale you'd push counts to SQL; at <300 rows this is fine.
    getPrompts({ sort: activeSort, limit: 300 }),
  ])

  // Apply filters in memory so we can show counts for every facet without
  // firing multiple DB calls.
  function matchesQuery(p: PromptWithRelations, needle: string) {
    if (!needle) return true
    const n = needle.toLowerCase()
    return (
      p.title.toLowerCase().includes(n) ||
      p.description.toLowerCase().includes(n) ||
      (p.result_content?.toLowerCase().includes(n) ?? false) ||
      p.tags.some(t => t.toLowerCase().includes(n)) ||
      p.tools_used.some(t => t.toLowerCase().includes(n))
    )
  }
  function matchesFilters(p: PromptWithRelations, opts: { cat?: boolean; diff?: boolean; mdl?: boolean } = {}) {
    if (activeCategory && opts.cat !== false) {
      const cat = categories.find(c => c.slug === activeCategory)
      if (!cat || p.category_id !== cat.id) return false
    }
    if (activeDifficulty && opts.diff !== false) {
      if (p.difficulty !== activeDifficulty) return false
    }
    if (activeModel && opts.mdl !== false) {
      if (p.model_used !== activeModel) return false
    }
    return true
  }

  const queryMatched = allPrompts.filter(p => matchesQuery(p, q))
  const filtered = queryMatched.filter(p => matchesFilters(p))

  // Facet counts — keep each facet's "what would this look like if I toggled it"
  // meaningful by excluding itself from the running filter set.
  const countsByCategory: Record<string, number> = {}
  for (const cat of categories) {
    countsByCategory[cat.slug] = queryMatched
      .filter(p => matchesFilters(p, { cat: false }))
      .filter(p => p.category_id === cat.id).length
  }
  const countsByDifficulty: Record<string, number> = {}
  for (const d of DIFFICULTIES) {
    countsByDifficulty[d.value] = queryMatched
      .filter(p => matchesFilters(p, { diff: false }))
      .filter(p => p.difficulty === d.value).length
  }
  const countsByModel: Record<string, number> = {}
  for (const m of FACET_MODELS) {
    countsByModel[m] = queryMatched
      .filter(p => matchesFilters(p, { mdl: false }))
      .filter(p => p.model_used === m).length
  }

  const totalLibrary = allPrompts.length

  function buildUrl(overrides: Partial<SearchParams>): string {
    const p: Record<string, string | undefined> = {
      q: q || undefined,
      category: activeCategory || undefined,
      difficulty: activeDifficulty || undefined,
      model: activeModel || undefined,
      sort: activeSort !== 'newest' ? activeSort : undefined,
      panel: panelOpen ? 'open' : undefined,
      ...overrides,
    }
    // Empty-string overrides -> drop the param
    for (const key of Object.keys(p)) {
      if (p[key] === '' || p[key] === undefined) delete p[key]
    }
    const qs = new URLSearchParams(p as Record<string, string>).toString()
    return `/browse${qs ? `?${qs}` : ''}`
  }

  // Editorial slices (only relevant when panel is closed)
  const potw = allPrompts[0]
  const shelf = allPrompts.slice(1, 5)

  return (
    <div className="pf-browse">
      {/* ═══════════ 1 · AI SEARCH BAND ═══════════ */}
      <section className={`ai-band${panelOpen ? ' sticky' : ''}`}>
        <div className="ai-band-wrap">
          {!panelOpen && (
            <>
              <div className="ai-band-eyebrow">
                Ask PathForge · {totalLibrary} {totalLibrary === 1 ? 'path' : 'paths'} indexed
              </div>
              <h1>
                Describe what you&apos;re trying to <span className="serif">build.</span>
              </h1>
              <p className="ai-lede">
                Plain English works best — we&apos;ll match you to the closest real build, then suggest how to adapt it.
              </p>
            </>
          )}

          <form action="/browse" method="get" className="ai-box">
            <div className="ai-box-row">
              <div className="ai-icon" aria-hidden="true">✦</div>
              <div className="ai-input-wrap">
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  className="ai-input"
                  placeholder={panelOpen ? 'Refine your query…' : "Describe the thing you're trying to build, in your own words…"}
                  aria-label="Search build paths"
                  autoComplete="off"
                />
                {!panelOpen && (
                  <div className="ai-box-meta">
                    <div className="ai-model">
                      <span className="ai-model-dot"><span className="mono">Keyword match</span></span>
                      <span>·</span>
                      <span>across titles, outcomes, steps & tags</span>
                    </div>
                    <button type="submit" className="ai-submit">
                      Find paths
                      <span className="ai-submit-kbd">↵</span>
                    </button>
                  </div>
                )}
              </div>
              {panelOpen && (
                <div className="ai-sticky-actions">
                  {q && (
                    <Link href={buildUrl({ q: undefined, panel: 'open' })} aria-label="Clear search query">
                      clear ✕
                    </Link>
                  )}
                  <button type="submit" className="ai-submit">
                    Search
                    <span className="ai-submit-kbd">↵</span>
                  </button>
                </div>
              )}
            </div>
          </form>

          {!panelOpen && (
            <div className="ai-suggest">
              <span className="ai-suggest-label">Try:</span>
              {SUGGESTION_QUERIES.map(suggestion => (
                <Link
                  key={suggestion}
                  href={`/browse?q=${encodeURIComponent(suggestion)}`}
                  className="ai-suggest-pill"
                >
                  &ldquo;{suggestion}&rdquo;
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ QUERY META BAR (panel-open only) ═══════════ */}
      {panelOpen && (
        <div className="query-meta">
          <div className="query-meta-wrap">
            <div className="query-meta-text">
              <span className="sparkle">✦</span>
              {q ? (
                <>Found {filtered.length} {filtered.length === 1 ? 'match' : 'matches'} for &ldquo;{q}&rdquo; · {totalLibrary - filtered.length} other paths hidden</>
              ) : (
                <>Browsing {filtered.length} of {totalLibrary} paths · refine with filters on the left</>
              )}
            </div>
            <div className="query-meta-sort">
              <Link href={buildUrl({ sort: 'newest' })} className={activeSort === 'newest' ? 'active' : ''}>
                Newest
              </Link>
              <Link href={buildUrl({ sort: 'popular' })} className={activeSort === 'popular' ? 'active' : ''}>
                Most popular
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ PANEL OPEN ═══════════ */}
      {panelOpen && (
        <section className="panel-open">
          <div className="panel-open-wrap">
            <header className="panel-open-head">
              <div className="panel-toggle-left">
                <div className="panel-toggle-icon" aria-hidden="true">≡</div>
                <div>
                  <div className="panel-toggle-title">Browse build paths</div>
                  <div className="panel-toggle-sub">
                    <span className="mono" style={{ color: 'var(--color-brand-orange)' }}>
                      {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
                    </span>
                    {' · '}
                    {totalLibrary - filtered.length} more paths hidden · refine with filters
                  </div>
                </div>
              </div>
              <Link href="/browse" className="btn-ghost" style={{ fontSize: 12 }}>
                Close panel ▴
              </Link>
            </header>

            <div className="panel-body">
              {/* ─── Left facet rail ─── */}
              <aside>
                <div className="facet-group">
                  <div className="facet-head">
                    <div className="facet-label">Category</div>
                    {activeCategory && (
                      <Link href={buildUrl({ category: undefined })} className="facet-clear">clear</Link>
                    )}
                  </div>
                  <div className="facet-list">
                    <Link
                      href={buildUrl({ category: undefined })}
                      className={`facet-item ${!activeCategory ? 'active' : ''}`}
                    >
                      <span>All matches</span>
                      <span className="facet-count">{queryMatched.filter(p => matchesFilters(p, { cat: false })).length}</span>
                    </Link>
                    {categories.map(cat => {
                      const count = countsByCategory[cat.slug] ?? 0
                      const isActive = activeCategory === cat.slug
                      if (count === 0 && !isActive) return null
                      return (
                        <Link
                          key={cat.id}
                          href={buildUrl({ category: isActive ? undefined : cat.slug })}
                          className={`facet-item ${isActive ? 'active' : ''}`}
                        >
                          <span>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</span>
                          <span className="facet-count">{count}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <div className="facet-group">
                  <div className="facet-head">
                    <div className="facet-label">Difficulty</div>
                    {activeDifficulty && (
                      <Link href={buildUrl({ difficulty: undefined })} className="facet-clear">clear</Link>
                    )}
                  </div>
                  {DIFFICULTIES.map(d => {
                    const isActive = activeDifficulty === d.value
                    const count = countsByDifficulty[d.value] ?? 0
                    return (
                      <Link
                        key={d.value}
                        href={buildUrl({ difficulty: isActive ? undefined : d.value })}
                        className={`facet-check ${isActive ? 'active' : ''}`}
                      >
                        <span className="facet-check-box" aria-hidden="true">{isActive ? '✓' : ''}</span>
                        <span className={`potw-diff ${d.value}`}>{d.label}</span>
                        <span className="facet-count" style={{ marginLeft: 'auto' }}>{count}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="facet-group">
                  <div className="facet-head">
                    <div className="facet-label">Model</div>
                    {activeModel && (
                      <Link href={buildUrl({ model: undefined })} className="facet-clear">clear</Link>
                    )}
                  </div>
                  {FACET_MODELS.map(modelId => {
                    const meta = AI_MODELS.find(m => m.id === modelId)
                    if (!meta) return null
                    const count = countsByModel[modelId] ?? 0
                    const isActive = activeModel === modelId
                    if (count === 0 && !isActive) return null
                    return (
                      <Link
                        key={modelId}
                        href={buildUrl({ model: isActive ? undefined : modelId })}
                        className={`facet-check ${isActive ? 'active' : ''}`}
                      >
                        <span className="facet-check-box" aria-hidden="true">{isActive ? '✓' : ''}</span>
                        <span>{meta.name}</span>
                        <span className="facet-count" style={{ marginLeft: 'auto' }}>{count}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="facet-footer">
                  <Link href={q ? `/browse?q=${encodeURIComponent(q)}` : '/browse?panel=open'} className="facet-reset" style={{ display: 'inline-block', textAlign: 'center' }}>
                    Reset all filters
                  </Link>
                </div>
              </aside>

              {/* ─── Results list ─── */}
              <div>
                {filtered.length > 0 ? (
                  <>
                    {filtered.map((p, i) => {
                      const isTop = i === 0
                      const cat = categories.find(c => c.id === p.category_id)
                      const modelMeta = AI_MODELS.find(m => m.id === p.model_used)
                      const stepCount = p.steps?.length ?? 0
                      return (
                        <Link
                          key={p.id}
                          href={`/prompt/${p.id}`}
                          className={`result-row${isTop ? ' top' : ''}`}
                        >
                          <div className={`result-rank${isTop ? ' top' : ''}`}>
                            <div className="result-rank-num">{String(i + 1).padStart(2, '0')}</div>
                            <div className="result-rank-label">rank</div>
                            {isTop && <div className="result-top-badge">Top</div>}
                          </div>
                          <div>
                            <div className="result-main-title">{p.title}</div>
                            <div className="result-main-desc">{p.description}</div>
                            {p.result_content && (
                              <div className="result-reason">
                                <span className="result-reason-icon">✦</span>
                                <span>
                                  {p.result_content.length > 180
                                    ? p.result_content.slice(0, 180).trim() + '…'
                                    : p.result_content}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="result-meta">
                            {cat && <span className="mono">{cat.name}</span>}
                            <span className={`potw-diff ${p.difficulty}`}>{p.difficulty}</span>
                            <span>{stepCount} {stepCount === 1 ? 'step' : 'steps'}{modelMeta ? ` · ${modelMeta.name}` : ''}</span>
                            <span>by {p.author?.display_name ?? p.author?.username ?? 'builder'}</span>
                          </div>
                          <div className="result-stats">
                            <span className="result-stats-votes">↑ {p.vote_count}</span>
                            <span>☆ {p.bookmark_count}</span>
                          </div>
                        </Link>
                      )
                    })}

                    <div className="result-generate">
                      <div className="result-generate-text">
                        <span className="sparkle">✦</span>
                        Didn&apos;t find the right path?{' '}
                        <b>
                          <Link href="/prompt/new" style={{ textDecoration: 'underline' }}>
                            Share your own build
                          </Link>
                        </b>{' '}
                        — what you ship today becomes the example someone forks tomorrow.
                      </div>
                      <Link href="/prompt/new" className="btn-dark">Share a path →</Link>
                    </div>
                  </>
                ) : (
                  <div className="result-empty">
                    <div className="result-empty-title">No paths match those filters</div>
                    <p className="result-empty-sub">
                      {q ? (
                        <>Nothing matched &ldquo;{q}&rdquo; under the current filters. Clear a filter, rephrase the query, or{' '}
                          <Link href="/prompt/new" style={{ color: 'var(--color-brand-orange)', textDecoration: 'underline' }}>
                            share your own build
                          </Link>{' '}
                          if the path doesn&apos;t exist yet.
                        </>
                      ) : (
                        <>Try broader filters or browse a domain below.</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ EDITORIAL (closed state only) ═══════════ */}
      {!panelOpen && potw && (
        <>
          {/* Path of the Week */}
          <section className="potw-section">
            <div className="section-wrap">
              <div className="section-eyebrow">Path of the week</div>
              <Link href={`/prompt/${potw.id}`} className="potw-card">
                <div className="potw-left">
                  <div className="potw-tagline">
                    <span className="potw-chip">Editor&apos;s pick</span>
                    <span className="potw-meta">
                      {categories.find(c => c.id === potw.category_id)?.name ?? 'Uncategorized'}
                      {' · shipped '}
                      {relativeTime(potw.created_at)}
                    </span>
                  </div>
                  <h2>{potw.title}</h2>
                  <p className="potw-desc">{potw.description}</p>
                  <div className="potw-stats">
                    <div className="potw-author">
                      <div className="potw-avatar" aria-hidden="true">
                        {(potw.author?.display_name ?? potw.author?.username ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span>by <b>{potw.author?.display_name ?? potw.author?.username ?? 'builder'}</b></span>
                    </div>
                    <span className={`potw-diff ${potw.difficulty}`}>{potw.difficulty}</span>
                    <span className="potw-meta">{potw.steps?.length ?? 0} steps</span>
                    {potw.model_used && (
                      <span className="potw-meta">
                        {AI_MODELS.find(m => m.id === potw.model_used)?.name ?? potw.model_used}
                      </span>
                    )}
                  </div>
                  <div className="potw-actions">
                    <span className="btn-dark">Open path →</span>
                  </div>
                </div>
                <div className="potw-right">
                  <div className="potw-right-eyebrow">↳ What they shipped</div>
                  <p className="potw-outcome">
                    &ldquo;{
                      potw.result_content
                        ? potw.result_content.length > 260
                          ? potw.result_content.slice(0, 260).trim() + '…'
                          : potw.result_content
                        : potw.description
                    }&rdquo;
                  </p>
                  {potw.steps && potw.steps.length > 0 && (
                    <div className="potw-steps">
                      {potw.steps.slice(0, 4).map((s, i) => (
                        <div key={s.id} className={`potw-step${i === 0 ? ' first' : ''}`}>
                          <span className="potw-step-num">{i + 1}</span>
                          <span className="potw-step-label">
                            {s.title.length > 32 ? s.title.slice(0, 32) + '…' : s.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </section>

          {/* Shelf — 4 curated picks */}
          {shelf.length >= 2 && (
            <section className="shelf-section">
              <div className="section-wrap">
                <div className="shelf-head">
                  <div>
                    <div className="section-eyebrow muted">─── Also this week</div>
                    <h3>Four more worth forking.</h3>
                  </div>
                  <span className="shelf-head-meta">Hand-picked · refreshed weekly</span>
                </div>
                <div className="shelf-grid">
                  {shelf.map(p => {
                    const cat = categories.find(c => c.id === p.category_id)
                    const modelMeta = AI_MODELS.find(m => m.id === p.model_used)
                    return (
                      <Link key={p.id} href={`/prompt/${p.id}`} className="shelf-card">
                        <div className="shelf-cat">{cat?.name ?? '—'}</div>
                        <div className="shelf-title">{p.title}</div>
                        <div className="shelf-desc">{p.description}</div>
                        {p.result_content && (
                          <div className="shelf-outcome">{p.result_content}</div>
                        )}
                        <div className="shelf-foot">
                          <span className={`potw-diff ${p.difficulty}`}>{p.difficulty}</span>
                          <span>by {p.author?.display_name ?? p.author?.username ?? 'builder'}</span>
                        </div>
                        <div className="shelf-foot-row">
                          <span>{p.steps?.length ?? 0} steps{modelMeta ? ` · ${modelMeta.name}` : ''}</span>
                          <span>↑{p.vote_count} ☆{p.bookmark_count}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Browse panel TOGGLE (closed) */}
          <div className="panel-toggle-wrap">
            <div className="section-wrap">
              <Link href="/browse?panel=open" className="panel-toggle" data-open="false">
                <div className="panel-toggle-left">
                  <div className="panel-toggle-icon" aria-hidden="true">≡</div>
                  <div>
                    <div className="panel-toggle-title">Browse build paths</div>
                    <div className="panel-toggle-sub">
                      Filter all {totalLibrary} paths by category, difficulty, model, and more.
                    </div>
                  </div>
                </div>
                <div className="panel-toggle-right">
                  <span className="panel-toggle-count">{totalLibrary} paths</span>
                  <span className="panel-toggle-chev" aria-hidden="true">▾</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Domain grid */}
          <section className="domains-section">
            <div className="section-wrap">
              <div className="domains-head">
                <div className="section-eyebrow muted">─── Or jump straight in</div>
                <h3>
                  Start with a <span className="serif">domain</span>.
                </h3>
                <p>Each category opens a curated shortlist — not a dump of every path.</p>
              </div>
              <div className="domains-grid">
                {categories.map(c => (
                  <Link key={c.id} href={`/browse?category=${c.slug}`} className="domain-card">
                    <div className="domain-icon">{c.icon ?? '◇'}</div>
                    <div className="domain-name">{c.name}</div>
                    <div className="domain-count">
                      {c.prompt_count ?? 0} {c.prompt_count === 1 ? 'path' : 'paths'}
                    </div>
                    <span className="domain-arrow" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>

              <div className="cta-band">
                <div>
                  <div className="cta-band-eyebrow">Didn&apos;t find it?</div>
                  <div className="cta-band-title">
                    Build it yourself. <span className="serif">Share it back.</span>
                  </div>
                </div>
                <Link href="/prompt/new" className="cta-band-btn">
                  Share a build path →
                </Link>
              </div>
            </div>
          </section>

          {/* THE LOOP */}
          <section className="loop-section">
            <div className="section-wrap">
              <div className="loop-head">
                <div className="section-eyebrow">─── The loop</div>
                <h3>
                  Find something. Fork it. <span className="serif">Ship yours back.</span>
                </h3>
                <p>
                  Every path on this page got here because someone ran the loop once. Yours joins the library the day you finish your first one.
                </p>
              </div>
              <div className="loop-steps">
                {[
                  { l: 'A', t: 'Find.', d: 'Describe what you\'re building in the search at the top, or pick a domain. Three doors into the same library.' },
                  { l: 'B', t: 'Read the outcome.', d: 'Every path shows what someone actually shipped — not what it "could" do. If that\'s not your outcome, move on.' },
                  { l: 'C', t: 'Fork.', d: 'One click clones the path into your workspace. You own the copy — edit prompts, swap models, reorder steps.' },
                  { l: 'D', t: 'Adapt.', d: 'Plug in your own inputs. Tweak the prompts until the output sounds like you. Usually takes 2–3 runs.' },
                  { l: 'E', t: 'Ship yours back.', d: 'Publish your version with your outcome attached. Someone else forks yours tomorrow. Loop closes.' },
                ].map((s, i) => (
                  <div key={s.l} className={`loop-step${i === 0 ? ' first' : ''}`}>
                    <div className="loop-step-head">
                      <div className="loop-letter">{s.l}</div>
                      <div className="loop-step-line" />
                      {i < 4 && <span className="loop-step-arrow" aria-hidden="true">→</span>}
                    </div>
                    <div className="loop-step-title">{s.t}</div>
                    <div className="loop-step-body">{s.d}</div>
                  </div>
                ))}
              </div>

              <div className="compounding">
                <div className="compounding-head">
                  <div>
                    <div className="section-eyebrow muted">─── Where leverage compounds</div>
                    <h4>Three moves after your first ship.</h4>
                  </div>
                </div>
                <div className="compounding-grid">
                  {[
                    { n: '01', t: 'Bookmark what you fork.', d: 'Your workspace remembers every path you\'ve touched. Rerun any past build with fresh inputs in two clicks.' },
                    { n: '02', t: 'Follow builders you trust.', d: 'Get a nudge when someone whose taste you like publishes a new path. Better than searching cold.' },
                    { n: '03', t: 'Chain paths.', d: 'Output from one build becomes the input to another. Three paths stitched together beats one rebuilt from scratch.' },
                  ].map(n => (
                    <div key={n.n} className="compound-card">
                      <div className="compound-num">{n.n}</div>
                      <div className="compound-title">{n.t}</div>
                      <div className="compound-body">{n.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cta-band loop-cta">
                <div>
                  <div className="cta-band-eyebrow">Didn&apos;t find it?</div>
                  <div className="cta-band-title">
                    Build it yourself. <span className="serif">Share it back.</span>
                  </div>
                </div>
                <Link href="/prompt/new" className="cta-band-btn">
                  Share a build path →
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// Simple relative-time helper (avoids pulling in date-fns for one use).
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'recently'
  const diff = Date.now() - then
  const day = 86_400_000
  if (diff < day * 2) return diff < day ? 'today' : 'yesterday'
  if (diff < day * 14) return `${Math.floor(diff / day)}d ago`
  if (diff < day * 60) return `${Math.floor(diff / (day * 7))}w ago`
  return `${Math.floor(diff / (day * 30))}mo ago`
}
