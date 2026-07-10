import curatedSourceRunData from '../../seed-runs/curation/2026-07-10-accepted-projects.json'
import type { PreparedShowcaseProject } from './prepared-showcase-projects'
import type { Prompt } from './types'

type CuratedSourceRunDescriptor = {
  projectId: string
  sourceRunId: string
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

function buildCuratedSourceRunProject(
  descriptor: CuratedSourceRunDescriptor,
): PreparedShowcaseProject {
  return {
    id: descriptor.projectId,
    sourceRunId: descriptor.sourceRunId,
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
      description:
        index === descriptor.prompts.length - 1
          ? 'Final response package that produced the mounted public artifact.'
          : 'Captured source-run prompt preserved before its response package.',
    })),
  }
}

const CURATED_SOURCE_RUN_DESCRIPTORS =
  curatedSourceRunData.projects as CuratedSourceRunDescriptor[]

export const CURATED_SOURCE_RUN_SHOWCASE_PROJECTS: PreparedShowcaseProject[] =
  CURATED_SOURCE_RUN_DESCRIPTORS.map(buildCuratedSourceRunProject)
