import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getRequestPublicApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import { requestPublicPatterns } from '@/lib/request-public-architecture'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Public consent withdrawn | PathForge',
  robots: { index: false, follow: false },
}

export default async function PublicationWithdrawnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ receipt?: string }>
}) {
  const { id } = await params
  const { receipt: commandId } = await searchParams
  if (
    !requestPublicPatterns.uuid.test(id) ||
    !commandId ||
    !requestPublicPatterns.uuid.test(commandId)
  ) {
    notFound()
  }
  let withdrawal
  try {
    const service = await getRequestPublicApplicationService()
    withdrawal = await service.getPublicationWithdrawalReceipt({
      requestId: id,
      commandId,
    })
  } catch (error) {
    if (requestAuthorityErrorCode(error) === 'not_found') notFound()
    throw error
  }

  return (
    <main className="min-h-screen bg-surface-50 px-4 py-8 sm:px-6 sm:py-12">
      <section
        aria-labelledby="publication-withdrawn-title"
        className="mx-auto w-full max-w-2xl border border-surface-300 bg-white p-5 sm:p-8"
        data-request-publication-withdrawn
      >
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Durable publication receipt
        </p>
        <h1
          id="publication-withdrawn-title"
          className="mt-3 text-3xl font-black tracking-tight"
        >
          Public consent withdrawn
        </h1>
        <p className="mt-3 text-sm leading-6 text-surface-700">
          The separately consented outcome is not public. This action did not
          restore, expose, or change the private case.
        </p>
        <p className="mt-4 font-mono text-xs text-surface-500">
          Recorded{' '}
          <time dateTime={withdrawal.occurredAt}>
            {new Date(withdrawal.occurredAt).toLocaleString('en-US')}
          </time>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/requests/outcomes"
            className="inline-flex min-h-11 items-center border border-surface-900 px-4 text-sm font-black"
          >
            View public outcomes
          </Link>
          <Link
            href="/my-forge?tab=requests"
            className="inline-flex min-h-11 items-center px-4 text-sm font-black underline"
          >
            Return to My Forge
          </Link>
        </div>
      </section>
    </main>
  )
}
