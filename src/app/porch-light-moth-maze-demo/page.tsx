import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { PORCH_LIGHT_MOTH_MAZE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function PorchLightMothMazeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={PORCH_LIGHT_MOTH_MAZE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('porch-light-moth-maze-chatgpt-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
