'use client'

import { useEffect } from 'react'
import { trackActivationEvent } from '@/lib/activation/track'

export default function AccountCreatedActivationTracker() {
  useEffect(() => {
    void trackActivationEvent({
      eventName: 'account_created',
      surface: 'signup',
      path: '/settings/profile',
      dedupeKey: 'account_created|oauth_onboarding',
    })
  }, [])
  return null
}
