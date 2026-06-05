import type { Prompt, PromptWithRelations } from './types'
import {
  DECISION_MATRIX_PROJECT_ID,
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  SNAKE_PROJECT_ID,
  SNAKE_PROJECT_LEGACY_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
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
  [WORD_LADDER_SPRINT_PROJECT_ID]: '/word-ladder-sprint-demo',
  [PUZZLE_BOX_ESCAPE_PROJECT_ID]: '/puzzle-box-escape-demo',
  [POCKET_RALLY_PROJECT_ID]: '/pocket-rally-time-trial-demo',
  [TRIP_PACKING_PROJECT_ID]: '/trip-packing-planner-demo',
  [FLASHCARD_CRAM_PROJECT_ID]: '/flashcard-cram-drill-demo',
  [FOLLOW_UP_CRM_PROJECT_ID]: '/follow-up-crm-tracker-demo',
  [REACTION_TRAINER_PROJECT_ID]: '/reaction-time-trainer-demo',
  [LANE_DEFENSE_PROJECT_ID]: '/tiny-lane-defense-demo',
}

export function getProjectRouteOverride(projectId: string) {
  return PROJECT_ROUTE_OVERRIDES[projectId] ?? null
}

export function getProjectHref(project: Pick<Prompt | PromptWithRelations, 'id'>) {
  return PROJECT_ROUTE_OVERRIDES[project.id] ?? `/prompt/${project.id}`
}
