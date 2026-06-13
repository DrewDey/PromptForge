import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { INTERNAL_LINK_RESCUE_MAP_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = INTERNAL_LINK_RESCUE_MAP_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function InternalLinkRescueMapChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('internal-link-rescue-map-chatgpt-source-run.json')}
      route="/internal-link-rescue-map-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
