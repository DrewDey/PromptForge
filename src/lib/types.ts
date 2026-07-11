export type Category = {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  prompt_count?: number
  created_at: string
}

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export type Prompt = {
  id: string
  title: string
  description: string
  content: string
  result_content: string | null
  category_id: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  model_used: string | null
  model_recommendation: string | null
  tools_used: string[]
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  author_id: string
  vote_count: number
  bookmark_count: number
  fork_source_project_id?: string | null
  fork_source_project_title?: string | null
  fork_source_model_variant_id?: string | null
  fork_source_run_id?: string | null
  fork_source_step_id?: string | null
  fork_source_step_number?: number | null
  fork_source_artifact_path?: string | null
  fork_source_artifact_sha256?: string | null
  fork_parent_submission_id?: string | null
  prompt_family_id?: string | null
  fork_depth?: number | null
  fork_branch_index?: number | null
  created_at: string
  updated_at: string
}

export type PromptStep = {
  id: string
  prompt_id: string
  step_number: number
  title: string
  content: string
  result_content: string | null
  description: string | null
  created_at: string
}

export type ProjectImage = {
  id: string
  project_id: string
  step_id: string | null
  image_url: string
  caption: string | null
  display_order: number
  created_at: string
}

export type PromptWithRelations = Prompt & {
  category?: Category
  author?: Profile
  steps?: PromptStep[]
  images?: ProjectImage[]
}

export type SourceRunSubmissionStatus = 'queued' | 'extracting' | 'draft_created' | 'failed'

export type SourceRunSubmission = {
  id: string
  title?: string | null
  source_url: string | null
  file_name: string | null
  notes: string | null
  fork_source_project_id?: string | null
  fork_source_project_title?: string | null
  fork_source_model_variant_id?: string | null
  fork_source_run_id?: string | null
  fork_source_step_id?: string | null
  fork_source_step_number?: number | null
  fork_source_artifact_path?: string | null
  fork_source_artifact_sha256?: string | null
  fork_parent_submission_id?: string | null
  prompt_family_id?: string | null
  fork_depth?: number | null
  fork_branch_index?: number | null
  author_id: string
  status: SourceRunSubmissionStatus
  extracted_prompt_id: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export type SourceRunSubmissionWithRelations = SourceRunSubmission & {
  author?: Profile | null
  extracted_prompt?: PromptWithRelations | null
}

export type ProjectModelVariantRecord = {
  id: string
  project_id: string
  source_run_id: string
  provider_key: 'openai' | 'anthropic' | 'google'
  service_label: string
  model_release_key: string
  model_label: string
  model_settings: Record<string, unknown>
  source_url: string
  source_package_file: string
  source_package_sha256: string
  opening_prompt_sha256: string
  comparison_contract_version: string
  comparison_contract_sha256: string
  operator_kind: 'original_author' | 'pathforge_labs_manual' | 'pathforge_labs_automation'
  operator_label: string
  automation_run_id: string | null
  run_role: 'historical_baseline' | 'comparison_run'
  quality_status: 'verified' | 'known_issue'
  run_started_at: string | null
  run_finished_at: string | null
  prompt_count: number
  repair_prompt_count: number
  first_artifact_path: string
  final_artifact_path: string
  artifact_version_paths: string[]
  first_pass_metrics: Record<string, unknown>
  final_metrics: Record<string, unknown>
  status: 'draft' | 'published' | 'historical' | 'retired' | 'failed'
  is_current: boolean
  is_default: boolean
  supersedes_variant_id: string | null
  created_at: string
  updated_at: string
}

export type ProjectModelVariantPublicRecord = Omit<
  ProjectModelVariantRecord,
  'automation_run_id'
>

export type SuggestionModerationStatus = 'pending' | 'approved' | 'declined'
export type SuggestionPublicStatus = 'under_review' | 'planned' | 'shipped' | 'declined'
export type SuggestionVisibility = 'private' | 'scheduled_public' | 'public'
export type SuggestionResponseVisibility = 'public' | 'submitter'

export type Suggestion = {
  id: string
  title: string
  body: string
  author_id: string
  moderation_status: SuggestionModerationStatus
  public_status: SuggestionPublicStatus
  visibility: SuggestionVisibility
  vote_count: number
  approved_at: string | null
  scheduled_publish_at: string | null
  kept_private_at: string | null
  created_at: string
  updated_at: string
}

export type SuggestionResponse = {
  id: string
  suggestion_id: string
  responder_id: string | null
  body: string
  visibility: SuggestionResponseVisibility
  created_at: string
}

export type SuggestionWithRelations = Suggestion & {
  author?: Profile | null
  responses?: SuggestionResponse[]
}

export type BuildRequestStatus = 'open' | 'answered' | 'closed'

export type BuildRequest = {
  id: string
  title: string
  body: string
  author_id: string
  status: BuildRequestStatus
  vote_count: number
  accepted_response_id: string | null
  created_at: string
  updated_at: string
}

export type BuildRequestResponse = {
  id: string
  request_id: string
  responder_id: string
  prompt_id: string | null
  url: string | null
  body: string
  is_accepted: boolean
  vote_count: number
  created_at: string
}

export type BuildRequestResponseWithRelations = BuildRequestResponse & {
  responder?: Profile | null
  prompt?: PromptWithRelations | null
}

export type BuildRequestWithRelations = BuildRequest & {
  author?: Profile | null
  responses?: BuildRequestResponseWithRelations[]
}
