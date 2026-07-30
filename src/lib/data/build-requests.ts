import type { BuildRequestWithRelations } from '../types'
import { getSiteUrl } from '../site-url'
import { SUPABASE_CONFIGURED, SUPABASE_READ_TIMEOUT_MS } from './shared'

export type PublicBuildRequestsReadResult =
  | {
      status: 'ready'
      requests: BuildRequestWithRelations[]
    }
  | {
      status: 'unavailable'
      requests: null
    }

const LEGACY_BUILD_REQUESTS_FROZEN_MESSAGE =
  'The legacy public Request board is read-only. Private managed-service intake is not accepting requests yet.'

function sortBuildRequests<T extends BuildRequestWithRelations>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime()
    const bTime = new Date(b.updated_at || b.created_at).getTime()
    return bTime - aTime
  })
}

function normalizeBuildRequestRows(rows: BuildRequestWithRelations[] | null | undefined) {
  return sortBuildRequests((rows ?? []).map((row) => ({
    ...row,
    responses: [...(row.responses ?? [])].sort((a, b) => (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )),
  })))
}

function throwReadableBuildRequestError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (error.message?.includes('Too many submissions')) {
    throw new Error('You have posted several requests recently. Wait a while before posting another.')
  }

  if (
    error.code === '42P01' || error.code === 'PGRST205'
  ) {
    throw new Error('Build Requests are not connected to the database yet.')
  }

  throw error
}

function normalizePathForgeBuildUrl(value: string) {
  const raw = value.trim()
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw, `${getSiteUrl()}/`)
  } catch {
    throw new Error('Paste a valid PathForge project URL.')
  }

  if (url.origin !== new URL(getSiteUrl()).origin) {
    throw new Error('Build responses can only link to a PathForge project or fork.')
  }
  if (!(/^\/prompt\/[A-Za-z0-9-]+$/.test(url.pathname) || /^\/[A-Za-z0-9-]+-demo$/.test(url.pathname))) {
    throw new Error('Link to a PathForge project or fork page, not a general website page.')
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export async function getPublicBuildRequests(): Promise<PublicBuildRequestsReadResult> {
  if (!SUPABASE_CONFIGURED) {
    return { status: 'unavailable', requests: null }
  }

  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const requests = await Promise.race([
      (async () => {
        const { createClient } = await import('../supabase/server')
        const supabase = await createClient()
        const { data, error } = await supabase
          .from('build_requests')
          .select('*, author:profiles(*), responses:build_request_responses!build_request_responses_request_id_fkey(*)')
          .order('updated_at', { ascending: false })
          .abortSignal(controller.signal)

        throwReadableBuildRequestError(error)
        if (!Array.isArray(data)) {
          throw new Error('The legacy Request board returned an invalid result.')
        }
        return normalizeBuildRequestRows(data as BuildRequestWithRelations[])
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(new Error('The legacy Request board read timed out.'))
        }, SUPABASE_READ_TIMEOUT_MS)
      }),
    ])

    return { status: 'ready', requests }
  } catch {
    return { status: 'unavailable', requests: null }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function createBuildRequest(input: { title: string; body: string }) {
  void input
  throw new Error(LEGACY_BUILD_REQUESTS_FROZEN_MESSAGE)
}

export async function createBuildRequestResponse(input: {
  requestId: string
  body: string
  url: string
}) {
  const body = input.body.trim()
  const url = normalizePathForgeBuildUrl(input.url)
  if (!body && !url) throw new Error('Add a response or a link to a build.')
  if (body.length > 5000) throw new Error('Keep the response under 5,000 characters.')

  throw new Error(LEGACY_BUILD_REQUESTS_FROZEN_MESSAGE)
}

export async function getUserBuildRequestVotes(requestIds: string[]): Promise<Set<string>> {
  void requestIds
  return new Set()
}

export async function toggleBuildRequestVote(requestId: string): Promise<{ voted: boolean; newCount: number }> {
  void requestId
  throw new Error(LEGACY_BUILD_REQUESTS_FROZEN_MESSAGE)
}
