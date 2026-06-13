import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SHORT_VIDEO_HOOK_BEAT_SHEET_TIMER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SHORT_VIDEO_HOOK_BEAT_SHEET_TIMER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ShortVideoHookBeatSheetTimerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('short-video-hook-beat-sheet-timer-gemini-source-run.json')}
      route="/short-video-hook-beat-sheet-timer-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
