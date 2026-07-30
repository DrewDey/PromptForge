'use client'

import { RequestRouteError } from '@/components/requests/RequestRouteError'

export default function BuildRequestsAdminError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <RequestRouteError
      reset={reset}
      title="Request operations unavailable"
      message="The authority could not verify this private queue. This is not an empty-state result."
    />
  )
}
