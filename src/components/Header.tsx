'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Hammer, Menu, X } from 'lucide-react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
              <Hammer className="w-6 h-6" />
              PromptForge
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/browse" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Browse
              </Link>
              <Link href="/prompt/new" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Submit Prompt
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Admin
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Sign up
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4 flex flex-col gap-3">
            <Link href="/browse" className="text-gray-600 hover:text-gray-900 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Browse
            </Link>
            <Link href="/prompt/new" className="text-gray-600 hover:text-gray-900 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Submit Prompt
            </Link>
            <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm" onClick={() => setMobileMenuOpen(false)}>
              Admin
            </Link>
            <hr className="border-gray-100" />
            <Link href="/auth/login" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>
              Log in
            </Link>
            <Link href="/auth/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center" onClick={() => setMobileMenuOpen(false)}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
