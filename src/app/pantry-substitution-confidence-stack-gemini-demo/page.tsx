import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PANTRY_SUBSTITUTION_CONFIDENCE_STACK_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PANTRY_SUBSTITUTION_CONFIDENCE_STACK_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PantrySubstitutionConfidenceStackGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('pantry-substitution-confidence-stack-gemini-source-run.json')}
      route="/pantry-substitution-confidence-stack-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
