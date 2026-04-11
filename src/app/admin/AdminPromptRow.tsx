'use client'

import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { approvePrompt, rejectPrompt } from '@/lib/actions'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-900/40 text-amber-400',
  approved: 'bg-green-900/40 text-green-400',
  rejected: 'bg-red-900/40 text-red-400',
}

export default function AdminPromptRow({
  prompt,
  showStatus,
}: {
  prompt: PromptWithRelations
  showStatus?: boolean
}) {
  return (
    <tr className="border-b border-surface-700 hover:bg-surface-700">
      <td className="px-4 py-3">
        <Link href={`/prompt/${prompt.id}`} className="font-medium text-white hover:text-brand-orange">
          {prompt.title}
        </Link>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{prompt.description}</p>
      </td>
      <td className="px-4 py-3 text-gray-400">
        {prompt.category?.icon} {prompt.category?.name ?? '—'}
      </td>
      {showStatus ? (
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 ${statusColors[prompt.status]}`}>
            {prompt.status}
          </span>
        </td>
      ) : (
        <td className="px-4 py-3 text-gray-400">{prompt.difficulty}</td>
      )}
      <td className="px-4 py-3 text-gray-400">
        {showStatus ? prompt.vote_count : (prompt.author?.display_name ?? 'Anonymous')}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {showStatus
          ? (prompt.author?.display_name ?? 'Anonymous')
          : new Date(prompt.created_at).toLocaleDateString()
        }
      </td>
      <td className="px-4 py-3 text-right">
        {prompt.status === 'pending' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => approvePrompt(prompt.id)}
              className="flex items-center gap-1 text-xs font-medium text-green-400 hover:text-green-300 bg-green-900/30 hover:bg-green-900/50 px-2.5 py-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => rejectPrompt(prompt.id)}
              className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-900/50 px-2.5 py-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        ) : (
          <Link
            href={`/prompt/${prompt.id}`}
            className="text-xs text-gray-500 hover:text-brand-orange"
          >
            View
          </Link>
        )}
      </td>
    </tr>
  )
}
