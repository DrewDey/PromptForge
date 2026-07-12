export type ProfileProvenanceKind = 'member' | 'pathforge_seed' | 'pathforge_team'

export type ProfileProvenance = {
  profileId: string
  kind: ProfileProvenanceKind
  createdAt: string
  updatedAt: string
}

export type MyForgeProfile = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
  provenance: ProfileProvenance | null
  isComplete: boolean
}

export type MyForgeProjectState = {
  userId: string
  projectId: string
  selectedModelVariantId: string | null
  selectedSourceRunId: string | null
  selectedStepId: string | null
  selectedStepNumber: number | null
  selectedArtifactPath: string | null
  selectedArtifactSha256: string | null
  modelUpdatesSeenAt: string
  lastOpenedAt: string
  forkStartedAt: string | null
  forkSourceModelVariantId: string | null
  forkSourceRunId: string | null
  forkSourceStepId: string | null
  forkSourceStepNumber: number | null
  forkSourceArtifactPath: string | null
  forkSourceArtifactSha256: string | null
  forkParentSubmissionId: string | null
  forkDepth: number
  forkBranchIndex: number
  forkPromptFamilyId: string | null
  createdAt: string
  updatedAt: string
  resumeIsValid: boolean
}

export type MyForgeProjectContext = {
  isAuthenticated: boolean
  state: MyForgeProjectState | null
}

export type MyForgeProjectSummary = {
  id: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  modelUsed: string | null
  voteCount: number
  bookmarkCount: number
  forkSourceProjectId: string | null
  forkSourceStepNumber: number | null
  createdAt: string
  updatedAt: string
  category: {
    name: string
    slug: string
    icon: string
  } | null
}

export type MyForgeSavedProject = {
  bookmarkId: string
  savedAt: string
  project: MyForgeProjectSummary
  state: MyForgeProjectState | null
  latestModelUpdateAt: string | null
  latestUnseenSourceRunId: string | null
  unseenModelUpdateCount: number
}

export type MyForgeSourceRunDatabaseStatus =
  | 'queued'
  | 'extracting'
  | 'in_review'
  | 'needs_repair'
  | 'draft_created'
  | 'published'
  | 'declined'
  | 'failed'

export type MyForgeSourceRunLifecycle =
  | 'received'
  | 'extracting'
  | 'in_review'
  | 'needs_repair'
  | 'live'
  | 'declined'
  | 'failed'

export type MyForgeSourceRun = {
  id: string
  title: string
  sourceUrl: string | null
  fileName: string | null
  status: MyForgeSourceRunDatabaseStatus
  lifecycle: MyForgeSourceRunLifecycle
  userStatusNote: string | null
  resubmissionOfId: string | null
  priorSubmissionTitle: string | null
  repairSubmissionId: string | null
  repairSubmissionTitle: string | null
  extractedPromptId: string | null
  extractedProject: MyForgeProjectSummary | null
  forkSourceProjectId: string | null
  forkSourceProjectTitle: string | null
  forkSourceRunId: string | null
  forkSourceStepId: string | null
  forkSourceStepNumber: number | null
  forkSourceArtifactPath: string | null
  forkSourceArtifactSha256: string | null
  createdAt: string
  updatedAt: string
}

export type MyForgeOwnedProject = MyForgeProjectSummary & {
  isFork: boolean
}

export type MyForgeUnfinishedFork = {
  project: MyForgeProjectSummary
  state: MyForgeProjectState
}

export type MyForgeRepairContext = {
  submissionId: string
  title: string
  sourceUrl: string | null
  userStatusNote: string | null
  forkSourceProjectId: string | null
  forkSourceProjectTitle: string | null
  forkSourceModelVariantId: string | null
  forkSourceRunId: string | null
  forkSourceStepId: string | null
  forkSourceStepNumber: number | null
  forkSourceArtifactPath: string | null
  forkSourceArtifactSha256: string | null
  forkParentSubmissionId: string | null
  promptFamilyId: string | null
  forkDepth: number
  forkBranchIndex: number
}

export type MyForgeDashboard = {
  profile: MyForgeProfile
  savedProjects: MyForgeSavedProject[]
  sourceRuns: MyForgeSourceRun[]
  ownedProjects: MyForgeOwnedProject[]
  unfinishedForks: MyForgeUnfinishedFork[]
}

export type SaveMyForgeResumeStateInput = {
  projectId: string
  sourceRunId?: string | null
  stepId?: string | null
  stepNumber?: number | null
  artifactPath?: string | null
  artifactSha256?: string | null
}

export type UpdateMyForgeProfileInput = {
  displayName: string
  bio?: string | null
  avatarUrl?: string | null
}
