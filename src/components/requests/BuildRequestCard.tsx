import Link from 'next/link'
import {
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import BuildRequestResponseForm from '@/components/BuildRequestResponseForm'
import { voteOnBuildRequest } from '@/lib/actions'
import type { BuildRequestWithRelations } from '@/lib/types'
import styles from '@/app/requests/requests.module.css'

interface BuildRequestCardProps {
  request: BuildRequestWithRelations
  requestNumber: number
  isAuthenticated: boolean
  hasVoted: boolean
}

function statusLabel(status: string) {
  if (status === 'answered') return 'Answered'
  if (status === 'closed') return 'Closed'
  return 'Open'
}

function loginHref(next: string) {
  return `/auth/login?next=${encodeURIComponent(next)}`
}

export function BuildRequestCard({
  request,
  requestNumber,
  isAuthenticated,
  hasVoted,
}: BuildRequestCardProps) {
  const responses = request.responses ?? []
  const canRespond = request.status !== 'closed'

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
          {isAuthenticated ? (
            <form action={voteOnBuildRequest}>
              <input type="hidden" name="request_id" value={request.id} />
              <button
                type="submit"
                className={hasVoted ? styles.votedButton : styles.voteButton}
                aria-pressed={hasVoted}
                aria-label={hasVoted ? 'Remove vote from build request' : 'Vote for build request'}
                title={hasVoted ? 'Remove vote' : 'Vote'}
              >
                <ArrowUp aria-hidden="true" />
                {request.vote_count}
              </button>
            </form>
          ) : (
            <Link href={loginHref('/requests')} className={styles.voteButton}>
              <ArrowUp aria-hidden="true" />
              Log in to vote
            </Link>
          )}
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

        {canRespond && isAuthenticated ? (
          <div className={styles.responseComposer}>
            <BuildRequestResponseForm requestId={request.id} />
          </div>
        ) : canRespond ? (
          <div className={styles.responseSignIn}>
            <Link href={loginHref('/requests')}>Log in</Link>
            {' '}to answer with a PathForge build, fork, or source-run result.
          </div>
        ) : (
          <div className={styles.closedNotice}>
            This request is closed. Its existing responses remain here as part of the public record.
          </div>
        )}
      </div>
    </article>
  )
}
