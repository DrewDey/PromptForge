import type { BuildRequestWithRelations } from '../types'
import { mockBuildRequests } from '../mock-data'
import { SUPABASE_CONFIGURED, SUPABASE_READ_TIMEOUT_MS } from './shared'

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

  if (
    error.code === '42P01' ||
    error.message?.includes('build_requests') ||
    error.message?.includes('build_request_responses') ||
    error.message?.includes('build_request_votes')
  ) {
    throw new Error('Build Requests are not connected to the database yet.')
  }

  throw error
}

async function readBuildRequestsWithFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
  if (!SUPABASE_CONFIGURED) return fallback

  try {
    return await Promise.race([
      read(),
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  }
}

export async function getPublicBuildRequests(): Promise<BuildRequestWithRelations[]> {
  return readBuildRequestsWithFallback(mockBuildRequests, async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('build_requests')
      .select('*, author:profiles(*), responses:build_request_responses(*)')
      .order('updated_at', { ascending: false })

    return normalizeBuildRequestRows(data as BuildRequestWithRelations[])
  })
}

export async function createBuildRequest(input: { title: string; body: string }) {
  if (!SUPABASE_CONFIGURED) throw new Error('Build Requests require sign in.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to request a build.')

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 4) throw new Error('Add a clearer request title.')
  if (body.length < 20) throw new Error('Add more detail so builders know what to make.')

  const { error } = await supabase
    .from('build_requests')
    .insert({
      title,
      body,
      author_id: user.id,
      status: 'open',
      vote_count: 0,
    })

  throwReadableBuildRequestError(error)
}

export async function createBuildRequestResponse(input: {
  requestId: string
  body: string
  url: string
}) {
  if (!SUPABASE_CONFIGURED) return

  const body = input.body.trim()
  const url = input.url.trim()
  if (!body && !url) throw new Error('Add a response or a link to a build.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to respond to a build request.')

  const { error } = await supabase
    .from('build_request_responses')
    .insert({
      request_id: input.requestId,
      responder_id: user.id,
      body: body || 'Shared a build link.',
      url: url || null,
    })

  throwReadableBuildRequestError(error)
}

export async function getUserBuildRequestVotes(requestIds: string[]): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED || requestIds.length === 0) return new Set()

  const uniqueIds = [...new Set(requestIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Set()

  return readBuildRequestsWithFallback(new Set<string>(), async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return new Set()

    const { data, error } = await supabase
      .from('build_request_votes')
      .select('request_id')
      .eq('user_id', user.id)
      .in('request_id', uniqueIds)

    throwReadableBuildRequestError(error)
    return new Set((data ?? []).map(v => v.request_id).filter(Boolean))
  })
}

export async function toggleBuildRequestVote(requestId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Log in to vote.')

  const { data: existing, error: existingError } = await supabase
    .from('build_request_votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('request_id', requestId)
    .maybeSingle()
  throwReadableBuildRequestError(existingError)

  if (existing) {
    const { error } = await supabase.from('build_request_votes').delete().eq('id', existing.id)
    throwReadableBuildRequestError(error)
    const { data: updated, error: countError } = await supabase.from('build_requests').select('vote_count').eq('id', requestId).single()
    throwReadableBuildRequestError(countError)
    return { voted: false, newCount: updated?.vote_count ?? 0 }
  }

  const { error } = await supabase.from('build_request_votes').insert({ user_id: user.id, request_id: requestId })
  throwReadableBuildRequestError(error)
  const { data: updated, error: countError } = await supabase.from('build_requests').select('vote_count').eq('id', requestId).single()
  throwReadableBuildRequestError(countError)
  return { voted: true, newCount: updated?.vote_count ?? 0 }
}
