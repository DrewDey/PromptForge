import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPromptById } from '@/lib/data'
import { getPublicCommunityProject } from '@/lib/data/community-projects'
import ReportProjectForm from './ReportProjectForm'

export default async function ReportProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [prompt, capsule] = await Promise.all([getPromptById(id), getPublicCommunityProject(id)])
  if (!prompt || !capsule) notFound()
  return (
    <main className="bg-surface-50 py-14">
      <div className="mx-auto max-w-2xl border border-surface-200 bg-white p-6 sm:p-10">
        <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Private content report</div>
        <h1 className="mt-3 text-3xl font-black text-surface-900">Report {prompt.title}</h1>
        <p className="mt-3 text-sm leading-6 text-surface-600">Your contact information and report details are visible only to authorized reviewers. They do not appear on the project page or to the contributor.</p>
        <div className="mt-8"><ReportProjectForm promptId={id} /></div>
        <p className="mt-6 text-xs leading-5 text-surface-500">See <Link href="/copyright" className="font-semibold underline">copyright and reporting guidance</Link> and the <Link href="/privacy" className="font-semibold underline">privacy notice</Link>.</p>
      </div>
    </main>
  )
}
