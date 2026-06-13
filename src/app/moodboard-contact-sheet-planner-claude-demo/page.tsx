import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { MOODBOARD_CONTACT_SHEET_PLANNER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = MOODBOARD_CONTACT_SHEET_PLANNER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function MoodboardContactSheetPlannerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('moodboard-contact-sheet-planner-claude-source-run.json')}
      route="/moodboard-contact-sheet-planner-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
