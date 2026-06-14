import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CHARACTER_SCENE_BEAT_CONTINUITY_BOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CHARACTER_SCENE_BEAT_CONTINUITY_BOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CharacterSceneBeatContinuityBoardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('character-scene-beat-continuity-board-claude-source-run.json')}
      route="/character-scene-beat-continuity-board-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
