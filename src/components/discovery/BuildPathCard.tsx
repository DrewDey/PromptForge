import type { BuildPathDiscoveryItem } from '@/lib/path-discovery'
import {
  InteractiveBuildPathCard,
  type BuildPathCardClientItem,
} from './InteractiveBuildPathCard'

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

function clientItem(item: BuildPathDiscoveryItem): BuildPathCardClientItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    categoryLabel: item.categoryLabel,
    authorName: item.authorName,
    modelRunCount: item.modelRunCount,
    variantsAreVerified: item.verifiedModelCount > 0,
    hasWorkingArtifact: item.hasWorkingArtifact,
    hasFork: item.hasFork,
    isFork: item.isFork,
    forkCount: item.forkCount,
    isActive: item.isActive,
    preview: item.preview,
    modelVariants: item.modelVariants,
  }
}

export function BuildPathCard({
  item,
  featured = false,
  compact = false,
  engagement,
}: BuildPathCardProps) {
  return (
    <InteractiveBuildPathCard
      item={clientItem(item)}
      featured={featured}
      compact={compact}
      engagement={engagement ? {
        promptId: item.id,
        initialVoteCount: item.prompt.vote_count,
        initialBookmarkCount: item.prompt.bookmark_count,
        ...engagement,
      } : undefined}
    />
  )
}
