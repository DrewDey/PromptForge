import type {
  RequestPublicationViewV1,
} from '@/lib/request-public-architecture'

type WithdrawalOnlyPublication = Extract<
  RequestPublicationViewV1,
  { visibility: 'withdrawal_only' }
>

type FormAction = (formData: FormData) => void | Promise<void>

export function RequestPublicationContinuation({
  requestId,
  publication,
  mutationNonce,
  publicationAction,
  actionError,
}: {
  requestId: string
  publication: WithdrawalOnlyPublication
  mutationNonce: string
  publicationAction: FormAction
  actionError?: boolean
}) {
  const scopeMessage = publication.status === 'held'
    ? 'This case is held. Its private record and public projection remain unavailable, but either consenting participant may still revoke public consent.'
    : 'The private case retention window has ended. Only the separately consented public summary and the right to revoke it remain available.'

  return (
    <section
      aria-labelledby="request-publication-continuation-title"
      className="mx-auto w-full max-w-3xl border border-surface-300 bg-white p-5 sm:p-8"
      data-request-publication-continuation
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
        Optional publication · withdrawal access
      </p>
      <h1
        id="request-publication-continuation-title"
        className="mt-3 text-3xl font-black tracking-tight"
      >
        Public consent remains yours to withdraw
      </h1>
      <p className="mt-3 text-sm leading-6 text-surface-600">
        {scopeMessage}
      </p>
      {actionError ? (
        <div
          role="alert"
          className="mt-4 border border-brand-orange bg-brand-orange-soft p-3 text-sm"
        >
          <strong>Public consent was not withdrawn.</strong>
          <p className="mt-1">
            The service could not verify this action. Review the current
            public-safe summary and try again.
          </p>
        </div>
      ) : null}
      <div className="mt-5 border border-surface-200 p-4">
        <h2 className="text-lg font-black">{publication.proposal.safeTitle}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-surface-700">
          {publication.proposal.safeSummary}
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-surface-500">
          {publication.proposal.status.replaceAll('_', ' ')}
        </p>
      </div>
      <form action={publicationAction} className="mt-5 grid gap-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input
          type="hidden"
          name="expectedRequestVersion"
          value={publication.requestVersion}
        />
        <input
          type="hidden"
          name="expectedProposalVersion"
          value={publication.proposal.proposalVersion}
        />
        <input type="hidden" name="command" value="withdraw" />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`request-publication-withdraw-continuation-${mutationNonce}`}
        />
        <label className="flex min-h-11 items-start gap-3 border border-brand-orange bg-brand-orange-soft px-3 py-3 text-sm font-bold">
          <input type="hidden" name="publicationWithdrawal" value="no" />
          <input
            type="checkbox"
            name="publicationWithdrawal"
            value="yes"
            required
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            I understand this removes the public outcome and does not restore,
            expose, or alter the private case.
          </span>
        </label>
        <button className="min-h-11 justify-self-stretch bg-surface-900 px-4 text-sm font-black text-white sm:justify-self-start">
          Withdraw public consent
        </button>
      </form>
    </section>
  )
}
