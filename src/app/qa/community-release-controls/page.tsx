import { notFound } from 'next/navigation'
import AdminCommunityProjectReportQueue from '@/app/admin/community-projects/AdminCommunityProjectReportQueue'
import InvitationControlForm from '@/app/admin/community-projects/InvitationControlForm'
import PublicationControlForm from '@/app/admin/community-projects/PublicationControlForm'
import ReportProjectForm from '@/app/report/project/[id]/ReportProjectForm'
import type { CommunityProjectReportQueue } from '@/lib/data/community-projects'

const QA_REPORT_QUEUE: CommunityProjectReportQueue = {
  reports: [
    {
      id: '20000000-0000-4000-8000-000000000001',
      submission_id: '30000000-0000-4000-8000-000000000001',
      prompt_id: '10000000-0000-4000-8000-000000000001',
      reporter_id: null,
      reporter_email: 'safety-fixture@example.invalid',
      reason: 'imminent_harm',
      details: 'Rendered critical-report fixture for browser verification. It contains no real user data.',
      status: 'open',
      alert_status: 'failed',
      alert_attempt_count: 2,
      alert_last_attempt_at: '2026-07-23T17:30:00.000Z',
      alert_delivered_at: null,
      alert_failure_code: 'qa_primary_endpoint_unavailable',
      resolution_notes: null,
      resolved_by: null,
      resolved_at: null,
      created_at: '2026-07-23T17:00:00.000Z',
      updated_at: '2026-07-23T17:30:00.000Z',
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      submission_id: '30000000-0000-4000-8000-000000000002',
      prompt_id: '10000000-0000-4000-8000-000000000002',
      reporter_id: null,
      reporter_email: 'moderation-fixture@example.invalid',
      reason: 'misleading',
      details: 'Rendered resolved-report fixture proving retained history remains searchable beyond the active queue.',
      status: 'resolved',
      alert_status: 'delivered',
      alert_attempt_count: 1,
      alert_last_attempt_at: '2026-07-23T18:05:00.000Z',
      alert_delivered_at: '2026-07-23T18:05:00.000Z',
      alert_failure_code: null,
      resolution_notes: 'Resolved in the local browser fixture without real user data.',
      resolved_by: '40000000-0000-4000-8000-000000000001',
      resolved_at: '2026-07-23T18:10:00.000Z',
      created_at: '2026-07-23T18:00:00.000Z',
      updated_at: '2026-07-23T18:10:00.000Z',
    },
  ],
  totalCount: 125,
  retainedCount: 325,
  filteredCount: 325,
  undeliveredCount: 17,
  criticalCount: 42,
  oldestOpenAt: '2026-07-23T16:45:00.000Z',
  oldestCriticalAt: '2026-07-23T17:00:00.000Z',
  oldestUndeliveredAt: '2026-07-23T17:00:00.000Z',
  nextCursor: 'fixture-next-cursor',
}

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

      <AdminCommunityProjectReportQueue queue={QA_REPORT_QUEUE} filters={{ status: 'all' }} />

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
