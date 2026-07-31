import Link from 'next/link'
import type {
  RequestNotificationPreferenceV1,
  RequestPublicationViewV1,
  RequestReportPageV1,
} from '@/lib/request-public-architecture'

type FormAction = (formData: FormData) => void | Promise<void>

function HiddenCommand({
  requestId,
  requestVersion,
  proposalVersion,
  command,
  idempotencyKey,
}: {
  requestId: string
  requestVersion: number
  proposalVersion: number | null
  command: string
  idempotencyKey: string
}) {
  return (
    <>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedRequestVersion" value={requestVersion} />
      <input
        type="hidden"
        name="expectedProposalVersion"
        value={proposalVersion ?? ''}
      />
      <input type="hidden" name="command" value={command} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    </>
  )
}

export function RequestParticipantTrustTools({
  requestId,
  requestVersion,
  publication,
  publicationTermsVersion,
  notificationPreference,
  reports,
  nextReportsHref,
  mutationNonce,
  reportAction,
  notificationAction,
  publicationAction,
  publishOutcomeAction,
}: {
  requestId: string
  requestVersion: number
  publication: RequestPublicationViewV1
  publicationTermsVersion: string
  notificationPreference: RequestNotificationPreferenceV1
  reports: RequestReportPageV1
  nextReportsHref: string | null
  mutationNonce: string
  reportAction: FormAction
  notificationAction: FormAction
  publicationAction: FormAction
  publishOutcomeAction: FormAction
}) {
  const proposal =
    publication.visibility === 'full' ? publication.proposal : null
  const capabilities =
    publication.visibility === 'full' ? publication.capabilities : []

  return (
    <div className="mt-6 grid gap-5" data-request-participant-trust-tools>
      <section aria-labelledby="request-case-reporting">
        <h3 id="request-case-reporting" className="text-base font-black">
          Report a privacy, safety, rights, or service concern
        </h3>
        <p className="mt-2 text-sm text-surface-600">
          Reports stay private, are rate-limited, and enter the operator queue
          without exposing case text to analytics.
        </p>
        <form action={reportAction} className="mt-3 grid gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`request-report-create-${mutationNonce}`}
          />
          <label className="grid gap-1 text-sm font-bold">
            Concern category
            <select
              name="category"
              required
              defaultValue="service"
              className="min-h-11 border border-surface-300 bg-white px-3"
            >
              <option value="service">Service</option>
              <option value="safety">Safety</option>
              <option value="privacy">Privacy</option>
              <option value="integrity">Integrity</option>
              <option value="rights">Rights</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Private report details
            <textarea
              name="details"
              required
              minLength={20}
              maxLength={2000}
              rows={3}
              className="border border-surface-300 px-3 py-2 font-normal"
            />
          </label>
          <button className="min-h-11 justify-self-start border border-surface-900 px-4 text-sm font-black">
            Submit private report
          </button>
        </form>
        {reports.items.length > 0 ? (
          <ul className="mt-3 space-y-2 text-xs text-surface-600">
            {reports.items.map((report) => (
              <li
                key={report.reportId}
                className="border border-surface-200 p-3"
              >
                <strong>
                  {report.category} report · {report.status} ·{' '}
                  <time dateTime={report.updatedAt}>
                    {new Date(report.updatedAt).toLocaleDateString('en-US')}
                  </time>
                </strong>
                <span className="mt-1 block whitespace-pre-wrap text-surface-700">
                  {report.details}
                </span>
                {report.resolutionNote ? (
                  <span className="mt-1 block whitespace-pre-wrap text-surface-700">
                    {report.resolutionNote}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {nextReportsHref ? (
          <Link
            href={nextReportsHref}
            className="mt-3 inline-flex min-h-11 items-center font-bold underline"
          >
            Older report history
          </Link>
        ) : null}
      </section>

      <section aria-labelledby="request-case-notifications">
        <h3 id="request-case-notifications" className="text-base font-black">
          Transactional email
        </h3>
        <p className="mt-2 text-sm text-surface-600">
          In-app status remains authoritative. Email contains only a bounded
          status template and a private case link.
        </p>
        <form action={notificationAction} className="mt-3 flex flex-wrap gap-3">
          <input type="hidden" name="requestId" value={requestId} />
          <input
            type="hidden"
            name="expectedPreferenceVersion"
            value={notificationPreference.preferenceVersion}
          />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`request-notification-pref-${mutationNonce}`}
          />
          <label className="flex min-h-11 items-center gap-3 border border-surface-300 px-3 text-sm font-bold">
            <input type="hidden" name="enabled" value="no" />
            <input
              type="checkbox"
              name="enabled"
              value="yes"
              defaultChecked={notificationPreference.transactionalEmailEnabled}
              className="h-5 w-5"
            />
            Email me when private Request status changes
          </label>
          <button className="min-h-11 border border-surface-900 px-4 text-sm font-black">
            Save preference
          </button>
        </form>
      </section>

      <section aria-labelledby="request-case-publication">
        <h3 id="request-case-publication" className="text-base font-black">
          Optional outcome publication
        </h3>
        {publication.visibility === 'restricted' ? (
          <p className="mt-2 text-sm text-surface-600">
            Publication controls are unavailable while this case is restricted.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-surface-600">
              The case remains private. Only a separately written safe summary
              can proceed after requester and builder consent, independent
              review, and the existing PathForge publication airlock.
            </p>
            {proposal ? (
              <div className="mt-3 border border-surface-200 p-4">
                <strong>{proposal.safeTitle}</strong>
                <p className="mt-2 text-sm text-surface-600">
                  {proposal.safeSummary}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wide">
                  {proposal.status} · requester {proposal.requesterConsented ? 'consented' : 'pending'} · builder {proposal.builderConsented ? 'consented' : 'pending'}
                </p>
              </div>
            ) : null}

            {capabilities.includes('propose') ||
            capabilities.includes('replace_proposal') ? (
              <form action={publicationAction} className="mt-3 grid gap-3">
                <HiddenCommand
                  requestId={requestId}
                  requestVersion={requestVersion}
                  proposalVersion={proposal?.proposalVersion ?? null}
                  command={proposal ? 'replace_proposal' : 'propose'}
                  idempotencyKey={`request-publication-copy-${mutationNonce}`}
                />
                <label className="text-sm font-bold">
                  Public-safe title
                  <input
                    name="safeTitle"
                    minLength={4}
                    maxLength={120}
                    required
                    defaultValue={proposal?.safeTitle}
                    className="mt-1 min-h-11 w-full border border-surface-300 px-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  Public-safe summary
                  <textarea
                    name="safeSummary"
                    minLength={40}
                    maxLength={1000}
                    required
                    rows={4}
                    defaultValue={proposal?.safeSummary}
                    className="mt-1 w-full border border-surface-300 px-3 py-2"
                  />
                </label>
                <button className="min-h-11 justify-self-start border border-surface-900 px-4 text-sm font-black">
                  {proposal ? 'Replace and reset consent' : 'Propose safe summary'}
                </button>
              </form>
            ) : null}

            {capabilities.includes('requester_consent') ? (
              <form action={publicationAction} className="mt-3 grid gap-3 border border-surface-200 p-4">
                <HiddenCommand
                  requestId={requestId}
                  requestVersion={requestVersion}
                  proposalVersion={proposal?.proposalVersion ?? null}
                  command="requester_consent"
                  idempotencyKey={`request-publication-requester-${mutationNonce}`}
                />
                <input type="hidden" name="publicationTermsVersion" value={publicationTermsVersion} />
                <label className="text-sm font-bold">
                  Requester attribution
                  <select name="requesterAttribution" className="mt-1 min-h-11 w-full border px-3">
                    <option value="anonymous">Do not credit requester</option>
                    <option value="credited">Credit requester</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input type="hidden" name="publicationConsent" value="no" />
                  <input
                    type="checkbox"
                    name="publicationConsent"
                    value="yes"
                    required
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <span>
                    I consent under{' '}
                    <Link
                      href="/requests/policies/publication"
                      target="_blank"
                      className="font-bold underline"
                    >
                      publication terms {publicationTermsVersion}
                    </Link>{' '}
                    to this public-safe summary and selected attribution. The
                    private brief and delivery remain private.
                  </span>
                </label>
                <button className="min-h-11 justify-self-start border border-surface-900 px-4 text-sm font-black">
                  Give requester consent
                </button>
              </form>
            ) : null}

            {capabilities.includes('builder_consent') ? (
              <form action={publicationAction} className="mt-3 grid gap-3 border border-surface-200 p-4">
                <HiddenCommand
                  requestId={requestId}
                  requestVersion={requestVersion}
                  proposalVersion={proposal?.proposalVersion ?? null}
                  command="builder_consent"
                  idempotencyKey={`request-publication-builder-${mutationNonce}`}
                />
                <input type="hidden" name="publicationTermsVersion" value={publicationTermsVersion} />
                <label className="text-sm font-bold">
                  Reuse permission
                  <select name="reusePermission" className="mt-1 min-h-11 w-full border px-3">
                    <option value="view_only">View only</option>
                    <option value="adapt_with_credit">Adapt with credit</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input type="hidden" name="publicationConsent" value="no" />
                  <input
                    type="checkbox"
                    name="publicationConsent"
                    value="yes"
                    required
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <span>
                    I consent under{' '}
                    <Link
                      href="/requests/policies/publication"
                      target="_blank"
                      className="font-bold underline"
                    >
                      publication terms {publicationTermsVersion}
                    </Link>{' '}
                    to this public-safe summary and selected reuse permission.
                    My reviewed delivery remains governed by the private case.
                  </span>
                </label>
                <button className="min-h-11 justify-self-start border border-surface-900 px-4 text-sm font-black">
                  Give builder consent
                </button>
              </form>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3">
              {capabilities
                .filter((capability) =>
                  ['decline', 'withdraw', 'submit_airlock'].includes(capability),
                )
                .map((capability) => (
                  <form action={publicationAction} key={capability}>
                    <HiddenCommand
                      requestId={requestId}
                      requestVersion={requestVersion}
                      proposalVersion={proposal?.proposalVersion ?? null}
                      command={capability}
                      idempotencyKey={`request-publication-${capability}-${mutationNonce}`}
                    />
                    {capability === 'withdraw' ? (
                      <label className="mb-2 flex max-w-md items-start gap-3 border border-brand-orange bg-brand-orange-soft px-3 py-3 text-sm font-bold">
                        <input
                          type="hidden"
                          name="publicationWithdrawal"
                          value="no"
                        />
                        <input
                          type="checkbox"
                          name="publicationWithdrawal"
                          value="yes"
                          required
                          className="mt-0.5 h-5 w-5 shrink-0"
                        />
                        <span>
                          I understand this removes the public outcome and
                          does not alter the private case.
                        </span>
                      </label>
                    ) : null}
                    <button className="min-h-11 border border-surface-900 px-4 text-sm font-black">
                      {capability === 'submit_airlock'
                        ? 'Submit consented summary to airlock'
                        : capability === 'withdraw'
                          ? 'Withdraw public consent'
                          : 'Decline publication'}
                    </button>
                  </form>
                ))}
            </div>
            {capabilities.includes('publish_outcome') && proposal ? (
              <form action={publishOutcomeAction} className="mt-3 grid gap-3 border border-brand-orange p-4">
                <input type="hidden" name="requestId" value={requestId} />
                <input type="hidden" name="proposalId" value={proposal.proposalId} />
                <input
                  type="hidden"
                  name="expectedProposalVersion"
                  value={proposal.proposalVersion}
                />
                <input
                  type="hidden"
                  name="idempotencyKey"
                  value={`request-publication-bridge-${mutationNonce}`}
                />
                <label className="text-sm font-bold">
                  Already-approved PathForge project identifier
                  <input
                    name="publishedProjectId"
                    required
                    autoComplete="off"
                    className="mt-1 min-h-11 w-full border border-surface-300 px-3"
                  />
                </label>
                <p className="text-xs text-surface-600">
                  The service rechecks exact reviewed delivery provenance,
                  both consent receipts, project approval, and live community
                  publication health before exposing the safe summary.
                </p>
                <label className="flex min-h-11 items-start gap-3 border border-brand-orange bg-brand-orange-soft px-3 py-3 text-sm font-bold">
                  <input
                    type="hidden"
                    name="publicationRelease"
                    value="no"
                  />
                  <input
                    type="checkbox"
                    name="publicationRelease"
                    value="yes"
                    required
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span>
                    I verified the approved project and understand this
                    releases the consented safe summary to the public outcome
                    catalog.
                  </span>
                </label>
                <button className="min-h-11 justify-self-start bg-surface-900 px-4 text-sm font-black text-white">
                  Publish safe outcome projection
                </button>
              </form>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
