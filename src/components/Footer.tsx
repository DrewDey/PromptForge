import Link from 'next/link'
import Image from 'next/image'

/**
 * Footer — dark (surface-900) bookend paired with the dark Header.
 * Iteration 24: migrated `gray-*` → `surface-*`, switched light-gray generic
 * footer to a dark modern-dev-tool footer matching Header. Keeps discoverability
 * columns (Platform, Categories) because PathForge is pre-launch and needs to
 * expose the category taxonomy — not yet Linear's ultra-minimal single row.
 */
export default function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-300 border-t border-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
          {/* Brand + tagline */}
          <div className="md:col-span-5">
            <Image
              src="/logo.png"
              alt="PathForge"
              width={130}
              height={37}
              className="mb-4 brightness-0 invert opacity-95"
            />
            <p className="text-sm text-surface-400 leading-relaxed max-w-md">
              The default place to reuse proven AI build paths for practical results.
              Stop starting from scratch — forge your path.
            </p>
          </div>

          {/* Platform links */}
          <div className="md:col-span-3 md:col-start-7">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-surface-500 mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/browse" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Browse paths</Link></li>
              <li><Link href="/prompt/new" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Submit a path</Link></li>
              <li><Link href="/browse?sort=popular" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Popular</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="md:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-surface-500 mb-4">Categories</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/browse?category=productivity" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Productivity</Link></li>
              <li><Link href="/browse?category=coding" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Coding</Link></li>
              <li><Link href="/browse?category=marketing" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Marketing</Link></li>
              <li><Link href="/browse?category=finance" className="text-surface-300 hover:text-brand-orange transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-orange focus-visible:outline-offset-2">Finance</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar — brand dots + wordmark */}
        <div className="border-t border-surface-800 mt-10 pt-6 flex items-center justify-between">
          <p className="text-xs text-surface-500">© {new Date().getFullYear()} PathForge</p>
          <div className="flex items-center gap-1" aria-hidden="true">
            <div className="w-2 h-2 bg-brand-orange" />
            <div className="w-2 h-2 bg-brand-blue" />
          </div>
        </div>
      </div>
    </footer>
  )
}
