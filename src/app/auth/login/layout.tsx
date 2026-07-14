import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthenticatedUserId } from '@/lib/data/profiles'

export const metadata: Metadata = {
  title: 'Log in to PathForge',
  description: 'Log in to PathForge to reopen drafts, fork proven AI build paths, attach artifacts, and keep source context tied to review-ready work.',
}

export default async function LoginLayout({ children }: { children: ReactNode }) {
  if (await getAuthenticatedUserId()) redirect('/my-forge')
  return children
}
