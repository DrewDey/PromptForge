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
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-surface-900">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm mb-6">
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <Link href="/auth/login" className="text-brand-orange hover:opacity-80 font-medium text-sm">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-surface-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-brand-orange mb-2">
            <Image src="/logo.png" alt="PathForge" width={28} height={28} />
            PathForge
          </Link>
          <p className="text-gray-400 text-sm">Create your account and start sharing projects.</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input
              type="text"
              name="username"
              required
              placeholder="Choose a username"
              className="w-full bg-surface-800 border border-surface-600 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full bg-surface-800 border border-surface-600 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full bg-surface-800 border border-surface-600 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange text-white py-2.5 font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-orange hover:opacity-80 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
