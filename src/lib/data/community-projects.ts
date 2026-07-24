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
  reason:
    | 'privacy'
    | 'copyright'
    | 'malware'
    | 'exploitation'
    | 'credentials'
    | 'imminent_harm'
    | 'abuse'
    | 'misleading'
    | 'other'
  details: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  alert_status: 'pending' | 'delivered' | 'failed'
  alert_attempt_count: number
  alert_last_attempt_at: string | null
  alert_delivered_at: string | null
  alert_failure_code: string | null
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
  operation: 'reconciliation' | 'report_intake' | 'invitation_expansion' | 'report_alerts'
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

export type CommunityProjectPilotStatus =
  | 'signed_out'
  | 'eligible'
  | 'not_admitted'
  | 'expired'
  | 'revoked'
  | 'temporarily_paused'
  | 'unavailable'

export type CommunityProjectPilotEligibility = {
  signedIn: boolean
  eligible: boolean
  status: CommunityProjectPilotStatus
  userId: string | null
  displayName: string | null
  username: string | null
}

export type CommunityProjectReportQueue = {
  reports: CommunityProjectReport[]
  totalCount: number
  retainedCount: number
  filteredCount: number
  undeliveredCount: number
  criticalCount: number
  oldestOpenAt: string | null
  oldestCriticalAt: string | null
  oldestUndeliveredAt: string | null
  nextCursor: string | null
}

export type CommunityProjectReportQueueFilters = {
  cursor?: string | null
  status?: string | null
  reason?: string | null
  alert?: string | null
  query?: string | null
}

export type CommunityProjectReportList = {
  reports: CommunityProjectReport[]
  totalCount: number
}

const COMMUNITY_PROJECT_REPORT_QUEUE_PAGE_SIZE = 25
const COMMUNITY_PROJECT_CRITICAL_REPORT_REASONS = new Set([
  'privacy',
  'malware',
  'exploitation',
  'credentials',
  'imminent_harm',
])
const COMMUNITY_PROJECT_REPORT_REASONS = new Set([
  ...COMMUNITY_PROJECT_CRITICAL_REPORT_REASONS,
  'copyright',
  'abuse',
  'misleading',
  'other',
])
const COMMUNITY_PROJECT_REPORT_ALERT_STATES = new Set(['pending', 'delivered', 'failed'])
const COMMUNITY_PROJECT_REPORT_QUEUE_STATUSES = new Set([
  'active',
  'all',
  'open',
  'reviewing',
  'resolved',
  'dismissed',
])

type CommunityProjectReportCursor = {
  priority: 0 | 1
  createdAt: string
  id: string
}

function communityProjectReportPriority(reason: string): 0 | 1 {
  return COMMUNITY_PROJECT_CRITICAL_REPORT_REASONS.has(reason) ? 1 : 0
}

function encodeCommunityProjectReportCursor(report: CommunityProjectReport) {
  return Buffer.from(JSON.stringify({
    priority: communityProjectReportPriority(report.reason),
    createdAt: report.created_at,
    id: report.id,
  })).toString('base64url')
}

function decodeCommunityProjectReportCursor(value: string | null | undefined): CommunityProjectReportCursor | null {
  if (!value || value.length > 500) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<CommunityProjectReportCursor>
    if (
      ![0, 1].includes(Number(parsed.priority))
      || typeof parsed.createdAt !== 'string'
      || !Number.isFinite(Date.parse(parsed.createdAt))
      || typeof parsed.id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id)
    ) {
      return null
    }
    return {
      priority: Number(parsed.priority) as 0 | 1,
      createdAt: parsed.createdAt,
      id: parsed.id,
    }
  } catch {
    return null
  }
}

function queueCount(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : 0
}

function queueTimestamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}

export async function getCommunityProjectPilotEligibility(): Promise<CommunityProjectPilotEligibility> {
  if (!SUPABASE_CONFIGURED) {
    return {
      signedIn: false,
      eligible: false,
      status: 'signed_out',
      userId: null,
      displayName: null,
      username: null,
    }
  }

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      signedIn: false,
      eligible: false,
      status: 'signed_out',
      userId: null,
      displayName: null,
      username: null,
    }
  }

  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc('community_project_pilot_status'),
    supabase.from('profiles').select('display_name,username').eq('id', user.id).maybeSingle(),
  ])
  const status = !error && (
    data === 'eligible'
    || data === 'not_admitted'
    || data === 'expired'
    || data === 'revoked'
    || data === 'temporarily_paused'
  )
    ? data
    : 'unavailable'
  return {
    signedIn: true,
    eligible: status === 'eligible',
    status,
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
  submissionId: string,
): Promise<CommunityProjectReportList> {
  await requireAdminAccess()
  const query = createAdminClient()
    .from('community_project_reports')
    .select('*', { count: 'exact' })
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(100)
  const { data, count, error } = await query
  if (error) throw error
  return {
    reports: (data ?? []) as CommunityProjectReport[],
    totalCount: count ?? 0,
  }
}

export async function getCommunityProjectReportForAdmin(
  id: string,
): Promise<CommunityProjectReport | null> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as CommunityProjectReport | null
}

export async function getCommunityProjectReportQueueForAdmin(
  filters: CommunityProjectReportQueueFilters = {},
): Promise<CommunityProjectReportQueue> {
  await requireAdminAccess()
  const cursor = decodeCommunityProjectReportCursor(filters.cursor)
  const status = typeof filters.status === 'string' && COMMUNITY_PROJECT_REPORT_QUEUE_STATUSES.has(filters.status)
    ? filters.status
    : 'active'
  const reason = typeof filters.reason === 'string' && COMMUNITY_PROJECT_REPORT_REASONS.has(filters.reason)
    ? filters.reason
    : null
  const alert = typeof filters.alert === 'string' && COMMUNITY_PROJECT_REPORT_ALERT_STATES.has(filters.alert)
    ? filters.alert
    : null
  const queryText = typeof filters.query === 'string'
    ? filters.query.trim().slice(0, 120) || null
    : null
  const admin = createAdminClient()
  const rpcFilters = {
    status_filter: status,
    reason_filter: reason,
    alert_filter: alert,
    query_text: queryText,
  }
  const [pageResult, countsResult] = await Promise.all([
    admin.rpc('get_community_project_report_queue', {
      page_size: COMMUNITY_PROJECT_REPORT_QUEUE_PAGE_SIZE + 1,
      cursor_priority: cursor?.priority ?? null,
      cursor_created_at: cursor?.createdAt ?? null,
      cursor_id: cursor?.id ?? null,
      ...rpcFilters,
    }),
    admin.rpc('get_community_project_report_queue_counts', rpcFilters),
  ])
  if (pageResult.error) throw pageResult.error
  if (countsResult.error) throw countsResult.error

  const page = (pageResult.data ?? []) as CommunityProjectReport[]
  const reports = page.slice(0, COMMUNITY_PROJECT_REPORT_QUEUE_PAGE_SIZE)
  const counts = (countsResult.data ?? {}) as Record<string, unknown>
  return {
    reports,
    totalCount: queueCount(counts.totalCount),
    retainedCount: queueCount(counts.retainedCount),
    filteredCount: queueCount(counts.filteredCount),
    undeliveredCount: queueCount(counts.undeliveredCount),
    criticalCount: queueCount(counts.criticalCount),
    oldestOpenAt: queueTimestamp(counts.oldestOpenAt),
    oldestCriticalAt: queueTimestamp(counts.oldestCriticalAt),
    oldestUndeliveredAt: queueTimestamp(counts.oldestUndeliveredAt),
    nextCursor: page.length > COMMUNITY_PROJECT_REPORT_QUEUE_PAGE_SIZE
      ? encodeCommunityProjectReportCursor(reports[reports.length - 1])
      : null,
  }
}

export async function getCommunityProjectOperationsForAdmin(): Promise<CommunityProjectOperations[]> {
  await requireAdminAccess()
  const { data, error } = await createAdminClient()
    .from('community_project_operations')
    .select('*')
    .in('operation', ['reconciliation', 'report_intake', 'invitation_expansion', 'report_alerts'])
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
    const supabase = await createPublicReadClient({ anonymous: true })
    const { data } = await supabase
      .rpc('get_public_community_project', { target_prompt: promptId })
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as PublicCommunityProject | null
  })
}
