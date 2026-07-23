import type { Profile } from '../types'
import type {
  CommunityProjectSubmission,
  PublicCommunityProject,
} from '../community-project-contract'
import { readWithFallback, requireAdminAccess, SUPABASE_CONFIGURED } from './shared'
import { createAdminClient } from '../supabase/admin'

// Owner reads deliberately omit reviewer identities/notes and every report or
// pilot-administration field. Keep this list in sync with the column-level
// authenticated grant in the pilot migration.
const COMMUNITY_PROJECT_OWNER_COLUMNS = 'id,author_id,title,summary,category_slug,difficulty,provider,model,model_settings,evidence_scope,source_url,source_visibility,source_access_status,source_checked_at,build_steps,artifact_path,artifact_original_name,artifact_sha256,artifact_size_bytes,artifact_scan,artifact_integrity_status,artifact_integrity_checked_at,submitter_role,reuse_permission,terms_version,privacy_version,builder_attested_at,profile_attribution_attested_at,rights_attested_at,privacy_attested_at,publication_consent_at,status,prompt_id,user_status_note,published_at,withdrawn_at,removed_at,submission_version,fork_source_project_id,fork_source_project_title,fork_source_model_variant_id,fork_source_run_id,fork_source_step_id,fork_source_step_number,fork_source_artifact_path,fork_source_artifact_sha256,fork_parent_submission_id,prompt_family_id,fork_depth,fork_branch_index,created_at,updated_at' as const

export type CommunityProjectSubmissionWithAuthor = CommunityProjectSubmission & {
  author?: Profile | null
}

export type CommunityProjectReport = {
  id: string
  submission_id: string
  prompt_id: string | null
  reporter_id: string | null
  reporter_email: string
  reason: 'privacy' | 'copyright' | 'malware' | 'abuse' | 'misleading' | 'other'
  details: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type CommunityProjectPilotMember = {
  user_id: string
  invited_by: string | null
  member_kind: 'internal_acceptance' | 'invited_builder'
  active: boolean
  expires_at: string | null
  note: string | null
  created_at: string
  updated_at: string
  revoked_at: string | null
  is_current: boolean
  user?: Profile | null
}

export type CommunityProjectOperations = {
  operation: 'reconciliation' | 'report_intake'
  lease_id: string | null
  lease_expires_at: string | null
  last_started_at: string | null
  last_success_at: string | null
  last_status: 'never_run' | 'running' | 'succeeded' | 'failed'
  last_error: string | null
  last_metrics: Record<string, unknown>
  updated_at: string
}

export type CommunityProjectPilotControls = {
  singleton: boolean
  allow_admin_submissions: boolean
  allow_internal_acceptance_submissions: boolean
  allow_invited_submissions: boolean
  allow_publication: boolean
  updated_by: string | null
  updated_at: string
}

export async function getCommunityProjectPilotEligibility() {
  if (!SUPABASE_CONFIGURED) return { signedIn: false, eligible: false, userId: null, displayName: null, username: null }

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { signedIn: false, eligible: false, userId: null, displayName: null, username: null }

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc('community_project_pilot_eligible'),
    supabase.from('profiles').select('display_name,username').eq('id', user.id).maybeSingle(),
  ])
  return {
    signedIn: true,
    eligible: !error && data === true,
    userId: user.id,
    displayName: profile?.display_name ?? null,
    username: profile?.username ?? null,
  }
}

export async function getCommunityProjectSubmissionsForOwner(): Promise<CommunityProjectSubmission[]> {
  if (!SUPABASE_CONFIGURED) return []
  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('community_project_submissions')
    .select(COMMUNITY_PROJECT_OWNER_COLUMNS)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CommunityProjectSubmission[]
}

export async function getCommunityProjectSubmissionForOwner(
  id: string,
): Promise<CommunityProjectSubmission | null> {
  if (!SUPABASE_CONFIGURED) return null
  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('community_project_submissions')
    .select(COMMUNITY_PROJECT_OWNER_COLUMNS)
    .eq('id', id)
    .eq('author_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data as CommunityProjectSubmission | null
}

export async function getCommunityProjectSubmissionsForAdmin(): Promise<CommunityProjectSubmissionWithAuthor[]> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_submissions')
    .select('*, author:profiles(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CommunityProjectSubmissionWithAuthor[]
}

export async function getCommunityProjectSubmissionForAdmin(
  id: string,
): Promise<CommunityProjectSubmissionWithAuthor | null> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_submissions')
    .select('*, author:profiles(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as CommunityProjectSubmissionWithAuthor | null
}

export async function getCommunityProjectReportsForAdmin(
  submissionId?: string,
): Promise<CommunityProjectReport[]> {
  await requireAdminAccess()
  let query = createAdminClient()
    .from('community_project_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (submissionId) query = query.eq('submission_id', submissionId)
  else query = query.in('status', ['open', 'reviewing'])
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CommunityProjectReport[]
}

export async function getCommunityProjectOperationsForAdmin(): Promise<CommunityProjectOperations[]> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_operations')
    .select('*')
    .in('operation', ['reconciliation', 'report_intake'])
    .order('operation')
  if (error) throw error
  return (data ?? []) as CommunityProjectOperations[]
}

export async function getCommunityProjectPilotControlsForAdmin(): Promise<CommunityProjectPilotControls | null> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_pilot_controls')
    .select('*')
    .eq('singleton', true)
    .maybeSingle()
  if (error) throw error
  return data as CommunityProjectPilotControls | null
}

export async function getCommunityProjectPilotMembersForAdmin(): Promise<CommunityProjectPilotMember[]> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_pilot_members')
    .select('*, user:profiles!community_project_pilot_members_user_id_fkey(*)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  const checkedAt = Date.now()
  return (data ?? []).map((member) => ({
    ...member,
    is_current: member.active && (
      member.member_kind !== 'internal_acceptance'
      || Boolean(member.expires_at && Date.parse(member.expires_at) > checkedAt)
    ),
  })) as CommunityProjectPilotMember[]
}

export async function getPublicCommunityProject(
  promptId: string,
): Promise<PublicCommunityProject | null> {
  if (!SUPABASE_CONFIGURED) return null
  return readWithFallback(null, async (signal) => {
    const { createPublicReadClient } = await import('../supabase/server')
    const supabase = await createPublicReadClient()
    const { data, error } = await supabase
      .rpc('get_public_community_project', { target_prompt: promptId })
      .abortSignal(signal)
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as PublicCommunityProject | null
  })
}
