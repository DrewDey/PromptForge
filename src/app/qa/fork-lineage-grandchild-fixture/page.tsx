import { notFound } from 'next/navigation'
import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import {
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
} from '@/lib/featured-projects'
import type { PreparedShowcaseProject } from '@/lib/prepared-showcase-projects'
import type { SourceRunPackage } from '@/lib/source-run-package'

export const metadata = {
  robots: { index: false, follow: false },
}

const projectId = 'cf151b15-2b30-4eef-90d1-15654e74bac1'
const sourceRunId = '0b3b00b1-e639-420d-85c9-0ee22bb7b63c'
const parentSourceRunId = 'd9fa40e7-7725-4387-ad5b-14f25cf744ce'
const sourceStepId = `${SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID}:${parentSourceRunId}:step:3`
const promptFamilyId = `${SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID}:${sourceStepId}`
const artifactPath = 'public/artifacts/fork-lineage-grandchild-fixture.html'
const artifactSha256 = 'd0c8a14e51ac385c1ea344942c0edd5b3a097f359c04b8b4a72919e39db93c38'
const parentArtifactPath = 'public/artifacts/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.html'
const parentArtifactSha256 = 'c4af9259664a6d5d7fd09096e83f9556a3409fdd4dbaf43db4912eae4fb3ae35'

const forkSource = {
  sourceProjectId: SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  sourceProjectTitle: 'School Desk HP 10Bii+ Calculator',
  sourceRunId: parentSourceRunId,
  sourceStepId,
  sourceStepNumber: 3,
  sourceArtifactPath: parentArtifactPath,
  sourceArtifactSha256: parentArtifactSha256,
  depth: 1,
  branchIndex: 0,
  promptFamilyId,
} as const

const project: PreparedShowcaseProject = {
  id: projectId,
  sourceRunId,
  href: '/qa/fork-lineage-grandchild-fixture',
  title: 'Calculator Night-Class Grandchild',
  description: 'A local-only third-generation fixture for the prepared fork lineage renderer.',
  content: 'This route verifies that the original calculator, school-desk branch, and grandchild remain visible in one ordered lineage.',
  resultContent: 'Three complete lineage crumbs and inherited source responses remain attached to the exact response socket.',
  categorySlug: 'finance',
  mockCategoryId: 'cat-1',
  difficulty: 'beginner',
  modelUsed: 'Fixture model',
  modelRecommendation: 'Fixture model',
  promptFamilyId,
  toolsUsed: ['HTML', 'Browser'],
  tags: ['fixture', 'fork', 'nested lineage'],
  artifactPath: `/${artifactPath.replace(/^public\//, '')}`,
  sourceUrl: '',
  authorDisplayName: 'PathForge QA',
  authorUsername: 'pathforge_qa',
  forkSource,
  createdAt: '2026-07-11T20:00:00.000Z',
  updatedAt: '2026-07-11T20:00:00.000Z',
  steps: [{
    id: `${projectId}-step-4`,
    stepNumber: 4,
    title: 'Continue the second-generation calculator',
    content: 'Continue from the school-desk response and prove the full lineage remains visible.',
    resultContent: '',
    description: 'Local-only nested lineage verification step.',
  }],
}

const sourceRunPackage: SourceRunPackage = {
  title: project.title,
  provider: 'Fixture',
  model: project.modelUsed,
  source_run_id: sourceRunId,
  prompt_count: 1,
  final_artifact_path: artifactPath,
  artifact_sha256: artifactSha256,
  fork_source: forkSource,
  steps: [{
    step_number: 4,
    prompt_exact: project.steps[0].content,
    response_exact: 'The fixture preserved every ancestor and mounted the third-generation artifact.',
    artifact_version_path: artifactPath,
    artifact_sha256: artifactSha256,
    generated_files: [artifactPath],
  }],
}

export default function ForkLineageGrandchildFixturePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={sourceRunPackage}
      route={project.href}
      capturedAt="Local QA fixture"
    />
  )
}
