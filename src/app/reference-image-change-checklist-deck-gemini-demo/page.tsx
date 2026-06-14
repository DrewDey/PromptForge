import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { REFERENCE_IMAGE_CHANGE_CHECKLIST_DECK_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = REFERENCE_IMAGE_CHANGE_CHECKLIST_DECK_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ReferenceImageChangeChecklistDeckGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('reference-image-change-checklist-deck-gemini-source-run.json')}
      route="/reference-image-change-checklist-deck-gemini-demo"
      capturedAt="June 14, 2026"
    />
  )
}
