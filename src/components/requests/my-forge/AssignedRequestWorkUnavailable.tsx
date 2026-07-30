import Link from 'next/link'

export function AssignedRequestWorkUnavailable({
  retryHref = '/my-forge?tab=requests',
}: {
  retryHref?: string
}) {
  return (
    <section
      className="mt-8 border border-red-300 bg-red-50 p-5 text-zinc-900"
      aria-labelledby="assigned-request-work-unavailable-heading"
      data-assigned-request-work-unavailable
    >
      <h2
        className="text-lg font-black tracking-tight"
        id="assigned-request-work-unavailable-heading"
      >
        Assigned Request work could not be verified
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
        PathForge could not verify all assigned work right now. Any available
        results are still shown below, but an empty assigned queue is not being
        claimed.
      </p>
      <Link
        className="mt-4 inline-flex min-h-11 items-center border border-zinc-900 bg-white px-4 py-2 text-sm font-bold text-zinc-900 no-underline"
        href={retryHref}
      >
        Retry assigned work
      </Link>
    </section>
  )
}
