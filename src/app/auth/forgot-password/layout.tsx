import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Reset Your Password | PathForge',
  description: 'Request a secure PathForge password reset link.',
  robots: { index: false, follow: false },
}
export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
