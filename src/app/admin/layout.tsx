import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, ArrowLeft, ShieldCheck } from 'lucide-react'

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function AccessDenied() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-surface-50 px-5 py-16">
      <section className="w-full max-w-xl border border-surface-200 bg-white p-7 shadow-[8px_8px_0_rgba(24,24,27,0.06)] sm:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center bg-surface-900 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-brand-orange-ink">
          Protected workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-surface-900">
          Admin access required.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-surface-600">
          This workspace is only available to PathForge administrators. Return to the public site or sign in with an authorized account.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to PathForge
        </Link>
      </section>
    </div>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!SUPABASE_CONFIGURED) {
    return <AccessDenied />
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return <AccessDenied />
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] min-w-0 bg-surface-50 text-surface-900">
      <header className="border-b border-surface-800 bg-surface-900 text-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-brand-orange text-surface-900 shadow-[4px_4px_0_rgba(255,255,255,0.12)]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-brand-orange-light">
                PathForge operations
              </p>
              <p className="mt-1 text-xl font-black tracking-[-0.025em] text-white">Admin console</p>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-surface-400">
                Review source runs, moderate projects, and manage community feedback without leaving the queue.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href="/admin/analytics"
              className="inline-flex min-h-10 items-center gap-2 border border-brand-orange/60 px-3 py-2 text-xs font-bold text-brand-orange-light transition-colors hover:border-brand-orange-light hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              Launch activation
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 border border-surface-700 px-3 py-2 text-xs font-bold text-surface-200 transition-colors hover:border-surface-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Public site
            </Link>
            <Link
              href="/my-forge"
              className="inline-flex min-h-10 items-center bg-white px-3 py-2 text-xs font-bold text-surface-900 transition-colors hover:bg-brand-orange-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-light"
            >
              My Forge
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 w-full max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </div>
    </div>
  )
}
