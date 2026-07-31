import { notFound } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { RequestAnalytics } from '@/components/requests/RequestAnalytics'
import { RequestReadAcknowledger } from '@/components/requests/RequestReadAcknowledger'
import { RequestClarificationAction } from '@/components/requests/RequestClarificationAction'
import { RequestDeliveryAnalyticsListener } from '@/components/requests/RequestDeliveryAnalyticsListener'
import { RequestCaseDeliverySlot } from '@/components/requests/delivery'
import {
  RequestCaseShell,
  RequestParticipantTrustTools,
} from '@/components/requests/case'
import {
  getRequestApplicationService,
  getRequestPublicApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import { toRequestCasePresentation } from '@/lib/build-requests/presentation'
import { toRequestDeliverySlotModel } from '@/lib/build-requests/delivery-view'
import {
  decodeRequestReportCursor,
  encodeRequestReportCursor,
} from '@/lib/build-requests/report-cursor'
import {
  acknowledgeRequestRead,
  publishRequestOutcomeAction,
  reportRequestAction,
  requestCaseCommandAction,
  requestPublicationAction,
  setRequestNotificationPreferenceAction,
  submitClarificationAction,
} from './actions'
import {
  acknowledgeRequestDeliveryAction,
  recordRequestDeliveryOutcomeAction,
} from './delivery-actions'
import type {
  RequestNotificationPreferenceV1,
  RequestPublicAvailabilityV1,
  RequestPublicationViewV1,
  RequestReportPageV1,
} from '@/lib/request-public-architecture'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Private build request | PathForge',
  robots: { index: false, follow: false },
}

function RequestWithdrawalForm({
  requestId,
  requestVersion,
  idempotencyKey,
}: {
  requestId: string
  requestVersion: number
  idempotencyKey: string
}) {
  return (
    <form action={requestCaseCommandAction} className="space-y-3">
      <input type="hidden" name="command" value="withdraw" />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={requestVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="reason" value="Requester withdrew this private case." />
      <label className="block text-sm font-semibold">
        Confirm permanent withdrawal
        <select
          name="confirmation"
          required
          defaultValue=""
          className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base"
        >
          <option value="" disabled>Choose confirmation</option>
          <option value="confirmed">
            I understand this permanently closes the private request.
          </option>
        </select>
      </label>
      <button type="submit">Withdraw request</button>
    </form>
  )
}

export default async function RequestCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ actionError?: string; reportCursor?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const reportCursor = decodeRequestReportCursor(query.reportCursor)
  let detail
  try {
    const service = await getRequestApplicationService()
    detail = await service.getRequest(id)
  } catch (error) {
    if (requestAuthorityErrorCode(error) === 'not_found') notFound()
    throw error
  }
  const deliveryModel = detail.visibility === 'full'
    ? toRequestDeliverySlotModel(detail, detail.actor)
    : null
  let trustData: {
    availability: RequestPublicAvailabilityV1
    publication: RequestPublicationViewV1
    notificationPreference: RequestNotificationPreferenceV1
    reports: RequestReportPageV1
  } | null = null
  if (detail.visibility === 'full') {
    try {
      const publicService = await getRequestPublicApplicationService()
      const [availability, publication, notificationPreference, reports] =
        await Promise.all([
          publicService.getAvailability(),
          publicService.getPublication(detail.requestId),
          publicService.getNotificationPreference(),
          publicService.listReports({
            scope: 'mine',
            requestId: detail.requestId,
            cursor: reportCursor,
            limit: 50,
          }),
        ])
      trustData = {
        availability,
        publication,
        notificationPreference,
        reports,
      }
    } catch {}
  }
  const trustTools = detail.visibility !== 'full'
    ? null
    : trustData
      ? (
          <RequestParticipantTrustTools
            requestId={detail.requestId}
            requestVersion={detail.requestVersion}
            publication={trustData.publication}
            publicationTermsVersion={
              trustData.availability.policyVersions.publicationTerms
            }
            notificationPreference={trustData.notificationPreference}
            reports={trustData.reports}
            nextReportsHref={
              trustData.reports.nextCursor
                ? `/requests/${encodeURIComponent(detail.requestId)}?reportCursor=${encodeURIComponent(encodeRequestReportCursor(trustData.reports.nextCursor))}#request-case-reporting`
                : null
            }
            mutationNonce={randomUUID()}
            reportAction={reportRequestAction}
            notificationAction={setRequestNotificationPreferenceAction}
            publicationAction={requestPublicationAction}
            publishOutcomeAction={publishRequestOutcomeAction}
          />
        )
      : (
          <section
            role="status"
            className="mt-6 border border-surface-300 bg-surface-50 p-4"
          >
            <h3 className="font-black">Participant controls unavailable</h3>
            <p className="mt-2 text-sm text-surface-600">
              Reporting, notification preferences, and optional publication
              controls could not be verified. No empty or enabled state is inferred.
            </p>
          </section>
        )
  const deliveryWorkflowAvailable = deliveryModel?.visibility === 'full' && (
    deliveryModel.commands.canStageArtifact
    || deliveryModel.commands.canAbandonArtifact
    || deliveryModel.commands.canPrepareRevision
    || deliveryModel.commands.canResumeRevision
    || deliveryModel.commands.submitKind !== null
    || deliveryModel.commands.canReview
    || deliveryModel.commands.canRequestRepair
    || deliveryModel.commands.canAcknowledge
    || deliveryModel.commands.canRecordRequesterOutcome
  )
  const mappedModel = toRequestCasePresentation(detail)
  const presentationModel = (
    mappedModel.visibility === 'full'
    && deliveryModel?.commands.canResumeRevision
    && deliveryModel.builderWorkspace?.revisionState === 'prepared'
    && deliveryModel.commands.submitKind === null
  )
    ? {
        ...mappedModel,
        nextAction: {
          title: 'Continue the exact delivery workflow',
          description:
            'The canonical builder workspace can resume through the private delivery area below.',
        },
      }
    : mappedModel
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
      : query.actionError === 'publication_blocked'
        ? {
            title: 'Optional publication is currently blocked.',
            messages: [
              'The private case is unchanged. Review consent, moderation, delivery evidence, and airlock readiness.',
            ],
          }
      : query.actionError === 'confirmation_required'
        ? {
            title: 'Withdrawal was not confirmed.',
            messages: ['Confirm the terminal withdrawal before submitting it again.'],
          }
      : query.actionError
        ? {
            title: 'The service could not verify this action.',
            messages: ['No success is claimed. Review the current case before trying again.'],
          }
        : undefined
  const model = presentationModel.visibility === 'full' && actionError
    ? { ...presentationModel, errorSummary: actionError }
    : presentationModel
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
          <RequestWithdrawalForm
            requestId={detail.requestId}
            requestVersion={detail.requestVersion}
            idempotencyKey={actionIntent('withdraw')}
          />
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
  const secondaryAction = (
    detail.visibility === 'full'
    && detail.actor.capabilities.includes('withdraw')
    && next?.kind !== 'withdraw'
  )
    ? (
        <RequestWithdrawalForm
          requestId={detail.requestId}
          requestVersion={detail.requestVersion}
          idempotencyKey={actionIntent('withdraw')}
        />
      )
    : undefined
  const workflowNavigation = deliveryWorkflowAvailable
    ? (
        <a href="#request-delivery-workflow">
          Continue exact delivery workflow
        </a>
      )
    : undefined
  const deliverySlot = detail.visibility === 'full'
    ? (
        <RequestCaseDeliverySlot
          model={deliveryModel!}
          mode="participant"
          actions={{
            requesterOutcome: recordRequestDeliveryOutcomeAction,
            acknowledge: acknowledgeRequestDeliveryAction,
          }}
        />
      )
    : null

  return (
    <>
      <RequestDeliveryAnalyticsListener surface="request_case" />
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
        deliverySlot={deliverySlot}
        primaryAction={primaryAction}
        workflowNavigation={workflowNavigation}
        clarificationAction={clarificationAction}
        secondaryAction={secondaryAction}
        recordTools={trustTools}
      />
    </>
  )
}
