'use client'

import { useEffect } from 'react'
import { trackActivationEvent } from '@/lib/activation/track'

export default function MyForgeActivationTracker() {
  useEffect(() => {
    void trackActivationEvent({
      eventName: 'my_forge_returned',
      surface: 'my_forge',
      path: '/my-forge',
    })
  }, [])
  return null
}
