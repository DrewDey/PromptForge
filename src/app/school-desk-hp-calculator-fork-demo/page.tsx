import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SCHOOL_DESK_HP_CALCULATOR_FORK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SCHOOL_DESK_HP_CALCULATOR_FORK_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SchoolDeskHpCalculatorForkDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('school-desk-hp-10bii-calculator-claude-5-fable-max-fork.json')}
      route="/school-desk-hp-calculator-fork-demo"
      capturedAt="June 9, 2026"
    />
  )
}
