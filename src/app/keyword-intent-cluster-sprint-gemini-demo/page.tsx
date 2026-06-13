import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { KEYWORD_INTENT_CLUSTER_SPRINT_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = KEYWORD_INTENT_CLUSTER_SPRINT_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function KeywordIntentClusterSprintGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('keyword-intent-cluster-sprint-gemini-source-run.json')}
      route="/keyword-intent-cluster-sprint-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
