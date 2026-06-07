import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { SMALL_CLINIC_CALLBACK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function SmallClinicCallbackQueueBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={SMALL_CLINIC_CALLBACK_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('small-clinic-callback-queue-board-gemini-source-run.json')}
      route="/small-clinic-callback-queue-board-demo"
      capturedAt="June 6, 2026"
    />
  )
}
