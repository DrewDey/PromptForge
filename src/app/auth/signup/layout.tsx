import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Create a PathForge Account',
  description: 'Create a PathForge account to save drafts, fork real AI build paths, attach artifacts, preserve source context, and publish review-ready work.',
}

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children
}
