import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { LUNCHBOX_CONVEYOR_SORTER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function LunchboxConveyorSorterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={LUNCHBOX_CONVEYOR_SORTER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('lunchbox-conveyor-sorter-chatgpt-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
