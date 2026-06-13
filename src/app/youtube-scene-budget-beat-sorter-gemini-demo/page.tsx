import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { YOUTUBE_SCENE_BUDGET_BEAT_SORTER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = YOUTUBE_SCENE_BUDGET_BEAT_SORTER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function YoutubeSceneBudgetBeatSorterGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('youtube-scene-budget-beat-sorter-gemini-source-run.json')}
      route="/youtube-scene-budget-beat-sorter-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
