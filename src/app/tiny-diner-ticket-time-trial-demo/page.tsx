import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_DINER_TICKET_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyDinerTicketTimeTrialDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_DINER_TICKET_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-diner-ticket-time-trial-chatgpt-source-run.json')}
      route="/tiny-diner-ticket-time-trial-demo"
      capturedAt="June 6, 2026"
    />
  )
}
