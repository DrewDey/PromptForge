import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CAROUSEL_HOOK_CONTINUITY_CHECKER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CAROUSEL_HOOK_CONTINUITY_CHECKER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CarouselHookContinuityCheckerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('carousel-hook-continuity-checker-claude-source-run.json')}
      route="/carousel-hook-continuity-checker-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
