export const COMMUNITY_PROJECT_BUCKET = 'community-project-quarantine'
export const COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES = 2_000_000
export const COMMUNITY_PROJECT_MAX_STEPS = 5
export const COMMUNITY_PROJECT_TERMS_VERSION = '2026-07-22-pilot-v1'
export const COMMUNITY_PROJECT_PRIVACY_VERSION = '2026-07-22-pilot-v1'
export const COMMUNITY_PROJECT_SCANNER_VERSION = 'html-static-v1'
export const COMMUNITY_PROJECT_REVIEW_VERSION = '2026-07-22-pilot-review-v1'

export const communityProjectCategories = [
  { slug: 'finance', label: 'Finance & Accounting' },
  { slug: 'marketing', label: 'Marketing & Sales' },
  { slug: 'writing', label: 'Writing & Content' },
  { slug: 'coding', label: 'Coding & Development' },
  { slug: 'design', label: 'Design & Creative' },
  { slug: 'education', label: 'Education & Learning' },
  { slug: 'productivity', label: 'Productivity' },
  { slug: 'data', label: 'Data & Analysis' },
  { slug: 'strategy', label: 'Business Strategy' },
  { slug: 'personal', label: 'Personal & Fun' },
] as const

export const communityProjectProviders = ['ChatGPT', 'Claude', 'Gemini', 'Other'] as const

export type CommunityProjectEvidenceScope =
  | 'full_run'
  | 'selected_excerpts'
  | 'reconstructed_notes'

export type CommunityProjectSourceVisibility = 'review_only' | 'public'
export type CommunityProjectSubmitterRole = 'builder'
export type CommunityProjectReusePermission = 'view_only' | 'allow_pathforge_remix'
export type CommunityProjectStatus =
  | 'queued'
  | 'needs_repair'
  | 'published'
  | 'declined'
  | 'withdrawn'
  | 'removed'

export type CommunityProjectBuildStep = {
  title: string
  prompt: string
  response: string
}

export type CommunityProjectScanReport = {
  passed: boolean
  scanner_version: string
  scanned_at: string
  sha256: string
  byte_length: number
  findings: string[]
}

export type CommunityProjectSubmission = {
  id: string
  author_id: string
  title: string
  summary: string
  category_slug: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  provider: string
  model: string
  model_settings: string | null
  evidence_scope: CommunityProjectEvidenceScope
  source_url: string | null
  source_visibility: CommunityProjectSourceVisibility
  source_access_status: 'not_checked' | 'public_verified' | 'unavailable'
  source_checked_at: string | null
  source_checked_by: string | null
  build_steps: CommunityProjectBuildStep[]
  artifact_path: string | null
  artifact_original_name: string | null
  artifact_sha256: string | null
  artifact_size_bytes: number | null
  artifact_scan: CommunityProjectScanReport | null
  artifact_integrity_status: 'pending' | 'verified' | 'failed' | 'purged'
  artifact_integrity_checked_at: string | null
  submitter_role: CommunityProjectSubmitterRole
  reuse_permission: CommunityProjectReusePermission
  terms_version: string
  privacy_version: string
  builder_attested_at: string
  profile_attribution_attested_at: string
  rights_attested_at: string
  privacy_attested_at: string
  publication_consent_at: string
  status: CommunityProjectStatus
  prompt_id: string | null
  reviewed_by: string | null
  review_checklist_version: string | null
  review_checklist: Record<string, boolean> | null
  reviewed_at: string | null
  review_notes: string | null
  user_status_note: string | null
  published_at: string | null
  withdrawn_at: string | null
  removed_at: string | null
  submission_version: number
  fork_source_project_id: string | null
  fork_source_project_title: string | null
  fork_source_model_variant_id: string | null
  fork_source_run_id: string | null
  fork_source_step_id: string | null
  fork_source_step_number: number | null
  fork_source_artifact_path: string | null
  fork_source_artifact_sha256: string | null
  fork_parent_submission_id: string | null
  prompt_family_id: string | null
  fork_depth: number
  fork_branch_index: number
  created_at: string
  updated_at: string
}

export type PublicCommunityProject = {
  submission_id: string
  prompt_id: string
  evidence_scope: CommunityProjectEvidenceScope
  provider: string
  model: string
  model_settings: string | null
  source_url: string | null
  source_checked_at: string | null
  artifact_sha256: string
  artifact_size_bytes: number
  submitter_role: CommunityProjectSubmitterRole
  reuse_permission: CommunityProjectReusePermission
  submission_version: number
  published_at: string
}

export const evidenceScopeLabels: Record<CommunityProjectEvidenceScope, string> = {
  full_run: 'Complete run',
  selected_excerpts: 'Selected excerpts',
  reconstructed_notes: 'Reconstructed notes',
}

export function isSupportedCommunitySourceUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    const path = url.pathname
    if (host === 'chatgpt.com') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(path)
    if (host === 'claude.ai') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(path)
    if (host === 'g.co') return /^\/gemini\/share\/[A-Za-z0-9-]+\/?$/.test(path)
    if (host === 'gemini.google.com') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(path)
    return false
  } catch {
    return false
  }
}

export function communityProjectStatusLabel(status: CommunityProjectStatus) {
  switch (status) {
    case 'queued': return 'Waiting for review'
    case 'needs_repair': return 'Changes requested'
    case 'published': return 'Published'
    case 'declined': return 'Declined'
    case 'withdrawn': return 'Withdrawn'
    case 'removed': return 'Removed'
  }
}
