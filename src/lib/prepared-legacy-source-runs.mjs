const PREPARED_LEGACY_SOURCE_RUNS = Object.freeze([
  Object.freeze({
    projectId: 'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
    sourceRunId: 'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    title: 'School Desk HP 10Bii+ Calculator Fork',
    finalArtifactPath:
      'public/artifacts/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.html',
    registryId: 'pathforge-seed-503',
    username: 'RowanPierce',
    displayName: 'Rowan Pierce',
    profileUrl: '/user/RowanPierce',
    authSeedMarkerRequired: true,
  }),
  Object.freeze({
    projectId: '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
    sourceRunId: '6a1f9bc4-c390-832f-88a5-d978d2e42577',
    title: 'Pomodoro Focus Timer',
    finalArtifactPath:
      'public/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    registryId: 'pathforge-seed-504',
    username: 'JordanWells',
    displayName: 'Jordan Wells',
    profileUrl: '/user/JordanWells',
    authSeedMarkerRequired: true,
  }),
  Object.freeze({
    projectId: 'e3f1d1a7-1d18-4a7b-ba54-045526cd2661',
    sourceRunId: '80b083bb-4f94-4411-b071-a5da731d3e2d',
    title: 'Family Road-Trip Readiness Board from ChatGPT',
    finalArtifactPath:
      'public/artifacts/weekend-plan-checklist-chatgpt-family-road-trip-fork-step-4.html',
    registryId: 'pathforge-seed-006',
    username: 'NoraBrooks',
    displayName: 'Nora Brooks',
    profileUrl: '/user/NoraBrooks',
    authSeedMarkerRequired: false,
  }),
])

function nonBlankString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function requiredExact(actual, expected, label) {
  if (nonBlankString(actual) !== expected) {
    throw new Error(`${label} must be exactly ${expected}.`)
  }
}

export function preparedLegacySourceRunBindings() {
  return [...PREPARED_LEGACY_SOURCE_RUNS]
}

export function assertPreparedLegacyPackageBinding(pkg) {
  const projectId = nonBlankString(pkg?.prepared_project_id)
  const sourceRunId = nonBlankString(pkg?.source_run_id)
  const compatibilityAlias = nonBlankString(pkg?.source_run_submission_id)
  const title = nonBlankString(pkg?.title)
  const finalArtifactPath = nonBlankString(pkg?.final_artifact_path)
  const profileRegistryId = nonBlankString(
    pkg?.submitted_by_profile_registry_id,
  )
  const recommended = (
    pkg?.recommended_seed_profile &&
    typeof pkg.recommended_seed_profile === 'object' &&
    !Array.isArray(pkg.recommended_seed_profile)
  ) ? pkg.recommended_seed_profile : null
  const candidates = PREPARED_LEGACY_SOURCE_RUNS.filter(
    (candidate) => (
      candidate.projectId === projectId ||
      candidate.sourceRunId === sourceRunId ||
      candidate.sourceRunId === compatibilityAlias ||
      candidate.title === title ||
      candidate.finalArtifactPath === finalArtifactPath ||
      (
        candidate.authSeedMarkerRequired &&
        (
          candidate.registryId === profileRegistryId ||
          candidate.registryId === nonBlankString(recommended?.registry_id) ||
          candidate.username === nonBlankString(recommended?.username) ||
          candidate.profileUrl === nonBlankString(recommended?.profile_url)
        )
      )
    ),
  )
  if (candidates.length === 0) {
    if (projectId) {
      throw new Error(
        `Prepared legacy package project ${projectId} is not registered.`,
      )
    }
    return null
  }
  if (candidates.length !== 1 || !projectId || !sourceRunId) {
    throw new Error(
      'Protected prepared legacy identity is incomplete or combines mismatched bindings.',
    )
  }

  const binding = PREPARED_LEGACY_SOURCE_RUNS.find(
    (candidate) => (
      candidate.projectId === projectId &&
      candidate.sourceRunId === sourceRunId
    ),
  )
  if (!binding) {
    throw new Error(
      `Prepared legacy package pair ${projectId} / ${sourceRunId || '(missing source_run_id)'} is not registered.`,
    )
  }

  if (compatibilityAlias && compatibilityAlias !== binding.sourceRunId) {
    throw new Error('source_run_submission_id may only alias the exact source_run_id.')
  }

  requiredExact(
    pkg?.submitted_by_profile_registry_id,
    binding.registryId,
    'submitted_by_profile_registry_id',
  )
  requiredExact(pkg?.title, binding.title, 'title')
  requiredExact(
    pkg?.final_artifact_path,
    binding.finalArtifactPath,
    'final_artifact_path',
  )
  const recommendedProfile = pkg?.recommended_seed_profile
  if (
    !recommendedProfile ||
    typeof recommendedProfile !== 'object' ||
    Array.isArray(recommendedProfile)
  ) {
    throw new Error('Prepared legacy package requires recommended_seed_profile.')
  }
  requiredExact(recommendedProfile.registry_id, binding.registryId, 'recommended_seed_profile.registry_id')
  requiredExact(recommendedProfile.username, binding.username, 'recommended_seed_profile.username')
  requiredExact(recommendedProfile.display_name, binding.displayName, 'recommended_seed_profile.display_name')
  requiredExact(recommendedProfile.profile_url, binding.profileUrl, 'recommended_seed_profile.profile_url')

  if (pkg?.source_access?.mode !== 'authenticated_owner_session') {
    throw new Error('Prepared legacy package must preserve its private locator as authenticated-owner evidence.')
  }
  if (pkg?.source_access?.public_share_managed_separately !== true) {
    throw new Error('Prepared legacy package must keep public-share projection in the separate registry.')
  }

  return binding
}

export function assertPreparedLegacyProfileBinding(binding, profile, provenanceKind) {
  if (!binding) return
  requiredExact(profile?.username, binding.username, 'profile username')
  requiredExact(profile?.display_name, binding.displayName, 'profile display_name')
  if (profile?.role !== 'user') {
    throw new Error(`Prepared legacy author ${binding.username} must have role=user.`)
  }
  if (provenanceKind !== 'pathforge_seed') {
    throw new Error(`Prepared legacy author ${binding.username} must have pathforge_seed provenance.`)
  }
}

export function assertAuthoritativePreparedLegacyProfileBinding(binding, profile) {
  assertPreparedLegacyProfileBinding(
    binding,
    profile,
    profile?.provenance_kind,
  )
  if (profile?.operator_kind !== 'pathforge_seed') {
    throw new Error(
      `Prepared legacy author ${binding.username} must have a private pathforge_seed operator binding.`,
    )
  }
  if (profile?.email_confirmed !== true) {
    throw new Error(
      `Prepared legacy author ${binding.username} must have a confirmed Auth identity.`,
    )
  }
  if (
    binding.authSeedMarkerRequired &&
    profile?.auth_seed_marker !== true
  ) {
    throw new Error(
      `Prepared legacy author ${binding.username} must retain the protected Auth seed marker.`,
    )
  }
}
