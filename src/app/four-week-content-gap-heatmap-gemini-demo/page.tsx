import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FOUR_WEEK_CONTENT_GAP_HEATMAP_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FOUR_WEEK_CONTENT_GAP_HEATMAP_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FourWeekContentGapHeatmapGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('four-week-content-gap-heatmap-gemini-source-run.json')}
      route="/four-week-content-gap-heatmap-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
