import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MAILROOM_CART_ROUTE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MailroomCartRoutePuzzleDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MAILROOM_CART_ROUTE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('mailroom-cart-route-puzzle-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
