import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { VOICEOVER_EMOTION_TAG_TIMING_BOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = VOICEOVER_EMOTION_TAG_TIMING_BOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function VoiceoverEmotionTagTimingBoardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('voiceover-emotion-tag-timing-board-claude-source-run.json')}
      route="/voiceover-emotion-tag-timing-board-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
