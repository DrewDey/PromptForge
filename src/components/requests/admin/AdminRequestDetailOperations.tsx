import type {
  RequestAdminActions,
  RequestAdminDetailModel,
  RequestCloseReason,
  RequestFormAction,
} from './types'
import { RequestAuditTimeline } from './RequestAuditTimeline'
import styles from './requestAdmin.module.css'

const CLOSE_REASONS: readonly {
  value: RequestCloseReason
  label: string
}[] = [
  { value: 'out_of_scope', label: 'Out of scope' },
  { value: 'capacity_unavailable', label: 'Capacity unavailable' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed_review', label: 'Failed review' },
]

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
              max={999}
              inputMode="numeric"
            />
          </label>
        </fieldset>
        <p className={styles.help}>
          Enter typed identifiers, never a URL. The service verifies project membership and response-step bounds.
        </p>
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
          Do not enter or reveal another private case identifier. The authority resolves duplicate relationships privately.
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
}: {
  action: RequestFormAction
  requestId: string
  version: number
  idempotencyKey: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <div className={styles.formGrid}>
        <label>
          Builder user identifier
          <input name="builderUserId" required autoComplete="off" />
        </label>
        <label>
          Target date
          <input name="targetDate" type="date" required />
        </label>
      </div>
      <p className={styles.help}>
        Acceptance and the sole builder assignment are submitted atomically.
        Capacity and current version remain service-authoritative.
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
  builderUserId,
  idempotencyKey,
}: {
  action: RequestFormAction
  requestId: string
  version: number
  builderUserId?: string | null
  idempotencyKey: string
}) {
  return (
    <form action={action} className={styles.form}>
      <AuthorityFields requestId={requestId} version={version} idempotencyKey={idempotencyKey} />
      <label>
        Independent reviewer user identifier
        <input
          name="reviewerUserId"
          required
          autoComplete="off"
          aria-describedby="reviewer-help"
        />
      </label>
      {builderUserId ? (
        <input type="hidden" name="builderUserIdForClientCheck" value={builderUserId} />
      ) : null}
      <p className={styles.help} id="reviewer-help">
        The service rejects the active builder as reviewer, including under
        elevated service authority.
      </p>
      <button className={styles.primaryButton} type="submit">
        Assign reviewer
      </button>
    </form>
  )
}

function ModerationForm({
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
        Moderation state
        <select name="moderation" required defaultValue="">
          <option value="" disabled>
            Choose state
          </option>
          <option value="clear">Clear</option>
          <option value="held">Hold</option>
          <option value="removed">Remove</option>
        </select>
      </label>
      <label>
        Internal reason
        <textarea name="reason" rows={3} maxLength={500} required />
      </label>
      <button className={styles.dangerButton} type="submit">
        Apply moderation state
      </button>
    </form>
  )
}

function CloseForm({
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
        Close reason
        <select name="closeReason" required defaultValue="">
          <option value="" disabled>
            Choose reason
          </option>
          {CLOSE_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
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
    (capabilities.canModerate && actions.moderate) ||
    (capabilities.canClose && actions.close)

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
              builderUserId={model.builderUserId}
              idempotencyKey={model.idempotencyKeys.assignReviewer}
            />
          </OperationCard>
        ) : null}

        {capabilities.canModerate && actions.moderate ? (
          <OperationCard
            title="Moderation"
            description="Hold or remove a case without implying successful completion or delivery."
          >
            <ModerationForm
              action={actions.moderate}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.moderation}
            />
          </OperationCard>
        ) : null}

        {capabilities.canClose && actions.close ? (
          <OperationCard
            title="Close case"
            description="Closure records a reason separately from lifecycle and never publishes the case."
          >
            <CloseForm
              action={actions.close}
              requestId={model.requestId}
              version={model.version}
              idempotencyKey={model.idempotencyKeys.close}
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
