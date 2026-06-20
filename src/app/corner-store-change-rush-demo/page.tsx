import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { CORNER_STORE_CHANGE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function CornerStoreChangeRushDemoPage() {
  return (
    <PreparedSourceRunPage
      project={CORNER_STORE_CHANGE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('corner-store-change-rush-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
