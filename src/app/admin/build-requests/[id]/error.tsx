'use client'

import { RequestRouteError } from '@/components/requests/RequestRouteError'

export default function BuildRequestAdminDetailError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <RequestRouteError
      reset={reset}
      title="Case detail unavailable"
      message="The authority could not verify this case. No private detail or delivery evidence is shown."
    />
  )
}
