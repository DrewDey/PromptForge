import { HP_10BII_PROJECT_ID, TIC_TAC_TOE_PROJECT_ID } from './featured-projects'
import type { Prompt } from './types'

export type PreparedShowcaseStep = {
  id: string
  stepNumber: number
  title: string
  content: string
  resultContent: string
  description: string
}

export type PreparedShowcaseProject = {
  id: string
  sourceRunId: string
  href: string
  title: string
  description: string
  content: string
  resultContent: string
  categorySlug: string
  mockCategoryId: string
  difficulty: Prompt['difficulty']
  modelUsed: string
  modelRecommendation: string
  toolsUsed: string[]
  tags: string[]
  artifactPath: string
  sourceUrl: string
  authorDisplayName: string
  authorUsername: string
  createdAt: string
  updatedAt: string
  steps: PreparedShowcaseStep[]
}

export const HP_10BII_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: HP_10BII_PROJECT_ID,
  sourceRunId: 'cb968686-6546-4218-93df-14c5113b1624',
  href: '/hp-10bii-calculator-demo',
  title: 'HP 10Bii+ Financial Calculator',
  description:
    'A Claude Opus run produced a self-contained HP 10Bii+ calculator, then a follow-up prompt corrected the visual palette to black, silver, and a green LCD.',
  content:
    'Taylor Grant used Claude to build a one-page HTML mock of an HP 10Bii+ financial calculator. The run produced a working financial calculator with TVM, cash flows, interest conversion, statistics, amortization, memory registers, keyboard input, and a visible readout panel. A short follow-up removed the original warm hue and finalized the calculator in a neutral black and silver hardware style.',
  resultContent:
    'A working HP 10Bii+ calculator embedded directly on the page. The public page preserves both prompts, both response packages, selectable artifact versions, collapsed HTML code, the source-run link, and verification notes.',
  categorySlug: 'finance',
  mockCategoryId: 'cat-1',
  difficulty: 'beginner',
  modelUsed: 'Claude Opus 4.8 Max',
  modelRecommendation: 'Claude Opus 4.8 Max',
  toolsUsed: ['Claude', 'HTML', 'Browser'],
  tags: ['finance', 'calculator', 'hp-10bii', 'html', 'cash flow', 'tvm', 'source-run'],
  artifactPath: '/artifacts/hp-10bii-financial-calculator-claude-opus-48.html',
  sourceUrl: 'https://claude.ai/share/35271fee-8723-4210-8923-16c909d9789c',
  authorDisplayName: 'Taylor Grant',
  authorUsername: 'TaylorGrant',
  createdAt: '2026-06-01T01:10:00.000Z',
  updatedAt: '2026-06-01T02:25:00.000Z',
  steps: [
    {
      id: `${HP_10BII_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Generate the calculator',
      content: 'Can you create a one page html mock fully functional HP 10Bii+ calculator from scratch?',
      resultContent:
        'Claude generated the first self-contained HTML calculator artifact with TVM, cash-flow, interest conversion, amortization, statistics, memory, math, and keyboard behavior.',
      description: 'Initial source-run prompt that produced the working calculator artifact.',
    },
    {
      id: `${HP_10BII_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Correct the hardware palette',
      content:
        'There is a red hue to it that is unwanted. It should be a standard black and white/silver color, with green-ish backround on the screen, with black writing.',
      resultContent:
        'Claude removed the plum/orange warm styling, kept the financial logic unchanged, and finalized the artifact with a graphite-and-silver body plus a green LCD with dark text.',
      description: 'Visual refinement prompt that produced the approved public artifact.',
    },
  ],
}

export const TIC_TAC_TOE_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: TIC_TAC_TOE_PROJECT_ID,
  sourceRunId: '08b06ee4-203b-40c8-a4da-aa299bc79d48',
  href: '/tic-tac-toe-demo',
  title: 'Playable Tic-Tac-Toe',
  description:
    'A basic Gemini Flash source run produced a self-contained browser Tic-Tac-Toe game with turn handling, win detection, draw detection, and a reset control.',
  content:
    'Alex Rivera used Gemini Flash for the simplest possible workflow proof: one plain prompt asking for a playable Tic-Tac-Toe game as a single HTML file. The run produced a working browser artifact without a follow-up prompt.',
  resultContent:
    'A playable Tic-Tac-Toe game embedded directly on the page. The response package includes the exact prompt, Gemini response intro, generated HTML artifact, source-run link, and verification notes.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'beginner',
  modelUsed: 'Gemini Flash',
  modelRecommendation: 'Gemini Flash',
  toolsUsed: ['Gemini', 'Chrome', 'HTML', 'Browser'],
  tags: ['tic-tac-toe', 'game', 'html', 'one-file', 'basic-build', 'playable artifact'],
  artifactPath: '/artifacts/tic-tac-toe-gemini-flash-basic.html',
  sourceUrl: 'https://gemini.google.com/app/07bc959af275ca09',
  authorDisplayName: 'Alex Rivera',
  authorUsername: 'AlexRivera',
  createdAt: '2026-05-30T21:32:29.000Z',
  updatedAt: '2026-06-01T03:20:00.000Z',
  steps: [
    {
      id: `${TIC_TAC_TOE_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Generate the game',
      content: 'Make me a playable Tic-Tac-Toe game as a single self-contained HTML file.',
      resultContent:
        'Gemini returned a complete self-contained Tic-Tac-Toe HTML artifact with styling, turn logic, win/draw detection, and reset behavior.',
      description: 'One plain Gemini prompt that generated the playable browser game.',
    },
  ],
}

export const PREPARED_SHOWCASE_PROJECTS = [HP_10BII_SHOWCASE_PROJECT, TIC_TAC_TOE_SHOWCASE_PROJECT]

export function getPreparedShowcaseProjectBySourceRunId(sourceRunId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.sourceRunId === sourceRunId) ?? null
}

export function getPreparedShowcaseProjectById(projectId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.id === projectId) ?? null
}
