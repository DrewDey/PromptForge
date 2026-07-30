import { notFound } from 'next/navigation'
import { RequestAnalytics } from '@/components/requests/RequestAnalytics'
import { RequestReadAcknowledger } from '@/components/requests/RequestReadAcknowledger'
import { RequestClarificationAction } from '@/components/requests/RequestClarificationAction'
import { RequestCaseShell } from '@/components/requests/case'
import {
  getRequestApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import { toRequestCasePresentation } from '@/lib/build-requests/presentation'
import {
  acknowledgeRequestRead,
  requestCaseCommandAction,
  submitClarificationAction,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function RequestCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ actionError?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  let detail
  try {
    const service = await getRequestApplicationService()
    detail = await service.getRequest(id)
  } catch (error) {
    if (requestAuthorityErrorCode(error) === 'not_found') notFound()
    throw error
  }
  const mappedModel = toRequestCasePresentation(detail)
  const actionError = query.actionError === 'stale_version'
    ? {
        title: 'This case changed before the action was recorded.',
        messages: ['Review the current stage and available actions, then try again.'],
      }
    : query.actionError === 'rate_limited'
      ? {
          title: 'This action is temporarily limited.',
          messages: ['Wait before trying again. No duplicate command was recorded.'],
        }
      : query.actionError
        ? {
            title: 'The service could not verify this action.',
            messages: ['No success is claimed. Review the current case before trying again.'],
          }
        : undefined
  const model = mappedModel.visibility === 'full' && actionError
    ? { ...mappedModel, errorSummary: actionError }
    : mappedModel
  const latestEventSequence = detail.unread.latestEventSequence
  const next = detail.visibility === 'full' ? detail.nextActions[0] : null
  const clarification = detail.visibility === 'full'
    ? detail.clarifications.at(-1)
    : null
  const actionIntent = (kind: string) => (
    `request-${detail.requestId}-v${detail.requestVersion}-${kind}`
  )
  const clarificationAction =
    next?.kind === 'submit_clarification' && clarification?.answer === null
      ? (
          <RequestClarificationAction
            action={submitClarificationAction}
            requestId={detail.requestId}
            requestVersion={detail.requestVersion}
            idempotencyKey={actionIntent('clarification')}
            clarificationId={clarification.clarificationId}
          />
        )
      : undefined
  const primaryAction = next?.kind === 'withdraw'
    ? {
        capabilityId: 'withdraw',
        content: (
          <form action={requestCaseCommandAction}>
            <input type="hidden" name="command" value="withdraw" />
            <input type="hidden" name="requestId" value={detail.requestId} />
            <input type="hidden" name="expectedVersion" value={detail.requestVersion} />
            <input type="hidden" name="idempotencyKey" value={actionIntent('withdraw')} />
            <input type="hidden" name="reason" value="Requester withdrew this private case." />
            <button type="submit">Withdraw request</button>
          </form>
        ),
      }
      : next?.kind === 'submit_clarification'
      ? {
          capabilityId: 'submit_clarification',
          content: <a href="#request-case-clarification">Answer clarification</a>,
        }
      : next?.kind === 'start_build'
        ? {
            capabilityId: 'start_build',
            content: (
              <form action={requestCaseCommandAction}>
                <input type="hidden" name="command" value="start_build" />
                <input type="hidden" name="requestId" value={detail.requestId} />
                <input type="hidden" name="expectedVersion" value={detail.requestVersion} />
                <input type="hidden" name="idempotencyKey" value={actionIntent('start-build')} />
                <button type="submit">Start assigned build</button>
              </form>
            ),
          }
      : undefined

  return (
    <>
      <RequestAnalytics
        emissionKey={`status:${detail.requestVersion}:${detail.lifecycleState}`}
        event={{
          eventName: 'status_viewed',
          surface: 'request_case',
          stage: detail.lifecycleState,
        }}
      />
      {detail.unread.unreadCount > 0 ? (
        <RequestReadAcknowledger
          action={acknowledgeRequestRead}
          requestId={detail.requestId}
          expectedEventSequence={latestEventSequence}
          idempotencyKey={`request-read-${detail.requestId}-${latestEventSequence}`}
        />
      ) : null}
      <RequestCaseShell
        model={model}
        deliverySlot={(
          <p data-request-delivery-placeholder>
            Protected reviewed delivery is not mounted until the custody component is integrated.
          </p>
        )}
        primaryAction={primaryAction}
        clarificationAction={clarificationAction}
      />
    </>
  )
}
