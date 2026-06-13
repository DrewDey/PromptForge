import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POTLUCK_ALLERGEN_LABEL_MIXER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = POTLUCK_ALLERGEN_LABEL_MIXER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PotluckAllergenLabelMixerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('potluck-allergen-label-mixer-gemini-source-run.json')}
      route="/potluck-allergen-label-mixer-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
