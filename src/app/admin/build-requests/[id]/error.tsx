'use client'

export default function BuildRequestAdminDetailError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <main>
      <section className="max-w-2xl border border-red-300 bg-red-50 p-6" role="alert">
        <h1 className="text-2xl font-black text-surface-900">Case detail unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-surface-700">
          The authority could not verify this case. No private detail or delivery evidence is shown.
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
