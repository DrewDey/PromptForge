import {
  HP_10BII_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
} from './featured-projects'
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

export const POMODORO_TIMER_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: POMODORO_TIMER_PROJECT_ID,
  sourceRunId: '6a1f9bc4-c390-832f-88a5-d978d2e42577',
  href: '/pomodoro-timer-demo',
  title: 'Pomodoro Focus Timer',
  description:
    'Four GPT 5.5 Instant prompts grew a single self-contained HTML file from a plain 25/5 countdown into a polished dark-theme focus timer with a progress ring, a Web Audio chime, custom session lengths, and a completed-sessions counter.',
  content:
    'A single ChatGPT conversation on GPT 5.5 Instant built a Pomodoro focus timer one prompt at a time, keeping everything in one self-contained HTML file the whole way. The first prompt produced a working 25-minute work / 5-minute break countdown with Start, Pause, and Reset. Each follow-up layered on a feature without breaking the file: custom work/break lengths plus a completed-sessions counter, then an SVG progress ring and a self-generated Web Audio chime, and finally a polished modern dark theme tuned to look and work great on mobile.',
  resultContent:
    'A polished dark-theme Pomodoro timer embedded directly on the page. The build path preserves all four exact prompts, the per-step build summaries, selectable progress through the chain, the final self-contained HTML collapsed below, the source-run link, and capture notes.',
  categorySlug: 'productivity',
  mockCategoryId: 'cat-7',
  difficulty: 'beginner',
  modelUsed: 'GPT 5.5 Instant',
  modelRecommendation: 'GPT 5.5 Instant',
  toolsUsed: ['ChatGPT'],
  tags: ['pomodoro', 'timer', 'focus', 'productivity', 'html', 'web audio', 'one-file', 'iterative build'],
  artifactPath: '/artifacts/pomodoro-focus-timer-gpt55-instant.html',
  sourceUrl: 'https://chatgpt.com/c/6a1f9bc4-c390-832f-88a5-d978d2e42577',
  authorDisplayName: 'Jordan Wells',
  authorUsername: 'JordanWells',
  createdAt: '2026-06-02T18:00:00.000Z',
  updatedAt: '2026-06-02T19:30:00.000Z',
  steps: [
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Build the base timer',
      content:
        'Build a Pomodoro focus timer as a single self-contained HTML file. It should run 25-minute work sessions and 5-minute breaks, with Start, Pause, and Reset buttons, a big readable countdown, and a clean minimal look. Put all the HTML, CSS, and JavaScript in one file I can save and open directly in a browser.',
      resultContent:
        'A single-file Pomodoro timer — light card UI, 25:00 countdown, Start/Pause/Reset, auto-switch between 25-min work and 5-min break, title-bar updates with remaining time.',
      description: 'First prompt that produced the working base 25/5 countdown.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Add custom lengths and a session counter',
      content:
        "Nice. Now add two things to the same single HTML file: a counter that tracks how many work sessions I've completed, and let me set my own work and break lengths in minutes with number inputs before I start. Keep everything in the one file.",
      resultContent:
        'Added Work/Break minute inputs (validated, disabled while running) and a "Work sessions completed" counter that increments each time a work block finishes.',
      description: 'Second prompt that added configurable session lengths and a completed-sessions counter.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-3`,
      stepNumber: 3,
      title: 'Add a progress ring and a chime',
      content:
        'Great. Two more upgrades to the same single file: draw a circular progress ring around the countdown that empties as the current session runs down, and play a soft chime when a work or break session ends. Keep it fully self-contained — no external files or libraries, so generate the chime with the Web Audio API.',
      resultContent:
        'Added an SVG progress ring (stroke-dashoffset driven by time left) and a self-contained Web Audio chime — a 3-note ascending arpeggio (C5/E5/G5 sine oscillators) generated on the fly, no audio files.',
      description: 'Third prompt that added the SVG progress ring and a self-generated Web Audio chime.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-4`,
      stepNumber: 4,
      title: 'Polish the dark theme and mobile layout',
      content:
        'Last step: give it a polished modern dark theme with nicer typography, smooth out the spacing, and make sure it looks and works great on mobile. Keep it the same single self-contained HTML file.',
      resultContent:
        'Polished dark theme (CSS variables, #0b1020 base with purple/cyan radial glows), Inter typography, glassmorphism card (backdrop-blur), a purple→cyan gradient progress ring, tabular-nums countdown, and a responsive @media(max-width:420px) layout. This is the final artifact.',
      description: 'Final prompt that produced the polished dark-theme, mobile-ready artifact mounted on this page.',
    },
  ],
}

export const PREPARED_SHOWCASE_PROJECTS = [
  HP_10BII_SHOWCASE_PROJECT,
  TIC_TAC_TOE_SHOWCASE_PROJECT,
  POMODORO_TIMER_SHOWCASE_PROJECT,
]

export function getPreparedShowcaseProjectBySourceRunId(sourceRunId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.sourceRunId === sourceRunId) ?? null
}

export function getPreparedShowcaseProjectById(projectId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.id === projectId) ?? null
}
