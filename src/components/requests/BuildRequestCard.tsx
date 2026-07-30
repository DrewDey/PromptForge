import Link from 'next/link'
import {
  CheckCircle2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import type { BuildRequestWithRelations } from '@/lib/types'
import styles from '@/app/requests/requests.module.css'

interface BuildRequestCardProps {
  request: BuildRequestWithRelations
  requestNumber: number
}

function statusLabel(status: string) {
  if (status === 'answered') return 'Answered'
  if (status === 'closed') return 'Closed'
  return 'Open'
}

export function BuildRequestCard({
  request,
  requestNumber,
}: BuildRequestCardProps) {
  const responses = request.responses ?? []

  return (
    <article className={styles.requestCard}>
      <div className={styles.requestNumber} aria-hidden="true">
        {String(requestNumber).padStart(2, '0')}
      </div>

      <div className={styles.requestContent}>
        <div className={styles.requestMeta}>
          <span data-status={request.status}>{statusLabel(request.status)}</span>
          <span>{responses.length} {responses.length === 1 ? 'response' : 'responses'}</span>
          <span>{new Date(request.created_at).toLocaleDateString()}</span>
        </div>

        <h3>{request.title}</h3>
        <p className={styles.requestBody}>{request.body}</p>

        <div className={styles.requestByline}>
          <p>Requested by <strong>{request.author?.display_name ?? request.author?.username ?? 'a PathForge user'}</strong></p>
          <span className={styles.legacyVoteCount}>{request.vote_count} archived {request.vote_count === 1 ? 'vote' : 'votes'}</span>
        </div>

        {responses.length > 0 && (
          <section className={styles.responses} aria-label={`Responses to ${request.title}`}>
            <h4>
              <MessageSquare aria-hidden="true" />
              Builder responses
            </h4>
            {responses.map(response => (
              <article key={response.id} className={styles.response}>
                <div>
                  {response.is_accepted && (
                    <span className={styles.acceptedResponse}>
                      <CheckCircle2 aria-hidden="true" />
                      Accepted
                    </span>
                  )}
                  <time dateTime={response.created_at}>{new Date(response.created_at).toLocaleDateString()}</time>
                </div>
                <p>{response.body}</p>
                {response.url && (
                  <Link href={response.url}>
                    Open linked build
                    <ExternalLink aria-hidden="true" />
                  </Link>
                )}
              </article>
            ))}
          </section>
        )}

        <div className={styles.closedNotice}>
          Legacy record — public responses and votes are permanently read-only.
        </div>
      </div>
    </article>
  )
}
