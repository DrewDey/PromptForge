'use client'

import { RequestRouteError } from '@/components/requests/RequestRouteError'

export default function RequestServiceError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RequestRouteError reset={reset} />
}
