import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { RequestIntakeWorkflow } from '@/components/requests/intake'
import {
  getRequestPublicApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'
import { submitRequestAction } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'New private build request | PathForge',
  robots: { index: false, follow: false },
}

export default async function NewRequestPage() {
  const viewer = await getRequestViewerState()
  if (viewer.status === 'signed_out') redirect('/auth/login?next=%2Frequests%2Fnew')
  if (viewer.status === 'unavailable') {
    throw new Error('Request identity is temporarily unavailable.')
  }

  const service = await getRequestPublicApplicationService()
  const availability = await service.getAvailability()
  const serviceError = availability.intakeEligibility === 'not_admitted'
    ? 'not_admitted'
    : availability.intakeEligibility === 'already_active'
      ? 'already_active'
      : availability.intakeEligibility === 'capacity_full' ||
          availability.unavailableReason === 'capacity_full'
        ? 'capacity_full'
        : availability.unavailableReason === 'controls_off' ||
            availability.intakeEligibility === 'controls_off'
          ? 'controls_off'
          : availability.intakeEligibility === 'readiness_incomplete' ||
              availability.unavailableReason === 'readiness_incomplete'
            ? 'readiness_incomplete'
            : availability.intakeEligibility === 'available'
              ? null
              : 'auth_required'

  return (
    <RequestIntakeWorkflow
      action={submitRequestAction}
      policyVersions={availability.policyVersions}
      initialState={{
        status: 'ready',
        idempotencyKey: `request-intake-${randomUUID()}`,
        analyticsAttempt: 0,
        serviceError,
      }}
    />
  )
}
