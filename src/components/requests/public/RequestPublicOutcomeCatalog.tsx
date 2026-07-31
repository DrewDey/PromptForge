import Link from 'next/link'
import type { RequestPublicOutcomePageV1 } from '@/lib/request-public-architecture'
import {
  encodeRequestPublicOutcomeCursor,
} from '@/lib/build-requests/public-outcome-cursor'

export function RequestPublicOutcomeCatalog({
  page,
}: {
  page: RequestPublicOutcomePageV1 | null
}) {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6"
      data-request-public-outcome-catalog
    >
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
        Request a Build
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-surface-900 sm:text-5xl">
        Consented outcomes, never raw requests.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-surface-600">
        This surface contains only safe summaries whose requester and builder
        separately consented, whose delivery passed independent review, and
        whose linked PathForge project passed the existing publication airlock.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/requests"
          className="inline-flex min-h-11 items-center border border-surface-300 px-4 text-sm font-black"
        >
          Request a Build
        </Link>
        <Link
          href="/paths?panel=open"
          className="inline-flex min-h-11 items-center border border-surface-300 px-4 text-sm font-black"
        >
          Explore existing paths
        </Link>
      </div>

      {!page ? (
        <section role="status" className="mt-10 border border-surface-300 bg-surface-50 p-6">
          <h2 className="text-xl font-black">Outcome status unavailable</h2>
          <p className="mt-2 text-sm text-surface-600">
            No empty or enabled publication state is inferred. Retry later.
          </p>
        </section>
      ) : !page.available ? (
        <section className="mt-10 border border-surface-300 bg-surface-50 p-6">
          <h2 className="text-xl font-black">Public outcomes are off.</h2>
          <p className="mt-2 text-sm text-surface-600">
            Private cases and deliveries are unaffected. Publication requires a
            separately enabled, healthy airlock.
          </p>
        </section>
      ) : page.items.length === 0 ? (
        <section className="mt-10 border border-surface-300 bg-surface-50 p-6">
          <h2 className="text-xl font-black">No consented outcome is public yet.</h2>
          <p className="mt-2 text-sm text-surface-600">
            An empty public projection does not expose or summarize private demand.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {page.items.map((outcome) => (
              <article key={outcome.slug} className="border border-surface-300 bg-white p-6">
                <p className="font-mono text-[10px] font-black uppercase tracking-wide text-brand-orange-ink">
                  Independently reviewed outcome
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                  <Link href={`/requests/outcomes/${outcome.slug}`}>
                    {outcome.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-6 text-surface-600">
                  {outcome.summary}
                </p>
                <p className="mt-4 text-xs text-surface-500">
                  Built by {outcome.builder.displayName}
                  {outcome.requester
                    ? ` · Requested by ${outcome.requester.displayName}`
                    : ''}
                </p>
              </article>
            ))}
          </section>
          {page.nextCursor ? (
            <nav aria-label="Outcome pages" className="mt-8">
              <Link
                href={`/requests/outcomes?cursor=${encodeURIComponent(encodeRequestPublicOutcomeCursor(page.nextCursor))}`}
                className="inline-flex min-h-11 items-center border border-surface-300 px-4 text-sm font-black"
              >
                Older outcomes
              </Link>
            </nav>
          ) : null}
        </>
      )}
    </main>
  )
}
