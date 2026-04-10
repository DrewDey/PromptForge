import Link from 'next/link'
import { Hammer } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white mb-3">
              <Hammer className="w-5 h-5" />
              PromptForge
            </Link>
            <p className="text-sm leading-relaxed max-w-md">
              The community hub for AI prompts and workflows. Discover, share, and build
              with prompts organized by what you actually need them for.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/browse" className="hover:text-white transition-colors">Browse Prompts</Link></li>
              <li><Link href="/prompt/new" className="hover:text-white transition-colors">Submit a Prompt</Link></li>
              <li><Link href="/browse?sort=popular" className="hover:text-white transition-colors">Popular</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/browse?category=finance" className="hover:text-white transition-colors">Finance</Link></li>
              <li><Link href="/browse?category=marketing" className="hover:text-white transition-colors">Marketing</Link></li>
              <li><Link href="/browse?category=coding" className="hover:text-white transition-colors">Coding</Link></li>
              <li><Link href="/browse?category=writing" className="hover:text-white transition-colors">Writing</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center">
          PromptForge — Built for the AI community
        </div>
      </div>
    </footer>
  )
}
