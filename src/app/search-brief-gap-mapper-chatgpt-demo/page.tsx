import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SEARCH_BRIEF_GAP_MAPPER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SEARCH_BRIEF_GAP_MAPPER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SearchBriefGapMapperChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('search-brief-gap-mapper-chatgpt-source-run.json')}
      route="/search-brief-gap-mapper-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
