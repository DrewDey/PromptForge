import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'
import { HomeBuildCard } from './HomeBuildCard'

type HomeBuildMosaicProps = {
  featured: BuildPathDiscoveryItem
  recent: BuildPathDiscoveryItem[]
}

export function HomeBuildMosaic({ featured, recent }: HomeBuildMosaicProps) {
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

        <div className="home-build-mosaic">
          <HomeBuildCard item={featured} lead positionLabel="Editor’s starting point" />
          <div className="home-recent-stack" aria-label="Recently added working projects">
            <p className="home-stack-label">Recently added</p>
            {recent.map((item) => (
              <HomeBuildCard key={item.id} item={item} positionLabel="New path" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
