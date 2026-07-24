import type { Metadata } from 'next'
import Link from 'next/link'
import { getCommunityProjectPilotEligibility } from '@/lib/data/community-projects'
import { parseProjectForkSearchParams } from '@/lib/project-forks'
import { canonicalMetadata } from '@/lib/site-url'
import LegacySourceRunIntakeClient from './LegacySourceRunIntakeClient'

export const metadata: Metadata = {
  title: 'Submit a Source Run | PathForge',
  description: 'Attach a public AI session and exact model to a private PathForge review record.',
  ...canonicalMetadata('/prompt/new'),
}

export default async function LegacySourceRunIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'string') query.set(key, value)
    else if (value?.[0]) query.set(key, value[0])
  }
  const forkSource = parseProjectForkSearchParams(query)
  const eligibility = await getCommunityProjectPilotEligibility()

  if (!eligibility.signedIn) {
    const returnPath = query.size > 0 ? `/prompt/new?${query.toString()}` : '/prompt/new'
    const next = encodeURIComponent(returnPath)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Private source-run review</div>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-surface-900">Sign in to continue this build</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-600">
          PathForge keeps the source link and fork coordinates attached to your account. Nothing publishes when you submit this review record.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/auth/login?next=${next}`} className="bg-brand-orange px-5 py-3 text-sm font-black text-surface-900">Sign in</Link>
          <Link href={`/auth/signup?next=${next}`} className="border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900">Create account</Link>
          <Link href="/paths" className="border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900">Back to projects</Link>
        </div>
      </main>
    )
  }

  return <LegacySourceRunIntakeClient forkSource={forkSource} />
}
