import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, FileText, Settings } from 'lucide-react'

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protect admin route when Supabase is configured
  if (SUPABASE_CONFIGURED) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/login')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">You don&apos;t have admin access.</p>
            <Link href="/" className="text-brand-orange hover:opacity-80 font-medium text-sm">
              Go back home
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:block">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-3">
          Admin Console
        </h2>
        <nav className="space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admin?tab=pending"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Review Queue
          </Link>
          <Link
            href="/admin?tab=all"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            All Prompts
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6 sm:p-8 bg-gray-50">
        {children}
      </div>
    </div>
  )
}
