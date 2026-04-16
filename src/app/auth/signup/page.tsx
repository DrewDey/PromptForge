'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')

  const passwordLongEnough = password.length >= 8

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
          data: {
            username: formData.get('username') as string,
            display_name: formData.get('username') as string,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // If email confirmation is required, session will be null
      if (!data.session) {
        setSuccess(true)
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="square" strokeLinejoin="miter" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 text-sm mb-6">
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <Link href="/auth/login" className="text-brand-orange hover:text-brand-orange-dark transition-colors duration-200 font-medium text-sm">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex bg-gray-50">
      {/* Brand Panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-blue to-brand-blue-dark relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Image src="/logo.png" alt="PathForge" width={36} height={36} className="brightness-0 invert" />
            <span className="text-2xl font-bold">PathForge</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Share what you built with AI
          </h2>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Show your process, inspire others, and get recognized for your AI projects.
          </p>

          {/* Value props — numbered to match login pattern */}
          <div className="space-y-3">
            {[
              { text: 'Showcase your full build process' },
              { text: 'Step-by-step prompts and results' },
              { text: 'Join a community of AI builders' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-white/60 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
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
          {/* Logo — mobile only */}
          <div className="text-center mb-8 lg:mb-10">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-brand-orange mb-2 lg:hidden">
              <Image src="/logo.png" alt="PathForge" width={28} height={28} />
              PathForge
            </Link>
            <h1 className="hidden lg:block text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm">
              <span className="lg:hidden">Create your account and start sharing your AI projects.</span>
              <span className="hidden lg:inline">Start sharing your AI projects.</span>
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
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                required
                placeholder="Choose a username"
                className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-200"
              />
            </div>
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
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-colors duration-200"
              />
              {/* Password helper */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-3 h-3 border flex items-center justify-center transition-colors duration-200 ${passwordLongEnough ? 'bg-brand-orange border-brand-orange' : 'border-gray-300'}`}>
                  {passwordLongEnough && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="square" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-xs transition-colors duration-200 ${passwordLongEnough ? 'text-brand-orange' : 'text-gray-400'}`}>
                  At least 8 characters
                </span>
              </div>
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
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-orange hover:text-brand-orange-dark transition-colors duration-200 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
