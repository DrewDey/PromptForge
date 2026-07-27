import type {
  ProjectModelVariantAdminRecord,
  ProjectModelVariantPublicRecord,
} from '../types'
import {
  requireAdminAccess,
  SUPABASE_PUBLIC_READS_ENABLED,
  SUPABASE_READ_TIMEOUT_MS,
} from './shared'

export class ProjectModelVariantReadError extends Error {
  readonly projectId: string
  readonly cause: unknown

  constructor(projectId: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'ProjectModelVariantReadError'
    this.projectId = projectId
    this.cause = cause
  }
}

function isTransportFailure(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const value = error as { code?: unknown; message?: unknown; name?: unknown }
  if (typeof value.code === 'string' && value.code.trim()) return false
  const message = typeof value.message === 'string' ? value.message : ''
  return (
    value.name === 'AbortError' ||
    /(?:failed to fetch|fetch failed|network request failed|networkerror|econnreset|econnrefused|enotfound|etimedout)/i.test(message)
  )
}

export async function getPublishedProjectModelVariants(
  projectId: string,
): Promise<ProjectModelVariantPublicRecord[] | null> {
  // Local/offline builds use the checked release manifests. Once public
  // Supabase reads are configured, an empty or partial database result is
  // evidence drift and must not be mistaken for an intentional fallback.
  if (!SUPABASE_PUBLIC_READS_ENABLED) return null

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        const { createClient } = await import('../supabase/server')
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('project_model_variants')
          .select(
            'id, project_id, source_run_id, provider_key, service_label, model_release_key, model_label, model_settings, source_package_file, source_package_sha256, opening_prompt_sha256, comparison_contract_version, comparison_contract_sha256, operator_kind, operator_label, run_role, quality_status, run_started_at, run_finished_at, prompt_count, repair_prompt_count, first_artifact_path, final_artifact_path, artifact_version_paths, first_pass_metrics, final_metrics, status, is_current, is_default, supersedes_variant_id, created_at, updated_at',
          )
          .eq('project_id', projectId)
          .in('status', ['published', 'historical'])
          .order('run_finished_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (error) {
          if (isTransportFailure(error)) {
            throw new ProjectModelVariantReadError(
              projectId,
              `Transport failed while loading published model variants for ${projectId}.`,
              error,
            )
          }
          const code = typeof error.code === 'string' && error.code.trim()
            ? ` (${error.code})`
            : ''
          throw new Error(
            `Published model-variant evidence query failed${code} for ${projectId}.`,
          )
        }
        return (data ?? []) as ProjectModelVariantPublicRecord[]
      })(),
      new Promise<ProjectModelVariantPublicRecord[]>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new ProjectModelVariantReadError(
            projectId,
            `Timed out loading published model variants for ${projectId}.`,
          ))
        }, SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    if (error instanceof ProjectModelVariantReadError) throw error
    if (isTransportFailure(error)) {
      throw new ProjectModelVariantReadError(
        projectId,
        `Transport failed while loading published model variants for ${projectId}.`,
        error,
      )
    }
    throw error
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function getProjectModelVariantsForAdmin(
  projectId: string,
): Promise<ProjectModelVariantAdminRecord[]> {
  await requireAdminAccess()
  const { createAdminClient } = await import('../supabase/admin')
  const { data, error } = await createAdminClient()
    .from('project_model_variants')
    .select(
      'id, project_id, source_run_id, provider_key, service_label, model_release_key, model_label, model_settings, source_url, source_package_file, source_package_sha256, opening_prompt_sha256, comparison_contract_version, comparison_contract_sha256, operator_kind, operator_label, run_role, quality_status, run_started_at, run_finished_at, prompt_count, repair_prompt_count, first_artifact_path, final_artifact_path, artifact_version_paths, first_pass_metrics, final_metrics, status, is_current, is_default, supersedes_variant_id, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .order('run_finished_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProjectModelVariantAdminRecord[]
}
