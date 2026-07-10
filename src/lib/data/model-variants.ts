import type { ProjectModelVariantPublicRecord } from '../types'
import {
  readWithFallback,
  requireAdminAccess,
  SUPABASE_PUBLIC_READS_ENABLED,
} from './shared'

export async function getPublishedProjectModelVariants(
  projectId: string,
): Promise<ProjectModelVariantPublicRecord[]> {
  if (!SUPABASE_PUBLIC_READS_ENABLED) return []

  return readWithFallback([], async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('project_model_variants')
      .select(
        'id, project_id, source_run_id, provider_key, service_label, model_release_key, model_label, model_settings, source_url, operator_kind, operator_label, run_role, quality_status, run_started_at, run_finished_at, prompt_count, repair_prompt_count, first_artifact_path, final_artifact_path, artifact_version_paths, first_pass_metrics, final_metrics, status, is_current, is_default, supersedes_variant_id, created_at, updated_at',
      )
      .eq('project_id', projectId)
      .in('status', ['published', 'historical'])
      .order('run_finished_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ProjectModelVariantPublicRecord[]
  })
}

export async function getProjectModelVariantsForAdmin(
  projectId: string,
): Promise<ProjectModelVariantPublicRecord[]> {
  const { supabase } = await requireAdminAccess()
  const { data, error } = await supabase
    .from('project_model_variants')
    .select(
      'id, project_id, source_run_id, provider_key, service_label, model_release_key, model_label, model_settings, source_url, operator_kind, operator_label, run_role, quality_status, run_started_at, run_finished_at, prompt_count, repair_prompt_count, first_artifact_path, final_artifact_path, artifact_version_paths, first_pass_metrics, final_metrics, status, is_current, is_default, supersedes_variant_id, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .order('run_finished_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProjectModelVariantPublicRecord[]
}
