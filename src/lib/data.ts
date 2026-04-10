import { Category, PromptWithRelations } from './types'
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
  if (options?.difficulty) query = query.eq('difficulty', options.difficulty)
  if (options?.search) query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`)
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
