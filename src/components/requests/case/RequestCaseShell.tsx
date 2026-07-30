import type { ReactNode } from 'react'
import Link from 'next/link'
import type {
  PathForgeRequestReference,
  RequestActorRole,
  RequestCloseReason,
  RequestLifecycleState,
  RequestModerationState,
  RequestPublicationState,
} from '@/lib/request-lifecycle'
import { RequestCaseErrorFocus } from './RequestCaseErrorFocus'
import styles from './RequestCaseShell.module.css'

export type RequestLifecycle = RequestLifecycleState
export type RequestModeration = RequestModerationState
export type RequestPublication = RequestPublicationState
export type { RequestActorRole, RequestCloseReason }

export type RequestAcceptanceChecks =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]

export interface RequestCaseCapability {
  /**
   * Opaque, authority-provided identifier. The presentation layer never turns
   * this value into a command or assumes that a missing/present value grants
   * authority.
   */
  id: string
  label: string
}

export interface RequestCaseBrief {
  outcome: string
  intendedUser: string
  mustWorkScenario: string
  acceptanceChecks: RequestAcceptanceChecks
  constraints?: string
  pathforgeReference?:
    | { kind: 'project'; projectId: string; label?: string }
    | {
        kind: 'response'
        projectId: string
        modelVariantId: string
        responseStepNumber: number
        label?: string
      }
}

export interface RequestCaseClarification {
  state: 'none' | 'requested' | 'submitted' | 'resolved'
  summary?: string
  question?: string
  answer?: string | null
  requestedAt?: string
  respondedAt?: string
}

export interface RequestCaseAssignment {
  role: 'triager' | 'builder' | 'reviewer'
  displayName: string
  status: string
  targetDate?: string
}

export interface RequestCaseTimelineItem {
  id: string
  label: string
  detail?: string
  occurredAt: string
  actorLabel?: string
}

export interface RequestCasePresentationModel {
  visibility: 'full'
  requestLabel: string
  requestVersion: number
  lifecycle: RequestLifecycle
  moderation: RequestModeration
  publication: RequestPublication
  closeReason: RequestCloseReason | null
  actorRole: RequestActorRole
  capabilities: readonly RequestCaseCapability[]
  nextAction: {
    title: string
    description: string
  }
  brief: RequestCaseBrief
  clarification: RequestCaseClarification
  assignments: readonly RequestCaseAssignment[]
  timeline: readonly RequestCaseTimelineItem[]
  retentionNotice: string
  errorSummary?: {
    title: string
    messages: readonly string[]
  }
  statusMessage?: string
  closure?: {
    note: string | null
    resolutionHref: string | null
    resolutionLabel: string | null
    resolutionReference: PathForgeRequestReference | null
  }
}

export interface RequestRestrictedCasePresentationModel {
  visibility: 'held' | 'removed'
  requestLabel: string
  requestVersion: number
  lifecycle: RequestLifecycle
  moderation: Extract<RequestModeration, 'held' | 'removed'>
  publication: RequestPublication
  closeReason: RequestCloseReason | null
  actorRole: RequestActorRole
  capabilities: readonly RequestCaseCapability[]
  nextAction: {
    title: string
    description: string
  }
  timeline: readonly RequestCaseTimelineItem[]
  retentionNotice: string
}

export interface RequestCaseShellProps {
  model: RequestCasePresentationModel | RequestRestrictedCasePresentationModel
  /**
   * Participant-safe delivery/review content supplied by the custody boundary.
   * This shell neither infers nor reconstructs delivery state.
   */
  deliverySlot: ReactNode
  /**
   * A single authority-wired action. It is mounted once and becomes the mobile
   * sticky action; callers remain responsible for authorization and mutation.
   */
  primaryAction?: {
    capabilityId: string
    content: ReactNode
  }
  clarificationAction?: ReactNode
}

const lifecycleLabels: Record<RequestLifecycle, string> = {
  submitted: 'Submitted',
  triage: 'Triage',
  clarification_requested: 'Clarification requested',
  accepted: 'Accepted',
  building: 'Building',
  review_pending: 'Review pending',
  repair_required: 'Repair required',
  delivery_ready: 'Delivery ready',
  delivered: 'Delivered',
  completed: 'Completed',
  closed: 'Closed',
}

const progressPhases = ['Intake', 'Assigned', 'Build', 'Review', 'Delivery', 'Complete'] as const

const lifecyclePhase: Record<RequestLifecycle, number | null> = {
  submitted: 0,
  triage: 0,
  clarification_requested: 0,
  accepted: 1,
  building: 2,
  review_pending: 3,
  repair_required: 3,
  delivery_ready: 4,
  delivered: 4,
  completed: 5,
  closed: null,
}

const closeReasonLabels: Record<RequestCloseReason, string> = {
  existing_resolution: 'Resolved through an existing PathForge path',
  duplicate: 'Duplicate request',
  out_of_scope: 'Outside the managed service scope',
  capacity_unavailable: 'Capacity unavailable',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  failed_review: 'Closed after failed review',
  safety_removed: 'Removed for safety',
  no_response: 'Closed after no response',
}

const actorRoleLabels: Record<RequestActorRole, string> = {
  requester: 'Requester',
  triager: 'Triager',
  builder: 'Builder',
  reviewer: 'Independent reviewer',
  system: 'Service',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Target date unavailable'
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.valueOf())) return 'Target date unavailable'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

function VisibilityAndStage({
  model,
}: {
  model: RequestCasePresentationModel | RequestRestrictedCasePresentationModel
}) {
  const isHeld = model.moderation === 'held'
  const isRemoved = model.moderation === 'removed'

  return (
    <section className={styles.statusSection} aria-labelledby="request-case-status">
      <div className={styles.eyebrowRow}>
        <span className={styles.privateBadge}>Private service</span>
        <span className={styles.roleBadge}>{actorRoleLabels[model.actorRole]} view</span>
      </div>
      <h2 id="request-case-status">Visibility and stage</h2>
      <dl className={styles.statusList}>
        <div>
          <dt>Stage</dt>
          <dd>{lifecycleLabels[model.lifecycle]}</dd>
        </div>
        <div>
          <dt>Visibility</dt>
          <dd>Participants and authorized staff only</dd>
        </div>
        <div>
          <dt>Publication</dt>
          <dd>
            {model.publication === 'private'
              ? 'Private — no publication action is available in V1'
              : 'Publication state is outside this V1 service and cannot be changed here'}
          </dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd className={styles.breakable}>{model.requestVersion}</dd>
        </div>
      </dl>

      {isHeld ? (
        <div className={styles.warningNotice} role="status">
          This case is on moderation hold. Delivery is not evidence while the
          hold is active, and available actions may be limited.
        </div>
      ) : null}
      {isRemoved ? (
        <div className={styles.dangerNotice} role="alert">
          This case was removed for safety. Private delivery content is not
          available.
        </div>
      ) : null}
      {model.lifecycle === 'closed' && model.closeReason ? (
        <div className={styles.neutralNotice}>
          <strong>Case closed:</strong> {closeReasonLabels[model.closeReason]}
        </div>
      ) : null}
      {model.closeReason === 'withdrawn' ? (
        <div className={styles.neutralNotice}>
          The requester withdrew this case. Work and delivery actions are no
          longer available.
        </div>
      ) : null}
    </section>
  )
}

function NextAction({
  model,
  primaryAction,
}: {
  model: RequestCasePresentationModel | RequestRestrictedCasePresentationModel
  primaryAction?: RequestCaseShellProps['primaryAction']
}) {
  return (
    <section className={styles.nextActionSection} aria-labelledby="request-case-next-action">
      <p className={styles.sectionKicker}>Next action</p>
      <h2 id="request-case-next-action">{model.nextAction.title}</h2>
      <p>{model.nextAction.description}</p>
      {model.capabilities.length > 0 ? (
        <div>
          <h3 className={styles.miniHeading}>Available to you</h3>
          <ul className={styles.capabilityList}>
            {model.capabilities.map(capability => (
              <li key={capability.id}>{capability.label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.mutedText}>No case action is currently available to you.</p>
      )}
      {primaryAction ? (
        <div
          className={styles.primaryAction}
          data-request-case-primary-action
        >
          {primaryAction.content}
        </div>
      ) : null}
    </section>
  )
}

function FinishLine({ brief }: { brief: RequestCaseBrief }) {
  return (
    <section className={styles.panel} aria-labelledby="request-case-finish-line">
      <p className={styles.sectionKicker}>Agreed brief</p>
      <h2 id="request-case-finish-line">Finish line and checks</h2>
      <dl className={styles.briefGrid}>
        <div>
          <dt>Outcome</dt>
          <dd>{brief.outcome}</dd>
        </div>
        <div>
          <dt>Intended user</dt>
          <dd>{brief.intendedUser}</dd>
        </div>
        <div>
          <dt>Must-work scenario</dt>
          <dd>{brief.mustWorkScenario}</dd>
        </div>
      </dl>
      <h3>Acceptance checks</h3>
      <ol className={styles.checkList}>
        {brief.acceptanceChecks.map((check, index) => (
          <li key={`${index}-${check}`}>{check}</li>
        ))}
      </ol>
      {brief.constraints ? (
        <>
          <h3>Constraints</h3>
          <p>{brief.constraints}</p>
        </>
      ) : null}
      {brief.pathforgeReference ? (
        <div className={styles.reference}>
          <span>Validated PathForge {brief.pathforgeReference.kind}</span>
          <strong className={styles.breakable}>
            {brief.pathforgeReference.label ?? brief.pathforgeReference.projectId}
          </strong>
          {brief.pathforgeReference.kind === 'response' ? (
            <span className={styles.breakable}>
              Model variant {brief.pathforgeReference.modelVariantId}, response step{' '}
              {brief.pathforgeReference.responseStepNumber}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Closure({
  closure,
}: {
  closure: NonNullable<RequestCasePresentationModel['closure']>
}) {
  return (
    <div className={styles.neutralNotice}>
      {closure.note ? <p>{closure.note}</p> : null}
      {closure.resolutionHref && closure.resolutionLabel ? (
        <Link href={closure.resolutionHref}>
          {closure.resolutionLabel}
        </Link>
      ) : null}
      {closure.resolutionReference?.kind === 'response' ? (
        <dl className={styles.statusList}>
          <div>
            <dt>Approved model variant</dt>
            <dd className={styles.breakable}>{closure.resolutionReference.modelVariantId}</dd>
          </div>
          <div>
            <dt>Response step</dt>
            <dd>{closure.resolutionReference.responseStepNumber}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

function Clarification({
  clarification,
  action,
}: {
  clarification: RequestCaseClarification
  action?: ReactNode
}) {
  const copy: Record<RequestCaseClarification['state'], string> = {
    none: 'No clarification is currently needed.',
    requested: 'A bounded clarification is waiting for the requester.',
    submitted: 'The requester submitted clarification for triage.',
    resolved: 'The clarification was resolved and remains in the case record.',
  }

  return (
    <section className={styles.panel} aria-labelledby="request-case-clarification">
      <p className={styles.sectionKicker}>Clarification</p>
      <h2 id="request-case-clarification">{copy[clarification.state]}</h2>
      {clarification.summary ? <p>{clarification.summary}</p> : null}
      {clarification.question ? (
        <div className={styles.reference}>
          <span>Question</span>
          <strong>{clarification.question}</strong>
        </div>
      ) : null}
      {clarification.answer ? (
        <div className={styles.reference}>
          <span>Requester answer</span>
          <strong>{clarification.answer}</strong>
        </div>
      ) : null}
      {clarification.requestedAt || clarification.respondedAt ? (
        <dl className={styles.inlineFacts}>
          {clarification.requestedAt ? (
            <div>
              <dt>Requested</dt>
              <dd>
                <time dateTime={clarification.requestedAt}>
                  {formatDate(clarification.requestedAt)}
                </time>
              </dd>
            </div>
          ) : null}
          {clarification.respondedAt ? (
            <div>
              <dt>Responded</dt>
              <dd>
                <time dateTime={clarification.respondedAt}>
                  {formatDate(clarification.respondedAt)}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {action}
    </section>
  )
}

function Assignments({ assignments }: { assignments: readonly RequestCaseAssignment[] }) {
  return (
    <section className={styles.historySubsection} aria-labelledby="request-case-assignments">
      <p className={styles.sectionKicker}>Assigned team</p>
      <h3 id="request-case-assignments">Assignment summary</h3>
      {assignments.length > 0 ? (
        <ul className={styles.assignmentList}>
          {assignments.map(assignment => (
            <li key={`${assignment.role}-${assignment.displayName}`}>
              <div>
                <span>{actorRoleLabels[assignment.role]}</span>
                <strong>{assignment.displayName}</strong>
              </div>
              <div>
                <span>{assignment.status}</span>
                {assignment.targetDate ? (
                  <time dateTime={assignment.targetDate}>
                    Target {formatDateOnly(assignment.targetDate)}
                  </time>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.mutedText}>No participant assignment is visible yet.</p>
      )}
    </section>
  )
}

function Progress({ lifecycle }: { lifecycle: RequestLifecycle }) {
  const activeIndex = lifecyclePhase[lifecycle]

  return (
    <section className={styles.historySubsection} aria-labelledby="request-case-progress">
      <p className={styles.sectionKicker}>Lifecycle</p>
      <h3 id="request-case-progress">Ordered progress</h3>
      <ol className={styles.progressList}>
        {progressPhases.map((phase, index) => (
          <li
            key={phase}
            className={
              activeIndex !== null && index < activeIndex
                ? styles.progressComplete
                : activeIndex !== null && index === activeIndex
                  ? styles.progressCurrent
                  : undefined
            }
            aria-current={activeIndex !== null && index === activeIndex ? 'step' : undefined}
          >
            <span aria-hidden="true">{index + 1}</span>
            {phase}
          </li>
        ))}
      </ol>
      {lifecycle === 'repair_required' ? (
        <p className={styles.mutedText}>Repair is an interruption in review, not a completed phase.</p>
      ) : null}
      {lifecycle === 'closed' ? (
        <p className={styles.mutedText}>Closed is a terminal off-ramp, not completed progress.</p>
      ) : null}
    </section>
  )
}

function History({
  timeline,
  retentionNotice,
  assignments,
  lifecycle,
}: {
  timeline: readonly RequestCaseTimelineItem[]
  retentionNotice: string
  assignments?: readonly RequestCaseAssignment[]
  lifecycle?: RequestLifecycle
}) {
  return (
    <section className={styles.panel} aria-labelledby="request-case-history">
      <p className={styles.sectionKicker}>Durable record</p>
      <h2 id="request-case-history">History and retention</h2>
      {assignments ? <Assignments assignments={assignments} /> : null}
      {lifecycle ? <Progress lifecycle={lifecycle} /> : null}
      {timeline.length > 0 ? (
        <ol className={styles.timeline}>
          {timeline.map(item => (
            <li key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
              </div>
              {item.detail ? <p>{item.detail}</p> : null}
              {item.actorLabel ? <span>By {item.actorLabel}</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.mutedText}>
          No participant-visible history entries are available.
        </p>
      )}
      <div className={styles.retentionNotice}>
        <strong>Retention</strong>
        <p>{retentionNotice}</p>
      </div>
    </section>
  )
}

export function RequestCaseShell({
  model,
  deliverySlot,
  primaryAction,
  clarificationAction,
}: RequestCaseShellProps) {
  if (model.visibility === 'removed') {
    return (
      <article className={styles.caseShell} aria-labelledby="request-case-title">
        <header className={styles.caseHeader}>
          <p className={styles.overline}>Private Request a Build case</p>
          <h1 id="request-case-title">Request unavailable</h1>
        </header>
        <section className={styles.dangerNotice} role="alert">
          This case was removed for safety. Its brief, clarification, assignments,
          delivery, and participant timeline are not available.
        </section>
        <section className={styles.panel} aria-labelledby="request-case-retention">
          <h2 id="request-case-retention">Retention</h2>
          <p>{model.retentionNotice}</p>
        </section>
      </article>
    )
  }

  const heldAction = primaryAction &&
    ['release_moderation_hold', 'remove_for_moderation'].includes(primaryAction.capabilityId)
    ? primaryAction
    : undefined
  const capabilityAction = primaryAction &&
    model.capabilities.some((capability) => capability.id === primaryAction.capabilityId)
    ? primaryAction
    : undefined
  const visiblePrimaryAction = model.visibility === 'held'
    ? capabilityAction && heldAction
    : capabilityAction

  if (model.visibility === 'held') {
    return (
      <article className={styles.caseShell} aria-labelledby="request-case-title">
        <header className={styles.caseHeader}>
          <p className={styles.overline}>Private Request a Build case</p>
          <h1 id="request-case-title" className={styles.breakable}>
            {model.requestLabel}
          </h1>
        </header>
        <div className={styles.caseGrid}>
          <aside className={styles.statusRail} aria-label="Held case status and next action">
            <VisibilityAndStage model={model} />
            <NextAction model={model} primaryAction={visiblePrimaryAction} />
          </aside>
          <div className={styles.caseMain}>
            <section className={styles.warningNotice} role="status">
              This restricted view does not expose the brief, clarification,
              assignments, or delivery while moderation hold authority is active.
            </section>
            <History
              timeline={model.timeline}
              retentionNotice={model.retentionNotice}
            />
          </div>
        </div>
      </article>
    )
  }

  if (model.visibility !== 'full') return null

  return (
    <article className={styles.caseShell} aria-labelledby="request-case-title">
      <header className={styles.caseHeader}>
        <p className={styles.overline}>Request a Build case</p>
        <h1 id="request-case-title" className={styles.breakable}>
          {model.requestLabel}
        </h1>
      </header>

      {model.errorSummary ? (
        <>
          <RequestCaseErrorFocus
            focusKey={`${model.requestVersion}:${model.errorSummary.title}:${model.errorSummary.messages.join('|')}`}
          />
          <section
            className={styles.errorSummary}
            role="alert"
            aria-labelledby="request-case-error-title"
            tabIndex={-1}
            data-request-case-error-summary
          >
            <h2 id="request-case-error-title">{model.errorSummary.title}</h2>
            <ul>
              {model.errorSummary.messages.map(message => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {model.statusMessage ? (
        <p className={styles.srStatus} role="status" aria-live="polite">
          {model.statusMessage}
        </p>
      ) : null}

      <div className={styles.caseGrid}>
        <aside className={styles.statusRail} aria-label="Case status and next action">
          <VisibilityAndStage model={model} />
          <NextAction model={model} primaryAction={visiblePrimaryAction} />
        </aside>

        <div className={styles.caseMain}>
          <FinishLine brief={model.brief} />
          {model.closure ? <Closure closure={model.closure} /> : null}
          <Clarification
            clarification={model.clarification}
            action={clarificationAction}
          />
          <div className={styles.deliverySlot}>{deliverySlot}</div>
          <History
            timeline={model.timeline}
            retentionNotice={model.retentionNotice}
            assignments={model.assignments}
            lifecycle={model.lifecycle}
          />
        </div>
      </div>
    </article>
  )
}
