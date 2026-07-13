import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Choose a New Password | PathForge',
  description: 'Finish recovering your PathForge account.',
  robots: { index: false, follow: false },
}
export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
