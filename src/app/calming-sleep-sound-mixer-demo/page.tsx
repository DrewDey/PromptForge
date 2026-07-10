import { redirect } from 'next/navigation'
import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPublishedProjectModelVariants } from '@/lib/data/model-variants'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import {
  getProjectModelVariantSet,
  reconcileProjectModelVariantSet,
  resolveProjectModelVariant,
  resolveProjectModelVariantComparison,
} from '@/lib/project-model-variants'

const route = '/calming-sleep-sound-mixer-demo'
const sourceRunId = 'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function selectedRoute(
  activeSourceRunId: string,
  defaultSourceRunId: string,
  compareSourceRunId?: string,
) {
  if (activeSourceRunId === defaultSourceRunId && !compareSourceRunId) return route

  const query = new URLSearchParams({ run: activeSourceRunId })
  if (compareSourceRunId) query.set('compare', compareSourceRunId)
  return `${route}?${query.toString()}`
}

export default async function CalmingSleepSoundMixerDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string | string[]; compare?: string | string[] }>
}) {
  const params = await searchParams
  const preparedVariantSet = getProjectModelVariantSet(project!.id)
  if (!preparedVariantSet) throw new Error(`Missing model-variant set for project ${project!.id}.`)

  const databaseRecords = await getPublishedProjectModelVariants(project!.id)
  const variantSet = reconcileProjectModelVariantSet(preparedVariantSet, databaseRecords)
  const requestedRun = singleParam(params.run)
  const requestedCompare = singleParam(params.compare)
  const activeVariant = resolveProjectModelVariant(variantSet, requestedRun)
  const compareVariant = resolveProjectModelVariantComparison(
    variantSet,
    activeVariant.sourceRunId,
    requestedCompare,
  )
  const resolvedRoute = selectedRoute(
    activeVariant.sourceRunId,
    variantSet.defaultSourceRunId,
    compareVariant?.sourceRunId,
  )
  const requestedSelectionIsCanonical =
    (requestedRun === undefined && requestedCompare === undefined) ||
    (
      requestedRun === activeVariant.sourceRunId &&
      requestedCompare === compareVariant?.sourceRunId &&
      resolvedRoute !== route
    )

  if (!requestedSelectionIsCanonical) redirect(resolvedRoute)

  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={activeVariant.sourceRunPackage}
      route={resolvedRoute}
      capturedAt={activeVariant.capturedAt}
      modelVariantSet={variantSet}
      activeModelVariant={activeVariant}
      compareModelVariant={compareVariant}
    />
  )
}
