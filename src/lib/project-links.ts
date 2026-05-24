import type { Prompt, PromptWithRelations } from './types'

const PROJECT_ROUTE_OVERRIDES: Record<string, string> = {
  'snake-gpt55-pro-oneshot': '/snake-demo',
}

export function getProjectHref(project: Pick<Prompt | PromptWithRelations, 'id'>) {
  return PROJECT_ROUTE_OVERRIDES[project.id] ?? `/prompt/${project.id}`
}
