import type { Metadata } from 'next'
import { RequestServiceOverview } from '@/components/requests/service'
import { canonicalMetadata } from '@/lib/site-url'
import {
  getRequestPublicApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'
import {
  toUnavailableServiceAvailability,
} from '@/lib/build-requests/presentation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Request a Build | PathForge',
  description:
    'A private, capacity-controlled PathForge service for finite, testable build outcomes.',
  ...canonicalMetadata('/requests'),
}

export default async function RequestsPage() {
  const viewer = await getRequestViewerState().catch(() => ({ status: 'unavailable' as const }))
  let mapped = null
  try {
    const service = await getRequestPublicApplicationService()
    const availability = await service.getAvailability()
    mapped = {
      availability: !availability.acceptingRequests
        ? {
            status: 'closed' as const,
            activeCases: availability.activeCaseCount,
            maxActiveCases: availability.activeCaseCapacity,
          }
        : availability.unavailableReason === 'readiness_incomplete'
          ? {
              status: 'not_ready' as const,
              activeCases: availability.activeCaseCount,
              maxActiveCases: availability.activeCaseCapacity,
            }
        : availability.remainingQueueCapacity === 0
          ? {
              status: 'capacity_full' as const,
              activeCases: availability.activeCaseCount,
              maxActiveCases: availability.activeCaseCapacity,
            }
          : {
              status: 'available' as const,
              activeCases: availability.activeCaseCount,
              maxActiveCases: availability.activeCaseCapacity,
            },
      intakeEligibility: availability.intakeEligibility,
      intakeAudience: availability.intakeAudience,
      fulfillmentCapacity: {
        activeCases: availability.fulfillmentCaseCount,
        maxActiveCases: availability.fulfillmentCaseCapacity,
      },
    }
  } catch {}
  if (!mapped) {
    return <RequestServiceOverview
      availability={toUnavailableServiceAvailability()}
      intakeEligibility={viewer.status === 'signed_out' ? 'sign_in_required' : 'controls_off'}
    />
  }
  return <RequestServiceOverview
    availability={mapped.availability}
    intakeEligibility={mapped.intakeEligibility}
    intakeAudience={mapped.intakeAudience}
    fulfillmentCapacity={mapped.fulfillmentCapacity}
    loginHref="/auth/login?next=%2Frequests%2Fnew"
    myForgeHref="/my-forge?tab=requests"
  />
}
