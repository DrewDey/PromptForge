import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RequestAnalytics } from '@/components/requests/RequestAnalytics'
import { RequestDeliveryAnalyticsListener } from '@/components/requests/RequestDeliveryAnalyticsListener'
import { RequestCaseDeliverySlot } from '@/components/requests/delivery'
import {
  AdminRequestDetailOperations,
} from '@/components/requests/admin'
import { RequestCaseShell } from '@/components/requests/case'
import {
  getRequestApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  toAdminDetailModel,
  toRequestCasePresentation,
} from '@/lib/build-requests/presentation'
import { toRequestDeliverySlotModel } from '@/lib/build-requests/delivery-view'
import { adminRequestCommandAction } from '../actions'
import { requestDeliveryReviewAction } from '@/app/requests/[id]/delivery-actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Private build request operations | PathForge',
  robots: { index: false, follow: false },
}

function HeldReleaseForm({
  requestId,
  requestVersion,
}: {
  requestId: string
  requestVersion: number
}) {
  return (
    <form action={adminRequestCommandAction} className="space-y-3">
      <input type="hidden" name="command" value="release_moderation_hold" />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={requestVersion} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`request-${requestId}-v${requestVersion}-release-hold`}
      />
      <label className="block text-sm font-semibold">
        Hold resolution
        <textarea
          name="resolution"
          required
          minLength={4}
          maxLength={500}
          rows={3}
          className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base"
        />
      </label>
      <button type="submit">Release moderation hold</button>
    </form>
  )
}

function HeldRemovalForm({
  requestId,
  requestVersion,
}: {
  requestId: string
  requestVersion: number
}) {
  return (
    <form action={adminRequestCommandAction} className="space-y-3">
      <input type="hidden" name="command" value="remove_for_moderation" />
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={requestVersion} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={`request-${requestId}-v${requestVersion}-remove`}
      />
      <label className="block text-sm font-semibold">
        Removal reason
        <textarea
          name="reason"
          required
          minLength={4}
          maxLength={500}
          rows={3}
          className="mt-2 min-h-11 w-full border border-surface-300 bg-white px-3 py-2 text-base"
        />
      </label>
      <button type="submit">Remove case for moderation</button>
    </form>
  )
}

export default async function BuildRequestAdminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ actionError?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const service = await getRequestApplicationService()
  let detail
  try {
    detail = await service.getRequest(id)
  } catch (error) {
    if (requestAuthorityErrorCode(error) === 'not_found') notFound()
    throw error
  }
  const mappedCaseModel = toRequestCasePresentation(detail)
  const actionError = query.actionError === 'stale_version'
    ? {
        title: 'The case changed before this operation was recorded.',
        messages: ['Review the canonical stage and authorized operations, then retry.'],
      }
      : query.actionError === 'rate_limited'
      ? {
          title: 'This operation is temporarily limited.',
          messages: ['Wait before retrying. No duplicate authority event is claimed.'],
        }
      : query.actionError === 'confirmation_required'
        ? {
            title: 'This reassignment was not confirmed.',
            messages: ['Confirm the accountable reassignment before submitting it again.'],
          }
      : query.actionError
        ? {
            title: 'The authority could not verify this operation.',
            messages: ['No success is claimed. Reload the case before trying again.'],
          }
        : undefined
  const caseModel = mappedCaseModel.visibility === 'full' && actionError
    ? { ...mappedCaseModel, errorSummary: actionError }
    : mappedCaseModel

  if (detail.visibility !== 'full') {
    const heldOperationAvailable = detail.visibility === 'held' && (
      detail.actor.capabilities.includes('release_moderation_hold')
      || detail.actor.capabilities.includes('remove_for_moderation')
    )
    const heldCaseModel = heldOperationAvailable
      ? {
          ...caseModel,
          nextAction: {
            title: 'Resolve the moderation hold',
            description:
              'Use only the restricted moderation operation authorized for this held case.',
          },
        }
      : caseModel
    const heldPrimaryAction = detail.visibility === 'held'
      && detail.actor.capabilities.includes('release_moderation_hold')
      ? {
          capabilityId: 'release_moderation_hold',
          content: (
            <a href="#request-case-held-operation">
              Resolve moderation hold
            </a>
          ),
        }
      : detail.visibility === 'held'
        && detail.actor.capabilities.includes('remove_for_moderation')
        ? {
            capabilityId: 'remove_for_moderation',
            content: (
              <a href="#request-case-held-operation">
                Resolve moderation hold
              </a>
            ),
          }
        : undefined
    const heldRestrictedAction = detail.visibility === 'held'
      && detail.actor.capabilities.includes('release_moderation_hold')
      ? (
          <HeldReleaseForm
            requestId={detail.requestId}
            requestVersion={detail.requestVersion}
          />
        )
      : detail.visibility === 'held'
        && detail.actor.capabilities.includes('remove_for_moderation')
        ? (
            <HeldRemovalForm
              requestId={detail.requestId}
              requestVersion={detail.requestVersion}
            />
          )
        : undefined
    return (
      <main>
        <RequestCaseShell
          model={heldCaseModel}
          deliverySlot={null}
          primaryAction={heldPrimaryAction}
          restrictedAction={heldRestrictedAction}
        />
      </main>
    )
  }

  const capabilities = new Set(detail.actor.capabilities)
  const [builders, reviewers, triagers] = await Promise.all([
    capabilities.has('accept') || capabilities.has('reassign_builder')
      ? service.listEligibleAssignees({
          requestId: detail.requestId,
          role: 'builder',
          limit: 50,
        })
      : Promise.resolve({ items: [], nextCursor: null }),
    capabilities.has('assign_reviewer') || capabilities.has('reassign_reviewer')
      ? service.listEligibleAssignees({
          requestId: detail.requestId,
          role: 'reviewer',
          limit: 50,
        })
      : Promise.resolve({ items: [], nextCursor: null }),
    capabilities.has('reassign_triager')
      ? service.listEligibleAssignees({
          requestId: detail.requestId,
          role: 'triager',
          limit: 50,
        })
      : Promise.resolve({ items: [], nextCursor: null }),
  ])
  const operations = toAdminDetailModel({
    detail,
    eligibleBuilders: builders.items,
    eligibleReviewers: reviewers.items,
    eligibleTriagers: triagers.items,
  })
  const action = adminRequestCommandAction
  const deliveryModel = toRequestDeliverySlotModel(detail, detail.actor)
  const deliveryWorkflowAvailable = (
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
  const operationalCaseModel = (
    deliveryModel.commands.canResumeRevision
    && deliveryModel.builderWorkspace?.revisionState === 'prepared'
    && deliveryModel.commands.submitKind === null
  )
    ? {
        ...caseModel,
        nextAction: {
          title: 'Continue the exact delivery workflow',
          description:
            'The canonical builder workspace can resume through the private delivery area below.',
        },
      }
    : caseModel
  const workflowNavigation = deliveryWorkflowAvailable
    ? (
        <a href="#request-delivery-workflow">
          Continue exact delivery workflow
        </a>
      )
    : undefined

  return (
    <main className="space-y-8">
      <RequestDeliveryAnalyticsListener surface="admin_requests" />
      <RequestAnalytics
        emissionKey={`admin-status:${detail.requestVersion}:${detail.lifecycleState}`}
        event={{
          eventName: 'status_viewed',
          surface: 'admin_requests',
          stage: detail.lifecycleState,
        }}
      />
      <RequestCaseShell
        model={operationalCaseModel}
        deliverySlot={(
          <RequestCaseDeliverySlot
            model={deliveryModel}
            mode="admin"
            actions={{ review: requestDeliveryReviewAction }}
          />
        )}
        workflowNavigation={workflowNavigation}
      />
      <AdminRequestDetailOperations
        model={operations}
        actions={{
          beginTriage: action,
          resolveExistingPath: action,
          requestClarification: action,
          acceptAndAssign: action,
          startBuild: action,
          assignReviewer: action,
          placeModerationHold: action,
          releaseModerationHold: action,
          removeForModeration: action,
          close: action,
          reassignTriager: action,
          reassignBuilder: action,
          reassignReviewer: action,
          closeNoResponse: action,
        }}
      />
    </main>
  )
}
