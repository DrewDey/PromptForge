import Link from 'next/link'
import { ArrowUpRight, GitFork, Layers3 } from 'lucide-react'
import { BuilderByline } from '@/components/BuilderByline'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'
import { publicArtifactStatusPresentation } from '@/lib/public-project-truth'

type HomeBuildCardProps = {
  item: BuildPathDiscoveryItem
  lead?: boolean
  positionLabel: string
}

function modelSummary(item: BuildPathDiscoveryItem) {
  if (item.modelVariants.length > 1) return `${item.modelVariants.length} model runs`
  return item.modelLabel
}

export function HomeBuildCard({ item, lead = false, positionLabel }: HomeBuildCardProps) {
  const outcome = item.outcome || item.description
  const defaultVariant = item.modelVariants.find((variant) => variant.isCanonicalDefault)
    ?? item.modelVariants[0]
  const artifactStatus = publicArtifactStatusPresentation({
    qualityStatus: defaultVariant?.qualityStatus ?? 'recorded',
    knownIssueExplanation: defaultVariant?.knownIssueExplanation,
  })
  const knownIssueRunCount = item.modelVariants.filter((variant) => (
    variant.qualityStatus === 'known-issue'
  )).length

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
            <span>{item.modelVariants.length > 1 ? 'Default run · ' : ''}{item.promptCount || 1} {item.promptCount === 1 ? 'prompt' : 'prompts'}</span>
            <span>{modelSummary(item)}</span>
            <span>{artifactStatus.label}</span>
            {defaultVariant && (
              <span data-home-default-source-evidence>
                {defaultVariant.sourceAccessLabel}
                {defaultVariant.recordLabel ? ` · ${defaultVariant.recordLabel}` : ''}
              </span>
            )}
            {knownIssueRunCount > 0 && defaultVariant?.qualityStatus !== 'known-issue' && (
              <span>{knownIssueRunCount} model {knownIssueRunCount === 1 ? 'run' : 'runs'} with known artifact {knownIssueRunCount === 1 ? 'issue' : 'issues'}</span>
            )}
            {defaultVariant && <span>{defaultVariant.modelProofLabel}</span>}
            {item.hasFork && <span><GitFork aria-hidden="true" /> Fork available</span>}
          </div>

          <div className="home-build-foot">
            <span>
              <Layers3 aria-hidden="true" />
              <BuilderByline
                name={item.authorName}
                provenanceKind={item.authorProvenanceKind}
                provenanceClassName="home-build-author-provenance"
              />
            </span>
            <span>Open path <ArrowUpRight aria-hidden="true" /></span>
          </div>
        </div>
      </Link>
    </article>
  )
}
