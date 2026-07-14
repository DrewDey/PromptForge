import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthenticatedUserId } from '@/lib/data/profiles'

export const metadata: Metadata = {
  title: 'Create a PathForge Account',
  description: 'Create a PathForge account to save drafts, fork real AI build paths, attach artifacts, preserve source context, and publish review-ready work.',
}

export default async function SignupLayout({ children }: { children: ReactNode }) {
  if (await getAuthenticatedUserId()) redirect('/my-forge')
  return children
}
