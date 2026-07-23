import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { communityProjectStatusLabel } from '@/lib/community-project-contract'
import {
  getCommunityProjectPilotEligibility,
  getCommunityProjectSubmissionsForOwner,
} from '@/lib/data/community-projects'

export const dynamic = 'force-dynamic'

export default async function OwnerCommunityProjectsPage() {
  const access = await getCommunityProjectPilotEligibility()
  if (!access.signedIn) redirect('/auth/login?next=%2Fmy-forge%2Fcommunity-projects')
  const submissions = await getCommunityProjectSubmissionsForOwner()
  return <main className="min-h-[70vh] bg-surface-50"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><Link href="/my-forge" className="inline-flex items-center gap-2 text-sm font-bold text-surface-500"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Forge</Link><header className="mt-6 flex flex-col gap-5 border-b border-surface-200 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">Invitation-only pilot</div><h1 className="mt-2 text-4xl font-black text-surface-900">My project submissions</h1><p className="mt-2 text-sm leading-6 text-surface-600">Private review, repair, publication, and withdrawal stay attached to one record.</p></div><Link href="/build" className="inline-flex min-h-11 items-center gap-2 bg-brand-orange px-4 py-2 text-sm font-black text-surface-900"><Plus className="h-4 w-4" aria-hidden="true" /> Submit project</Link></header><div className="mt-7 grid gap-3">{submissions.length === 0 ? <div className="border border-surface-200 bg-white p-8 text-center text-sm text-surface-500">No pilot submissions yet.</div> : submissions.map((item) => <Link key={item.id} href={`/my-forge/community-projects/${item.id}`} className="grid gap-3 border border-surface-200 bg-white p-4 hover:border-brand-orange sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><span><strong className="block text-sm text-surface-900">{item.title}</strong><span className="mt-1 block text-xs text-surface-500">Version {item.submission_version} · {new Date(item.updated_at).toLocaleDateString()}</span></span><span className="flex items-center gap-3 text-xs font-bold text-surface-600">{communityProjectStatusLabel(item.status)}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span></Link>)}</div></div></main>
}
