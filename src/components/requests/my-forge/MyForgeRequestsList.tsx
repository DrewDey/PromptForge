import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileLock2,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  ShieldAlert,
  Wrench,
} from 'lucide-react'
import styles from './MyForgeRequestsList.module.css'

export type MyForgeRequestLifecycle =
  | 'submitted'
  | 'triage'
  | 'clarification_requested'
  | 'accepted'
  | 'building'
  | 'review_pending'
  | 'repair_required'
  | 'delivery_ready'
  | 'delivered'
  | 'completed'
  | 'closed'

export type MyForgeRequestModeration = 'clear' | 'held' | 'removed'

export interface MyForgeRequestSummary {
  /** A participant-safe label. Do not pass raw brief text. */
  summaryLabel: string
  lifecycle: MyForgeRequestLifecycle
  moderation: MyForgeRequestModeration
  publication: 'private'
  /** Authority-derived display status; the component does not infer one from lifecycle. */
  statusLabel: string
  unread: boolean
  /** A bounded, participant-safe next-action label. */
  nextAction: string
  updatedAt: string
  /** Opaque, same-origin href for resuming this request. */
  continuationHref: string
}

export type MyForgeRequestsState =
  | {
      kind: 'loading'
      label?: string
    }
  | {
      kind: 'unavailable'
      retryHref: string
      message?: string
    }
  | {
      kind: 'empty'
      newRequestHref: string
      existingPathHref: string
    }
  | {
      kind: 'ready'
      requests: readonly MyForgeRequestSummary[]
      /** Opaque, cursor-bearing href supplied by the server adapter. */
      nextPageHref?: string
    }

export interface MyForgeRequestsListProps {
  state: MyForgeRequestsState
  headingId?: string
}

const lifecycleIcons = {
  submitted: Clock3,
  triage: Clock3,
  clarification_requested: MessageSquareText,
  accepted: CheckCircle2,
  building: Wrench,
  review_pending: ShieldAlert,
  repair_required: Wrench,
  delivery_ready: Inbox,
  delivered: Inbox,
  completed: CheckCircle2,
  closed: FileLock2,
} satisfies Record<MyForgeRequestLifecycle, typeof Clock3>

function formatUpdatedAt(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Update time unavailable'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function RequestRow({ request }: { request: MyForgeRequestSummary }) {
  const StatusIcon = lifecycleIcons[request.lifecycle]
  const moderationLabel = request.moderation === 'held'
    ? 'Moderation hold'
    : request.moderation === 'removed'
      ? 'Removed'
      : null

  return (
    <li className={styles.requestItem}>
      <Link
        href={request.continuationHref}
        className={styles.requestLink}
        aria-label={`${request.summaryLabel}. ${moderationLabel ?? request.statusLabel}. Next action: ${request.nextAction}.`}
      >
        <span className={styles.requestMain}>
          <span className={styles.titleLine}>
            {request.unread ? (
              <span className={styles.unreadDot} aria-hidden="true" />
            ) : null}
            <span className={styles.requestTitle}>{request.summaryLabel}</span>
            {request.unread ? <span className={styles.screenReaderOnly}>Unread update</span> : null}
          </span>

          <span className={styles.statusLine}>
            <span
              className={styles.status}
              data-lifecycle={request.lifecycle}
              data-moderation={request.moderation}
            >
              <StatusIcon aria-hidden="true" />
              {moderationLabel ?? request.statusLabel}
            </span>
            <span className={styles.privateLabel}>
              <FileLock2 aria-hidden="true" />
              Private
            </span>
            <time dateTime={request.updatedAt}>Updated {formatUpdatedAt(request.updatedAt)}</time>
          </span>
        </span>

        <span className={styles.nextAction}>
          <span>
            <span className={styles.eyebrow}>Next action</span>
            <span className={styles.nextActionLabel}>{request.nextAction}</span>
          </span>
          <ArrowRight aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

function LoadingState({ label }: { label?: string }) {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle className={styles.loadingIcon} aria-hidden="true" />
      <div>
        <h3>{label ?? 'Loading your requests'}</h3>
        <p>Checking your private request history and next actions.</p>
      </div>
    </div>
  )
}

function UnavailableState({
  retryHref,
  message,
}: {
  retryHref: string
  message?: string
}) {
  return (
    <div className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
      <AlertCircle aria-hidden="true" />
      <div>
        <h3>Requests could not load.</h3>
        <p>
          {message
            ?? 'Your private request history has not been replaced with an empty list. Retry the secure read.'}
        </p>
        <Link href={retryHref} className={styles.stateAction}>
          Retry requests
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function EmptyState({
  newRequestHref,
  existingPathHref,
}: {
  newRequestHref: string
  existingPathHref: string
}) {
  return (
    <div className={styles.statePanel}>
      <Inbox aria-hidden="true" />
      <div>
        <h3>No private build requests yet.</h3>
        <p>
          Requests appear here only for you and assigned PathForge staff. Search for an existing
          path first, or submit a finite outcome when the service is accepting requests.
        </p>
        <div className={styles.stateActions}>
          <Link href={existingPathHref} className={styles.secondaryAction}>
            Search existing paths
          </Link>
          <Link href={newRequestHref} className={styles.stateAction}>
            Request a build
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function MyForgeRequestsList({
  state,
  headingId = 'my-forge-requests-heading',
}: MyForgeRequestsListProps) {
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Private managed service</span>
          <h2 id={headingId}>Build requests</h2>
          <p>Follow durable receipts, next actions, and private reviewed delivery in one place.</p>
        </div>
        {state.kind === 'ready' ? (
          <span className={styles.count} aria-label={`${state.requests.length} requests on this page`}>
            {state.requests.length} {state.requests.length === 1 ? 'request' : 'requests'}
          </span>
        ) : null}
      </header>

      {state.kind === 'loading' ? <LoadingState label={state.label} /> : null}
      {state.kind === 'unavailable' ? (
        <UnavailableState retryHref={state.retryHref} message={state.message} />
      ) : null}
      {state.kind === 'empty' ? (
        <EmptyState
          newRequestHref={state.newRequestHref}
          existingPathHref={state.existingPathHref}
        />
      ) : null}
      {state.kind === 'ready' ? (
        <>
          {state.requests.length > 0 ? (
            <ol className={styles.requestList} aria-label="Your private build requests">
              {state.requests.map((request) => (
                <RequestRow key={request.continuationHref} request={request} />
              ))}
            </ol>
          ) : (
            <div className={styles.contractWarning} role="alert">
              <AlertCircle aria-hidden="true" />
              <p>
                The request list returned without any items. Use the explicit empty state so a
                successful empty result stays distinct from an unavailable read.
              </p>
            </div>
          )}

          {state.nextPageHref ? (
            <nav className={styles.pagination} aria-label="Build request pages">
              <Link href={state.nextPageHref} className={styles.loadMore}>
                Continue to older requests
                <ArrowRight aria-hidden="true" />
              </Link>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
