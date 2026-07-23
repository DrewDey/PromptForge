import { notFound } from 'next/navigation'
import InvitationControlForm from '@/app/admin/community-projects/InvitationControlForm'
import PublicationControlForm from '@/app/admin/community-projects/PublicationControlForm'
import ReportProjectForm from '@/app/report/project/[id]/ReportProjectForm'

export default function CommunityReleaseControlsFixture() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <div className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-brand-orange-ink">
        Local rendered QA
      </div>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.035em] text-surface-900">
        Community release controls fixture
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-600">
        This production-hidden route renders the real control components without submitting a mutation.
      </p>

      <section className="mt-8 border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <h2 className="text-lg font-black">External invitation lane: locked</h2>
        <p className="mt-1 text-xs leading-5">
          The rendered attempt requires a private record reference, explicit human confirmation, and the
          authoritative server/database gates.
        </p>
        <InvitationControlForm
          enabled={false}
          canAttemptEnable
          blockReason=""
        />
      </section>

      <section className="mt-6 border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <h2 className="text-lg font-black">Publication readiness: paused</h2>
        <PublicationControlForm
          enabled={false}
          operationallyReady={false}
          canAttemptEnable
        />
      </section>

      <section className="mt-8 border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-black text-surface-900">Public safety report</h2>
        <p className="mt-1 text-xs leading-5 text-surface-600">
          The full urgent-safety taxonomy is rendered from the production report form.
        </p>
        <div className="mt-4">
          <ReportProjectForm promptId="10000000-0000-4000-8000-000000000001" />
        </div>
      </section>
    </main>
  )
}
