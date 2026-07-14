'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section className="mx-auto flex min-h-[58vh] w-full max-w-3xl items-center py-10">
      <div className="w-full border border-red-200 bg-white p-6 shadow-[8px_8px_0_rgba(127,29,29,0.08)] sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center bg-red-50 text-red-800">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-700">
          Admin workspace interrupted
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-surface-900">
          This review view could not load.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-600">
          Try the request again. No moderation or publishing action is taken when this screen appears.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/my-forge"
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-surface-300 bg-white px-4 py-2.5 text-sm font-bold text-surface-700 transition-colors hover:border-brand-orange-ink hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to My Forge
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 border-t border-surface-200 pt-4 font-mono text-[10px] text-surface-400">
            Reference {error.digest}
          </p>
        )}
      </div>
    </section>
  )
}
