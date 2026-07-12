import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_BIRTHDAY_RSVP_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyBirthdayRsvpTablePlannerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_BIRTHDAY_RSVP_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-birthday-rsvp-table-planner-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
