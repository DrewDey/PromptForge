import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { AIRLOCK_ZERO_CLAUDE_FORK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { preparedProjectIsPublic } from '@/lib/prepared-release-gates'
import { loadSourceRunPackage } from '@/lib/source-run-package'
import { notFound } from 'next/navigation'

const route = '/airlock-zero-blackout-shift-fork-demo'
const project = AIRLOCK_ZERO_CLAUDE_FORK_SHOWCASE_PROJECT

export const dynamic = 'force-dynamic'
export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default async function AirlockZeroBlackoutShiftForkDemoPage() {
  if (!await preparedProjectIsPublic(project.id)) notFound()

  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json')}
      route={route}
      capturedAt="July 11, 2026"
    />
  )
}
