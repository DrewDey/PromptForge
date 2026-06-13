import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { BACK_COVER_BLURB_BEAT_MAPPER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = BACK_COVER_BLURB_BEAT_MAPPER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function BackCoverBlurbBeatMapperClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('back-cover-blurb-beat-mapper-claude-source-run.json')}
      route="/back-cover-blurb-beat-mapper-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
