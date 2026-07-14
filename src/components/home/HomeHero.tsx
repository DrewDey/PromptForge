import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { ProjectPreview } from '@/components/ProjectPreview'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'

type HomeHeroProps = {
  pathCount: number
  featured?: BuildPathDiscoveryItem
}

const startingPoints = [
  { href: '/paths?intent=organize', label: 'Use something practical', note: 'Planners, boards, calculators' },
  { href: '/paths?intent=play', label: 'Play something', note: 'Games, puzzles, experiments' },
  { href: '/paths?compare=models', label: 'Compare model runs', note: 'Same brief, different models' },
  { href: '/paths?intent=one-prompt', label: 'Start with one prompt', note: 'Small paths with a short runway' },
] as const

export function HomeHero({ pathCount, featured }: HomeHeroProps) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-shell">
        <div className="home-hero-layout">
          <div className="home-hero-copy">
            <p className="home-kicker">{pathCount.toLocaleString()} published build paths</p>
            <h1 id="home-title">See what people built with AI. Start from there.</h1>
            <p className="home-intro">
              Open a finished project, inspect the exact prompts and responses behind it, then fork the point where your version changes.
            </p>

            <form className="home-search" action="/paths" method="get" role="search">
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="home-path-search">Search build paths</label>
              <input
                id="home-path-search"
                name="q"
                type="search"
                placeholder="What do you want to make?"
                autoComplete="off"
              />
              <button type="submit">Search</button>
            </form>

            <div className="home-hero-links">
              <Link href="/paths">Explore every path <ArrowRight aria-hidden="true" /></Link>
              <Link href="/guide">See how PathForge works</Link>
            </div>
          </div>

          {featured && (
            <Link href={featured.href} className="home-hero-demo" aria-label={`Open featured project: ${featured.title}`}>
              <div className="home-hero-demo-heading">
                <span>Open a real working result</span>
                <strong>{featured.categoryLabel} · {featured.promptCount || 1} {featured.promptCount === 1 ? 'prompt' : 'prompts'}</strong>
              </div>
              <ProjectPreview
                artifactPath={featured.artifactPath}
                title={featured.title}
                label="Featured working artifact"
                className="home-hero-project-preview"
              />
            </Link>
          )}
        </div>

        <nav className="home-entry-strip" aria-label="Browse build paths by outcome">
          <p>Browse by outcome</p>
          <ol>
            {startingPoints.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  )
}
