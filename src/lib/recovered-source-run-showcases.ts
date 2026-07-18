import recoveredSourceRunData from '../../seed-runs/curation/2026-07-16-recovered-approved-source-runs.json'
import type { PreparedShowcaseProject } from './prepared-showcase-projects'
import type { Prompt } from './types'

const EXPECTED_RECOVERED_PROJECT_COUNT = 98
const EXCLUDED_UNAPPROVED_PROJECT_ID = '46e0df9b-f469-5612-a8ac-d409dfa009cd'

type RecoveredSourceRunDescriptor = {
  projectId: string
  sourceRunId: string
  sourceRunPackageFile: string
  capturedAt: string
  href: string
  title: string
  description: string
  content: string
  resultContent: string
  categorySlug: string
  mockCategoryId: string
  difficulty: Prompt['difficulty']
  modelUsed: string
  modelRecommendation: string
  promptFamilyId?: string
  toolsUsed: string[]
  tags: string[]
  artifactPath: string
  sourceUrl: string
  authorDisplayName: string
  authorUsername: string
  createdAt: string
  updatedAt: string
  prompts: string[]
}

type RecoveredSourceRunManifest = {
  manifestVersion: string
  approvedRecoveredCount: number
  excludedOldOnlyProjects: Array<{
    projectId: string
    href: string
    reason: string
  }>
  projects: RecoveredSourceRunDescriptor[]
}

const manifest = recoveredSourceRunData as RecoveredSourceRunManifest

function assertRecoveredSourceRunManifest() {
  if (manifest.manifestVersion !== '1') {
    throw new Error(`Unsupported recovered source-run manifest ${manifest.manifestVersion}.`)
  }
  if (
    manifest.approvedRecoveredCount !== EXPECTED_RECOVERED_PROJECT_COUNT ||
    manifest.projects.length !== EXPECTED_RECOVERED_PROJECT_COUNT
  ) {
    throw new Error(
      `Recovered source-run manifest must contain ${EXPECTED_RECOVERED_PROJECT_COUNT} approved projects.`,
    )
  }
  if (
    manifest.excludedOldOnlyProjects.length !== 1 ||
    manifest.excludedOldOnlyProjects[0]?.projectId !== EXCLUDED_UNAPPROVED_PROJECT_ID
  ) {
    throw new Error('Recovered source-run manifest must preserve the single verified exclusion.')
  }

  const projectIds = new Set<string>()
  const sourceRunIds = new Set<string>()
  const hrefs = new Set<string>()
  const packageFiles = new Set<string>()
  for (const descriptor of manifest.projects) {
    if (descriptor.projectId === EXCLUDED_UNAPPROVED_PROJECT_ID) {
      throw new Error(`Unapproved project ${descriptor.projectId} cannot enter the recovered registry.`)
    }
    if (!descriptor.href.startsWith('/') || descriptor.href.startsWith('/recovered-source-runs/')) {
      throw new Error(`Recovered project ${descriptor.projectId} has an invalid public href.`)
    }
    if (
      !descriptor.sourceRunPackageFile.endsWith('.json') ||
      descriptor.sourceRunPackageFile.includes('/') ||
      descriptor.sourceRunPackageFile.includes('\\')
    ) {
      throw new Error(`Recovered project ${descriptor.projectId} has an invalid package file.`)
    }
    if (!descriptor.artifactPath.startsWith('/artifacts/')) {
      throw new Error(`Recovered project ${descriptor.projectId} has an invalid artifact path.`)
    }
    for (const [label, value, values] of [
      ['project id', descriptor.projectId, projectIds],
      ['source-run id', descriptor.sourceRunId, sourceRunIds],
      ['public href', descriptor.href, hrefs],
      ['package file', descriptor.sourceRunPackageFile, packageFiles],
    ] as const) {
      if (values.has(value)) {
        throw new Error(`Recovered source-run manifest repeats ${label} ${value}.`)
      }
      values.add(value)
    }
  }
}

assertRecoveredSourceRunManifest()

function buildRecoveredSourceRunProject(
  descriptor: RecoveredSourceRunDescriptor,
): PreparedShowcaseProject {
  return {
    id: descriptor.projectId,
    sourceRunId: descriptor.sourceRunId,
    sourceRunPackageFile: descriptor.sourceRunPackageFile,
    href: descriptor.href,
    title: descriptor.title,
    description: descriptor.description,
    content: descriptor.content,
    resultContent: descriptor.resultContent,
    categorySlug: descriptor.categorySlug,
    mockCategoryId: descriptor.mockCategoryId,
    difficulty: descriptor.difficulty,
    modelUsed: descriptor.modelUsed,
    modelRecommendation: descriptor.modelRecommendation,
    promptFamilyId: descriptor.promptFamilyId,
    toolsUsed: descriptor.toolsUsed,
    tags: descriptor.tags,
    artifactPath: descriptor.artifactPath,
    sourceUrl: descriptor.sourceUrl,
    authorDisplayName: descriptor.authorDisplayName,
    authorUsername: descriptor.authorUsername,
    createdAt: descriptor.createdAt,
    updatedAt: descriptor.updatedAt,
    steps: descriptor.prompts.map((prompt, index) => ({
      id: `${descriptor.projectId}-step-${index + 1}`,
      stepNumber: index + 1,
      title: index === 0 ? 'Start the build' : `Refine the build ${index + 1}`,
      content: prompt,
      resultContent: '',
      description: index === descriptor.prompts.length - 1
        ? 'Final response package that produced the mounted public artifact.'
        : 'Captured source-run prompt preserved before its response package.',
    })),
  }
}

export type RecoveredSourceRunShowcase = {
  slug: string
  capturedAt: string
  sourceRunPackageFile: string
  project: PreparedShowcaseProject
}

export const RECOVERED_SOURCE_RUN_SHOWCASES: RecoveredSourceRunShowcase[] =
  manifest.projects.map((descriptor) => ({
    slug: descriptor.href.slice(1),
    capturedAt: descriptor.capturedAt,
    sourceRunPackageFile: descriptor.sourceRunPackageFile,
    project: buildRecoveredSourceRunProject(descriptor),
  }))

export const RECOVERED_SOURCE_RUN_SHOWCASE_PROJECTS =
  RECOVERED_SOURCE_RUN_SHOWCASES.map((showcase) => showcase.project)

export const RECOVERED_SOURCE_RUN_ROUTE_OVERRIDES: Record<string, string> =
  Object.fromEntries(
    RECOVERED_SOURCE_RUN_SHOWCASES.map(({ project }) => [project.id, project.href]),
  )

export function getRecoveredSourceRunShowcaseBySlug(slug: string) {
  return RECOVERED_SOURCE_RUN_SHOWCASES.find((showcase) => showcase.slug === slug) ?? null
}
