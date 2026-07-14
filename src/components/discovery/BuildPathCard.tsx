import Link from 'next/link'
import { ArrowUpRight, GitFork, Layers3 } from 'lucide-react'
import VoteBookmarkButtons from '@/components/VoteBookmarkButtons'
import { ProjectPreview } from '@/components/ProjectPreview'
import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'
import { ArtifactPreview } from './ArtifactPreview'

type BuildPathCardProps = {
  item: BuildPathDiscoveryItem
  featured?: boolean
  compact?: boolean
  engagement?: {
    isLoggedIn: boolean
    initialVoted: boolean
    initialBookmarked: boolean
    loginNextPath: string
  }
}

function PathAnatomy({ item }: { item: BuildPathDiscoveryItem }) {
  const parts = [
    `${item.promptCount || 1} ${item.promptCount === 1 ? 'prompt' : 'prompts'}`,
    item.comparisonCount > 1 ? `${item.comparisonCount} models` : item.modelLabel,
    item.hasFork ? 'Fork available' : null,
  ].filter(Boolean)

  return <span>{parts.join(' · ')}</span>
}

export function BuildPathCard({ item, featured = false, compact = false, engagement }: BuildPathCardProps) {
  const initials = item.authorName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const showArtifactPreview = Boolean(item.artifactPath && (featured || compact))

  return (
    <article className={`path-card${featured ? ' is-featured' : ''}${compact ? ' is-compact' : ''}`}>
      <div className="path-card-link">
        {showArtifactPreview ? (
          <ProjectPreview
            artifactPath={item.artifactPath}
            title={item.title}
            label="Staff pick · real artifact"
            className="path-real-project-preview"
          />
        ) : (
          <ArtifactPreview variant={item.preview} title={item.title} large={featured} live={item.hasWorkingArtifact} />
        )}
        <div className="path-card-body">
          <div className="path-card-labels">
            <span>{item.categoryLabel}</span>
            {item.hasWorkingArtifact && <span className="path-card-verified"><i /> Working artifact</span>}
          </div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="path-card-author">
            <span className="path-card-avatar">{initials}</span>
            <span>by <strong>{item.authorName}</strong></span>
          </div>
          <div className="path-card-foot">
            <span className="path-card-anatomy">
              {item.hasFork ? <GitFork aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
              <PathAnatomy item={item} />
            </span>
            <span className="path-card-action">Explore path <ArrowUpRight aria-hidden="true" /></span>
          </div>
        </div>
      </div>
      <Link href={item.href} className="path-card-hit-area" aria-label={`Explore ${item.title}`}>
        <span className="sr-only">Explore {item.title}</span>
      </Link>
      {engagement && (
        <div className="path-card-quick-actions" aria-label={`Save or upvote ${item.title}`}>
          <VoteBookmarkButtons
            promptId={item.id}
            initialVoteCount={item.prompt.vote_count}
            initialBookmarkCount={item.prompt.bookmark_count}
            initialVoted={engagement.initialVoted}
            initialBookmarked={engagement.initialBookmarked}
            isLoggedIn={engagement.isLoggedIn}
            loginNextPath={engagement.loginNextPath}
            hideZeroCounts
          />
        </div>
      )}
    </article>
  )
}
