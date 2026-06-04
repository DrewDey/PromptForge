import {
  HP_10BII_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
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
      resultContent: '',
      description: 'Initial source-run prompt that produced the working calculator artifact.',
    },
    {
      id: `${HP_10BII_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Correct the hardware palette',
      content:
        'There is a red hue to it that is unwanted. It should be a standard black and white/silver color, with green-ish backround on the screen, with black writing.',
      resultContent: '',
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
      resultContent: '',
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
    'A polished dark-theme Pomodoro timer embedded directly on the page. The build path preserves all four exact prompts, each step’s verbatim HTML response, a per-step artifact selector that mounts the selected step above, the source-run link, and capture notes.',
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
      resultContent: '',
      description: 'First prompt that produced the working base 25/5 countdown.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Add custom lengths and a session counter',
      content:
        "Nice. Now add two things to the same single HTML file: a counter that tracks how many work sessions I've completed, and let me set my own work and break lengths in minutes with number inputs before I start. Keep everything in the one file.",
      resultContent: '',
      description: 'Second prompt that added configurable session lengths and a completed-sessions counter.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-3`,
      stepNumber: 3,
      title: 'Add a progress ring and a chime',
      content:
        'Great. Two more upgrades to the same single file: draw a circular progress ring around the countdown that empties as the current session runs down, and play a soft chime when a work or break session ends. Keep it fully self-contained — no external files or libraries, so generate the chime with the Web Audio API.',
      resultContent: '',
      description: 'Third prompt that added the SVG progress ring and a self-generated Web Audio chime.',
    },
    {
      id: `${POMODORO_TIMER_PROJECT_ID}-step-4`,
      stepNumber: 4,
      title: 'Polish the dark theme and mobile layout',
      content:
        'Last step: give it a polished modern dark theme with nicer typography, smooth out the spacing, and make sure it looks and works great on mobile. Keep it the same single self-contained HTML file.',
      resultContent: '',
      description: 'Final prompt that produced the polished dark-theme, mobile-ready artifact mounted on this page.',
    },
  ],
}

export const WEEKEND_CHECKLIST_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: WEEKEND_CHECKLIST_PROJECT_ID,
  sourceRunId: 'f4f0e2df-58c9-4def-bb1c-7785a3989ec9',
  href: '/weekend-plan-checklist-demo',
  title: 'Weekend Plan Checklist',
  description:
    'Six ChatGPT prompts turned a messy weekend plan into a self-contained packing and errand checklist, including filters, timing groups, export/print support, and a final bug fix.',
  content:
    'Nora Brooks used ChatGPT to grow a practical weekend planning tool one prompt at a time. The run started with a one-file checklist generator, then tightened duplicate handling, split essentials from nice-to-haves, added focus filters, grouped tasks by timing, cleaned up row controls, and finished with a sixth prompt that fixed a real next-five summary bug.',
  resultContent:
    'A working weekend checklist generator embedded directly on the page. The source path preserves all six prompts, every captured artifact version, the broken step 5 state, and the final step 6 fix.',
  categorySlug: 'productivity',
  mockCategoryId: 'cat-7',
  difficulty: 'beginner',
  modelUsed: 'ChatGPT web, Instant mode visible',
  modelRecommendation: 'ChatGPT',
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['checklist', 'weekend planning', 'packing', 'errands', 'productivity', 'html', 'iterative build'],
  artifactPath: '/artifacts/weekend-plan-checklist-chatgpt-6prompt-fixed.html',
  sourceUrl: 'https://chatgpt.com/c/6a208694-1e78-8327-8ec7-3b231b18169d',
  authorDisplayName: 'Nora Brooks',
  authorUsername: 'NoraBrooks',
  createdAt: '2026-06-03T23:46:00.000Z',
  updatedAt: '2026-06-04T00:16:23.000Z',
  steps: [
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Build the base checklist',
      content:
        'Make me a polished one-file browser tool that turns a messy weekend plan into a clean packing and errand checklist.',
      resultContent: '',
      description:
        'Initial weekend checklist generator. It worked visually, but sample output duplicated related items and generated a very long checklist.',
    },
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Deduplicate and split priorities',
      content:
        'The generated checklist works, but it repeats things like gift/card and formal outfit and can balloon into 50+ items. Add smarter deduping and split the output into Essentials first and Nice-to-have, while keeping it one self-contained HTML file.',
      resultContent: '',
      description:
        'Added smarter deduping and Essentials/Nice-to-have sections. The split helped, but the list still needed focus controls.',
    },
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-3`,
      stepNumber: 3,
      title: 'Add filters and next-five focus',
      content:
        'This is cleaner, but the generated list is still long and there is no quick way to focus. Add simple filters for All, Essentials, Nice-to-have, and Done, plus a small “next 5 things to do” summary at the top of the checklist.',
      resultContent: '',
      description:
        'Added checklist filters and a next-five summary. The controls helped, but the list still needed timing context.',
    },
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-4`,
      stepNumber: 4,
      title: 'Group by when each item happens',
      content:
        'The filters help, but the list still feels like one giant pile. Add a time grouping so items can be marked as Before leaving, On the way, At arrival, or Sunday reset, and make the next-5 summary pull from the earliest unfinished group first.',
      resultContent: '',
      description:
        'Added timing groups and made the next-five summary prioritize the earliest unfinished group.',
    },
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-5`,
      stepNumber: 5,
      title: 'Clean up dense row controls',
      content:
        'This is useful now, but the timing dropdown on every row makes the checklist feel dense. Make the row controls cleaner, improve the mobile layout, and make export/print include the timing groups and next-5 summary clearly.',
      resultContent: '',
      description:
        'Attempted cleaner row controls and better export/print output, but verification found ReferenceError: nextFiveItems is not defined.',
    },
    {
      id: `${WEEKEND_CHECKLIST_PROJECT_ID}-step-6`,
      stepNumber: 6,
      title: 'Fix the next-five bug',
      content:
        'The cleaned-up version has a bug: clicking Generate checklist throws ReferenceError: nextFiveItems is not defined, so the list stays empty. Fix that bug, keep the cleaner row controls, and return the full corrected one-file HTML.',
      resultContent: '',
      description:
        'Final bug-fix prompt restored nextFiveItems and produced the verified public artifact.',
    },
  ],
}

export const NEON_BLOCK_PATROL_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: NEON_BLOCK_PATROL_PROJECT_ID,
  sourceRunId: '6b875335-7fab-42e9-8ca0-8ad1d9868ea8',
  href: '/neon-block-patrol-demo',
  title: 'Neon Block Patrol v3',
  description:
    'Five ChatGPT Heavy prompts produced a safe arcade FPS prototype, then recovered from a duplicate download and a stalled file-generation path by capturing the final v3 HTML inline.',
  content:
    'Avery Stone used ChatGPT Latest 5.5 Heavy to build a stylized open-city foam-tag patrol game. The run started with a playable first-person canvas prototype, then tried to improve target readability and hit feedback. When the downloaded update turned out to be identical, the follow-up prompts called that out, recovered from a stalled download path, and captured a final inline v3 artifact with clearer target and checkpoint cues.',
  resultContent:
    'A safe arcade-only first-person browser game embedded directly on the page. The public page preserves the duplicate step 2 artifact, the failed/stalled recovery turns, and the final v3 HTML response.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: 'Latest 5.5 / Heavy (ChatGPT UI)',
  modelRecommendation: 'GPT 5.5 Heavy',
  toolsUsed: ['ChatGPT', 'Chrome', 'HTML Canvas'],
  tags: ['game', 'fps', 'open-city', 'arcade', 'html', 'canvas', 'iterative build'],
  artifactPath: '/artifacts/gta-style-fps-step-5.html',
  sourceUrl: 'https://chatgpt.com/c/6a20895a-8c4c-832f-b364-fee5c8c89bff',
  authorDisplayName: 'Avery Stone',
  authorUsername: 'AveryStone',
  createdAt: '2026-06-03T20:12:00.000Z',
  updatedAt: '2026-06-04T01:05:49.000Z',
  steps: [
    {
      id: `${NEON_BLOCK_PATROL_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Generate the arcade FPS prototype',
      content:
        'Make me a single-file HTML browser prototype for a stylized GTA-inspired open-city FPS arcade game, with keyboard/mouse controls, a tiny mission loop, cartoon targets, and no gore or realistic crime instructions.',
      resultContent: '',
      description:
        'Initial Neon Block Patrol prototype with pointer-lock aiming, WASD movement, foam-tag targets, checkpoint loop, and safe arcade framing.',
    },
    {
      id: `${NEON_BLOCK_PATROL_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Ask for target readability and hit feedback',
      content:
        'The prototype renders and the safe neon-city tone works. The main problem is that the targets/checkpoint are hard to read in first person, and I can’t tell when a foam tag actually connects. Make the mascots/checkpoint more obvious and add clear hit feedback without changing the single-file setup.',
      resultContent: '',
      description:
        'ChatGPT claimed it improved readability, but the downloaded artifact was byte-identical to step 1.',
    },
    {
      id: `${NEON_BLOCK_PATROL_PROJECT_ID}-step-3`,
      stepNumber: 3,
      title: 'Call out the duplicate download',
      content:
        'I downloaded the updated HTML, but it appears to be identical to the first file. Please actually revise the single HTML file this time. Also fix the pre-start HUD so LEFT does not show 0 while the mission text says there are targets, and make the visibility improvements obvious right away.',
      resultContent: '',
      description:
        'ChatGPT acknowledged the duplicate download and described the fixes, but did not produce a revised artifact.',
    },
    {
      id: `${NEON_BLOCK_PATROL_PROJECT_ID}-step-4`,
      stepNumber: 4,
      title: 'Request a fresh v3 download',
      content:
        'Don’t worry about simulating or self-verifying it inside ChatGPT. Please generate a fresh downloadable single-file HTML version now, with a visible v3 badge on the start overlay, LEFT initialized correctly before start, and obvious target/checkpoint readability improvements in the opening view.',
      resultContent: '',
      description:
        'ChatGPT started a fresh-download attempt but stalled in Heavy thinking and was stopped.',
    },
    {
      id: `${NEON_BLOCK_PATROL_PROJECT_ID}-step-5`,
      stepNumber: 5,
      title: 'Capture the final HTML inline',
      content:
        'The download path is still getting stuck. Please stop using the file/download tool and paste the complete revised HTML directly in one code block. Keep it single-file, safe arcade only, include the v3 badge, initialize LEFT before start, make target/checkpoint cues visible immediately, and keep the controls playable.',
      resultContent: '',
      description:
        'Final complete v3 HTML was extracted from the inline response and saved as the public artifact.',
    },
  ],
}

export const SWISH_CITY_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: SWISH_CITY_PROJECT_ID,
  sourceRunId: 'f3918d0e-5261-4600-b1da-45199e38b224',
  href: '/swish-city-timing-hoops-demo',
  title: 'Swish City Timing Hoops',
  description:
    'A Claude Opus 4.8 Max run identified the remembered arcade reference as Megatouch Hoop Jones, then recovered from two failed generation attempts to produce a playable timing basketball game.',
  content:
    'Eli Harper used Claude Opus 4.8 Max to build a family-safe browser arcade basketball game inspired by the remembered Hoop Jones mechanics: four shooters, timing the ball across hands, distance progression, BRICK/AIRBALL/SWISH callouts, and a lightning backboard bonus. The first Max-thinking attempt over-planned and failed before code, the second recovery prompt returned no useful response, and the third prompt produced the final playable HTML.',
  resultContent:
    'A self-contained canvas basketball timing game embedded directly on the page. The source path preserves the failed first two turns and the final complete HTML artifact from Claude.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: 'Claude Opus 4.8 Max',
  modelRecommendation: 'Claude Opus 4.8 Max',
  toolsUsed: ['Claude', 'Chrome', 'HTML Canvas'],
  tags: ['game', 'basketball', 'arcade', 'timing', 'html', 'canvas', 'source-run'],
  artifactPath: '/artifacts/swish-city-claude-opus-4-8.html',
  sourceUrl: 'https://claude.ai/chat/63c97ec5-905b-4c88-8267-0d19b0e6e9bb',
  authorDisplayName: 'Eli Harper',
  authorUsername: 'EliHarper',
  createdAt: '2026-06-03T20:13:00.000Z',
  updatedAt: '2026-06-04T01:06:12.000Z',
  steps: [
    {
      id: `${SWISH_CITY_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Ask for the Hoop Jones-style arcade loop',
      content:
        'Make me a single-file browser arcade basketball game inspired by Megatouch Hoop Jones, without using its name, branding, or copyrighted art. Core loop: the ball moves back and forth across hands/players, the player clicks/taps at the right timing to shoot, the action moves left to right through multiple shooters, each round starts close to the hoop and then backs up farther, misses get arcade callouts like BRICK and AIRBALL, and three makes trigger a lightning/backboard bonus for extra points. Keep it family-safe, polished, and playable in one HTML file.',
      resultContent: '',
      description:
        'Claude started a long planning response and failed before producing an HTML artifact.',
    },
    {
      id: `${SWISH_CITY_PROJECT_ID}-step-2`,
      stepNumber: 2,
      title: 'Recover by asking for complete HTML',
      content:
        "Claude couldn't finish that response before producing the file. Please continue by outputting one complete, working single-file HTML game now. Keep the Hoop-Jones-inspired mechanics: four shooters across the bottom, ball timing across hands, click/tap to shoot, round-by-round distance increase, BRICK/AIRBALL/SWISH callouts, and a lightning backboard bonus after three makes. Please put the entire artifact in one html code block and skip further planning.",
      resultContent: '',
      description:
        'Claude returned no useful visible assistant response or code block for this recovery prompt.',
    },
    {
      id: `${SWISH_CITY_PROJECT_ID}-step-3`,
      stepNumber: 3,
      title: 'Force a compact HTML-only response',
      content:
        'Please output ONLY a complete single-file HTML document now, no explanation before or after. It must be playable: four red-jersey shooters across the bottom, a basketball timing sweep across their hands, click/tap/space to shoot, hoop/backboard at the top, rounds that move the shooters farther away, SWISH/BRICK/AIRBALL callouts, and a lightning backboard bonus after 3 makes. Use plain canvas/JS/CSS in one file.',
      resultContent: '',
      description:
        'Claude produced the final complete single-file canvas basketball game artifact.',
    },
  ],
}

export const PREPARED_SHOWCASE_PROJECTS = [
  HP_10BII_SHOWCASE_PROJECT,
  TIC_TAC_TOE_SHOWCASE_PROJECT,
  POMODORO_TIMER_SHOWCASE_PROJECT,
  WEEKEND_CHECKLIST_SHOWCASE_PROJECT,
  NEON_BLOCK_PATROL_SHOWCASE_PROJECT,
  SWISH_CITY_SHOWCASE_PROJECT,
]

export function getPreparedShowcaseProjectBySourceRunId(sourceRunId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.sourceRunId === sourceRunId) ?? null
}

export function getPreparedShowcaseProjectById(projectId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.id === projectId) ?? null
}
