import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Image src="/logo.png" alt="PathForge" width={130} height={37} className="mb-4" />
            <p className="text-sm text-gray-500 leading-relaxed max-w-md">
              The default place to reuse proven AI build paths for practical results.
              Stop starting from scratch — forge your path.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/browse" className="text-gray-400 hover:text-brand-orange transition-colors">Browse Paths</Link></li>
              <li><Link href="/prompt/new" className="text-gray-400 hover:text-brand-orange transition-colors">Submit a Path</Link></li>
              <li><Link href="/browse?sort=popular" className="text-gray-400 hover:text-brand-orange transition-colors">Popular</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Categories</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/browse?category=productivity" className="text-gray-400 hover:text-brand-orange transition-colors">Productivity</Link></li>
              <li><Link href="/browse?category=coding" className="text-gray-400 hover:text-brand-orange transition-colors">Coding</Link></li>
              <li><Link href="/browse?category=marketing" className="text-gray-400 hover:text-brand-orange transition-colors">Marketing</Link></li>
              <li><Link href="/browse?category=finance" className="text-gray-400 hover:text-brand-orange transition-colors">Finance</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex items-center justify-between">
          <p className="text-xs text-gray-600">PathForge</p>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-brand-orange" />
            <div className="w-2 h-2 bg-brand-blue" />
          </div>
        </div>
      </div>
    </footer>
  )
}
