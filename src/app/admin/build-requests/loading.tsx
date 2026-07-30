import { AdminRequestQueue } from '@/components/requests/admin'

export default function BuildRequestsAdminLoading() {
  return (
    <main>
      <h1 className="mb-6 text-4xl font-black tracking-[-0.04em] text-surface-900">
        Private managed-service queue
      </h1>
      <AdminRequestQueue model={{ state: 'loading', scope: 'admin' }} />
    </main>
  )
}
