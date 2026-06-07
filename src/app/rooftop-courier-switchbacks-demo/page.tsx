import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { ROOFTOP_COURIER_SWITCHBACKS_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function RooftopCourierSwitchbacksDemoPage() {
  return (
    <PreparedSourceRunPage
      project={ROOFTOP_COURIER_SWITCHBACKS_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('rooftop-courier-switchbacks-chatgpt-source-run.json')}
      route="/rooftop-courier-switchbacks-demo"
      capturedAt="June 6, 2026"
    />
  )
}
