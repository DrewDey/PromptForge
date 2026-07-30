import Link from 'next/link'
import {
  ArrowRight,
  Clock3,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import styles from './RequestServiceOverview.module.css'

export type RequestServiceAvailability =
  | { status: 'loading' }
  | { status: 'unavailable'; retryHref?: string }
  | { status: 'closed'; activeCases?: number; maxActiveCases?: number }
  | { status: 'capacity_full'; activeCases: number; maxActiveCases: number }
  | { status: 'available'; activeCases: number; maxActiveCases: number }
  | { status: 'private'; activeCases?: number; maxActiveCases: number }

export type RequestServiceOverviewProps = {
  availability: RequestServiceAvailability
  isSignedIn: boolean
  intakeHref?: string
  loginHref?: string
  searchHref?: string
}

function availabilityCopy(availability: RequestServiceAvailability) {
  switch (availability.status) {
    case 'loading':
      return {
        eyebrow: 'Checking availability',
        title: 'Confirming current capacity…',
        body: 'PathForge is checking the managed-service controls before offering an intake action.',
        tone: 'neutral',
      } as const
    case 'unavailable':
      return {
        eyebrow: 'Status unavailable',
        title: 'Availability could not be confirmed.',
        body: 'No request state has been inferred. Retry the secure read before planning around an open place.',
        tone: 'warning',
      } as const
    case 'closed':
      return {
        eyebrow: 'Intake closed',
        title: 'PathForge is not accepting requests right now.',
        body: 'The service control is off. Existing private cases remain available to their participants.',
        tone: 'closed',
      } as const
    case 'capacity_full':
      return {
        eyebrow: 'At capacity',
        title: 'All managed build places are currently in use.',
        body: 'New intake stays closed while the active-case limit is full. Search existing paths in the meantime.',
        tone: 'closed',
      } as const
    case 'private':
      return {
        eyebrow: 'Private managed service',
        title: 'Request intake is available to signed-in members.',
        body: 'Every brief, clarification, review, and delivery stays visible only to authorized participants.',
        tone: 'available',
      } as const
    case 'available':
      return {
        eyebrow: 'Intake available',
        title: 'A managed build place is available.',
        body: 'Submit a finite, testable outcome. PathForge will first look for an existing path, repair, fork, or model rerun.',
        tone: 'available',
      } as const
  }
}

function capacityLabel(availability: RequestServiceAvailability) {
  if (
    !('activeCases' in availability) ||
    !('maxActiveCases' in availability) ||
    typeof availability.activeCases !== 'number' ||
    typeof availability.maxActiveCases !== 'number'
  ) return null
  return `${availability.activeCases} of ${availability.maxActiveCases} active cases`
}

export function RequestServiceOverview({
  availability,
  isSignedIn,
  intakeHref = '/requests/new',
  loginHref = '/auth/login?next=%2Frequests%2Fnew',
  searchHref = '/paths?panel=open',
}: RequestServiceOverviewProps) {
  const copy = availabilityCopy(availability)
  const capacity = capacityLabel(availability)
  const canStart = availability.status === 'available' || availability.status === 'private'

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.kicker}>
          <LockKeyhole aria-hidden="true" />
          Request a Build
        </div>
        <div className={styles.heroGrid}>
          <div>
            <h1>Bring PathForge a finish line, not a public post.</h1>
            <p>
              Request a Build is a private, capacity-controlled service for a
              specific outcome that can be tested. It is not a public board,
              voting feed, or open-response marketplace.
            </p>
          </div>
          <Link href={searchHref} className={styles.searchAction}>
            <Search aria-hidden="true" />
            Search existing paths first
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section
          className={styles.availability}
          data-tone={copy.tone}
          aria-live="polite"
          aria-busy={availability.status === 'loading' ? 'true' : undefined}
        >
          <div className={styles.availabilityIcon} aria-hidden="true">
            {availability.status === 'loading'
              ? <RefreshCw />
              : availability.status === 'available' || availability.status === 'private'
                ? <ShieldCheck />
                : <Clock3 />}
          </div>
          <div className={styles.availabilityCopy}>
            <span>{copy.eyebrow}</span>
            <h2>{copy.title}</h2>
            <p>{copy.body}</p>
            {capacity && <strong>{capacity}</strong>}
          </div>
          <div className={styles.availabilityAction}>
            {canStart && (
              <Link href={isSignedIn ? intakeHref : loginHref} className={styles.primaryAction}>
                {isSignedIn ? 'Start a private brief' : 'Log in to request'}
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {availability.status === 'unavailable' && availability.retryHref && (
              <Link href={availability.retryHref} className={styles.secondaryAction}>
                <RefreshCw aria-hidden="true" />
                Retry availability
              </Link>
            )}
            {!canStart && availability.status !== 'unavailable' && (
              <Link href={searchHref} className={styles.secondaryAction}>
                <Search aria-hidden="true" />
                Explore existing paths
              </Link>
            )}
          </div>
        </section>

        <div className={styles.detailGrid}>
          <section className={styles.process} aria-labelledby="request-service-process">
            <span className={styles.sectionLabel}>How the service works</span>
            <h2 id="request-service-process">A bounded path from brief to reviewed delivery.</h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Submit a testable outcome</h3>
                  <p>Describe the intended user, must-work scenario, and one to three acceptance checks.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Triage before building</h3>
                  <p>One triager looks for an existing resolution, duplicate, repair, fork, or model rerun before approving net-new work.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Independent review</h3>
                  <p>One assigned builder remains the credited author. A different reviewer checks the agreed finish line before private delivery.</p>
                </div>
              </li>
            </ol>
          </section>

          <aside className={styles.terms} aria-labelledby="request-service-terms">
            <div className={styles.termsHeading}>
              <UsersRound aria-hidden="true" />
              <div>
                <span className={styles.sectionLabel}>Scope and rights</span>
                <h2 id="request-service-terms">Know the boundary before intake.</h2>
              </div>
            </div>
            <ul>
              <li>Briefs and deliveries remain private to authorized participants.</li>
              <li>The builder stays the credited author.</li>
              <li>The requester receives non-exclusive use and download rights.</li>
              <li>No confidential, exclusive, or work-for-hire cases.</li>
              <li>No public attribution or publication transition is offered in V1.</li>
            </ul>
            <p>
              The three-business-day target applies to triage or clarification,
              not to final delivery. It is an operating goal, not a contractual SLA.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default RequestServiceOverview
