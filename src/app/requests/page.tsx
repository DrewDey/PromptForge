import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  ClipboardPenLine,
  Lightbulb,
  Search,
} from 'lucide-react'
import { BuildRequestCard } from '@/components/requests/BuildRequestCard'
import { getPublicBuildRequests } from '@/lib/data'
import { canonicalMetadata } from '@/lib/site-url'
import styles from './requests.module.css'

export const metadata: Metadata = {
  title: 'Request an AI Build Path | PathForge',
  description: 'Learn how PathForge handles private, capacity-controlled requests for AI build paths and finished artifacts.',
  ...canonicalMetadata('/requests'),
}

export default async function BuildRequestsPage() {
  const board = await getPublicBuildRequests()
  const requests = board.status === 'ready' ? board.requests : null

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div className={styles.kicker}>
          <ClipboardPenLine aria-hidden="true" />
          Private managed service
        </div>

        <div className={styles.introGrid}>
          <div>
            <h1>Request a focused PathForge build.</h1>
            <p>
              Request a tool, game, workflow, or build path through a capacity-controlled service. Each accepted case has one assigned builder and a different independent reviewer.
            </p>
          </div>

          <nav className={styles.introActions} aria-label="Build request shortcuts">
            <Link href="/paths?panel=open">
              <Search aria-hidden="true" />
              Search existing paths first
            </Link>
            <Link href="#request-availability" className={styles.primaryAction}>
              Check availability
              <ArrowRight aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.queue} aria-labelledby="request-queue-heading">
          <div className={styles.queueHeading}>
            <div>
              <span>Legacy public archive</span>
              <h2 id="request-queue-heading">
                {requests === null
                  ? 'Archive temporarily unavailable.'
                  : requests.length > 0
                    ? 'Prior public requests'
                    : 'No legacy public requests.'}
              </h2>
            </div>
            {requests !== null && (
              <div className={styles.queueCount} aria-label={`${requests.length} legacy public ${requests.length === 1 ? 'request' : 'requests'}`}>
                <strong>{requests.length.toString().padStart(2, '0')}</strong>
                <span>archived</span>
              </div>
            )}
          </div>

          {requests === null ? (
            <div className={styles.unavailableBoard} role="status">
              <h3>PathForge could not verify the legacy archive.</h3>
              <p>
                This is an unavailable state, not an empty-board result. No public response or voting controls are available.
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className={styles.emptyBoard}>
              <div className={styles.emptyLead}>
                <h3>The verified legacy archive is empty.</h3>
                <p>
                  PathForge does not infer demand or replace a failed read with an empty result. New work will use the private managed-service lifecycle, not this public board.
                </p>
                <Link href="#request-availability">
                  Check service availability
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.requestList}>
              {requests.map((request, index) => (
                <BuildRequestCard
                  key={request.id}
                  request={request}
                  requestNumber={index + 1}
                />
              ))}
            </div>
          )}
        </section>

        <aside className={styles.sidebar}>
          <section id="request-availability" className={styles.composer} aria-labelledby="request-availability-heading">
            <div className={styles.composerHeader}>
              <span>Availability</span>
              <h2 id="request-availability-heading">Intake is currently off</h2>
              <p>
                PathForge is not accepting or assigning new Request a Build cases yet. A page URL or query string is never proof that a request was received.
              </p>
            </div>

            <div className={styles.availabilityNotice} role="status">
              <strong>Not accepting requests</strong>
              <p>Capacity is capped at four active cases and remains closed until an operator enables intake.</p>
            </div>

            <div className={styles.briefNotes}>
              <div>
                <span>01</span>
                <p><strong>Private by default.</strong> Briefs, clarification, review, and delivery stay inside the managed case.</p>
              </div>
              <div>
                <span>02</span>
                <p><strong>Publication is separate.</strong> Public requester attribution or publication requires separate consent.</p>
              </div>
            </div>
          </section>

          <div className={styles.feedbackNote}>
            <Lightbulb aria-hidden="true" />
            <p>
              <strong>Trying to improve PathForge itself?</strong>{' '}
              Bugs, interface feedback, and site ideas belong in the{' '}
              <Link href="/suggestion-box">Suggestion Box</Link>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
