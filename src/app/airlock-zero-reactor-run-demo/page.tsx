import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import {
  AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID,
  AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID,
  AIRLOCK_ZERO_GPT_SOURCE_RUN_ID,
  AIRLOCK_ZERO_SHOWCASE_PROJECT,
} from '@/lib/prepared-showcase-projects'
import { preparedModelCohortIsPublic } from '@/lib/prepared-release-gates'
import { notFound } from 'next/navigation'

const route = '/airlock-zero-reactor-run-demo'
const project = AIRLOCK_ZERO_SHOWCASE_PROJECT

export const dynamic = 'force-dynamic'
export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default async function AirlockZeroReactorRunDemoPage({
  searchParams,
}: {
  searchParams: ModelVariantSearchParams
}) {
  if (!await preparedModelCohortIsPublic(project.id, [
    AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID,
    AIRLOCK_ZERO_GPT_SOURCE_RUN_ID,
    AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID,
  ])) {
    notFound()
  }

  return (
    <PreparedModelVariantSourceRunPage
      project={project}
      route={route}
      searchParams={searchParams}
    />
  )
}
