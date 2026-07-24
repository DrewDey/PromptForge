'use server'

import { createHash, createHmac, randomUUID } from 'node:crypto'
import { revalidatePath, revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import {
  COMMUNITY_PROJECT_BUCKET,
  COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES,
  COMMUNITY_PROJECT_PRIVACY_VERSION,
  COMMUNITY_PROJECT_TERMS_VERSION,
  communityProjectCategories,
  communityProjectProviders,
  isSupportedCommunitySourceUrl,
  type CommunityProjectBuildStep,
} from './community-project-contract'
import {
  communityProjectOperatorAlertsConfigured,
  communityProjectReportSeverity,
  sendCommunityProjectOperatorAlert,
} from './community-project-alerts'
import {
  scanCommunityProjectArtifact,
  scanCommunityProjectEvidenceText,
} from './community-project-scanner'
import { canSubmitCommunityProjectRepair } from './community-project-pilot-policy.mjs'
import { requireAdminAccess } from './data/shared'
import { PUBLIC_CATALOG_CACHE_TAG } from './public-catalog-cache'
import { createAdminClient } from './supabase/admin'
import { createClient } from './supabase/server'

export type CommunityProjectActionResult = {
  success: boolean
  id?: string
  promptId?: string
  error?: string
  warning?: string
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function publicationRuntimeConfigured() {
  return Boolean(
    process.env.REPORT_RATE_LIMIT_SECRET &&
    process.env.REPORT_RATE_LIMIT_SECRET.length >= 32 &&
    process.env.CRON_SECRET &&
    process.env.CRON_SECRET.length >= 32 &&
    communityProjectOperatorAlertsConfigured()
  )
}

async function verifyAndRecordCommunityProjectReportReadiness(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  scope: 'publication' | 'external invitations',
) {
  if (!publicationRuntimeConfigured()) {
    throw new Error(
      'Configure strong REPORT_RATE_LIMIT_SECRET and CRON_SECRET values plus distinct HTTPS primary and escalation alert webhooks before changing this control.',
    )
  }
  const reportSecret = process.env.REPORT_RATE_LIMIT_SECRET as string
  const cronSecret = process.env.CRON_SECRET as string
  const correlation = randomUUID()
  const delivered = await sendCommunityProjectOperatorAlert({
    code: 'operator_readiness_probe',
    severity: 'warning',
    summary: `Operator notification readiness probe before ${scope}.`,
  })
  if (!delivered) {
    throw new Error('The operator-alert readiness probe was not delivered. The control remains closed.')
  }
  const proofHash = createHmac('sha256', reportSecret)
    .update(`community-project-report-readiness:${scope}:${actorId}:${correlation}`)
    .digest('hex')
  const alertProofHash = createHmac('sha256', cronSecret)
    .update(`community-project-alert-readiness:${scope}:${actorId}:${correlation}`)
    .digest('hex')
  const { error } = await admin.rpc('record_community_project_report_readiness', {
    proof_hash: proofHash,
    alert_proof_hash: alertProofHash,
    correlation,
  })
  if (error) throw error
}

function safeError(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : ''
  if (!rawMessage) return fallback
  const message = rawMessage
    .replace(/SUPABASE_SECRET_KEY/gi, 'server upload configuration')
    .replace(/SUPABASE_SERVICE_ROLE_KEY/gi, 'server upload configuration')
    .replace(/service[_ -]?role/gi, 'server upload service')
  return message.length <= 500 ? message : fallback
}

function safeOriginalFilename(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[\\/]/g, '_')
    .trim()
    .slice(0, 180) || 'submitted-project.html'
}

const artifactFindingGuidance: Record<string, string> = {
  'embedded frame or plugin': 'remove iframe, frame, object, embed, or plugin elements',
  'base URL rewriting': 'remove the base element',
  'active form submission': 'replace forms with local button interactions',
  'automatic redirect': 'remove the meta refresh redirect',
  'active SVG animation': 'replace SVG animation elements with a static final state',
  'external script dependency': 'paste required JavaScript into the HTML file instead of using script src',
  'external stylesheet dependency': 'paste required CSS into a style element instead of using link href',
  'external media dependency': 'embed media as a data URL or remove it',
  'external CSS dependency': 'embed the CSS asset as a data URL or remove the url/import rule',
  'external hyperlink': 'remove outbound links or show the address as plain text',
  'navigation-capable hyperlink': 'keep only fragment links that jump within the same document',
  'navigation ping': 'remove link ping attributes',
  'network request API': 'remove fetch, XMLHttpRequest, WebSocket, EventSource, or importScripts calls',
  'WebRTC network API': 'remove peer-to-peer and ICE networking calls',
  'dynamic HTML API': 'replace setHTML or setHTMLUnsafe with explicit local DOM construction',
  'beacon API': 'remove navigator.sendBeacon',
  'dynamic image request': 'remove new Image network loading',
  'popup or external navigation API': 'remove popup and scripted navigation code',
  'obvious non-terminating loop': 'replace unbounded while(true) or for(;;) loops with bounded work',
  'automatic file generation': 'remove automatic download or file-generation behavior',
  'no useful script-disabled preview': 'include the finished result as readable HTML before any script runs',
}

function artifactRejectionMessage(findings: string[]) {
  const repairs = findings.slice(0, 4).map((finding) => (
    artifactFindingGuidance[finding] ? `${finding}: ${artifactFindingGuidance[finding]}` : finding
  ))
  const remainder = findings.length > repairs.length ? `; plus ${findings.length - repairs.length} more finding(s)` : ''
  return `The HTML artifact was rejected. ${repairs.join('; ')}${remainder}.`
}

async function verifyQuarantinedArtifact(
  admin: ReturnType<typeof createAdminClient>,
  artifactPath: string,
  expectedSha256: string,
  expectedSize: number,
) {
  const { data: artifact, error } = await admin.storage
    .from(COMMUNITY_PROJECT_BUCKET)
    .download(artifactPath)
  if (error || !artifact) throw new Error('The reviewed artifact is missing from private quarantine.')
  if (
    artifact.size !== expectedSize ||
    artifact.size < 1 ||
    artifact.size > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES
  ) {
    throw new Error('The quarantined artifact size changed after review. Publication was blocked.')
  }
  const bytes = new Uint8Array(await artifact.arrayBuffer())
  const actualSha256 = createHash('sha256').update(bytes).digest('hex')
  if (actualSha256 !== expectedSha256) {
    throw new Error('The quarantined artifact bytes changed after review. Publication was blocked.')
  }
}

function parseBuildSteps(formData: FormData): CommunityProjectBuildStep[] {
  const raw = formString(formData, 'build_steps_json')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Build evidence could not be read. Reload the page and try again.')
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 5) {
    throw new Error('Add between one and five build checkpoints.')
  }

  const steps = parsed.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Build checkpoint ${index + 1} is incomplete.`)
    }
    const item = value as Record<string, unknown>
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
    const response = typeof item.response === 'string' ? item.response.trim() : ''
    if (!title || title.length > 120) throw new Error(`Name build checkpoint ${index + 1} in 120 characters or fewer.`)
    if (!prompt || prompt.length > 30_000) throw new Error(`Checkpoint ${index + 1} needs a prompt under 30,000 characters.`)
    if (!response || response.length > 50_000) throw new Error(`Checkpoint ${index + 1} needs a response under 50,000 characters.`)
    return { title, prompt, response }
  })
  if (new TextEncoder().encode(JSON.stringify(steps)).byteLength > 250_000) {
    throw new Error('The combined build evidence must be 250 KB or less.')
  }
  return steps
}

function parseFork(formData: FormData) {
  const raw = formString(formData, 'fork_json')
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const sourceProjectId = typeof value.source_project_id === 'string'
      ? value.source_project_id.trim()
      : ''
    const sourceStepId = typeof value.source_step_id === 'string' ? value.source_step_id.trim() : ''
    const sourceStepNumber = value.source_step_number === null || value.source_step_number === ''
      ? null
      : Number(value.source_step_number)
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceProjectId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceStepId) ||
      !Number.isInteger(sourceStepNumber) || (sourceStepNumber ?? 0) < 1
    ) throw new Error('The fork source is incomplete or invalid. Start the fork from its project page again.')
    return {
      source_project_id: sourceProjectId,
      source_step_id: sourceStepId,
      source_step_number: sourceStepNumber,
    }
  } catch {
    throw new Error('The fork source could not be verified. Start the fork from its project page again.')
  }
}

async function requireEligibleUser(repairId: string | null = null) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Sign in to submit a project.')
  const admin = createAdminClient()
  const [
    { data: eligibilityStatus, error: eligibilityError },
    { data: profile, error: profileError },
    { data: membership, error: membershipError },
    repairResult,
  ] = await Promise.all([
    supabase.rpc('community_project_pilot_status'),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    admin
      .from('community_project_pilot_members')
      .select('member_kind,active,expires_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    repairId
      ? admin
          .from('community_project_submissions')
          .select('id')
          .eq('id', repairId)
          .eq('author_id', user.id)
          .eq('status', 'needs_repair')
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (profileError || !profile) throw new Error('PathForge could not verify your pilot access.')
  if (membershipError) throw new Error('PathForge could not verify your pilot admission.')
  if (repairResult.error) throw new Error('PathForge could not verify the requested repair.')
  const ownedRepairAllowed = Boolean(
    repairId &&
    repairResult.data &&
    canSubmitCommunityProjectRepair(eligibilityStatus),
  )
  if ((eligibilityError || eligibilityStatus !== 'eligible') && !ownedRepairAllowed) {
    if (eligibilityError) {
      throw new Error('PathForge could not verify whether project submissions are open. Try again later.')
    }
    if (eligibilityStatus === 'temporarily_paused') {
      throw new Error('You are admitted to the pilot, but new project submissions are temporarily paused while the safety and review controls are restored.')
    }
    if (eligibilityStatus === 'expired') {
      throw new Error('Your internal acceptance access has expired. Ask the PathForge operator to renew it.')
    }
    if (eligibilityStatus === 'revoked') {
      throw new Error('Your pilot access is no longer active.')
    }
    throw new Error('This account has not been admitted to the invitation-only pilot.')
  }
  if (
    eligibilityStatus === 'eligible' &&
    profile.role !== 'admin' &&
    membership?.member_kind === 'invited_builder' &&
    !communityProjectOperatorAlertsConfigured()
  ) {
    throw new Error('Invited submissions are temporarily paused while operator alerts are unavailable.')
  }
  return user
}

function validateSubmissionFields(formData: FormData) {
  const title = formString(formData, 'title')
  const summary = formString(formData, 'summary')
  const categorySlug = formString(formData, 'category_slug')
  const difficulty = formString(formData, 'difficulty')
  const providerSelection = formString(formData, 'provider')
  const provider = providerSelection === 'Other'
    ? formString(formData, 'custom_provider')
    : providerSelection
  const model = formString(formData, 'model')
  const modelSettings = formString(formData, 'model_settings')
  const evidenceScope = formString(formData, 'evidence_scope')
  const sourceUrl = formString(formData, 'source_url')
  const sourceVisibility = sourceUrl ? formString(formData, 'source_visibility') : 'review_only'
  const submitterRole = formString(formData, 'submitter_role')
  const reusePermission = formString(formData, 'reuse_permission')
  const buildSteps = parseBuildSteps(formData)

  if (title.length < 3 || title.length > 120) throw new Error('Use a project title between 3 and 120 characters.')
  if (summary.length < 20 || summary.length > 2000) throw new Error('Describe what the project does in 20 to 2,000 characters.')
  if (!communityProjectCategories.some((category) => category.slug === categorySlug)) throw new Error('Choose a listed project category.')
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) throw new Error('Choose a project difficulty.')
  if (!communityProjectProviders.includes(providerSelection as typeof communityProjectProviders[number])) {
    throw new Error('Choose a listed AI service or Other.')
  }
  if (provider.length < 2 || provider.length > 80) throw new Error('Name the AI service used for this project.')
  if (model.length < 2 || model.length > 160) throw new Error('Add the visible model name, or type Not sure.')
  if (modelSettings.length > 1000) throw new Error('Model settings must be 1,000 characters or fewer.')
  if (!['full_run', 'selected_excerpts', 'reconstructed_notes'].includes(evidenceScope)) throw new Error('Choose how complete the build evidence is.')
  if (sourceUrl && !isSupportedCommunitySourceUrl(sourceUrl)) {
    throw new Error('Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.')
  }
  if (!['review_only', 'public'].includes(sourceVisibility)) throw new Error('Choose whether the source link may become public.')
  if (submitterRole !== 'builder') throw new Error('The invitation-only pilot accepts projects from their actual builder only.')
  if (!['view_only', 'allow_pathforge_remix'].includes(reusePermission)) throw new Error('Choose a reuse permission.')

  if (formString(formData, 'builder_attested') !== 'yes') throw new Error('Confirm that you personally built this project.')
  if (formString(formData, 'profile_attribution_attested') !== 'yes') throw new Error('Confirm the public PathForge profile credit shown in the preview.')
  if (formString(formData, 'rights_attested') !== 'yes') throw new Error('Confirm that you have permission to submit this material.')
  if (formString(formData, 'privacy_attested') !== 'yes') throw new Error('Confirm that you removed secrets and personal information.')
  if (formString(formData, 'publication_consent') !== 'yes') throw new Error('Confirm that PathForge may review and publicly display the approved bundle.')

  const evidenceFindings = scanCommunityProjectEvidenceText([
    title,
    summary,
    provider,
    model,
    modelSettings,
    sourceUrl,
    ...buildSteps.flatMap((step) => [step.title, step.prompt, step.response]),
  ].join('\n'))
  if (evidenceFindings.length > 0) {
    throw new Error(`Remove possible private material from the text fields: ${evidenceFindings.join(', ')}.`)
  }

  return {
    title,
    summary,
    categorySlug,
    difficulty,
    provider,
    model,
    modelSettings,
    evidenceScope,
    sourceUrl,
    sourceVisibility,
    submitterRole,
    reusePermission,
    buildSteps,
  }
}

export async function submitCommunityProject(formData: FormData): Promise<CommunityProjectActionResult> {
  let uploadedPath: string | null = null
  try {
    const repairId = formString(formData, 'repair_id') || null
    const user = await requireEligibleUser(repairId)
    const fields = validateSubmissionFields(formData)
    const artifact = formData.get('artifact')
    if (!(artifact instanceof File)) throw new Error('Choose the self-contained HTML artifact.')
    const scanned = await scanCommunityProjectArtifact(artifact)
    if (!scanned.report.passed) {
      throw new Error(artifactRejectionMessage(scanned.report.findings))
    }

    const admin = createAdminClient()
    if (!repairId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const [
        { count: totalSubmissionCount, error: totalCountError },
        { count: recentOwnerCount, error: recentCountError },
      ] = await Promise.all([
        admin
          .from('community_project_submissions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['queued', 'needs_repair', 'published']),
        admin
          .from('community_project_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', user.id)
          .gt('created_at', oneHourAgo)
          .not('status', 'in', '(withdrawn,removed)'),
      ])
      if (totalCountError || recentCountError) {
        throw new Error('PathForge could not verify the pilot submission limits.')
      }
      if ((totalSubmissionCount ?? 0) >= 50) {
        throw new Error('The invitation-only pilot has reached its 50-active-submission cap.')
      }
      if ((recentOwnerCount ?? 0) >= 5) {
        throw new Error('Community project pilot limit reached. Try again later.')
      }
    }

    const objectId = randomUUID()
    uploadedPath = `${user.id}/${objectId}.html.txt`
    const { error: uploadError } = await admin.storage
      .from(COMMUNITY_PROJECT_BUCKET)
      .upload(uploadedPath, scanned.bytes, {
        contentType: 'text/plain',
        cacheControl: '0',
        upsert: false,
      })
    if (uploadError) throw new Error('PathForge could not place the scanned artifact in private review storage.')

    const now = new Date().toISOString()
    const payload = {
      title: fields.title,
      summary: fields.summary,
      category_slug: fields.categorySlug,
      difficulty: fields.difficulty,
      provider: fields.provider,
      model: fields.model,
      model_settings: fields.modelSettings,
      evidence_scope: fields.evidenceScope,
      source_url: fields.sourceUrl,
      source_visibility: fields.sourceVisibility,
      build_steps: fields.buildSteps,
      artifact_path: uploadedPath,
      artifact_original_name: safeOriginalFilename(artifact.name),
      artifact_sha256: scanned.report.sha256,
      artifact_size_bytes: scanned.report.byte_length,
      artifact_scan: scanned.report,
      submitter_role: fields.submitterRole,
      reuse_permission: fields.reusePermission,
      terms_version: COMMUNITY_PROJECT_TERMS_VERSION,
      privacy_version: COMMUNITY_PROJECT_PRIVACY_VERSION,
      builder_attested_at: now,
      profile_attribution_attested_at: now,
      rights_attested_at: now,
      privacy_attested_at: now,
      publication_consent_at: now,
      fork: parseFork(formData),
    }
    const correlation = randomUUID()
    const rpc = repairId
      ? await admin.rpc('replace_community_project_submission', {
          target_submission: repairId,
          actor: user.id,
          payload,
          correlation,
        })
      : await admin.rpc('create_community_project_submission', {
          actor: user.id,
          payload,
          correlation,
        })
    if (rpc.error) throw rpc.error

    if (repairId && typeof rpc.data === 'string' && rpc.data !== uploadedPath) {
      await admin.storage.from(COMMUNITY_PROJECT_BUCKET).remove([rpc.data])
    }

    const id = repairId || String(rpc.data)
    revalidatePath('/build')
    revalidatePath('/my-forge')
    revalidatePath('/my-forge/community-projects')
    revalidatePath(`/my-forge/community-projects/${id}`)
    return { success: true, id }
  } catch (error) {
    if (uploadedPath) {
      try {
        await createAdminClient().storage.from(COMMUNITY_PROJECT_BUCKET).remove([uploadedPath])
      } catch {
        // The object remains private. Reconciliation can remove the orphan.
      }
    }
    return { success: false, error: safeError(error, 'PathForge could not submit this project safely.') }
  }
}

export async function publishCommunityProject(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'id')
    const sourceAccessConfirmed = formString(formData, 'source_access_confirmed') === 'yes'
    const reviewerNotes = formString(formData, 'reviewer_notes')
    const reviewChecks = {
      artifact_reviewed: formString(formData, 'artifact_reviewed') === 'yes',
      evidence_reviewed: formString(formData, 'evidence_reviewed') === 'yes',
      privacy_rights_reviewed: formString(formData, 'privacy_rights_reviewed') === 'yes',
      public_truth_reviewed: formString(formData, 'public_truth_reviewed') === 'yes',
      moderation_reviewed: formString(formData, 'moderation_reviewed') === 'yes',
    }
    if (Object.values(reviewChecks).some((value) => !value)) {
      throw new Error('Complete every required human review check before publication.')
    }
    if (reviewerNotes.length < 20 || reviewerNotes.length > 4000) {
      throw new Error('Record review notes between 20 and 4,000 characters before publication.')
    }
    if (!publicationRuntimeConfigured()) {
      throw new Error('Publication is paused until report abuse controls and authenticated reconciliation are configured.')
    }
    const { user } = await requireAdminAccess()
    const admin = createAdminClient()
    const { data: submission, error: submissionError } = await admin
      .from('community_project_submissions')
      .select('artifact_path,artifact_sha256,artifact_size_bytes,status,author_id')
      .eq('id', id)
      .maybeSingle()
    if (
      submissionError ||
      !submission ||
      submission.status !== 'queued' ||
      !submission.artifact_path ||
      !submission.artifact_sha256 ||
      !submission.artifact_size_bytes
    ) {
      throw new Error('Only a complete queued community project can be published.')
    }
    const [authorProfileResult, membershipResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', submission.author_id).maybeSingle(),
      admin
        .from('community_project_pilot_members')
        .select('member_kind,active,expires_at')
        .eq('user_id', submission.author_id)
        .maybeSingle(),
    ])
    const { data: authorProfile, error: authorProfileError } = authorProfileResult
    const { data: authorMembership, error: authorMembershipError } = membershipResult
    if (authorProfileError || !authorProfile) {
      throw new Error('PathForge could not verify the contributor before publication.')
    }
    if (authorMembershipError) {
      throw new Error('PathForge could not verify the contributor admission before publication.')
    }
    if (
      authorProfile.role !== 'admin' &&
      authorMembership?.member_kind === 'invited_builder' &&
      !communityProjectOperatorAlertsConfigured()
    ) {
      throw new Error('Publication is paused while operator alerts are unavailable.')
    }
    await verifyQuarantinedArtifact(
      admin,
      submission.artifact_path,
      submission.artifact_sha256,
      submission.artifact_size_bytes,
    )
    const { data, error } = await admin.rpc('publish_community_project_submission', {
      target_submission: id,
      reviewer: user.id,
      source_access_confirmed: sourceAccessConfirmed,
      review_checks: reviewChecks,
      reviewer_notes: reviewerNotes,
      correlation: randomUUID(),
    })
    if (error) throw error
    const promptId = String(data)
    revalidatePath('/paths')
    revalidatePath(`/prompt/${promptId}`)
    revalidatePath(`/admin/community-projects/${id}`)
    revalidatePath('/admin/community-projects')
    revalidateTag(PUBLIC_CATALOG_CACHE_TAG, { expire: 0 })
    return { success: true, id, promptId }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not publish this project.') }
  }
}

export async function requestCommunityProjectRepair(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'id')
    const note = formString(formData, 'builder_note')
    const { user } = await requireAdminAccess()
    const { error } = await createAdminClient().rpc('request_community_project_repair', {
      target_submission: id,
      reviewer: user.id,
      builder_note: note,
      correlation: randomUUID(),
    })
    if (error) throw error
    revalidatePath(`/admin/community-projects/${id}`)
    revalidatePath(`/my-forge/community-projects/${id}`)
    return { success: true, id }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not request changes.') }
  }
}

export async function declineCommunityProject(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'id')
    const note = formString(formData, 'builder_note')
    const { user } = await requireAdminAccess()
    const { error } = await createAdminClient().rpc('decline_community_project_submission', {
      target_submission: id,
      reviewer: user.id,
      builder_note: note,
      correlation: randomUUID(),
    })
    if (error) throw error
    revalidatePath(`/admin/community-projects/${id}`)
    revalidatePath(`/my-forge/community-projects/${id}`)
    return { success: true, id }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not decline this project.') }
  }
}

async function removeCommunityProject(
  id: string,
  actorId: string,
  removalKind: 'withdrawn' | 'removed',
  reason: string,
) {
  const admin = createAdminClient()
  const correlation = randomUUID()
  const { data: objectPath, error } = await admin.rpc('withdraw_community_project_submission', {
    target_submission: id,
    actor: actorId,
    removal_kind: removalKind,
    reason,
    correlation,
  })
  if (error) throw error

  if (typeof objectPath === 'string' && objectPath) {
    const { error: storageError } = await admin.storage.from(COMMUNITY_PROJECT_BUCKET).remove([objectPath])
    if (storageError) {
      return 'The project is no longer public, but its private artifact is queued for cleanup.'
    }
  }
  const { error: confirmError } = await admin.rpc('confirm_community_project_artifact_purged', {
    target_submission: id,
    actor: actorId,
    correlation: randomUUID(),
  })
  if (confirmError) {
    return 'The project is no longer public. PathForge could not finalize the private cleanup marker.'
  }
  return undefined
}

export async function withdrawCommunityProject(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'id')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Sign in to withdraw this project.')
    const warning = await removeCommunityProject(id, user.id, 'withdrawn', 'Contributor withdrawal')
    revalidatePath('/paths')
    revalidatePath('/my-forge')
    revalidatePath(`/my-forge/community-projects/${id}`)
    revalidateTag(PUBLIC_CATALOG_CACHE_TAG, { expire: 0 })
    return { success: true, id, warning }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not withdraw this project.') }
  }
}

export async function removeCommunityProjectAsAdmin(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'id')
    const reason = formString(formData, 'reason')
    if (reason.length < 10 || reason.length > 2000) {
      throw new Error('Record a moderation reason between 10 and 2,000 characters.')
    }
    const { user } = await requireAdminAccess()
    const warning = await removeCommunityProject(id, user.id, 'removed', reason)
    revalidatePath('/paths')
    revalidatePath(`/admin/community-projects/${id}`)
    revalidatePath('/admin/community-projects')
    revalidateTag(PUBLIC_CATALOG_CACHE_TAG, { expire: 0 })
    return { success: true, id, warning }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not remove this project.') }
  }
}

export async function reportCommunityProject(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    if (formString(formData, 'company')) return { success: true }
    const promptId = formString(formData, 'prompt_id')
    const email = formString(formData, 'email')
    const reason = formString(formData, 'reason')
    const details = formString(formData, 'details')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const rateLimitSecret = process.env.REPORT_RATE_LIMIT_SECRET
    if (!rateLimitSecret || rateLimitSecret.length < 32) {
      throw new Error('Public reporting is temporarily unavailable because its abuse controls are not configured.')
    }
    const requestHeaders = await headers()
    const forwardedFor = requestHeaders.get('x-forwarded-for')
    const clientAddress = forwardedFor?.split(',')[0]?.trim()
      || requestHeaders.get('x-real-ip')?.trim()
      || 'unavailable'
    const requestFingerprint = createHmac('sha256', rateLimitSecret)
      .update(clientAddress)
      .digest('hex')
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('create_community_project_report', {
      target_prompt: promptId,
      reporter: user?.id ?? null,
      reporter_email_value: email,
      report_reason: reason,
      report_details: details,
      request_fingerprint: requestFingerprint,
      correlation: randomUUID(),
    })
    if (error) throw error
    const reportId = String(data)
    const alertCorrelation = randomUUID()
    const alertDelivered = await sendCommunityProjectOperatorAlert({
      code: 'report_filed',
      severity: communityProjectReportSeverity(reason),
      reportId,
      promptId,
    })
    const { error: deliveryRecordError } = await admin.rpc(
      'record_community_project_report_alert_delivery',
      {
        target_report: reportId,
        delivered: alertDelivered,
        failure_code: alertDelivered ? null : 'webhook_delivery_failed',
        correlation: alertCorrelation,
      },
    )
    if (deliveryRecordError) {
      console.error('Community project report alert receipt persistence failed.', { reportId })
    }
    const notificationQueued = !alertDelivered || Boolean(deliveryRecordError)
    return {
      success: true,
      id: reportId,
      warning: notificationQueued
        ? 'The report is safely stored. Operator notification is queued for automatic retry, and publication and external invitations remain blocked until delivery succeeds.'
        : undefined,
    }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not file this report.') }
  }
}

export async function updateCommunityProjectReport(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const id = formString(formData, 'report_id')
    const status = formString(formData, 'status')
    const notes = formString(formData, 'resolution_notes')
    if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
      throw new Error('Choose a valid report state.')
    }
    const { user } = await requireAdminAccess()
    const { error } = await createAdminClient().rpc('set_community_project_report_status', {
      target_report: id,
      reviewer: user.id,
      next_status: status,
      notes,
      correlation: randomUUID(),
    })
    if (error) throw error
    revalidatePath('/admin/community-projects')
    return { success: true, id }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not update this report.') }
  }
}

export async function setCommunityProjectPilotMember(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const username = formString(formData, 'username').replace(/^@/, '')
    const active = formString(formData, 'active') === 'yes'
    const memberKind = formString(formData, 'member_kind')
    const note = formString(formData, 'note')
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) throw new Error('Enter an exact PathForge username.')
    if (!['internal_acceptance', 'invited_builder'].includes(memberKind)) {
      throw new Error('Choose the owner-operated acceptance account or invited-builder cohort.')
    }

    const { user, supabase } = await requireAdminAccess()
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,username')
      .ilike('username', escapeLikePattern(username))
      .limit(2)
    if (profileError) throw profileError
    const exactMatches = (profiles ?? []).filter((profile) => (
      profile.username?.toLocaleLowerCase() === username.toLocaleLowerCase()
    ))
    if (exactMatches.length !== 1) throw new Error('No single PathForge account matches that exact username.')
    const profile = exactMatches[0]

    const { error } = await createAdminClient().rpc('set_community_project_pilot_member', {
      target_user: profile.id,
      administrator: user.id,
      enabled: active,
      requested_member_kind: memberKind,
      member_note: note || null,
    })
    if (error) throw error
    revalidatePath('/admin/community-projects')
    return { success: true, id: profile.id }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not update pilot access.') }
  }
}

export async function setCommunityProjectInvitationControl(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const enabled = formString(formData, 'enabled') === 'yes'
    const readinessReference = formString(formData, 'launch_readiness_reference')
    if (
      enabled
      && (
        formString(formData, 'launch_readiness_confirmed') !== 'yes'
        || readinessReference.length < 8
        || readinessReference.length > 200
      )
    ) throw new Error('Confirm the gates and enter a non-secret private expansion-record reference first.')
    const { user } = await requireAdminAccess()
    const admin = createAdminClient()
    if (enabled) {
      await verifyAndRecordCommunityProjectReportReadiness(admin, user.id, 'external invitations')
      const { error: readinessError } = await admin.rpc(
        'record_community_project_invitation_readiness',
        {
          administrator: user.id,
          readiness_reference: readinessReference,
          correlation: randomUUID(),
        },
      )
      if (readinessError) throw readinessError
    }
    const { error } = await admin.rpc('set_community_project_invitation_control', {
      administrator: user.id,
      enabled,
    })
    if (error) throw error
    revalidatePath('/admin/community-projects')
    return { success: true, id: enabled ? 'invitations-enabled' : 'invitations-disabled' }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not update invited-builder submissions.') }
  }
}

export async function setCommunityProjectPublicationControl(formData: FormData): Promise<CommunityProjectActionResult> {
  try {
    const enabled = formString(formData, 'enabled') === 'yes'
    const { user } = await requireAdminAccess()
    const admin = createAdminClient()
    if (enabled) {
      await verifyAndRecordCommunityProjectReportReadiness(admin, user.id, 'publication')
    }
    const { error } = await admin.rpc('set_community_project_publication_control', {
      administrator: user.id,
      enabled,
    })
    if (error) throw error
    revalidatePath('/admin/community-projects')
    return { success: true, id: enabled ? 'publication-enabled' : 'publication-disabled' }
  } catch (error) {
    return { success: false, error: safeError(error, 'PathForge could not update publication readiness.') }
  }
}
