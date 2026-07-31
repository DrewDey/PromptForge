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
  | { status: 'not_ready'; activeCases: number; maxActiveCases: number }
  | { status: 'capacity_full'; activeCases: number; maxActiveCases: number }
  | { status: 'available'; activeCases: number; maxActiveCases: number }
  | { status: 'private'; activeCases?: number; maxActiveCases: number }

export type RequestIntakeEligibility =
  | 'sign_in_required'
  | 'not_admitted'
  | 'already_active'
  | 'controls_off'
  | 'capacity_full'
  | 'readiness_incomplete'
  | 'available'

export type RequestServiceOverviewProps = {
  availability: RequestServiceAvailability
  intakeEligibility?: RequestIntakeEligibility
  intakeHref?: string
  loginHref?: string
  myForgeHref?: string
  searchHref?: string
  intakeAudience?: 'invited' | 'authenticated'
  fulfillmentCapacity?: {
    activeCases: number
    maxActiveCases: number
  }
  outcomesHref?: string
}

function availabilityCopy(
  availability: RequestServiceAvailability,
  intakeAudience: 'invited' | 'authenticated',
) {
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
    case 'not_ready':
      return {
        eyebrow: 'Intake readiness incomplete',
        title: 'Private intake is temporarily unavailable.',
        body: 'The queue switch is on, but one or more required operating safeguards have expired or are not yet confirmed.',
        tone: 'closed',
      } as const
    case 'capacity_full':
      return {
        eyebrow: 'Intake queue full',
        title: 'The private request queue is currently full.',
        body: 'No new brief can be accepted until queue capacity returns. Fulfillment capacity is managed separately so intake never implies immediate assignment.',
        tone: 'closed',
      } as const
    case 'private':
      return {
        eyebrow: 'Private managed service',
        title: 'There is no public request board.',
        body: 'Cases are visible only to authorized participants. Privacy alone does not mean intake controls or capacity are open.',
        tone: 'neutral',
      } as const
    case 'available':
      return {
        eyebrow: intakeAudience === 'authenticated'
          ? 'Private intake capacity'
          : 'Pilot capacity',
        title: intakeAudience === 'authenticated'
          ? 'The private request queue currently has room.'
          : 'A managed build place is currently available.',
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
  intakeEligibility = 'sign_in_required',
  intakeHref = '/requests/new',
  loginHref = '/auth/login?next=%2Frequests%2Fnew',
  myForgeHref = '/my-forge?tab=requests',
  searchHref = '/paths?panel=open',
  intakeAudience = 'invited',
  fulfillmentCapacity,
  outcomesHref = '/requests/outcomes',
}: RequestServiceOverviewProps) {
  const copy = availabilityCopy(availability, intakeAudience)
  const capacity = capacityLabel(availability)
  const serviceCanOfferIntake = availability.status === 'available'
  const serviceHasParticipantState =
    availability.status === 'available' ||
    availability.status === 'capacity_full' ||
    availability.status === 'not_ready'
  const canStart = serviceCanOfferIntake && intakeEligibility === 'available'
  const shouldSignIn =
    serviceCanOfferIntake && intakeEligibility === 'sign_in_required'
  const shouldContinue =
    serviceHasParticipantState && intakeEligibility === 'already_active'

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
            <p className={styles.pilotNotice}>
              {intakeAudience === 'authenticated'
                ? 'Private intake is available to confirmed signed-in accounts while the queue is open.'
                : 'Request a Build is in a small invited pilot.'}
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
              : availability.status === 'available'
                ? <ShieldCheck />
                : <Clock3 />}
          </div>
          <div className={styles.availabilityCopy}>
            <span>{copy.eyebrow}</span>
            <h2>{copy.title}</h2>
            <p>{copy.body}</p>
            {capacity && <strong>{capacity}</strong>}
            {fulfillmentCapacity ? (
              <span>
                {fulfillmentCapacity.activeCases} of{' '}
                {fulfillmentCapacity.maxActiveCases} fulfillment places in use
              </span>
            ) : null}
            {serviceHasParticipantState && intakeEligibility === 'not_admitted' ? (
              <p
                className={styles.eligibilityNotice}
                role="status"
                data-request-intake-eligibility="not_admitted"
              >
                This account is not in the current pilot.
              </p>
            ) : null}
            {serviceHasParticipantState && intakeEligibility === 'already_active' ? (
              <p className={styles.eligibilityNotice} role="status">
                This account already has an active Request a Build case.
              </p>
            ) : null}
            {intakeEligibility === 'controls_off' && availability.status !== 'unavailable' ? (
              <p className={styles.eligibilityNotice} role="status">
                Request intake controls are currently off.
              </p>
            ) : null}
            {intakeEligibility === 'readiness_incomplete' ? (
              <p className={styles.eligibilityNotice} role="status">
                Public intake readiness is incomplete. No brief can be submitted.
              </p>
            ) : null}
          </div>
          <div className={styles.availabilityAction}>
            {canStart && (
              <Link
                href={intakeHref}
                className={styles.primaryAction}
                data-request-intake-cta
              >
                Start a private brief
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
            {shouldSignIn ? (
              <Link href={loginHref} className={styles.primaryAction}>
                Log in to check eligibility
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
            {shouldContinue ? (
              <Link href={myForgeHref} className={styles.primaryAction}>
                Continue your active case
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
            {availability.status === 'unavailable' && availability.retryHref && (
              <Link href={availability.retryHref} className={styles.secondaryAction}>
                <RefreshCw aria-hidden="true" />
                Retry availability
              </Link>
            )}
            {!canStart && !shouldSignIn && !shouldContinue && availability.status !== 'unavailable' && (
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
              <li>
                No case publishes automatically; any safe outcome summary
                requires separate requester and builder consent.
              </li>
            </ul>
            <p>
              The three-business-day target applies to triage or clarification,
              not to final delivery. It is an operating goal, not a contractual SLA.
            </p>
            <p>
              Finished outcomes appear publicly only after separate requester
              and builder consent plus the existing PathForge publication
              review. <Link href={outcomesHref}>View published outcomes</Link>.
            </p>
            <p>
              <Link href="/requests/policies">
                Read the versioned Request a Build policy set
              </Link>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default RequestServiceOverview
