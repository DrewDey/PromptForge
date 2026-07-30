import type { RequestAuditEvent } from './types'
import styles from './requestAdmin.module.css'

export function RequestAuditTimeline({
  events,
}: {
  events: readonly RequestAuditEvent[]
}) {
  return (
    <section className={styles.timelineSection} aria-labelledby="audit-heading">
      <div>
        <p className={styles.eyebrow}>Durable history</p>
        <h2 id="audit-heading">Audit timeline</h2>
      </div>
      {events.length === 0 ? (
        <p className={styles.muted}>
          No participant-visible events were included in this projection.
        </p>
      ) : (
        <ol className={styles.timeline}>
          {events.map((event) => (
            <li key={event.eventId}>
              <span className={styles.timelineMarker} aria-hidden="true" />
              <div>
                <h3>{event.label}</h3>
                {event.detail ? <p>{event.detail}</p> : null}
                <p className={styles.timelineMeta}>
                  {event.actorLabel} ·{' '}
                  <time dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString()}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
