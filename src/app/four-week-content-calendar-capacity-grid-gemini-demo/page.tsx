import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FOUR_WEEK_CONTENT_CALENDAR_CAPACITY_GRID_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FOUR_WEEK_CONTENT_CALENDAR_CAPACITY_GRID_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FourWeekContentCalendarCapacityGridGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('four-week-content-calendar-capacity-grid-gemini-source-run.json')}
      route="/four-week-content-calendar-capacity-grid-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
