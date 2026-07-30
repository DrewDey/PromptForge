import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RequestAnalytics } from '@/components/requests/RequestAnalytics'
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
import { adminRequestCommandAction } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Private build request operations | PathForge',
  robots: { index: false, follow: false },
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
    return (
      <main>
        <RequestCaseShell
          model={caseModel}
          deliverySlot={null}
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

  return (
    <main className="space-y-8">
      <RequestAnalytics
        emissionKey={`admin-status:${detail.requestVersion}:${detail.lifecycleState}`}
        event={{
          eventName: 'status_viewed',
          surface: 'admin_requests',
          stage: detail.lifecycleState,
        }}
      />
      <RequestCaseShell
        model={caseModel}
        deliverySlot={(
          <p data-request-delivery-placeholder>
            Protected delivery and review controls are awaiting the immutable custody component.
          </p>
        )}
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
