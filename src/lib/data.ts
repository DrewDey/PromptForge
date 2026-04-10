import { Category, Profile, PromptWithRelations } from './types'
import { mockCategories, mockPrompts, mockProfiles, mockSteps } from './mock-data'

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ---- Categories ----

export async function getCategories(): Promise<Category[]> {
  if (!SUPABASE_CONFIGURED) {
    return mockCategories
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  return data ?? []
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!SUPABASE_CONFIGURED) {
    return mockCategories.find(c => c.slug === slug) ?? null
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).single()
  return data
}

// ---- Prompts ----

function attachRelations(prompt: typeof mockPrompts[0]): PromptWithRelations {
  return {
    ...prompt,
    category: mockCategories.find(c => c.id === prompt.category_id),
    author: mockProfiles.find(p => p.id === prompt.author_id),
    steps: mockSteps.filter(s => s.prompt_id === prompt.id).sort((a, b) => a.step_number - b.step_number),
  }
}

export async function getPrompts(options?: {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}): Promise<PromptWithRelations[]> {
  if (!SUPABASE_CONFIGURED) {
    let prompts = [...mockPrompts]

    // Default to approved only
    const status = options?.status ?? 'approved'
    if (status !== 'all') {
      prompts = prompts.filter(p => p.status === status)
    }

    if (options?.categorySlug) {
      const cat = mockCategories.find(c => c.slug === options.categorySlug)
      if (cat) prompts = prompts.filter(p => p.category_id === cat.id)
    }
    if (options?.difficulty) {
      prompts = prompts.filter(p => p.difficulty === options.difficulty)
    }
    if (options?.search) {
      const q = options.search.toLowerCase()
      prompts = prompts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort
    if (options?.sort === 'popular') {
      prompts.sort((a, b) => b.vote_count - a.vote_count)
    } else {
      prompts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    if (options?.limit) prompts = prompts.slice(0, options.limit)

    return prompts.map(attachRelations)
  }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  let query = supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')

  const status = options?.status ?? 'approved'
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // Category filtering — look up category ID from slug
  if (options?.categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (options?.difficulty) query = query.eq('difficulty', options.difficulty)

  // Search title, description, and tags
  if (options?.search) {
    const s = options.search
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,tags.cs.{${s}}`)
  }

  if (options?.sort === 'popular') {
    query = query.order('vote_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return data ?? []
}

export async function getPromptById(id: string): Promise<PromptWithRelations | null> {
  if (!SUPABASE_CONFIGURED) {
    const prompt = mockPrompts.find(p => p.id === id)
    if (!prompt) return null
    return attachRelations(prompt)
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
    .eq('id', id)
    .single()
  return data
}

// ---- Profiles ----

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  if (!SUPABASE_CONFIGURED) {
    return mockProfiles.find(p => p.username === username) ?? null
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()
  return data
}

export async function getProjectsByAuthor(authorId: string): Promise<PromptWithRelations[]> {
  if (!SUPABASE_CONFIGURED) {
    return mockPrompts
      .filter(p => p.author_id === authorId && p.status === 'approved')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(attachRelations)
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data } = await supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
    .eq('author_id', authorId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getAuthorStats(authorId: string) {
  if (!SUPABASE_CONFIGURED) {
    const authorPrompts = mockPrompts.filter(p => p.author_id === authorId && p.status === 'approved')
    return {
      totalProjects: authorPrompts.length,
      totalUpvotes: authorPrompts.reduce((sum, p) => sum + p.vote_count, 0),
      totalBookmarks: authorPrompts.reduce((sum, p) => sum + p.bookmark_count, 0),
      topCategory: getTopCategory(authorPrompts),
      memberSince: mockProfiles.find(p => p.id === authorId)?.created_at ?? '',
    }
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: prompts } = await supabase
    .from('prompts')
    .select('vote_count, bookmark_count, category_id, categories(name, icon)')
    .eq('author_id', authorId)
    .eq('status', 'approved')

  const items = prompts ?? []
  return {
    totalProjects: items.length,
    totalUpvotes: items.reduce((sum: number, p: { vote_count: number }) => sum + p.vote_count, 0),
    totalBookmarks: items.reduce((sum: number, p: { bookmark_count: number }) => sum + p.bookmark_count, 0),
    topCategory: getTopCategoryFromDb(items),
    memberSince: '',
  }
}

function getTopCategory(prompts: typeof mockPrompts) {
  const counts: Record<string, number> = {}
  for (const p of prompts) {
    counts[p.category_id] = (counts[p.category_id] || 0) + 1
  }
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!topId) return null
  const cat = mockCategories.find(c => c.id === topId)
  return cat ? { name: cat.name, icon: cat.icon } : null
}

function getTopCategoryFromDb(prompts: { category_id: string; categories: unknown }[]) {
  const counts: Record<string, { count: number; name: string; icon: string }> = {}
  for (const p of prompts) {
    const cat = p.categories as { name: string; icon: string } | null
    if (!cat) continue
    if (!counts[p.category_id]) counts[p.category_id] = { count: 0, name: cat.name, icon: cat.icon }
    counts[p.category_id].count++
  }
  const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
  return top ? { name: top.name, icon: top.icon } : null
}

// ---- Votes & Bookmarks ----

export async function toggleVote(promptId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  // Check if already voted
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .single()

  if (existing) {
    // Remove vote
    await supabase.from('votes').delete().eq('id', existing.id)
    await supabase.from('prompts').update({
      vote_count: Math.max(0, (await supabase.from('prompts').select('vote_count').eq('id', promptId).single()).data?.vote_count - 1 || 0)
    }).eq('id', promptId)
    const { data: updated } = await supabase.from('prompts').select('vote_count').eq('id', promptId).single()
    return { voted: false, newCount: updated?.vote_count ?? 0 }
  } else {
    // Add vote
    await supabase.from('votes').insert({ user_id: user.id, prompt_id: promptId })
    await supabase.from('prompts').update({
      vote_count: ((await supabase.from('prompts').select('vote_count').eq('id', promptId).single()).data?.vote_count || 0) + 1
    }).eq('id', promptId)
    const { data: updated } = await supabase.from('prompts').select('vote_count').eq('id', promptId).single()
    return { voted: true, newCount: updated?.vote_count ?? 0 }
  }
}

export async function toggleBookmark(promptId: string): Promise<{ bookmarked: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { bookmarked: false, newCount: 0 }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .single()

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id)
    await supabase.from('prompts').update({
      bookmark_count: Math.max(0, (await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()).data?.bookmark_count - 1 || 0)
    }).eq('id', promptId)
    const { data: updated } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    return { bookmarked: false, newCount: updated?.bookmark_count ?? 0 }
  } else {
    await supabase.from('bookmarks').insert({ user_id: user.id, prompt_id: promptId })
    await supabase.from('prompts').update({
      bookmark_count: ((await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()).data?.bookmark_count || 0) + 1
    }).eq('id', promptId)
    const { data: updated } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    return { bookmarked: true, newCount: updated?.bookmark_count ?? 0 }
  }
}

export async function getUserVotesAndBookmarks(promptIds: string[]): Promise<{ votes: Set<string>; bookmarks: Set<string> }> {
  if (!SUPABASE_CONFIGURED) return { votes: new Set(), bookmarks: new Set() }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { votes: new Set(), bookmarks: new Set() }

  const [votesRes, bookmarksRes] = await Promise.all([
    supabase.from('votes').select('prompt_id').eq('user_id', user.id).in('prompt_id', promptIds),
    supabase.from('bookmarks').select('prompt_id').eq('user_id', user.id).in('prompt_id', promptIds),
  ])

  return {
    votes: new Set((votesRes.data ?? []).map(v => v.prompt_id)),
    bookmarks: new Set((bookmarksRes.data ?? []).map(b => b.prompt_id)),
  }
}

// ---- Admin ----

export async function getPromptStats() {
  if (!SUPABASE_CONFIGURED) {
    return {
      total: mockPrompts.length,
      pending: mockPrompts.filter(p => p.status === 'pending').length,
      approved: mockPrompts.filter(p => p.status === 'approved').length,
      rejected: mockPrompts.filter(p => p.status === 'rejected').length,
      categories: mockCategories.length,
    }
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const [total, pending, approved, rejected, categories] = await Promise.all([
    supabase.from('prompts').select('*', { count: 'exact', head: true }),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])
  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    categories: categories.count ?? 0,
  }
}

export async function createProject(project: {
  title: string
  description: string
  content: string
  result_content: string | null
  category_slug: string
  difficulty: string
  model_used: string | null
  model_recommendation: string | null
  tools_used: string[]
  tags: string[]
  steps: { title: string; content: string; result_content: string | null; description: string | null }[]
}) {
  if (!SUPABASE_CONFIGURED) return { id: 'mock-id' }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to submit a project')

  // Look up category ID from slug
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', project.category_slug)
    .single()
  if (!cat) throw new Error('Invalid category')

  // Insert the project
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .insert({
      title: project.title,
      description: project.description,
      content: project.content,
      result_content: project.result_content || null,
      category_id: cat.id,
      difficulty: project.difficulty,
      model_used: project.model_used || null,
      model_recommendation: project.model_recommendation || null,
      tools_used: project.tools_used,
      tags: project.tags,
      status: 'pending',
      author_id: user.id,
    })
    .select('id')
    .single()

  if (promptError) throw promptError

  // Insert steps if any
  if (project.steps.length > 0) {
    const stepsToInsert = project.steps.map((step, idx) => ({
      prompt_id: prompt.id,
      step_number: idx + 1,
      title: step.title,
      content: step.content,
      result_content: step.result_content || null,
      description: step.description || null,
    }))

    const { error: stepsError } = await supabase
      .from('prompt_steps')
      .insert(stepsToInsert)

    if (stepsError) throw stepsError
  }

  return { id: prompt.id }
}

export async function updatePromptStatus(id: string, status: 'approved' | 'rejected') {
  if (!SUPABASE_CONFIGURED) {
    const prompt = mockPrompts.find(p => p.id === id)
    if (prompt) prompt.status = status
    return
  }
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { error } = await supabase.from('prompts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
