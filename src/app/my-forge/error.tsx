'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'

export default function MyForgeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-surface-50">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <section className="border border-surface-200 bg-white p-6 shadow-[10px_10px_0_rgba(24,24,27,0.06)] sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="mt-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange">Private workspace</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-surface-900">My Forge could not load.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-600">
            Your workspace data is still attached to your account. Try the secure read again, or return to the public library while the connection recovers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-orange"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <Link href="/paths" className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-800 hover:border-surface-900">
              Explore paths
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
