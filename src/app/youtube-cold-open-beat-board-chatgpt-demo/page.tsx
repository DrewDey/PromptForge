import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { YOUTUBE_COLD_OPEN_BEAT_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = YOUTUBE_COLD_OPEN_BEAT_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function YoutubeColdOpenBeatBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('youtube-cold-open-beat-board-chatgpt-source-run.json')}
      route="/youtube-cold-open-beat-board-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
