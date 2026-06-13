import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PROPOSAL_RED_FLAG_HEATMAP_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PROPOSAL_RED_FLAG_HEATMAP_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProposalRedFlagHeatmapClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('proposal-red-flag-heatmap-claude-source-run.json')}
      route="/proposal-red-flag-heatmap-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
