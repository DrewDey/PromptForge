import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ACCIDENTAL_SNAPSHOT_SHOT_LIST_LAB_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ACCIDENTAL_SNAPSHOT_SHOT_LIST_LAB_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function AccidentalSnapshotShotListLabGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('accidental-snapshot-shot-list-lab-gemini-source-run.json')}
      route="/accidental-snapshot-shot-list-lab-gemini-demo"
      capturedAt="June 14, 2026"
    />
  )
}
