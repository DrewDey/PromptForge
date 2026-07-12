import Link from 'next/link'
import { ArrowRight, GitCompareArrows } from 'lucide-react'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'

type HomeModelEvolutionProps = {
  item: BuildPathDiscoveryItem
}

export function HomeModelEvolution({ item }: HomeModelEvolutionProps) {
  const models = [...item.modelLabels].sort((left, right) => left.localeCompare(right))

  return (
    <section className="home-model-story" aria-labelledby="home-model-title">
      <div className="home-shell">
        <div className="home-model-panel">
          <div className="home-model-intro">
            <p className="home-kicker"><GitCompareArrows aria-hidden="true" /> Model history</p>
            <h2 id="home-model-title">The project stays recognizable. The model can change.</h2>
            <p>
              PathForge keeps developer-run versions of the same project together, so the differences stay inspectable instead of disappearing into separate pages.
            </p>
            <Link href={item.href}>Open this model history <ArrowRight aria-hidden="true" /></Link>
          </div>

          <div className="home-model-project">
            <p>One project · {models.length} model runs</p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <ul aria-label={`Models available for ${item.title}`}>
              {models.map((model) => <li key={model}>{model}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
