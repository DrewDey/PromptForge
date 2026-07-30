'use client'

import { RequestRouteError } from '@/components/requests/RequestRouteError'

export default function RequestIntakeError({ reset }: { reset: () => void }) {
  return <RequestRouteError reset={reset} />
}
