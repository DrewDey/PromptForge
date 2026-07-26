import 'server-only'

import { SUPABASE_CONFIGURED } from './data/shared'
import { preparedReleaseGateIsEnforced } from './prepared-release-gates-core.mjs'

const PREPARED_RELEASE_GATE_TIMEOUT_MS = 2_000

function enforcePreparedReleaseGates() {
  // Vercel production is always fail-closed. Preview and local builds stay
  // inspectable without a production-capable bypass variable that could be
  // misconfigured and expose every prepared route.
  return preparedReleaseGateIsEnforced(process.env.VERCEL_ENV)
}

async function persistedApprovedProjectExists(projectId: string) {
  if (!SUPABASE_CONFIGURED) return false

  try {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', projectId)
      .eq('status', 'approved')
      .abortSignal(AbortSignal.timeout(PREPARED_RELEASE_GATE_TIMEOUT_MS))
      .maybeSingle()

    return !error && Boolean(data)
  } catch {
    return false
  }
}

export async function preparedArtifactHasPublicProject(projectIds: readonly string[]) {
  if (!enforcePreparedReleaseGates()) return projectIds.length > 0
  if (!SUPABASE_CONFIGURED || projectIds.length < 1) return false

  const startedAt = performance.now()
  try {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id')
      .in('id', [...new Set(projectIds)])
      .eq('status', 'approved')
      .limit(1)
      .abortSignal(AbortSignal.timeout(PREPARED_RELEASE_GATE_TIMEOUT_MS))

    if (error) throw error
    return Boolean(data?.length)
  } catch (error) {
    console.error('Prepared artifact release gate failed closed.', {
      durationMs: Math.round(performance.now() - startedAt),
      projectCount: projectIds.length,
      errorKind: error instanceof Error ? error.name : 'unknown',
    })
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
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data, error } = await supabase
      .from('project_model_variants')
      .select('source_run_id, is_default')
      .eq('project_id', projectId)
      .eq('status', 'published')
      .eq('is_current', true)
      .abortSignal(AbortSignal.timeout(PREPARED_RELEASE_GATE_TIMEOUT_MS))

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
