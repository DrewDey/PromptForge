import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { RAINY_WINDOW_CAFE_RUSH_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function RainyWindowCafeRushDemoPage() {
  return (
    <PreparedSourceRunPage
      project={RAINY_WINDOW_CAFE_RUSH_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('rainy-window-cafe-rush-chatgpt-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
