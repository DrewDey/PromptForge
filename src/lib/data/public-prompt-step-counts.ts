import type { PromptWithRelations } from '../types'

type PublicPromptStepCountRow = {
  prompt_id: string
  step_count: number
}

export function attachExactPublicPromptStepCounts<T extends PromptWithRelations>(
  projects: T[],
  rows: PublicPromptStepCountRow[] | null,
): T[] {
  if (projects.length === 0) return projects
  if (!rows || rows.length !== projects.length) {
    throw new Error('Public prompt step-count registry returned incomplete cardinality.')
  }

  const expectedIds = new Set(projects.map((project) => project.id))
  if (expectedIds.size !== projects.length) {
    throw new Error('Public prompt list contains duplicate project IDs.')
  }

  const counts = new Map<string, number>()
  for (const row of rows) {
    if (
      !row ||
      !expectedIds.has(row.prompt_id) ||
      counts.has(row.prompt_id) ||
      !Number.isInteger(row.step_count) ||
      row.step_count < 0
    ) {
      throw new Error('Public prompt step-count registry returned invalid evidence.')
    }
    counts.set(row.prompt_id, row.step_count)
  }

  if (counts.size !== expectedIds.size) {
    throw new Error('Public prompt step-count registry omitted a checked project.')
  }

  return projects.map((project) => ({
    ...project,
    prompt_step_count: counts.get(project.id),
  }))
}
