import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { RequestIntakeWorkflow } from '@/components/requests/intake'
import {
  getRequestApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'
import { submitRequestAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function NewRequestPage() {
  const viewer = await getRequestViewerState()
  if (viewer.status === 'signed_out') redirect('/auth/login?next=%2Frequests%2Fnew')
  if (viewer.status === 'unavailable') {
    throw new Error('Request identity is temporarily unavailable.')
  }

  const service = await getRequestApplicationService()
  const availability = await service.getAvailability()
  const serviceError = availability.intakeEligibility === 'not_admitted'
    ? 'not_admitted'
    : availability.intakeEligibility === 'controls_off'
      ? 'controls_off'
      : availability.intakeEligibility === 'already_active'
        ? 'already_active'
        : availability.intakeEligibility === 'available'
          ? null
          : 'auth_required'

  return (
    <RequestIntakeWorkflow
      action={submitRequestAction}
      initialState={{
        status: 'ready',
        idempotencyKey: `request-intake-${randomUUID()}`,
        analyticsAttempt: 0,
        serviceError,
      }}
    />
  )
}
