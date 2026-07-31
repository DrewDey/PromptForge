import Link from 'next/link'
import type { RequestPublicOutcomeV1 } from '@/lib/request-public-architecture'

export function RequestPublicOutcomeDetail({
  outcome,
}: {
  outcome: RequestPublicOutcomeV1
}) {
  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6"
      data-request-public-outcome-detail
    >
      <Link
        href="/requests/outcomes"
        className="inline-flex min-h-11 items-center text-sm font-black underline"
      >
        All Request outcomes
      </Link>
      <article className="mt-6 border border-surface-300 bg-white p-6 sm:p-9">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
          Dual consent · independent review · publication airlock
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-surface-900 sm:text-5xl">
          {outcome.title}
        </h1>
        <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-surface-700">
          {outcome.summary}
        </p>
        <dl className="mt-8 grid gap-4 border-t border-surface-200 pt-6 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] font-black uppercase tracking-wide text-surface-500">
              Builder
            </dt>
            <dd className="mt-1 font-bold">{outcome.builder.displayName}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-black uppercase tracking-wide text-surface-500">
              Requester attribution
            </dt>
            <dd className="mt-1 font-bold">
              {outcome.requester?.displayName ?? 'Not published'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-black uppercase tracking-wide text-surface-500">
              Reuse permission
            </dt>
            <dd className="mt-1 font-bold">
              {outcome.reusePermission === 'adapt_with_credit'
                ? 'Adapt with builder credit'
                : 'View only'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-black uppercase tracking-wide text-surface-500">
              Published
            </dt>
            <dd className="mt-1 font-bold">
              <time dateTime={outcome.publishedAt}>
                {new Date(outcome.publishedAt).toLocaleDateString('en-US')}
              </time>
            </dd>
          </div>
        </dl>
        <Link
          href={outcome.projectHref}
          className="mt-8 inline-flex min-h-11 items-center bg-surface-900 px-5 text-sm font-black text-white"
        >
          Open the approved PathForge project
        </Link>
      </article>
    </main>
  )
}
