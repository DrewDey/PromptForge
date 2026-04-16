'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-[80vh] flex bg-gray-50">
      {/* Brand Panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-orange to-brand-orange-dark relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Image src="/logo.png" alt="PathForge" width={36} height={36} className="brightness-0 invert" />
            <span className="text-2xl font-bold">PathForge</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            See what others built with AI
          </h2>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Explore real projects with step-by-step prompts and results. Learn from the community, then share your own.
          </p>

          {/* Mini flow diagram */}
          <div className="space-y-3">
            {[
              { label: 'Prompt', desc: 'Start with an idea' },
              { label: 'Result', desc: 'See what AI produced' },
              { label: 'Iterate', desc: 'Refine and improve' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-white/60 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="h-px flex-1 bg-white/20" />
                <div>
                  <span className="font-semibold text-sm">{step.label}</span>
                  <span className="text-white/60 text-sm ml-2">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo — mobile only (hidden on desktop since brand panel has it) */}
          <div className="text-center mb-8 lg:mb-10">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-brand-orange mb-2 lg:hidden">
              <Image src="/logo.png" alt="PathForge" width={28} height={28} />
              PathForge
            </Link>
            <h1 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">
              <span className="lg:hidden">Welcome back! </span>Log in to your account.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 mb-4 flex items-start gap-2" role="alert">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                required
                placeholder="Your password"
                className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange text-white py-2.5 font-medium hover:bg-brand-orange-dark transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </span>
              ) : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-brand-orange hover:text-brand-orange-dark transition-colors duration-200 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
