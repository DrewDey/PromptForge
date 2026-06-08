import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Log in to PathForge',
  description: 'Log in to PathForge to reopen drafts, fork proven AI build paths, attach artifacts, and keep source context tied to review-ready work.',
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
