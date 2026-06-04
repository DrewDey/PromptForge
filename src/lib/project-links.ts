import type { Prompt, PromptWithRelations } from './types'
import {
  DECISION_MATRIX_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  SNAKE_PROJECT_ID,
  SNAKE_PROJECT_LEGACY_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
} from './featured-projects'

const PROJECT_ROUTE_OVERRIDES: Record<string, string> = {
  [SNAKE_PROJECT_ID]: '/snake-demo',
  [SNAKE_PROJECT_LEGACY_ID]: '/snake-demo',
  [DECISION_MATRIX_PROJECT_ID]: '/decision-matrix-demo',
  [HP_10BII_PROJECT_ID]: '/hp-10bii-calculator-demo',
  [TIC_TAC_TOE_PROJECT_ID]: '/tic-tac-toe-demo',
  [POMODORO_TIMER_PROJECT_ID]: '/pomodoro-timer-demo',
  [WEEKEND_CHECKLIST_PROJECT_ID]: '/weekend-plan-checklist-demo',
  [NEON_BLOCK_PATROL_PROJECT_ID]: '/neon-block-patrol-demo',
  [SWISH_CITY_PROJECT_ID]: '/swish-city-timing-hoops-demo',
  [MEETING_COST_PROJECT_ID]: '/meeting-cost-calculator-demo',
}

export function getProjectRouteOverride(projectId: string) {
  return PROJECT_ROUTE_OVERRIDES[projectId] ?? null
}

export function getProjectHref(project: Pick<Prompt | PromptWithRelations, 'id'>) {
  return PROJECT_ROUTE_OVERRIDES[project.id] ?? `/prompt/${project.id}`
}
