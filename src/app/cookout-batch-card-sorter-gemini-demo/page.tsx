import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { COOKOUT_BATCH_CARD_SORTER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = COOKOUT_BATCH_CARD_SORTER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CookoutBatchCardSorterGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('cookout-batch-card-sorter-gemini-source-run.json')}
      route="/cookout-batch-card-sorter-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
