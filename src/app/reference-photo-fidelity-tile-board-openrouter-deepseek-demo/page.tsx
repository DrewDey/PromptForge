import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { REFERENCE_PHOTO_FIDELITY_TILE_BOARD_OPENROUTER_DEEPSEEK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = REFERENCE_PHOTO_FIDELITY_TILE_BOARD_OPENROUTER_DEEPSEEK_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ReferencePhotoFidelityTileBoardOpenrouterDeepseekDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('reference-photo-fidelity-tile-board-openrouter-deepseek-source-run.json')}
      route="/reference-photo-fidelity-tile-board-openrouter-deepseek-demo"
      capturedAt="June 13, 2026"
    />
  )
}
