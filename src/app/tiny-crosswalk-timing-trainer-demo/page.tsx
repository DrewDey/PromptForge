import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_CROSSWALK_TIMING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyCrosswalkTimingTrainerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_CROSSWALK_TIMING_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-crosswalk-timing-trainer-chatgpt-source-run.json')}
      route="/tiny-crosswalk-timing-trainer-demo"
      capturedAt="June 6, 2026"
    />
  )
}
