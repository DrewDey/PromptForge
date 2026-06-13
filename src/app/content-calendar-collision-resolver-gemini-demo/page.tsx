import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CONTENT_CALENDAR_COLLISION_RESOLVER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CONTENT_CALENDAR_COLLISION_RESOLVER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ContentCalendarCollisionResolverGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('content-calendar-collision-resolver-gemini-source-run.json')}
      route="/content-calendar-collision-resolver-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
