import Link from 'next/link'
import type {
  RequestAvailability,
  RequestLifecycle,
  RequestQueueModel,
  RequestQueueScope,
} from './types'
import styles from './requestAdmin.module.css'

const SCOPE_LABELS: Record<RequestQueueScope, string> = {
  admin: 'All managed cases',
  triager: 'Triage queue',
  builder: 'Builder queue',
  reviewer: 'Review queue',
}

const LIFECYCLE_LABELS: Record<RequestLifecycle, string> = {
  submitted: 'Submitted',
  triage: 'In triage',
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

function formatTargetDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function AvailabilityNotice({
  availability,
}: {
  availability: RequestAvailability
}) {
  if (availability.state === 'open') {
    return (
      <p className={styles.availability} data-tone="positive" role="status">
        Service open · {availability.activeCount} of{' '}
        {availability.maxActiveCases} active cases
      </p>
    )
  }

  const message =
    availability.state === 'capacity_full'
      ? `Capacity full · ${availability.activeCount} of ${availability.maxActiveCases} active cases`
      : availability.state === 'assignment_off'
        ? 'Assignments are paused by service controls'
        : 'Request intake is paused by service controls'

  return (
    <p className={styles.availability} data-tone="warning" role="status">
      {message}
    </p>
  )
}

function QueueSkeleton() {
  return (
    <div className={styles.skeletonList} aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div className={styles.skeletonRow} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

export function AdminRequestQueue({ model }: { model: RequestQueueModel }) {
  const heading = SCOPE_LABELS[model.scope]
  const headingId = `request-${model.scope}-queue-heading`

  return (
    <section className={styles.queue} aria-labelledby={headingId}>
      <div className={styles.queueHeader}>
        <div>
          <p className={styles.eyebrow}>Private managed service</p>
          <h2 id={headingId}>{heading}</h2>
        </div>
        {model.state === 'ready' ? (
          <AvailabilityNotice availability={model.availability} />
        ) : null}
      </div>

      {model.state === 'loading' ? (
        <div role="status" aria-live="polite">
          <span className={styles.srOnly}>Loading request queue.</span>
          <QueueSkeleton />
        </div>
      ) : model.state === 'unavailable' ? (
        <div className={styles.unavailable} role="alert">
          <h3>Queue unavailable</h3>
          <p>
            {model.message ??
              'The service could not verify the current queue. No empty-state conclusion was made.'}
          </p>
          {model.retryHref ? (
            <Link className={styles.secondaryButton} href={model.retryHref}>
              Retry queue
            </Link>
          ) : null}
        </div>
      ) : model.rows.length === 0 ? (
        <div className={styles.empty}>
          <h3>No cases in this private queue</h3>
          <p>
            There are no participant-authorized case summaries in this scope.
            Private cases outside this role are not shown.
          </p>
        </div>
      ) : (
        <>
          <ol className={styles.queueList}>
            {model.rows.map((row) => (
              <li key={row.requestId}>
                <Link
                  className={styles.queueRow}
                  href={row.detailHref}
                >
                  <span className={styles.queueRowTop}>
                    <span className={styles.queueLabel}>{row.label}</span>
                    {row.unread ? (
                      <span className={styles.unread}>Unread</span>
                    ) : null}
                  </span>
                  <span className={styles.queueMetadata}>
                    <span data-lifecycle={row.lifecycle}>
                      {LIFECYCLE_LABELS[row.lifecycle]}
                    </span>
                    <span>{row.actorRole}</span>
                    <time dateTime={row.updatedAt}>
                      Updated {new Date(row.updatedAt).toLocaleDateString()}
                    </time>
                    {row.targetDate ? (
                      <time dateTime={row.targetDate}>
                        Target {formatTargetDate(row.targetDate)}
                      </time>
                    ) : null}
                  </span>
                  <span className={styles.nextAction}>
                    <strong>Next action</strong>
                    {row.nextAction}
                  </span>
                  <span className={styles.opaqueId}>
                    Case {row.requestId} · v{row.version}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {model.nextCursor && model.loadMoreHref ? (
            <Link className={styles.secondaryButton} href={model.loadMoreHref}>
              Load more cases
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}
