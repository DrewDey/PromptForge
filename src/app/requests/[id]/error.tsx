'use client'

import { RequestRouteError } from '@/components/requests/RequestRouteError'

export default function RequestCaseError({ reset }: { reset: () => void }) {
  return <RequestRouteError reset={reset} />
}
