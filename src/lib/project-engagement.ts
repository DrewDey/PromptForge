import {
  DECISION_MATRIX_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
} from './featured-projects'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Code-only "prepared showcase" projects: their UUIDs are well-formed and they
// render on the site via the in-memory mock fallback, but they have NO row in
// the live Supabase `prompts` table. Any vote/bookmark INSERT against these IDs
// fails the FK + RLS "approved prompts row" check, surfacing the red
// "Could not save vote." error. Treat them as non-persistable so the
// engagement UI renders read-only counts instead of interactive controls.
//
// NOTE: Snake (SNAKE_PROJECT_ID) is intentionally NOT in this set — it is
// seeded as a real approved prompts row in supabase/prompt-engagement.sql, so
// its votes/bookmarks persist and it stays interactive. If any of the IDs below
// is ever published to a real prompts row via
// publishPreparedShowcaseProjectFromSourceRun, remove it from this set so it
// becomes interactive again (mirroring how Snake works today).
const CODE_ONLY_SHOWCASE_IDS = new Set<string>([
  DECISION_MATRIX_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
])

export function isPersistableProjectId(projectId: string) {
  return UUID_PATTERN.test(projectId) && !CODE_ONLY_SHOWCASE_IDS.has(projectId)
}
