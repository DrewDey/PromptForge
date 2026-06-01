import type { Prompt, PromptWithRelations } from './types'
import { DECISION_MATRIX_PROJECT_ID, SNAKE_PROJECT_ID, SNAKE_PROJECT_LEGACY_ID } from './featured-projects'

const PROJECT_ROUTE_OVERRIDES: Record<string, string> = {
  [SNAKE_PROJECT_ID]: '/snake-demo',
  [SNAKE_PROJECT_LEGACY_ID]: '/snake-demo',
  [DECISION_MATRIX_PROJECT_ID]: '/decision-matrix-demo',
}

export function getProjectHref(project: Pick<Prompt | PromptWithRelations, 'id'>) {
  return PROJECT_ROUTE_OVERRIDES[project.id] ?? `/prompt/${project.id}`
}
