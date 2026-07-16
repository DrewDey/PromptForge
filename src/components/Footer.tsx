import Image from 'next/image'
import Link from 'next/link'

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
    <footer className="border-t border-surface-200 bg-white text-surface-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-10 sm:grid-cols-2 md:grid-cols-12 md:gap-8">
          <div className="sm:col-span-2 md:col-span-5">
            <Link href="/" className="inline-flex focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange-ink" aria-label="PathForge home">
              <Image src="/logo.png" alt="PathForge" width={971} height={310} className="h-auto w-[132px]" loading="eager" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-surface-500">
              Finished AI projects with their prompts, responses, artifacts, model results, and forks still attached.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-3 md:col-span-7">
            {footerGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-surface-500">
                  {group.label}
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-surface-600 transition-colors duration-150 hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
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

        <div className="flex flex-col gap-2 border-t border-surface-200 py-5 text-xs text-surface-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PathForge</p>
          <p>Transparent AI work that can improve over time.</p>
        </div>
      </div>
    </footer>
  )
}
