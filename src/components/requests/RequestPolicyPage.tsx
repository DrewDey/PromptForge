import type { ReactNode } from 'react'
import PolicyPage from '@/components/PolicyPage'

const requestPolicyLinks = [
  { href: '/requests/policies', label: 'Request policies' },
  { href: '/requests/policies/terms', label: 'Service terms' },
  { href: '/requests/policies/privacy', label: 'Privacy notice' },
  {
    href: '/requests/policies/acceptable-use',
    label: 'Acceptable use',
  },
  {
    href: '/requests/policies/requester-rights',
    label: 'Requester rights',
  },
  {
    href: '/requests/policies/publication',
    label: 'Publication terms',
  },
] as const

export function RequestPolicyPage({
  version,
  title,
  intro,
  children,
}: {
  version: string
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <PolicyPage
      eyebrow={`Request a Build policy · ${version}`}
      title={title}
      intro={intro}
      footerLinks={requestPolicyLinks}
    >
      <section>
        <h2>Version and activation</h2>
        <p>
          This policy version applies only when an authoritative Request intake
          or publication-consent receipt names it. Deploying this page does not
          open intake, enable email, or authorize publication.
        </p>
      </section>
      {children}
    </PolicyPage>
  )
}
