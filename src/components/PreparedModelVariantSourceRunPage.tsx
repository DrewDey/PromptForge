import { redirect } from 'next/navigation'
import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import {
  getPublishedProjectModelVariants,
  ProjectModelVariantReadError,
} from '@/lib/data/model-variants'
import type { PreparedShowcaseProject } from '@/lib/prepared-showcase-projects'
import {
  getProjectModelVariantSet,
  reconcileProjectModelVariantSet,
  resolveProjectModelVariant,
  resolveProjectModelVariantComparison,
} from '@/lib/project-model-variants'

export type ModelVariantSearchParams = Promise<{
  run?: string | string[]
  compare?: string | string[]
}>

function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function selectedRoute(
  route: string,
  activeSourceRunId: string,
  defaultSourceRunId: string,
  compareSourceRunId?: string,
) {
  if (activeSourceRunId === defaultSourceRunId && !compareSourceRunId) return route

  const query = new URLSearchParams({ run: activeSourceRunId })
  if (compareSourceRunId) query.set('compare', compareSourceRunId)
  return `${route}?${query.toString()}`
}

export default async function PreparedModelVariantSourceRunPage({
  project,
  route,
  searchParams,
}: {
  project: PreparedShowcaseProject
  route: string
  searchParams: ModelVariantSearchParams
}) {
  const params = await searchParams
  const hasRepeatedSelectionParam = Array.isArray(params.run) || Array.isArray(params.compare)
  const preparedVariantSet = getProjectModelVariantSet(project.id)
  if (!preparedVariantSet) {
    throw new Error(`Missing model-variant set for project ${project.id}.`)
  }

  let databaseRecords: Awaited<ReturnType<typeof getPublishedProjectModelVariants>> = null
  let registryWarning: string | undefined
  try {
    databaseRecords = await getPublishedProjectModelVariants(project.id)
  } catch (error) {
    if (!(error instanceof ProjectModelVariantReadError)) throw error
    registryWarning =
      'Live model history is temporarily unavailable. This page is showing the checked release; reload to refresh it.'
  }
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
    route,
    activeVariant.sourceRunId,
    variantSet.defaultSourceRunId,
    compareVariant?.sourceRunId,
  )
  const requestedSelectionIsCanonical =
    !hasRepeatedSelectionParam &&
    (
      (requestedRun === undefined && requestedCompare === undefined) ||
      (
        requestedRun === activeVariant.sourceRunId &&
        requestedCompare === compareVariant?.sourceRunId &&
        resolvedRoute !== route
      )
    )

  if (!requestedSelectionIsCanonical) redirect(resolvedRoute)

  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={activeVariant.sourceRunPackage}
      route={resolvedRoute}
      capturedAt={activeVariant.capturedAt}
      modelVariantSet={variantSet}
      activeModelVariant={activeVariant}
      compareModelVariant={compareVariant}
      modelVariantRegistryWarning={registryWarning}
    />
  )
}
