import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { CAMPAIGN_CAPTION_INGREDIENT_MIXER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = CAMPAIGN_CAPTION_INGREDIENT_MIXER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CampaignCaptionIngredientMixerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('campaign-caption-ingredient-mixer-gemini-source-run.json')}
      route="/campaign-caption-ingredient-mixer-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
