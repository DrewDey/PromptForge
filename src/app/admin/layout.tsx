import Link from 'next/link'
import { LayoutDashboard, FileText, Settings } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:block">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">
          Admin Console
        </h2>
        <nav className="space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/admin?tab=pending"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Review Queue
          </Link>
          <Link
            href="/admin?tab=all"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
