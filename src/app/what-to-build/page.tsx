import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Gamepad2,
  Lightbulb,
  ListChecks,
  Palette,
  Scale,
  Sparkles,
} from 'lucide-react'
import { BuilderByline } from '@/components/BuilderByline'
import { ProjectPreview } from '@/components/ProjectPreview'
import { PublicTruthSummary } from '@/components/PublicTruthSummary'
import { BuildPathCard } from '@/components/discovery/BuildPathCard'
import { IdeaArtifactPreview } from '@/components/ideas/IdeaArtifactPreview'
import { getUserVotesAndBookmarks } from '@/lib/data'
import { getCachedPublicPrompts } from '@/lib/public-catalog-cache'
import {
  buildPathDiscoveryCatalog,
  getCanonicalDefaultDiscoveryTruth,
  itemMatchesIntent,
  recommendedOrder,
  selectCuratedItems,
  START_HERE_PROJECT_IDS,
  type BuildPathDiscoveryItem,
  type DiscoveryIntent,
} from '@/lib/path-discovery'
import { isPersistableProjectId } from '@/lib/project-engagement'
import { canonicalMetadata } from '@/lib/site-url'
import '../browse.css'
import './what-to-build.css'

export const metadata: Metadata = {
  title: 'What to Build with AI Tonight | PathForge',
  description: 'Find focused AI project ideas for tonight, then jump into real PathForge build paths, prompts, artifacts, or community requests.',
  ...canonicalMetadata('/what-to-build'),
}

const intentions = [
  {
    value: 'organize',
    icon: ListChecks,
    label: 'Make work easier',
    detail: 'Boards, trackers, checklists, and repeatable workflows.',
  },
  {
    value: 'decide',
    icon: Scale,
    label: 'Think something through',
    detail: 'Calculators, comparisons, scorers, and decision tools.',
  },
  {
    value: 'learn',
    icon: Lightbulb,
    label: 'Learn by doing',
    detail: 'Practice tools, explainers, quizzes, and study aids.',
  },
  {
    value: 'create',
    icon: Palette,
    label: 'Make something visual',
    detail: 'Studios, editors, maps, and creative experiments.',
  },
  {
    value: 'play',
    icon: Gamepad2,
    label: 'Play or experiment',
    detail: 'Games, puzzles, simulations, and strange little worlds.',
  },
  {
    value: 'one-prompt',
    icon: Sparkles,
    label: 'See what one prompt can do',
    detail: 'Small complete projects without a long specification.',
  },
] as const satisfies ReadonlyArray<{
  value: DiscoveryIntent
  icon: typeof ListChecks
  label: string
  detail: string
}>

type BuildPace = 'quick' | 'guided' | 'any'

const buildPaces: ReadonlyArray<{
  value: BuildPace
  label: string
  detail: string
}> = [
  {
    value: 'quick',
    label: 'One prompt',
    detail: 'A compact, finished starting point.',
  },
  {
    value: 'guided',
    label: 'A short path',
    detail: 'Two or three prompts with visible iteration.',
  },
  {
    value: 'any',
    label: 'Show the strongest',
    detail: 'Choose quality over conversation length.',
  },
]

type WhatToBuildSearchParams = Promise<Record<string, string | string[] | undefined>>

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseIntent(value: string | undefined): DiscoveryIntent | null {
  return intentions.some((intention) => intention.value === value)
    ? value as DiscoveryIntent
    : null
}

function parsePace(value: string | undefined): BuildPace {
  return buildPaces.some((pace) => pace.value === value)
    ? value as BuildPace
    : 'any'
}

function paceMatches(item: BuildPathDiscoveryItem, pace: BuildPace) {
  if (pace === 'quick') return item.promptCount <= 1
  if (pace === 'guided') return item.promptCount >= 2 && item.promptCount <= 3
  return true
}

function ideaMatchesIntent(item: BuildPathDiscoveryItem, intent: DiscoveryIntent) {
  if (intent === 'organize') return item.preview === 'board' || item.preview === 'checklist'
  if (intent === 'decide') return item.preview === 'calculator' || item.preview === 'matrix'
  if (intent === 'create') return item.preview === 'studio' || item.preview === 'mixer'
  if (intent === 'play') return item.preview === 'game'
  return itemMatchesIntent(item, intent)
}

function ideaHref(intent: DiscoveryIntent, pace: BuildPace) {
  return `/what-to-build?goal=${intent}&pace=${pace}#matches`
}

function paceHref(pace: BuildPace, intent: DiscoveryIntent | null) {
  const params = new URLSearchParams({ pace })
  if (intent) params.set('goal', intent)
  return `/what-to-build?${params.toString()}#matches`
}

function promptLabel(item: BuildPathDiscoveryItem) {
  const count = Math.max(1, item.promptCount)
  return `${count} ${count === 1 ? 'prompt' : 'prompts'}`
}

function pathTraits(item: BuildPathDiscoveryItem) {
  return [
    promptLabel(item),
    item.modelRunCount > 1 ? `${item.modelRunCount} model runs` : item.modelLabel,
    item.hasFork ? 'Fork available' : null,
    item.hasWorkingArtifact ? (item.isCommunityArtifact ? 'Visual-only community preview' : 'Working artifact') : null,
  ].filter((trait): trait is string => Boolean(trait))
}

function selectVariedRail(catalog: BuildPathDiscoveryItem[], featuredId?: string) {
  const curated = selectCuratedItems(catalog, START_HERE_PROJECT_IDS, 14)
  const candidates = [
    ...curated,
    ...recommendedOrder(catalog),
  ].filter(item => item.id !== featuredId)
  const selected: BuildPathDiscoveryItem[] = []
  const usedPreviews = new Set<string>()

  for (const item of candidates) {
    if (selected.length >= 3) break
    if (selected.some(selectedItem => selectedItem.id === item.id)) continue
    if (usedPreviews.has(item.preview)) continue
    selected.push(item)
    usedPreviews.add(item.preview)
  }

  for (const item of candidates) {
    if (selected.length >= 3) break
    if (!selected.some(selectedItem => selectedItem.id === item.id)) selected.push(item)
  }

  return selected
}

export default async function WhatToBuildPage({
  searchParams,
}: {
  searchParams: WhatToBuildSearchParams
}) {
  const params = await searchParams
  const selectedIntent = parseIntent(firstParam(params.goal))
  const selectedPace = parsePace(firstParam(params.pace))
  const prompts = await getCachedPublicPrompts()
  const catalog = buildPathDiscoveryCatalog(prompts, [])
  const intentMatches = selectedIntent
    ? catalog.filter((item) => ideaMatchesIntent(item, selectedIntent))
    : catalog
  const exactMatches = intentMatches.filter((item) => paceMatches(item, selectedPace))
  const candidatePool = exactMatches.length > 0
    ? exactMatches
    : intentMatches.length > 0
      ? intentMatches
      : catalog
  const defaultFeatured = selectCuratedItems(catalog, START_HERE_PROJECT_IDS, 1)[0]
  const featured = selectedIntent || selectedPace !== 'any'
    ? recommendedOrder(candidatePool)[0]
    : defaultFeatured ?? recommendedOrder(catalog)[0]
  const featuredTruth = featured
    ? getCanonicalDefaultDiscoveryTruth(featured)
    : null
  const rail = selectVariedRail(candidatePool, featured?.id)
  const selectedIntention = intentions.find((intention) => intention.value === selectedIntent)
  const selectedPaceOption = buildPaces.find((pace) => pace.value === selectedPace) ?? buildPaces[2]
  const hasFallback = exactMatches.length === 0 && (selectedIntent !== null || selectedPace !== 'any')
  const railLoginNextPath = selectedIntent
    ? ideaHref(selectedIntent, selectedPace)
    : paceHref(selectedPace, null)
  let isLoggedIn = false
  let votedPromptIds = new Set<string>()
  let bookmarkedPromptIds = new Set<string>()

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && rail.length > 0) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = Boolean(user)
      if (user) {
        const userState = await getUserVotesAndBookmarks(rail.map((item) => item.id))
        votedPromptIds = userState.votes
        bookmarkedPromptIds = userState.bookmarks
      }
    }
  } catch {
    // The shared cards still render when viewer-specific engagement state is unavailable.
  }

  return (
    <div className="pf-ideas">
      <section className="ideas-opening">
        <div className="ideas-shell ideas-opening-layout">
          <div className="ideas-opening-copy">
            <div className="ideas-kicker">
              <Compass aria-hidden="true" />
              Find a direction
            </div>
            <h1>
              Choose the result.<br />
              <span>Borrow the path.</span>
            </h1>
            <p>
              Start with something you would actually like to use, play, or understand. Every direction below leads to real PathForge builds—not a list of abstract prompt ideas.
            </p>
            <Link href="/paths?panel=open" className="ideas-text-link">
              Browse the complete library
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <nav className="ideas-intention-index" aria-label="Choose what you want to make">
            <div className="ideas-index-heading">
              <span>Start with the outcome</span>
              <small>Choose a direction</small>
            </div>
            <ol>
              {intentions.map((intention, index) => {
                const Icon = intention.icon
                const active = intention.value === selectedIntent
                return (
                  <li key={intention.value}>
                    <Link
                      href={ideaHref(intention.value, selectedPace)}
                      className={active ? 'is-active' : undefined}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="ideas-index-number">0{index + 1}</span>
                      <Icon aria-hidden="true" />
                      <span className="ideas-index-copy">
                        <strong>{intention.label}</strong>
                        <small>{intention.detail}</small>
                      </span>
                      <ArrowUpRight className="ideas-index-arrow" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>
      </section>

      <section className="ideas-feature-section" id="matches" aria-labelledby="ideas-feature-title">
        <div className="ideas-shell">
          <div className="ideas-pace-chooser" aria-labelledby="ideas-pace-title">
            <div className="ideas-pace-heading">
              <span>Then choose the runway</span>
              <div>
                <h2 id="ideas-pace-title">How much build path do you want?</h2>
                <p>The result stays useful; only the amount of visible iteration changes.</p>
              </div>
            </div>
            <div className="ideas-pace-options">
              {buildPaces.map((pace) => {
                const active = pace.value === selectedPace
                return (
                  <Link
                    key={pace.value}
                    href={paceHref(pace.value, selectedIntent)}
                    className={active ? 'is-active' : undefined}
                    aria-current={active ? 'true' : undefined}
                  >
                    <strong>{pace.label}</strong>
                    <span>{pace.detail}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="ideas-section-label">
            <span>{selectedIntention ? `Matched to: ${selectedIntention.label}` : 'One strong place to begin'}</span>
            <p>
              {hasFallback
                ? 'No path matched both choices exactly, so this is the strongest close fit.'
                : `${selectedPaceOption.label}. See the finished direction before you inspect how it was made.`}
            </p>
          </div>

          {featured ? (
            <article className="ideas-feature">
              <Link href={featured.href} className="ideas-feature-preview" aria-label={`Open ${featured.title}`}>
                {featured.artifactPath ? (
                  <ProjectPreview
                    artifactPath={featured.artifactPath}
                    title={featured.title}
                    label="Real project artifact"
                    className="ideas-real-project-preview"
                    isCommunityArtifact={featured.isCommunityArtifact}
                  />
                ) : (
                  <IdeaArtifactPreview title={featured.title} variant={featured.preview} />
                )}
                <span className="ideas-preview-caption">
                  {featured.hasWorkingArtifact
                    ? (featured.isCommunityArtifact ? 'Visual-only community preview' : 'Working artifact included')
                    : 'Build path preview'}
                  <ArrowUpRight aria-hidden="true" />
                </span>
              </Link>

              <div className="ideas-feature-story">
                <div className="ideas-feature-meta">
                  <span>{featured.categoryLabel}</span>
                  <span>{featured.difficulty}</span>
                </div>
                <h2 id="ideas-feature-title">{featured.title}</h2>
                <p className="ideas-feature-description">{featured.description}</p>

                <div className="ideas-outcome-note">
                  <span>Why this is a useful starting point</span>
                  <p>
                    {featured.hasWorkingArtifact
                      ? 'Open the result first, decide what you would keep, then trace the prompts or fork the direction into your own version.'
                      : 'Read the finished path, see where the model needed direction, and reuse only the parts that serve your version.'}
                  </p>
                </div>

                <ul className="ideas-traits" aria-label="Path traits">
                  {pathTraits(featured).map(trait => <li key={trait}>{trait}</li>)}
                </ul>

                {featuredTruth && (
                  <div data-ideas-feature-public-truth>
                    <PublicTruthSummary
                      truth={featuredTruth}
                      showArtifactExplanation={false}
                      className="ideas-feature-public-truth"
                    />
                  </div>
                )}

                <div className="ideas-feature-footer">
                  <BuilderByline
                    prefix="Built by"
                    name={featured.authorName}
                    provenanceKind={featured.authorProvenanceKind}
                    provenanceClassName="ideas-builder-provenance"
                  />
                  <Link href={featured.href} className="ideas-primary-link">
                    Explore this path
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>

                {(selectedIntent || selectedPace !== 'any') && (
                  <div className="ideas-selection-actions">
                    <Link href="/what-to-build#matches">Clear choices</Link>
                    {selectedIntent && (
                      <Link href={`/paths?intent=${selectedIntent}&panel=open`}>
                        Browse every matching path
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </article>
          ) : (
            <div className="ideas-empty">
              <h2 id="ideas-feature-title">The approved library is still taking shape.</h2>
              <p>Once a real project clears review, it can become a starting point here.</p>
            </div>
          )}
        </div>
      </section>

      {rail.length > 0 && (
        <section className="ideas-rail-section" aria-labelledby="ideas-rail-title">
          <div className="ideas-shell">
            <div className="ideas-rail-heading">
              <div>
                <span>{selectedIntention ? 'More matches for your direction' : 'Change the kind of challenge'}</span>
                <h2 id="ideas-rail-title">
                  {selectedIntention ? `More ways to ${selectedIntention.label.toLowerCase()}.` : 'Different results need different paths.'}
                </h2>
              </div>
              <p>
                {selectedIntention
                  ? 'Compare finished outcomes first, then choose the build path whose decisions are worth borrowing.'
                  : 'Move from practical tools to games, visual work, or a shorter prompt run without starting from a blank chat.'}
              </p>
            </div>

            <div className="ideas-path-rail pf-paths" data-ideas-shared-path-cards>
              {rail.map((item) => (
                <BuildPathCard
                  key={item.id}
                  item={item}
                  engagement={isPersistableProjectId(item.id) ? {
                    isLoggedIn,
                    initialVoted: votedPromptIds.has(item.id),
                    initialBookmarked: bookmarkedPromptIds.has(item.id),
                    loginNextPath: railLoginNextPath,
                  } : undefined}
                />
              ))}
            </div>

            <div className="ideas-rail-footer">
              <p>{candidatePool.length} matching build {candidatePool.length === 1 ? 'path is' : 'paths are'} available to explore.</p>
              <Link href={selectedIntent ? `/paths?intent=${selectedIntent}&panel=open` : '/paths?panel=open'} className="ideas-text-link">
                View the full matching set
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="ideas-request-section">
        <div className="ideas-shell ideas-request-note">
          <div>
            <span>Still not seeing it?</span>
            <h2>Describe the result you wish existed.</h2>
          </div>
          <p>
            A Build Request gives the community a concrete finish line. Use it when the library genuinely does not have the project or fork you need.
          </p>
          <Link href="/requests">
            Open Build Requests
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}
