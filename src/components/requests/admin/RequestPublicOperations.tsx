import Link from 'next/link'
import type {
  RequestOperatorCandidateV1,
  RequestPublicOperationsV1,
  RequestPublicationQueueV1,
  RequestReadinessGate,
  RequestReportPageV1,
} from '@/lib/request-public-architecture'

type FormAction = (formData: FormData) => void | Promise<void>

const readinessLabels: Record<RequestReadinessGate, string> = {
  legal: 'Legal terms and rights',
  incident_owner: 'Named incident owner',
  waf: 'Network abuse controls',
  responsive_qa: 'Desktop and exact-390 QA',
  attended_lifecycle: 'Attended lifecycle drill',
  notification_transport: 'Transactional email transport',
}

function flag(name: string, checked: boolean) {
  return (
    <label className="flex min-h-11 items-center gap-3 border border-surface-200 px-3 py-2 text-sm font-bold">
      <input type="hidden" name={name} value="no" />
      <input
        type="checkbox"
        name={name}
        value="yes"
        defaultChecked={checked}
        className="h-5 w-5"
      />
      {name.replaceAll(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())}
    </label>
  )
}

export function RequestPublicOperations({
  operations,
  operators,
  reports,
  publications,
  operatorQuery,
  publicationStatus,
  mutationNonce,
  updateControls,
  updateOperator,
  updateReadiness,
  updateReport,
}: {
  operations: RequestPublicOperationsV1
  operators: readonly RequestOperatorCandidateV1[]
  reports: RequestReportPageV1
  publications: RequestPublicationQueueV1
  operatorQuery: string
  publicationStatus:
    | 'active'
    | 'consent_pending'
    | 'fully_consented'
    | 'in_airlock'
    | 'published'
  mutationNonce: string
  updateControls: FormAction
  updateOperator: FormAction
  updateReadiness: FormAction
  updateReport: FormAction
}) {
  return (
    <div className="space-y-6" data-request-public-operations>
      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-brand-orange-ink">
          Public-ready authority
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
          Release posture and independent capacity
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="border border-surface-200 p-4">
            <strong className="text-2xl">{operations.activeCaseCount}</strong>
            <p className="mt-1 text-xs text-surface-600">
              private cases in a queue capped at {operations.activeCaseCapacity}
            </p>
          </div>
          <div className="border border-surface-200 p-4">
            <strong className="text-2xl">{operations.fulfillmentCaseCount}</strong>
            <p className="mt-1 text-xs text-surface-600">
              active builds in a separate cap of {operations.fulfillmentCaseCapacity}
            </p>
          </div>
          <div className="border border-surface-200 p-4">
            <strong className="text-2xl">
              {Object.values(operations.readiness).filter(Boolean).length}/7
            </strong>
            <p className="mt-1 text-xs text-surface-600">
              readiness checks currently true, including the community airlock
            </p>
          </div>
        </div>
      </section>

      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Scale and release controls</h2>
        <p className="mt-2 text-sm text-surface-600">
          Every switch is independently default-off. Database readiness gates
          reject unsafe combinations even if this form is stale.
        </p>
        <form action={updateControls} className="mt-5 grid gap-4">
          <input
            type="hidden"
            name="expectedControlsVersion"
            value={operations.controlsVersion}
          />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`request-public-controls-${mutationNonce}`}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flag('acceptingRequests', operations.acceptingRequests)}
            {flag('assigningRequests', operations.assigningRequests)}
            {flag('operatorRosterRequired', operations.operatorRosterRequired)}
            {flag(
              'publicIntakeRiskScreening',
              operations.publicIntakeRiskScreening,
            )}
            {flag(
              'transactionalNotificationsEnabled',
              operations.transactionalNotificationsEnabled,
            )}
            {flag(
              'publicationConsentEnabled',
              operations.publicationConsentEnabled,
            )}
            {flag(
              'publicationAirlockEnabled',
              operations.publicationAirlockEnabled,
            )}
            {flag('publicOutcomesEnabled', operations.publicOutcomesEnabled)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold">
              Intake audience
              <select
                name="intakeAudience"
                defaultValue={operations.intakeAudience}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              >
                <option value="invited">Invited accounts</option>
                <option value="authenticated">All confirmed accounts</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Queue capacity
              <input
                type="number"
                name="activeCaseCapacity"
                min={1}
                max={5000}
                defaultValue={operations.activeCaseCapacity}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              />
            </label>
            <label className="text-sm font-bold">
              Fulfillment capacity
              <input
                type="number"
                name="fulfillmentCaseCapacity"
                min={1}
                max={50}
                defaultValue={operations.fulfillmentCaseCapacity}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              />
            </label>
            <label className="text-sm font-bold">
              Actor hourly intake
              <input
                type="number"
                name="actorHourlyIntakeLimit"
                min={1}
                max={25}
                defaultValue={operations.actorHourlyIntakeLimit}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              />
            </label>
            <label className="text-sm font-bold">
              Network hourly intake
              <input
                type="number"
                name="networkHourlyIntakeLimit"
                min={1}
                max={100}
                defaultValue={operations.networkHourlyIntakeLimit}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              />
            </label>
            <label className="text-sm font-bold">
              Global daily intake
              <input
                type="number"
                name="globalDailyIntakeLimit"
                min={1}
                max={10000}
                defaultValue={operations.globalDailyIntakeLimit}
                className="mt-1 min-h-11 w-full border border-surface-300 px-3"
              />
            </label>
          </div>
          <dl className="grid gap-2 border border-surface-200 p-4 text-xs sm:grid-cols-2">
            {Object.entries(operations.policyVersions).map(([name, value]) => (
              <div key={name}>
                <dt className="font-bold text-surface-500">
                  {name.replaceAll(/([A-Z])/g, ' $1')}
                </dt>
                <dd className="mt-1 break-all font-mono text-surface-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {Object.entries(operations.policyVersions).map(([name, value]) => (
            <input
              key={name}
              type="hidden"
              name={`${name}Version`}
              value={value}
            />
          ))}
          <label className="flex min-h-11 max-w-3xl items-start gap-3 border border-brand-orange bg-brand-orange-soft px-3 py-3 text-sm font-bold">
            <input
              type="hidden"
              name="controlConfirmation"
              value="no"
            />
            <input
              type="checkbox"
              name="controlConfirmation"
              value="yes"
              required
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <span>
              I reviewed every resulting gate, capacity, audience, and
              readiness state. This is an attended authority change.
            </span>
          </label>
          <button className="min-h-11 justify-self-start bg-surface-900 px-5 py-2 text-sm font-black text-white">
            Record control update
          </button>
        </form>
      </section>

      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Readiness evidence</h2>
        <p className="mt-2 text-sm text-surface-600">
          A checkbox is not evidence. Each gate records a versioned,
          attributable reference and can be explicitly revoked.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {(Object.keys(readinessLabels) as RequestReadinessGate[]).map((gate) => (
            <form
              key={gate}
              action={updateReadiness}
              className="grid gap-3 border border-surface-200 p-4"
            >
              <input type="hidden" name="gate" value={gate} />
              <input
                type="hidden"
                name="expectedEvidenceVersion"
                value={operations.readinessVersions[gate]}
              />
              <input
                type="hidden"
                name="idempotencyKey"
                value={`request-readiness-${gate}-${mutationNonce}`}
              />
              <div>
                <strong>{readinessLabels[gate]}</strong>
                <span className="ml-2 font-mono text-[10px] text-surface-500">
                  v{operations.readinessVersions[gate]} ·{' '}
                  {operations.readiness[
                    gate === 'incident_owner'
                      ? 'incidentOwner'
                      : gate === 'responsive_qa'
                        ? 'responsiveQa'
                        : gate === 'attended_lifecycle'
                          ? 'attendedLifecycle'
                          : gate === 'notification_transport'
                            ? 'notificationTransport'
                            : gate
                  ] ? 'ready' : 'not ready'}
                </span>
              </div>
              <label className="text-xs font-bold">
                State
                <select name="state" className="mt-1 min-h-11 w-full border px-3">
                  <option value="confirmed">Confirm</option>
                  <option value="revoked">Revoke</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Evidence reference
                <input
                  name="evidenceReference"
                  minLength={8}
                  maxLength={200}
                  required
                  className="mt-1 min-h-11 w-full border px-3"
                />
              </label>
              <label className="text-xs font-bold">
                Optional validity end (UTC)
                <input
                  name="validUntil"
                  type="datetime-local"
                  data-request-time-zone="UTC"
                  className="mt-1 min-h-11 w-full border px-3"
                />
              </label>
              <label className="text-xs font-bold">
                Note
                <textarea
                  name="note"
                  minLength={1}
                  maxLength={500}
                  required
                  rows={2}
                  className="mt-1 w-full border px-3 py-2"
                />
              </label>
              <button className="min-h-11 border border-surface-900 px-4 text-sm font-black">
                Record evidence
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">Operator roster and workload</h2>
        <p className="mt-2 text-sm text-surface-600">
          Assignment requires an active, available roster membership. Requester,
          builder, and reviewer remain distinct.
        </p>
        <form method="get" className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="scope" value="admin" />
          <label className="min-w-64 flex-1 text-sm font-bold">
            Find a confirmed account
            <input
              name="operatorQuery"
              defaultValue={operatorQuery}
              maxLength={80}
              className="mt-1 min-h-11 w-full border border-surface-300 px-3"
            />
          </label>
          <button className="min-h-11 self-end border border-surface-900 px-4 text-sm font-black">
            Search roster candidates
          </button>
        </form>
        <form action={updateOperator} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input
            type="hidden"
            name="idempotencyKey"
            value={`request-operator-${mutationNonce}`}
          />
          <input
            type="hidden"
            name="operatorQuery"
            value={operatorQuery}
          />
          <label className="text-sm font-bold sm:col-span-2">
            Confirmed account and exact role version
            <select
              name="membershipTarget"
              required
              defaultValue=""
              className="mt-1 min-h-11 w-full border px-3"
            >
              <option value="" disabled>Select an account and role</option>
              {operators.flatMap((operator) => (
                (
                  operator.isAdmin
                    ? (['triager', 'builder', 'reviewer'] as const)
                    : (['builder', 'reviewer'] as const)
                ).map((role) => {
                  const membership = operator.memberships.find(
                    (item) => item.role === role,
                  )
                  return (
                    <option
                      key={`${operator.accountId}:${role}`}
                      value={`${operator.accountId}:${role}:${membership?.version ?? 0}`}
                    >
                      {operator.displayName} · {role} ·{' '}
                      {membership
                        ? `${membership.state} v${membership.version}`
                        : 'new membership'}
                    </option>
                  )
                })
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            State
            <select name="state" className="mt-1 min-h-11 w-full border px-3">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="revoked">Revoked</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Maximum active cases
            <input
              name="maxActiveCases"
              type="number"
              min={1}
              max={50}
              defaultValue={4}
              className="mt-1 min-h-11 w-full border px-3"
            />
          </label>
          <label className="text-sm font-bold">
            Optional availability start (UTC)
            <input
              name="availableFrom"
              type="datetime-local"
              data-request-time-zone="UTC"
              className="mt-1 min-h-11 w-full border px-3"
            />
          </label>
          <label className="text-sm font-bold">
            Optional availability end (UTC)
            <input
              name="availableUntil"
              type="datetime-local"
              data-request-time-zone="UTC"
              className="mt-1 min-h-11 w-full border px-3"
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Reason
            <textarea
              name="reason"
              minLength={1}
              maxLength={500}
              required
              rows={2}
              className="mt-1 w-full border px-3 py-2"
            />
          </label>
          <button className="min-h-11 justify-self-start bg-surface-900 px-5 text-sm font-black text-white">
            Record roster membership
          </button>
        </form>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[680px] w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-surface-300">
                <th className="p-2">Account</th>
                <th className="p-2">Memberships</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((operator) => (
                <tr key={operator.accountId} className="border-b border-surface-200">
                  <td className="p-2 font-bold">{operator.displayName}</td>
                  <td className="p-2">
                    {operator.memberships.length
                      ? operator.memberships.map((membership) => (
                          <span key={membership.membershipId} className="mr-3">
                            {membership.role}: {membership.state}, {membership.maxActiveCases} max
                            {membership.availableUntil
                              ? `, through ${new Date(membership.availableUntil).toLocaleDateString('en-US')}`
                              : ''}
                          </span>
                        ))
                      : 'No Request role'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">
          Participant reports ({operations.reportCounts.open} open)
        </h2>
        <div className="mt-4 grid gap-3">
          {reports.items.length === 0 ? (
            <p className="text-sm text-surface-600">No open or reviewing reports.</p>
          ) : reports.items.map((report) => (
            <article key={report.reportId} className="border border-surface-200 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{report.category} · {report.status}</strong>
                <Link
                  href={`/admin/build-requests/${encodeURIComponent(report.requestId)}`}
                  className="font-bold underline"
                >
                  Open private case
                </Link>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-surface-700">
                {report.details}
              </p>
              {report.status === 'open' || report.status === 'reviewing' ? (
                <form action={updateReport} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="reportId" value={report.reportId} />
                  <input
                    type="hidden"
                    name="expectedStatus"
                    value={report.status}
                  />
                  <input
                    type="hidden"
                    name="idempotencyKey"
                    value={`request-report-${report.reportId}-${mutationNonce}`}
                  />
                  <label className="grid gap-1 text-xs font-bold">
                    Next report state
                    <select name="nextStatus" className="min-h-11 border px-3">
                      {report.status === 'open' ? (
                        <option value="reviewing">Start review</option>
                      ) : (
                        <>
                          <option value="resolved">Resolve</option>
                          <option value="dismissed">Dismiss</option>
                        </>
                      )}
                    </select>
                  </label>
                  {report.status === 'reviewing' ? (
                    <label className="grid w-full gap-1 text-xs font-bold">
                      Participant-safe resolution or dismissal reason
                      <textarea
                        name="resolutionNote"
                        minLength={10}
                        maxLength={1000}
                        required
                        className="min-h-24 w-full border border-surface-300 px-3 py-2 text-sm font-normal"
                      />
                    </label>
                  ) : null}
                  <button className="min-h-11 border border-surface-900 px-4 font-bold">
                    Record report status
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="border border-surface-300 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black">
          Publication airlock ({operations.publicationCounts.airlockReady} ready)
        </h2>
        <p className="mt-2 text-sm text-surface-600">
          These are safe proposed summaries only. Raw briefs and private
          deliveries never enter this queue.
        </p>
        <nav
          aria-label="Publication queue states"
          className="mt-4 flex flex-wrap gap-2"
        >
          {([
            'active',
            'consent_pending',
            'fully_consented',
            'in_airlock',
            'published',
          ] as const).map((status) => (
            <Link
              key={status}
              href={`/admin/build-requests?scope=admin&publicationStatus=${status}`}
              aria-current={publicationStatus === status ? 'page' : undefined}
              className="inline-flex min-h-11 items-center border border-surface-300 px-3 text-xs font-black"
            >
              {status.replaceAll('_', ' ')}
            </Link>
          ))}
        </nav>
        <div className="mt-4 grid gap-3">
          {publications.items.length === 0 ? (
            <p className="text-sm text-surface-600">No active publication proposal.</p>
          ) : publications.items.map((proposal) => (
            <article key={proposal.proposalId} className="border border-surface-200 p-4">
              <strong>{proposal.safeTitle}</strong>
              <p className="mt-2 text-sm text-surface-600">{proposal.safeSummary}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wide">
                {proposal.status} · requester {proposal.requesterConsented ? 'consented' : 'pending'} · builder {proposal.builderConsented ? 'consented' : 'pending'}
              </p>
              <Link
                href={`/admin/build-requests/${encodeURIComponent(proposal.requestId)}`}
                className="mt-3 inline-flex min-h-11 items-center font-bold underline"
              >
                Review private authority
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
