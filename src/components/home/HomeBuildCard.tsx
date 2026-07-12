import Link from 'next/link'
import { ArrowUpRight, GitFork, Layers3 } from 'lucide-react'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'

type HomeBuildCardProps = {
  item: BuildPathDiscoveryItem
  lead?: boolean
  positionLabel: string
}

function modelSummary(item: BuildPathDiscoveryItem) {
  if (item.comparisonCount > 1) return `${item.comparisonCount} model runs`
  return item.modelLabel
}

export function HomeBuildCard({ item, lead = false, positionLabel }: HomeBuildCardProps) {
  const outcome = item.outcome || item.description

  return (
    <article className={`home-build-card${lead ? ' is-lead' : ''}`}>
      <Link href={item.href} aria-label={`Open ${item.title}`}>
        <div className="home-build-visual" data-preview={item.preview}>
          <div className="home-build-visual-topline">
            <span>{positionLabel}</span>
            {item.hasWorkingArtifact && <span className="home-artifact-status"><i /> Working artifact</span>}
          </div>
          <p>{outcome}</p>
        </div>

        <div className="home-build-copy">
          <div className="home-build-category">{item.categoryLabel}</div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>

          <div className="home-build-meta">
            <span>{item.promptCount || 1} {item.promptCount === 1 ? 'prompt' : 'prompts'}</span>
            <span>{modelSummary(item)}</span>
            {item.hasFork && <span><GitFork aria-hidden="true" /> Fork available</span>}
          </div>

          <div className="home-build-foot">
            <span><Layers3 aria-hidden="true" /> by {item.authorName}</span>
            <span>Open path <ArrowUpRight aria-hidden="true" /></span>
          </div>
        </div>
      </Link>
    </article>
  )
}
