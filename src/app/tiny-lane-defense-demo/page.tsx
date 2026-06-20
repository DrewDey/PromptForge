import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { LANE_DEFENSE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/lane-defense-chatgpt-gpt55-heavy-oneshot.json'

export default function TinyLaneDefenseDemoPage() {
  return (
    <PreparedSourceRunPage
      project={LANE_DEFENSE_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      capturedAt="June 4, 2026"
    />
  )
}
