import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { RequestPublicOutcomeDetail } from '@/components/requests/public'
import {
  getRequestPublicApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import { requestPublicPatterns } from '@/lib/request-public-architecture'
import { canonicalMetadata } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

type RequestOutcomePageProps = {
  params: Promise<{ slug: string }>
}

const loadPublicOutcome = cache(async (slug: string) => {
  if (!requestPublicPatterns.slug.test(slug)) notFound()
  try {
    return await (
      await getRequestPublicApplicationService()
    ).getPublicOutcome(slug)
  } catch (error) {
    if (requestAuthorityErrorCode(error) === 'not_found') notFound()
    throw error
  }
})

export async function generateMetadata({
  params,
}: RequestOutcomePageProps): Promise<Metadata> {
  const { slug } = await params
  const outcome = await loadPublicOutcome(slug)
  return {
    title: `${outcome.title} | PathForge`,
    description: outcome.summary,
    ...canonicalMetadata(`/requests/outcomes/${outcome.slug}`),
  }
}

export default async function RequestOutcomePage({
  params,
}: RequestOutcomePageProps) {
  const { slug } = await params
  const outcome = await loadPublicOutcome(slug)

  return <RequestPublicOutcomeDetail outcome={outcome} />
}
