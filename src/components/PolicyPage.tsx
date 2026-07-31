import type { ReactNode } from 'react'
import Link from 'next/link'

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  children,
  footerLinks,
}: {
  eyebrow: string
  title: string
  intro: string
  children: ReactNode
  footerLinks?: readonly { href: string; label: string }[]
}) {
  const links = footerLinks ?? [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/community-guidelines', label: 'Community Guidelines' },
    { href: '/copyright', label: 'Copyright and reports' },
  ]
  return (
    <main className="bg-surface-50 py-14 sm:py-20" data-policy-page>
      <article className="mx-auto max-w-3xl border border-surface-200 bg-white px-5 py-8 sm:px-10 sm:py-12">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">{eyebrow}</div>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-surface-900">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-surface-600">{intro}</p>
        <div className="mt-10 space-y-8 text-sm leading-7 text-surface-700 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-surface-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <div className="mt-12 flex flex-wrap gap-3 border-t border-surface-200 pt-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-bold text-surface-600 underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </article>
    </main>
  )
}
