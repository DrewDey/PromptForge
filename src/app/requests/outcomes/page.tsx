import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRequestPublicApplicationService } from '@/lib/build-requests/server'
import {
  decodeRequestPublicOutcomeCursor,
} from '@/lib/build-requests/public-outcome-cursor'
import { RequestPublicOutcomeCatalog } from '@/components/requests/public'
import { canonicalMetadata } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Request a Build outcomes | PathForge',
  description:
    'Separately consented, independently reviewed outcomes from PathForge Request a Build.',
  ...canonicalMetadata('/requests/outcomes'),
}

export default async function RequestOutcomesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const query = await searchParams
  const cursor = decodeRequestPublicOutcomeCursor(query.cursor)
  if (query.cursor && !cursor) notFound()
  let page = null
  try {
    page = await (
      await getRequestPublicApplicationService()
    ).listPublicOutcomes({ limit: 24, cursor })
  } catch {}

  return <RequestPublicOutcomeCatalog page={page} />
}
