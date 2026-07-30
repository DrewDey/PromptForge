'use client'

export default function BuildRequestsAdminError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <main>
      <section
        className="max-w-2xl border border-red-300 bg-red-50 p-6"
        role="alert"
      >
        <h1 className="text-2xl font-black text-surface-900">Request operations unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-surface-700">
          The authority could not verify this private queue. This is not an empty-state result.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 bg-surface-900 px-4 py-2 text-sm font-bold text-white"
        >
          Retry
        </button>
      </section>
    </main>
  )
}
