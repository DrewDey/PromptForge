import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TRIP_PACKING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/trip-packing-gemini-pro-source-run.json'

export default function TripPackingPlannerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TRIP_PACKING_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/trip-packing-planner-demo"
      capturedAt="June 5, 2026"
    />
  )
}
