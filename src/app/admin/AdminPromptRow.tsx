'use client'

import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { PromptWithRelations } from '@/lib/types'
import { approvePrompt, rejectPrompt } from '@/lib/actions'

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

export default function AdminPromptRow({
  prompt,
  showStatus,
}: {
  prompt: PromptWithRelations
  showStatus?: boolean
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <Link href={`/prompt/${prompt.id}`} className="font-medium text-gray-900 hover:text-brand-orange">
          {prompt.title}
        </Link>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{prompt.description}</p>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {prompt.category?.icon} {prompt.category?.name ?? '—'}
      </td>
      {showStatus ? (
        <td className="px-4 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 ${statusColors[prompt.status]}`}>
            {prompt.status}
          </span>
        </td>
      ) : (
        <td className="px-4 py-3 text-gray-600">{prompt.difficulty}</td>
      )}
      <td className="px-4 py-3 text-gray-600">
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
              className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => rejectPrompt(prompt.id)}
              className="flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
