import {
  BuildRequestWithRelations,
  Category,
  Profile,
  Prompt,
  PromptStep,
  SuggestionResponse,
  SuggestionWithRelations,
} from './types'
import { SNAKE_PROJECT_ID } from './featured-projects'
import { HP_10BII_SHOWCASE_PROJECT } from './prepared-showcase-projects'

export const mockProfiles: Profile[] = [
  {
    id: '22222222-2222-2222-2222-222222222211',
    username: 'pathforge_projects',
    display_name: 'PathForge Projects',
    avatar_url: null,
    bio: 'Approved PathForge seed projects with real prompts, captured responses, and playable artifacts.',
    role: 'user',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-05-24T16:15:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222212',
    username: HP_10BII_SHOWCASE_PROJECT.authorUsername,
    display_name: HP_10BII_SHOWCASE_PROJECT.authorDisplayName,
    avatar_url: null,
    bio: 'Finance and browser-tool builds submitted through PathForge source runs.',
    role: 'user',
    created_at: '2026-06-01T01:07:00Z',
    updated_at: HP_10BII_SHOWCASE_PROJECT.updatedAt,
  },
]

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Finance & Accounting', slug: 'finance', description: 'Budgeting, forecasting, analysis, and financial planning', icon: '💰', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-2', name: 'Marketing & Sales', slug: 'marketing', description: 'Campaigns, content strategy, lead generation, and outreach', icon: '📢', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-3', name: 'Writing & Content', slug: 'writing', description: 'Blog posts, emails, copy, and creative writing', icon: '✍️', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-4', name: 'Coding & Development', slug: 'coding', description: 'Code generation, debugging, architecture, and documentation', icon: '💻', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-5', name: 'Design & Creative', slug: 'design', description: 'UI/UX, branding, image generation, and visual design', icon: '🎨', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-6', name: 'Education & Learning', slug: 'education', description: 'Study plans, explanations, tutoring, and course creation', icon: '📚', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-7', name: 'Productivity', slug: 'productivity', description: 'Task management, meetings, workflows, and automation', icon: '⚡', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-8', name: 'Data & Analysis', slug: 'data', description: 'Data visualization, surveys, reporting, and insights', icon: '📊', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-9', name: 'Business Strategy', slug: 'strategy', description: 'SWOT analysis, business plans, market research, and OKRs', icon: '🎯', prompt_count: 0, created_at: '2026-03-01T00:00:00Z' },
  { id: 'cat-10', name: 'Personal & Fun', slug: 'personal', description: 'Games, experiments, creative demos, and playful AI builds', icon: '🎮', prompt_count: 1, created_at: '2026-03-01T00:00:00Z' },
]

export const mockSteps: PromptStep[] = [
  {
    id: 'step-snake-gpt55-pro-oneshot-1',
    prompt_id: SNAKE_PROJECT_ID,
    step_number: 1,
    title: 'One-sentence Snake game build',
    content: 'Make me a playable Snake game as a single self-contained HTML file.',
    result_content: 'ChatGPT returned a self-contained HTML file for a playable Snake game. The response artifact is mounted directly at the top of the demo page, with the exact response package collapsed below it for verification.',
    description: 'One plain prompt that generated the playable browser game',
    created_at: '2026-05-23T18:00:00Z',
  },
  ...HP_10BII_SHOWCASE_PROJECT.steps.map((step) => ({
    id: step.id,
    prompt_id: HP_10BII_SHOWCASE_PROJECT.id,
    step_number: step.stepNumber,
    title: step.title,
    content: step.content,
    result_content: step.resultContent,
    description: step.description,
    created_at: HP_10BII_SHOWCASE_PROJECT.createdAt,
  })),
]

export const mockPrompts: Prompt[] = [
  {
    id: SNAKE_PROJECT_ID,
    title: 'Playable Snake Game - GPT 5.5 Pro One-Shot',
    description: 'A first-taste demo path: one plain sentence produced a playable Snake game, with the final artifact embedded at the top and the captured response package below it.',
    content: 'This is the simplest approved PathForge seed: one normal user prompt, one captured model response, one playable result. It exists to show how a finished artifact, exact prompt, exact response package, attachments, and verification can live together on a project page.',
    result_content: 'A playable Snake game embedded directly on the page. The response package includes the one-sentence prompt, the generated HTML artifact, verification screenshots, and a collapsed exact-response drawer.',
    category_id: 'cat-10',
    difficulty: 'beginner',
    model_used: null,
    model_recommendation: 'Latest 5.5 / Extended Pro',
    tools_used: ['ChatGPT', 'GPT 5.5 Pro', 'HTML', 'Browser'],
    tags: ['snake', 'game', 'arcade', 'html', 'one-shot', 'playable artifact', 'personal fun', 'token maxing', 'AI paralysis'],
    status: 'approved',
    author_id: '22222222-2222-2222-2222-222222222211',
    vote_count: 0,
    bookmark_count: 0,
    created_at: '2026-05-23T18:00:00Z',
    updated_at: '2026-05-24T16:15:00Z',
  },
  {
    id: HP_10BII_SHOWCASE_PROJECT.id,
    title: HP_10BII_SHOWCASE_PROJECT.title,
    description: HP_10BII_SHOWCASE_PROJECT.description,
    content: HP_10BII_SHOWCASE_PROJECT.content,
    result_content: HP_10BII_SHOWCASE_PROJECT.resultContent,
    category_id: HP_10BII_SHOWCASE_PROJECT.mockCategoryId,
    difficulty: HP_10BII_SHOWCASE_PROJECT.difficulty,
    model_used: HP_10BII_SHOWCASE_PROJECT.modelUsed,
    model_recommendation: HP_10BII_SHOWCASE_PROJECT.modelRecommendation,
    tools_used: HP_10BII_SHOWCASE_PROJECT.toolsUsed,
    tags: HP_10BII_SHOWCASE_PROJECT.tags,
    status: 'approved',
    author_id: '22222222-2222-2222-2222-222222222212',
    vote_count: 0,
    bookmark_count: 0,
    created_at: HP_10BII_SHOWCASE_PROJECT.createdAt,
    updated_at: HP_10BII_SHOWCASE_PROJECT.updatedAt,
  },
]

export const mockSuggestions: SuggestionWithRelations[] = []

export const mockSuggestionResponses: SuggestionResponse[] = []

export const mockBuildRequests: BuildRequestWithRelations[] = []
