import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TRIP_PACKING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/trip-packing-gemini-pro-source-run.json'

export const metadata = buildPreparedSourceRunDetailMetadata(TRIP_PACKING_SHOWCASE_PROJECT)

export default function TripPackingPlannerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TRIP_PACKING_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      capturedAt="June 5, 2026"
    />
  )
}
