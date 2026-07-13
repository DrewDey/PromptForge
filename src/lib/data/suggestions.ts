import type {
  SuggestionPublicStatus,
  SuggestionResponseVisibility,
  SuggestionWithRelations,
} from '../types'
import { mockSuggestions } from '../mock-data'
import {
  requireAdminAccess,
  SUPABASE_CONFIGURED,
  SUPABASE_READ_TIMEOUT_MS,
} from './shared'

export const SUGGESTION_PUBLIC_DELAY_HOURS = 24

function isPublicSuggestion(suggestion: SuggestionWithRelations, now = new Date()) {
  if (suggestion.moderation_status !== 'approved') return false
  if (suggestion.visibility === 'public') return true
  return Boolean(
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() <= now.getTime()
  )
}

function sortSuggestions<T extends SuggestionWithRelations>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime()
    const bTime = new Date(b.updated_at || b.created_at).getTime()
    return bTime - aTime
  })
}

function normalizeSuggestionRows(rows: SuggestionWithRelations[] | null | undefined) {
  return sortSuggestions((rows ?? []).map((row) => ({
    ...row,
    responses: [...(row.responses ?? [])].sort((a, b) => (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )),
  })))
}

function throwReadableSuggestionError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (error.message?.includes('Too many submissions')) {
    throw new Error('You have sent several suggestions recently. Wait a while before sending another.')
  }

  if (
    error.code === '42P01' || error.code === 'PGRST205'
  ) {
    throw new Error('Suggestion Box is not connected to the database yet.')
  }

  throw error
}

async function readSuggestionsWithFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
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

export async function getPublicSuggestions(): Promise<SuggestionWithRelations[]> {
  const fallback = normalizeSuggestionRows(mockSuggestions).filter((suggestion) => (
    isPublicSuggestion(suggestion)
  )).map((suggestion) => ({
    ...suggestion,
    responses: (suggestion.responses ?? []).filter((response) => response.visibility === 'public'),
  }))

  return readSuggestionsWithFallback(fallback, async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .eq('moderation_status', 'approved')
      .or(`visibility.eq.public,and(visibility.eq.scheduled_public,scheduled_publish_at.lte.${now})`)
      .order('updated_at', { ascending: false })

    return normalizeSuggestionRows(data as SuggestionWithRelations[]).map((suggestion) => ({
      ...suggestion,
      responses: (suggestion.responses ?? []).filter((response) => response.visibility === 'public'),
    }))
  })
}

export async function getMySuggestions(): Promise<SuggestionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  return readSuggestionsWithFallback([], async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })

    return normalizeSuggestionRows(data as SuggestionWithRelations[])
  })
}

export async function getAllSuggestionsForAdmin(): Promise<SuggestionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  return readSuggestionsWithFallback([], async () => {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return normalizeSuggestionRows(data as SuggestionWithRelations[])
  })
}

export async function getSuggestionStats() {
  if (!SUPABASE_CONFIGURED) {
    return { total: 0, pending: 0, approved: 0, private: 0, public: 0 }
  }

  const { supabase } = await requireAdminAccess()
  const now = new Date().toISOString()
  const [total, pending, approved, privateItems, publicItems] = await Promise.all([
    supabase.from('suggestions').select('*', { count: 'exact', head: true }),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('visibility', 'private'),
    supabase
      .from('suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'approved')
      .or(`visibility.eq.public,and(visibility.eq.scheduled_public,scheduled_publish_at.lte.${now})`),
  ])

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    private: privateItems.count ?? 0,
    public: publicItems.count ?? 0,
  }
}

export async function createSuggestion(input: { title: string; body: string }) {
  if (!SUPABASE_CONFIGURED) throw new Error('Suggestion submission requires sign in.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to send a suggestion.')

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 4) throw new Error('Add a clearer suggestion title.')
  if (title.length > 160) throw new Error('Keep the suggestion title under 160 characters.')
  if (body.length < 12) throw new Error('Add a little more detail so PathForge can respond.')
  if (body.length > 5000) throw new Error('Keep the suggestion under 5,000 characters.')

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      title,
      body,
      author_id: user.id,
    })
    .select('id')
    .single()

  throwReadableSuggestionError(error)
  if (!data) throw new Error('Suggestion could not be created.')
  return { id: data.id as string }
}

export async function approveSuggestionById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const { supabase } = await requireAdminAccess()
  const { error } = await supabase
    .rpc('pathforge_approve_suggestion', { target_suggestion_id: id })

  throwReadableSuggestionError(error)
}

export async function declineSuggestionById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const { supabase } = await requireAdminAccess()
  const { error } = await supabase
    .rpc('pathforge_decline_suggestion', { target_suggestion_id: id })

  throwReadableSuggestionError(error)
}

export async function keepSuggestionPrivateById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to update this suggestion.')

  const { error } = await supabase
    .rpc('pathforge_keep_suggestion_private', { target_suggestion_id: id })

  throwReadableSuggestionError(error)
}

export async function updateSuggestionPublicStatusById(id: string, status: SuggestionPublicStatus) {
  if (!SUPABASE_CONFIGURED) return

  const { supabase } = await requireAdminAccess()
  const { error } = await supabase
    .rpc('pathforge_set_suggestion_public_status', {
      target_suggestion_id: id,
      target_public_status: status,
    })

  throwReadableSuggestionError(error)
}

export async function createSuggestionResponse(input: {
  suggestionId: string
  body: string
  visibility: SuggestionResponseVisibility
}) {
  if (!SUPABASE_CONFIGURED) return

  const body = input.body.trim()
  if (!body) throw new Error('Write a response first.')
  if (body.length > 5000) throw new Error('Keep the response under 5,000 characters.')

  const { supabase, user } = await requireAdminAccess()

  const { error } = await supabase
    .from('suggestion_responses')
    .insert({
      suggestion_id: input.suggestionId,
      responder_id: user.id,
      body,
      visibility: input.visibility,
    })

  if (error) throw error
}

export async function getUserSuggestionVotes(suggestionIds: string[]): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED || suggestionIds.length === 0) return new Set()

  const uniqueIds = [...new Set(suggestionIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Set()

  return readSuggestionsWithFallback(new Set<string>(), async () => {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return new Set()

    const { data, error } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', user.id)
      .in('suggestion_id', uniqueIds)

    throwReadableSuggestionError(error)
    return new Set((data ?? []).map(v => v.suggestion_id).filter(Boolean))
  })
}

export async function toggleSuggestionVote(suggestionId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Log in to vote.')

  const { data: existing, error: existingError } = await supabase
    .from('suggestion_votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('suggestion_id', suggestionId)
    .maybeSingle()
  throwReadableSuggestionError(existingError)

  if (existing) {
    const { error } = await supabase.from('suggestion_votes').delete().eq('id', existing.id)
    throwReadableSuggestionError(error)
    const { data: updated, error: countError } = await supabase.from('suggestions').select('vote_count').eq('id', suggestionId).single()
    throwReadableSuggestionError(countError)
    return { voted: false, newCount: updated?.vote_count ?? 0 }
  }

  const { error } = await supabase.from('suggestion_votes').insert({ user_id: user.id, suggestion_id: suggestionId })
  throwReadableSuggestionError(error)
  const { data: updated, error: countError } = await supabase.from('suggestions').select('vote_count').eq('id', suggestionId).single()
  throwReadableSuggestionError(countError)
  return { voted: true, newCount: updated?.vote_count ?? 0 }
}
