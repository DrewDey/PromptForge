export type Category = {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  prompt_count?: number
  created_at: string
}

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export type Prompt = {
  id: string
  title: string
  description: string
  content: string
  result_content: string | null
  category_id: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  model_used: string | null
  model_recommendation: string | null
  tools_used: string[]
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  author_id: string
  vote_count: number
  bookmark_count: number
  created_at: string
  updated_at: string
}

export type PromptStep = {
  id: string
  prompt_id: string
  step_number: number
  title: string
  content: string
  result_content: string | null
  description: string | null
  created_at: string
}

export type ProjectImage = {
  id: string
  project_id: string
  step_id: string | null
  image_url: string
  caption: string | null
  display_order: number
  created_at: string
}

export type PromptWithRelations = Prompt & {
  category?: Category
  author?: Profile
  steps?: PromptStep[]
  images?: ProjectImage[]
}
