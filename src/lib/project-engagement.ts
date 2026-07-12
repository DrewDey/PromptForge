import {
  POMODORO_TIMER_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
} from './featured-projects'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// These three legacy showcases still render from checked local evidence but do
// not yet have canonical rows in the live `prompts` table. Every other prepared
// showcase is database-backed and can participate in votes, bookmarks, public
// profiles, and My Forge. Keep this list intentionally tiny and remove entries
// as the ownership backfill publishes their canonical rows.
const CODE_ONLY_SHOWCASE_IDS = new Set<string>([
  POMODORO_TIMER_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
])

export function isPersistableProjectId(projectId: string) {
  return UUID_PATTERN.test(projectId) && !CODE_ONLY_SHOWCASE_IDS.has(projectId)
}
