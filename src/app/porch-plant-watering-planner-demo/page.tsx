import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { PORCH_PLANT_WATERING_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function PorchPlantWateringDemoPage() {
  return (
    <PreparedSourceRunPage
      project={PORCH_PLANT_WATERING_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('porch-plant-watering-planner-claude-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
