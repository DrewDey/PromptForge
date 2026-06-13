import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ARTICLE_ANGLE_TRIAGE_SPRINT_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ARTICLE_ANGLE_TRIAGE_SPRINT_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ArticleAngleTriageSprintChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('article-angle-triage-sprint-chatgpt-source-run.json')}
      route="/article-angle-triage-sprint-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
