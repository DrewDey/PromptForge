import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { RECIPE_LEFTOVER_CAPTION_PACK_SORTER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = RECIPE_LEFTOVER_CAPTION_PACK_SORTER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RecipeLeftoverCaptionPackSorterGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('recipe-leftover-caption-pack-sorter-gemini-source-run.json')}
      route="/recipe-leftover-caption-pack-sorter-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
