import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Hammer } from 'lucide-react'

const footerGroups = [
  {
    label: 'Discover',
    links: [
      { href: '/paths', label: 'Explore build paths' },
      { href: '/what-to-build', label: 'Ideas' },
      { href: '/requests', label: 'Build requests' },
      { href: '/paths?domain=games&panel=open', label: 'Games' },
    ],
  },
  {
    label: 'Create',
    links: [
      { href: '/build', label: 'Share a build' },
      { href: '/my-forge', label: 'My Forge' },
      { href: '/guide', label: 'How it works' },
    ],
  },
  {
    label: 'PathForge',
    links: [
      { href: '/about', label: 'Vision' },
      { href: '/suggestion-box', label: 'Suggestion Box' },
    ],
  },
] as const

export default function Footer() {
  return (
    <footer className="border-t-4 border-brand-orange bg-surface-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-white/10 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:py-12">
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-orange-light">
              Build · trace · fork
            </p>
            <h2 className="font-display text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-4xl">
              Good work should be reusable.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-300 sm:text-base">
              PathForge keeps the prompts, responses, working artifacts, and forks together—so anyone can learn from the process and build the next version.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
            <Link
              href="/paths"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-4 text-sm font-bold text-white transition-colors duration-150 hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
            >
              Explore paths
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/build"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-brand-orange bg-brand-orange px-4 text-sm font-bold text-surface-900 transition-colors duration-150 hover:border-brand-orange-light hover:bg-brand-orange-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
            >
              <Hammer className="h-4 w-4" aria-hidden="true" />
              Share a build
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-10 sm:grid-cols-2 md:grid-cols-12 md:gap-8 md:py-12">
          <div className="sm:col-span-2 md:col-span-5">
            <Link href="/" className="inline-flex focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange-light" aria-label="PathForge home">
              <Image src="/logo.png" alt="PathForge" width={971} height={310} className="h-auto w-[142px]" loading="eager" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-surface-400">
              Explore what people built with AI, inspect the path that produced it, and carry the strongest work forward.
            </p>
            <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-8 bg-brand-orange" />
              <span className="h-2 w-2 bg-brand-blue" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-3 md:col-span-7">
            {footerGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-surface-400">
                  {group.label}
                </h3>
                <ul className="space-y-3 text-sm">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-surface-300 transition-colors duration-150 hover:text-brand-orange-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-surface-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PathForge</p>
          <p>Transparent AI work, built to improve over time.</p>
        </div>
      </div>
    </footer>
  )
}
