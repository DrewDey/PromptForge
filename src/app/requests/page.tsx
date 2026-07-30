import type { Metadata } from 'next'
import { RequestServiceOverview } from '@/components/requests/service'
import { canonicalMetadata } from '@/lib/site-url'
import {
  getRequestApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'
import {
  toRequestServiceAvailability,
  toUnavailableServiceAvailability,
} from '@/lib/build-requests/presentation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Request a Build | PathForge',
  description: 'A private invited PathForge pilot for finite, testable build outcomes.',
  ...canonicalMetadata('/requests'),
}

export default async function RequestsPage() {
  const viewer = await getRequestViewerState().catch(() => ({ status: 'unavailable' as const }))
  let mapped = null
  try {
    const service = await getRequestApplicationService()
    mapped = toRequestServiceAvailability(await service.getAvailability())
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
    loginHref="/auth/login?next=%2Frequests%2Fnew"
    myForgeHref="/my-forge?tab=requests"
  />
}
