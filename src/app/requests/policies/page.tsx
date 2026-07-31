import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Request a Build policies | PathForge',
  robots: { index: false, follow: false },
}
const policies = [
  {
    href: '/requests/policies/terms',
    title: 'Service terms',
    version: 'request-terms-v1',
  },
  {
    href: '/requests/policies/privacy',
    title: 'Privacy and retention',
    version: 'request-privacy-v1',
  },
  {
    href: '/requests/policies/acceptable-use',
    title: 'Acceptable use',
    version: 'request-aup-v1',
  },
  {
    href: '/requests/policies/requester-rights',
    title: 'Requester rights',
    version: 'request-rights-v1',
  },
  {
    href: '/requests/policies/publication',
    title: 'Optional publication',
    version: 'request-publication-v1',
  },
] as const

export default function RequestPoliciesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
        Request a Build
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-surface-900">
        Private-service policy set
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-surface-600">
        These documents separate private intake, data handling, use rights,
        acceptable use, and optional safe-outcome publication. The authority
        records the exact versions accepted for each action.
      </p>
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {policies.map((policy) => (
          <article
            key={policy.href}
            className="border border-surface-300 bg-white p-5"
          >
            <h2 className="text-xl font-black">{policy.title}</h2>
            <p className="mt-2 font-mono text-xs text-surface-500">
              {policy.version}
            </p>
            <Link
              href={policy.href}
              className="mt-4 inline-flex min-h-11 items-center font-bold underline"
            >
              Read this policy
            </Link>
          </article>
        ))}
      </section>
      <Link
        href="/requests"
        className="mt-8 inline-flex min-h-11 items-center font-bold underline"
      >
        Return to Request a Build
      </Link>
    </main>
  )
}
