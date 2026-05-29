import type { Prompt, PromptWithRelations } from './types'

const PROJECT_ROUTE_OVERRIDES: Record<string, string> = {
  'snake-gpt55-pro-oneshot': '/snake-demo',
  '069d354a-ec99-4ee4-aed4-aa1baaec8b29': '/decision-matrix-demo',
}

export function getProjectHref(project: Pick<Prompt | PromptWithRelations, 'id'>) {
  return PROJECT_ROUTE_OVERRIDES[project.id] ?? `/prompt/${project.id}`
}
