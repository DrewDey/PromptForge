import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/rental-walkthrough-red-flag-scorecard-demo'
const sourceRunId = '3137def2-964d-49a8-ad22-3b776870e3fe'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RentalWalkthroughRedFlagScorecardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('rental-walkthrough-red-flag-scorecard-chatgpt-gpt55-medium-source-run.json')}
      route={route}
      capturedAt="June 16, 2026"
    />
  )
}
