import 'server-only'

import { SUPABASE_CONFIGURED } from './data/shared'

function enforcePreparedReleaseGates() {
  // Vercel production is always fail-closed. Preview and local builds stay
  // inspectable without a production-capable bypass variable that could be
  // misconfigured and expose every prepared route.
  return process.env.VERCEL_ENV === 'production'
}

async function persistedApprovedProjectExists(projectId: string) {
  if (!SUPABASE_CONFIGURED) return false

  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', projectId)
      .eq('status', 'approved')
      .maybeSingle()

    return !error && Boolean(data)
  } catch {
    return false
  }
}

export async function preparedProjectIsPublic(projectId: string) {
  if (!enforcePreparedReleaseGates()) return true
  return persistedApprovedProjectExists(projectId)
}

export async function preparedModelCohortIsPublic(
  projectId: string,
  expectedSourceRunIds: readonly string[],
) {
  if (!enforcePreparedReleaseGates()) return true
  if (!(await persistedApprovedProjectExists(projectId)) || !SUPABASE_CONFIGURED) {
    return false
  }

  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('project_model_variants')
      .select('source_run_id, is_default')
      .eq('project_id', projectId)
      .eq('status', 'published')
      .eq('is_current', true)

    if (error || !data) return false

    const expected = [...new Set(expectedSourceRunIds)].sort()
    const actual = [...new Set(data.map((row) => row.source_run_id))].sort()
    return (
      expected.length > 0 &&
      actual.length === expected.length &&
      actual.every((sourceRunId, index) => sourceRunId === expected[index]) &&
      data.filter((row) => row.is_default).length === 1
    )
  } catch {
    return false
  }
}
