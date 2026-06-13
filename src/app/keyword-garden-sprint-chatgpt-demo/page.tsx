import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { KEYWORD_GARDEN_SPRINT_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = KEYWORD_GARDEN_SPRINT_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function KeywordGardenSprintChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('keyword-garden-sprint-chatgpt-source-run.json')}
      route="/keyword-garden-sprint-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
