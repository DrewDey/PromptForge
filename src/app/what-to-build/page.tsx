import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Gamepad2,
  GitFork,
  Layers3,
  Lightbulb,
  ListChecks,
  Palette,
  Scale,
  Sparkles,
} from 'lucide-react'
import { IdeaArtifactPreview } from '@/components/ideas/IdeaArtifactPreview'
import { getPrompts } from '@/lib/data'
import {
  buildPathDiscoveryCatalog,
  recommendedOrder,
  selectCuratedItems,
  START_HERE_PROJECT_IDS,
  type BuildPathDiscoveryItem,
} from '@/lib/path-discovery'
import { canonicalMetadata } from '@/lib/site-url'
import './what-to-build.css'

export const metadata: Metadata = {
  title: 'What to Build with AI Tonight | PathForge',
  description: 'Find focused AI project ideas for tonight, then jump into real PathForge build paths, prompts, artifacts, or community requests.',
  ...canonicalMetadata('/what-to-build'),
}

const intentions = [
  {
    icon: ListChecks,
    label: 'Make work easier',
    detail: 'Boards, trackers, checklists, and repeatable workflows.',
    href: '/paths?intent=organize&panel=open',
  },
  {
    icon: Scale,
    label: 'Think something through',
    detail: 'Calculators, comparisons, scorers, and decision tools.',
    href: '/paths?intent=decide&panel=open',
  },
  {
    icon: Lightbulb,
    label: 'Learn by doing',
    detail: 'Practice tools, explainers, quizzes, and study aids.',
    href: '/paths?intent=learn&panel=open',
  },
  {
    icon: Palette,
    label: 'Make something visual',
    detail: 'Studios, editors, maps, and creative experiments.',
    href: '/paths?intent=create&panel=open',
  },
  {
    icon: Gamepad2,
    label: 'Play or experiment',
    detail: 'Games, puzzles, simulations, and strange little worlds.',
    href: '/paths?intent=play&panel=open',
  },
  {
    icon: Sparkles,
    label: 'See what one prompt can do',
    detail: 'Small complete projects without a long specification.',
    href: '/paths?intent=one-prompt&panel=open',
  },
] as const

function promptLabel(item: BuildPathDiscoveryItem) {
  const count = Math.max(1, item.promptCount)
  return `${count} ${count === 1 ? 'prompt' : 'prompts'}`
}

function pathTraits(item: BuildPathDiscoveryItem) {
  return [
    promptLabel(item),
    item.comparisonCount > 1 ? `${item.comparisonCount} model runs` : item.modelLabel,
    item.hasFork ? 'Fork available' : null,
    item.hasWorkingArtifact ? 'Working artifact' : null,
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
    if (selected.length >= 5) break
    if (selected.some(selectedItem => selectedItem.id === item.id)) continue
    if (usedPreviews.has(item.preview)) continue
    selected.push(item)
    usedPreviews.add(item.preview)
  }

  for (const item of candidates) {
    if (selected.length >= 5) break
    if (!selected.some(selectedItem => selectedItem.id === item.id)) selected.push(item)
  }

  return selected
}

export default async function WhatToBuildPage() {
  const prompts = await getPrompts()
  const catalog = buildPathDiscoveryCatalog(prompts, [])
  const featured = selectCuratedItems(catalog, START_HERE_PROJECT_IDS, 1)[0] ?? recommendedOrder(catalog)[0]
  const rail = selectVariedRail(catalog, featured?.id)

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
                return (
                  <li key={intention.href}>
                    <Link href={intention.href}>
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

      <section className="ideas-feature-section" aria-labelledby="ideas-feature-title">
        <div className="ideas-shell">
          <div className="ideas-section-label">
            <span>One strong place to begin</span>
            <p>See the finished direction before you inspect how it was made.</p>
          </div>

          {featured ? (
            <article className="ideas-feature">
              <Link href={featured.href} className="ideas-feature-preview" aria-label={`Open ${featured.title}`}>
                <IdeaArtifactPreview title={featured.title} variant={featured.preview} />
                <span className="ideas-preview-caption">
                  {featured.hasWorkingArtifact ? 'Working artifact included' : 'Build path preview'}
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

                <div className="ideas-feature-footer">
                  <span>Built by <strong>{featured.authorName}</strong></span>
                  <Link href={featured.href} className="ideas-primary-link">
                    Explore this path
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
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
                <span>Change the kind of challenge</span>
                <h2 id="ideas-rail-title">Different results need different paths.</h2>
              </div>
              <p>Move from practical tools to games, visual work, or a shorter prompt run without starting from a blank chat.</p>
            </div>

            <div className="ideas-path-rail" role="list">
              {rail.map((item, index) => (
                <article key={item.id} className="ideas-rail-item" role="listitem">
                  <Link href={item.href} aria-label={`Explore ${item.title}`}>
                    <div className="ideas-rail-preview">
                      <IdeaArtifactPreview title={item.title} variant={item.preview} compact />
                      <span>0{index + 1}</span>
                    </div>
                    <div className="ideas-rail-copy">
                      <div className="ideas-rail-meta">
                        <span>{item.categoryLabel}</span>
                        <span>{item.difficulty}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <div className="ideas-rail-traits">
                        <span><Layers3 aria-hidden="true" /> {promptLabel(item)}</span>
                        {item.hasFork && <span><GitFork aria-hidden="true" /> Forkable</span>}
                      </div>
                      <span className="ideas-rail-action">See how it was made <ArrowUpRight aria-hidden="true" /></span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            <div className="ideas-rail-footer">
              <p>{catalog.length} real build {catalog.length === 1 ? 'path is' : 'paths are'} available to explore.</p>
              <Link href="/paths?panel=open" className="ideas-text-link">
                View every path
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
