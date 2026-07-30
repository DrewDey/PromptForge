import type {
  RequestAdminActions,
  RequestAdminDetailModel,
  RequestCloseReason,
  RequestEligibleAssignee,
  RequestFormAction,
} from './types'
import { RequestAuditTimeline } from './RequestAuditTimeline'
import styles from './requestAdmin.module.css'

const CLOSE_REASON_LABELS: Record<RequestCloseReason, string> = {
  existing_resolution: 'Existing PathForge resolution',
  duplicate: 'Duplicate',
  out_of_scope: 'Out of scope',
  capacity_unavailable: 'Capacity unavailable',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired clarification',
  failed_review: 'Failed review',
  safety_removed: 'Safety removal',
  no_response: 'No response',
}

function AuthorityFields({
  requestId,
  version,
  idempotencyKey,
}: {
  requestId: string
  version: number
  idempotencyKey: string
}) {
  return (
    <>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    </>
  )
}

function OperationCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.operationCard}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

function ResolutionForms({
  action,
  requestId,
  version,
  existingResolutionKey,
  duplicateKey,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  existingResolutionKey: string
  duplicateKey: string
}) {
  return (
    <div className={styles.detailStack}>
      <form action={action} className={styles.form}>
        <AuthorityFields requestId={requestId} version={version} idempotencyKey={existingResolutionKey} />
        <input type="hidden" name="resolution" value="existing_resolution" />
        <fieldset>
          <legend>Validated existing PathForge resolution</legend>
          <label>
            Reference type
            <select name="referenceKind" required defaultValue="project">
              <option value="project">Project</option>
              <option value="response">Response step</option>
            </select>
          </label>
          <label>
            Project identifier
            <input name="referenceProjectId" required autoComplete="off" />
          </label>
          <label>
            Model variant identifier <span>Response only</span>
            <input name="referenceModelVariantId" autoComplete="off" />
          </label>
          <label>
            Response step number <span>Response only</span>
            <input
              name="referenceResponseStepNumber"
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
            />
          </label>
        </fieldset>
        <p className={styles.help}>
          Enter typed identifiers, never a URL. For a response, the service
          verifies exact approved published model-variant response evidence.
        </p>
        <label>
          Participant-facing resolution note
          <textarea name="note" rows={3} minLength={4} maxLength={500} required />
        </label>
        <button className={styles.primaryButton} type="submit">
          Record existing resolution
        </button>
      </form>
      <form action={action} className={styles.form}>
        <AuthorityFields requestId={requestId} version={version} idempotencyKey={duplicateKey} />
        <input type="hidden" name="resolution" value="duplicate" />
        <label>
          Duplicate note
          <textarea name="note" rows={3} minLength={4} maxLength={500} required />
        </label>
        <p className={styles.help}>
          Do not enter or reveal another private case identifier. No other
          private case ID or link is accepted, stored through this form, or
          projected to participants.
        </p>
        <button className={styles.primaryButton} type="submit">
          Record duplicate
        </button>
      </form>
    </div>
  )
}

function ClarificationForm({
  action,
  requestId,
  version,
  idempotencyKey,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <label>
        Bounded clarification question
        <textarea
          name="question"
          rows={4}
          minLength={10}
          maxLength={600}
          required
          aria-describedby="clarification-help"
        />
      </label>
      <p className={styles.help} id="clarification-help">
        Ask only for information needed to make the outcome testable. Do not
        request secrets, customer data, repositories, account links, or
        attachments.
      </p>
      <button className={styles.primaryButton} type="submit">
        Request clarification
      </button>
    </form>
  )
}

function AcceptAssignmentForm({
  action,
  requestId,
  version,
  idempotencyKey,
  eligibleBuilders,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
  eligibleBuilders: readonly RequestEligibleAssignee[]
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <div className={styles.formGrid}>
        <label>
          Eligible builder
          <select name="builderUserId" required defaultValue="">
            <option value="" disabled>Select an eligible builder</option>
            {eligibleBuilders.map((assignee) => (
              <option key={assignee.accountId} value={assignee.accountId}>
                {assignee.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target date
          <input name="targetDate" type="date" required />
        </label>
      </div>
      <p className={styles.help}>
        Acceptance and the sole builder assignment are submitted atomically.
        The service revalidates eligibility, capacity, and current version.
      </p>
      <button className={styles.primaryButton} type="submit">
        Accept and assign builder
      </button>
    </form>
  )
}

function StartBuildForm({
  action,
  requestId,
  version,
  idempotencyKey,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <input type="hidden" name="command" value="start_build" />
      <p className={styles.help}>
        Only the assigned builder can start work. Delivery submission and review handoff remain in the protected delivery slot.
      </p>
      <button className={styles.primaryButton} type="submit">
        Start building
      </button>
    </form>
  )
}

function ReviewerAssignmentForm({
  action,
  requestId,
  version,
  idempotencyKey,
  eligibleReviewers,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
  eligibleReviewers: readonly RequestEligibleAssignee[]
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <label>
        Eligible independent reviewer
        <select
          name="reviewerUserId"
          required
          defaultValue=""
          aria-describedby="reviewer-help"
        >
          <option value="" disabled>Select an eligible reviewer</option>
          {eligibleReviewers.map((assignee) => (
            <option key={assignee.accountId} value={assignee.accountId}>
              {assignee.displayName}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.help} id="reviewer-help">
        Only the admin-scoped eligible-assignee projection is shown. The
        service revalidates the selection and rejects the active builder.
      </p>
      <button className={styles.primaryButton} type="submit">
        Assign reviewer
      </button>
    </form>
  )
}

function ModerationReasonForm({
  action,
  requestId,
  version,
  idempotencyKey,
  command,
  label,
  buttonLabel,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
  command: 'place_moderation_hold' | 'remove_for_moderation'
  label: string
  buttonLabel: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <input type="hidden" name="command" value={command} />
      <label>
        {label}
        <textarea name="reason" rows={3} maxLength={500} required />
      </label>
      <button className={styles.dangerButton} type="submit">
        {buttonLabel}
      </button>
    </form>
  )
}

function ReleaseModerationHoldForm({
  action,
  requestId,
  version,
  idempotencyKey,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <input type="hidden" name="command" value="release_moderation_hold" />
      <label>
        Hold resolution
        <textarea name="resolution" rows={3} minLength={4} maxLength={500} required />
      </label>
      <p className={styles.help}>
        Release is available only for the authority-projected active hold and
        is revalidated by the service.
      </p>
      <button className={styles.primaryButton} type="submit">
        Release moderation hold
      </button>
    </form>
  )
}

function CloseForm({
  action,
  requestId,
  version,
  idempotencyKey,
  allowedReasons,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
  allowedReasons: readonly RequestCloseReason[]
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <label>
        Close reason
        <select name="closeReason" required defaultValue="">
          <option value="" disabled>
            Choose reason
          </option>
          {allowedReasons.map((reason) => (
            <option key={reason} value={reason}>
              {CLOSE_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Closure note
        <textarea name="note" rows={3} minLength={4} maxLength={500} required />
      </label>
      <button className={styles.dangerButton} type="submit">
        Close case
      </button>
    </form>
  )
}

export function AdminRequestDetailOperations({
  model,
  actions = {},
}: {
  model: RequestAdminDetailModel
  actions?: RequestAdminActions
}) {
  const { capabilities } = model
  const hasOperations =
    (capabilities.canResolveExistingPath && actions.resolveExistingPath) ||
    (capabilities.canRequestClarification && actions.requestClarification) ||
    (capabilities.canAcceptAndAssign && actions.acceptAndAssign) ||
    (capabilities.canStartBuild && actions.startBuild) ||
    (capabilities.canAssignReviewer && actions.assignReviewer) ||
    (capabilities.canPlaceModerationHold && actions.placeModerationHold) ||
    (capabilities.canReleaseModerationHold && actions.releaseModerationHold) ||
    (capabilities.canRemoveForModeration && actions.removeForModeration) ||
    (model.allowedCloseReasons.length > 0 && actions.close)

  return (
    <div className={styles.detailStack}>
      <section className={styles.caseSummary} aria-labelledby="operations-heading">
        <div>
          <p className={styles.eyebrow}>Role operations</p>
          <h2 id="operations-heading">Authorized next actions</h2>
        </div>
        <dl>
          <div>
            <dt>Role</dt>
            <dd>{model.actorRole}</dd>
          </div>
          <div>
            <dt>Lifecycle</dt>
            <dd>{model.lifecycle.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt>Moderation</dt>
            <dd>{model.moderation}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{model.version}</dd>
          </div>
          {model.builderLabel ? (
            <div>
              <dt>Builder</dt>
              <dd>{model.builderLabel}</dd>
            </div>
          ) : null}
          {model.reviewerLabel ? (
            <div>
              <dt>Reviewer</dt>
              <dd>{model.reviewerLabel}</dd>
            </div>
          ) : null}
          {model.targetDate ? (
            <div>
              <dt>Target</dt>
              <dd>
                <time dateTime={model.targetDate}>
                  {new Date(model.targetDate).toLocaleDateString()}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className={styles.opaqueId}>Case {model.requestId}</p>
      </section>

      <div className={styles.operationGrid}>
        {capabilities.canResolveExistingPath && actions.resolveExistingPath ? (
          <OperationCard
            title="Resolve to existing work"
            description="Prefer an existing PathForge path or identify a duplicate before accepting net-new work."
          >
            <ResolutionForms
              action={actions.resolveExistingPath}
              requestId={model.requestId}
              version={model.version}
              existingResolutionKey={model.idempotencyKeys.existingResolution}
              duplicateKey={model.idempotencyKeys.duplicate}
            />
          </OperationCard>
        ) : null}

        {capabilities.canRequestClarification &&
        actions.requestClarification ? (
          <OperationCard
            title="Request clarification"
            description="Ask one bounded question that makes the outcome or acceptance checks testable."
          >
            <ClarificationForm
              action={actions.requestClarification}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.clarification}
            />
          </OperationCard>
        ) : null}

        {capabilities.canAcceptAndAssign && actions.acceptAndAssign ? (
          <OperationCard
            title="Accept and assign"
            description="Create the sole active builder assignment in the same authoritative command."
          >
            <AcceptAssignmentForm
              action={actions.acceptAndAssign}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.accept}
              eligibleBuilders={model.eligibleBuilders}
            />
          </OperationCard>
        ) : null}

        {capabilities.canStartBuild &&
        actions.startBuild ? (
          <OperationCard
            title="Builder progress"
            description="Begin the assigned build. Exact delivery and review are handled in the protected delivery slot."
          >
            <StartBuildForm
              action={actions.startBuild}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.startBuild}
            />
          </OperationCard>
        ) : null}

        {capabilities.canAssignReviewer && actions.assignReviewer ? (
          <OperationCard
            title="Assign independent reviewer"
            description="The reviewer must be different from the credited builder."
          >
            <ReviewerAssignmentForm
              action={actions.assignReviewer}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.assignReviewer}
              eligibleReviewers={model.eligibleReviewers}
            />
          </OperationCard>
        ) : null}

        {capabilities.canPlaceModerationHold && actions.placeModerationHold ? (
          <OperationCard
            title="Place moderation hold"
            description="Block work and access with a bounded reason. This is not a generic state setter."
          >
            <ModerationReasonForm
              action={actions.placeModerationHold}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.placeModerationHold}
              command="place_moderation_hold"
              label="Hold reason"
              buttonLabel="Place moderation hold"
            />
          </OperationCard>
        ) : null}

        {capabilities.canReleaseModerationHold && actions.releaseModerationHold ? (
          <OperationCard
            title="Release moderation hold"
            description="Resolve the one active authority-projected hold."
          >
            <ReleaseModerationHoldForm
              action={actions.releaseModerationHold}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.releaseModerationHold}
            />
          </OperationCard>
        ) : null}

        {capabilities.canRemoveForModeration && actions.removeForModeration ? (
          <OperationCard
            title="Remove for moderation"
            description="Remove access with a bounded reason; this does not imply completion."
          >
            <ModerationReasonForm
              action={actions.removeForModeration}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.removeForModeration}
              command="remove_for_moderation"
              label="Removal reason"
              buttonLabel="Remove case"
            />
          </OperationCard>
        ) : null}

        {model.allowedCloseReasons.length > 0 && actions.close ? (
          <OperationCard
            title="Close case"
            description="Closure records a reason separately from lifecycle and never publishes the case."
          >
            <CloseForm
              action={actions.close}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.close}
              allowedReasons={model.allowedCloseReasons}
            />
          </OperationCard>
        ) : null}
      </div>

      {!hasOperations ? (
        <p className={styles.noOperations} role="status">
          No operations are authorized for this participant and case version.
        </p>
      ) : null}

      <RequestAuditTimeline events={model.timeline} />
    </div>
  )
}
