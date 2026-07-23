import type { Metadata } from 'next'
import Link from 'next/link'
import { FileCheck2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { getCommunityProjectPilotEligibility, getCommunityProjectSubmissionForOwner } from '@/lib/data/community-projects'
import { canonicalMetadata } from '@/lib/site-url'
import ProjectSubmissionClient from './ProjectSubmissionClient'
import LegacySourceRunRepairClient from './LegacySourceRunRepairClient'

export const metadata: Metadata = {
  title: 'Submit a Project | PathForge',
  description: 'Submit a reviewed project artifact and clearly scoped build evidence to the invitation-only PathForge pilot.',
  ...canonicalMetadata('/build'),
}

function PilotExplanation({
  signedIn,
  username,
}: {
  signedIn: boolean
  username?: string | null
}) {
  return (
    <main className="bg-surface-50">
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-20">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-orange-ink">
              Invitation-only project pilot
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.03] tracking-[-0.035em] text-surface-900 sm:text-5xl">
              Submit the finished project and the evidence that explains it.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-surface-600">
              A PathForge submission is a private review bundle: one self-contained HTML result, selected build checkpoints, model details, and explicit permission. A provider chat link is optional supporting evidence—not the project itself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {!signedIn ? (
                <>
                  <Link href="/auth/login?next=%2Fbuild" className="bg-brand-orange px-5 py-3 text-sm font-black text-surface-900 hover:bg-brand-orange-light">
                    Invited already? Sign in
                  </Link>
                  <Link href="/auth/signup?next=%2Fbuild" className="border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 hover:border-brand-orange">
                    New here? Create a profile
                  </Link>
                </>
              ) : (
                <Link href="/my-forge/community-projects" className="border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 hover:border-brand-orange">
                  View my pilot projects
                </Link>
              )}
              <Link href="/community-guidelines" className="border border-surface-300 bg-white px-5 py-3 text-sm font-bold text-surface-900 hover:border-brand-orange">
                Read the rules
              </Link>
            </div>
            {signedIn && (
              <p className="mt-5 max-w-2xl border-l-2 border-brand-orange pl-4 text-sm leading-6 text-surface-600">
                This account is not currently in the pilot. If someone invited you, send them your exact PathForge handle{username ? <>: <strong>@{username}</strong></> : ''}; pilot access is assigned manually and does not require sharing your email or provider account.
              </p>
            )}
            {!signedIn && (
              <p className="mt-5 max-w-2xl border-l-2 border-surface-300 pl-4 text-sm leading-6 text-surface-600">
                Creating a profile prepares you for an invitation; it does not unlock project uploads on its own. After signup, send the person who invited you the exact public handle you chose so they can assign access.
              </p>
            )}
          </div>

          <aside className="border border-surface-200 bg-primary-50 p-5 shadow-[10px_10px_0_rgba(232,122,44,0.10)]">
            <h2 className="text-lg font-black text-surface-900">What the pilot guarantees</h2>
            <div className="mt-5 space-y-3">
              {[
                [LockKeyhole, 'Private before approval', 'Files and build evidence stay owner/admin-only during review.'],
                [ShieldCheck, 'No automatic publishing', 'Automated checks and a human review must both pass.'],
                [FileCheck2, 'One reversible record', 'A withdrawal turns off the page and artifact immediately—no deployment required.'],
              ].map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof LockKeyhole
                return (
                  <div key={String(title)} className="grid grid-cols-[38px_1fr] gap-3 border border-primary-200 bg-white p-3">
                    <span className="flex h-9 w-9 items-center justify-center bg-surface-900 text-white"><ItemIcon className="h-4 w-4" aria-hidden="true" /></span>
                    <span>
                      <strong className="block text-sm text-surface-900">{String(title)}</strong>
                      <span className="mt-0.5 block text-xs leading-5 text-surface-600">{String(body)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const legacyRepairId = typeof params.repair === 'string' ? params.repair : null
  const repairId = typeof params.repairCommunity === 'string' ? params.repairCommunity : null
  const eligibility = await getCommunityProjectPilotEligibility()
  if (legacyRepairId) {
    if (!eligibility.signedIn) {
      const next = encodeURIComponent(`/build?repair=${legacyRepairId}`)
      return (
        <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-black text-surface-900">Sign in to repair this build</h1>
          <p className="mt-3 text-sm leading-6 text-surface-600">The repair record is private and can be opened only by the account that submitted it.</p>
          <Link href={`/auth/login?next=${next}`} className="mt-6 inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 text-sm font-black text-surface-900">Sign in</Link>
        </main>
      )
    }
    return <LegacySourceRunRepairClient repairId={legacyRepairId} />
  }
  const repairSubmission = eligibility.signedIn && repairId
    ? await getCommunityProjectSubmissionForOwner(repairId)
    : null
  const repairIsAvailable = repairSubmission?.status === 'needs_repair'
  if (!eligibility.signedIn || (!eligibility.eligible && !repairIsAvailable)) {
    return <PilotExplanation signedIn={eligibility.signedIn} username={eligibility.username} />
  }

  return (
    <ProjectSubmissionClient
      repairSubmission={repairIsAvailable ? repairSubmission : null}
      requestedRepairId={repairId}
      publicContributorName={eligibility.displayName || eligibility.username || 'Your PathForge profile'}
    />
  )
}
