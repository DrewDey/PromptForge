import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BuildPathCard } from '@/components/discovery/BuildPathCard'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'

type HomeBuildMosaicProps = {
  items: BuildPathDiscoveryItem[]
}

export function HomeBuildMosaic({ items }: HomeBuildMosaicProps) {
  return (
    <section className="home-library" aria-labelledby="home-library-title">
      <div className="home-shell">
        <header className="home-section-heading">
          <div>
            <p className="home-kicker">Open the result first</p>
            <h2 id="home-library-title">Start with something that already works.</h2>
          </div>
          <p>
            The finished project is the front door. The prompts, responses, model details, and forks stay attached behind it.
          </p>
          <Link href="/paths">Browse all paths <ArrowRight aria-hidden="true" /></Link>
        </header>

        <div
          className="home-build-grid pf-paths"
          aria-label="Recently added working projects"
          data-home-shared-path-cards
        >
          {items.map((item) => (
            <BuildPathCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
