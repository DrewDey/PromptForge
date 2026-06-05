import {
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
} from './featured-projects'
import { PENDING_SOURCE_RUN_SHOWCASE_PROJECTS } from './pending-source-run-showcases'
export * from './pending-source-run-showcases'
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
  promptFamilyId?: string
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

type PreparedStepInput = {
  title: string
  content: string
  description: string
}

function buildPreparedSteps(projectId: string, steps: PreparedStepInput[]): PreparedShowcaseStep[] {
  return steps.map((step, index) => ({
    id: `${projectId}-step-${index + 1}`,
    stepNumber: index + 1,
    title: step.title,
    content: step.content,
    resultContent: '',
    description: step.description,
  }))
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

export const MEETING_COST_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: MEETING_COST_PROJECT_ID,
  sourceRunId: '59d48a98-1b9e-4cc0-9522-2f9437680464',
  href: '/meeting-cost-calculator-demo',
  title: 'Meeting Cost Calculator',
  description:
    'A one-prompt ChatGPT run produced a polished browser calculator that makes the cost of meetings and wasted time visible.',
  content:
    'Drew submitted a ChatGPT source run that asked for a polished one-file meeting cost calculator. The result is a self-contained browser artifact with live cost math, wasted-time visuals, and a simple summary export flow.',
  resultContent:
    'A working meeting cost calculator embedded directly on the page. The source path preserves the exact prompt, visible ChatGPT response text, generated HTML artifact, source-run link, and verification notes.',
  categorySlug: 'productivity',
  mockCategoryId: 'cat-7',
  difficulty: 'beginner',
  modelUsed: 'ChatGPT web',
  modelRecommendation: 'ChatGPT',
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['meeting cost', 'calculator', 'productivity', 'html', 'one-file', 'export', 'source-run'],
  artifactPath: '/artifacts/meeting-cost-calculator-chatgpt.html',
  sourceUrl: 'https://chatgpt.com/c/6a207d18-6938-8327-a6b5-b101bab25857',
  authorDisplayName: 'Drew',
  authorUsername: 'Drew',
  createdAt: '2026-06-03T23:17:21.000Z',
  updatedAt: '2026-06-04T02:00:00.000Z',
  steps: [
    {
      id: `${MEETING_COST_PROJECT_ID}-step-1`,
      stepNumber: 1,
      title: 'Generate the calculator',
      content:
        'Make me a polished one-file meeting cost calculator that works in the browser, makes wasted time obvious, and can export a simple summary.',
      resultContent: '',
      description:
        'One ChatGPT prompt that produced the final self-contained meeting cost calculator artifact.',
    },
  ],
}

export const WORD_LADDER_SPRINT_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: WORD_LADDER_SPRINT_PROJECT_ID,
  sourceRunId: '530fdb44-b014-4444-8b1b-545e95b74d5c',
  href: '/word-ladder-sprint-demo',
  title: 'Word Ladder Sprint',
  description:
    'Seven ChatGPT prompts grew a browser word-ladder game from a timed valid-move sprint into a mobile-friendly replay loop with hints, streaks, and thumb-sized keypad controls.',
  content:
    'Jordan Lee used ChatGPT to build a word-ladder sprint game one response package at a time. The run starts with a working timed ladder, adds fair hints and streak scoring, then iterates on mobile input until the final complete HTML file fixes the phone keypad tap targets.',
  resultContent:
    'A playable Word Ladder Sprint artifact embedded directly on the page. The source path preserves all seven prompts, the transcript-only sixth response, every mountable artifact version, and the final mobile-keypad fix.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'beginner',
  modelUsed: 'Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes',
  modelRecommendation: 'ChatGPT',
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['word ladder', 'game', 'mobile', 'html', 'hints', 'streaks', 'source-run'],
  artifactPath: '/artifacts/word-ladder-sprint-chatgpt.html',
  sourceUrl: 'https://chatgpt.com/c/6a22246c-9d48-83ea-a9a8-62a368b05621',
  authorDisplayName: 'Jordan Lee',
  authorUsername: 'JordanLee',
  createdAt: '2026-06-05T01:19:00.000Z',
  updatedAt: '2026-06-05T01:52:35.000Z',
  steps: buildPreparedSteps(WORD_LADDER_SPRINT_PROJECT_ID, [
    {
      title: 'Build the timed ladder',
      content:
        'Can you make a little browser Word Ladder Sprint game where I race from one word to another by changing one letter at a time, and it catches invalid moves while timing the run?',
      description: 'Initial playable word ladder sprint with timer, validation, random puzzles, path chips, undo/reset, and per-puzzle best time.',
    },
    {
      title: 'Add fair hints',
      content:
        'This works, but I forgot the main thing that keeps a word ladder from feeling stuck: add a Hint button that suggests one valid next word, and make the built-in word list/puzzles sturdy enough that each sprint has a fair path. Keep it as one HTML file.',
      description: 'Added a Hint button, shortest-path hints, a sturdier fair-path puzzle list, hint counter, and solvability checks.',
    },
    {
      title: 'Add replay scoring',
      content:
        'Nice, the hints make it feel fair now. Add the replay score layer I should have asked for: a streak for finishing sprints without hints, a best-streak record, and a compact finish summary with time, moves, hints, and whether the streak survived.',
      description: 'Added streak and best-streak scoring for no-hint finishes plus a compact finish summary.',
    },
    {
      title: 'Redesign mobile input',
      content:
        'On a phone, the plain text box is still a little fiddly. Redesign the input so it feels mobile-friendly: big four-letter slots, auto-uppercase typing, clear backspace behavior, and large tap targets, while keeping normal desktop typing fast.',
      description: 'Reworked input into large letter slots with hidden desktop typing support and a mobile keypad.',
    },
    {
      title: 'Fix narrow keypad keys',
      content:
        'I checked the phone-sized layout and the letter keypad is technically visible, but each letter key is too narrow to tap comfortably. Rework the mobile keyboard into real thumb-sized rows with no horizontal overflow, and keep the slots/play/backspace controls easy to reach.',
      description: 'Tried to fix mobile tap targets with a revised keypad layout, but verification still measured narrow letter keys at 390px.',
    },
    {
      title: 'Request thumb-sized rows',
      content:
        'The phone check still shows the alphabet keys at about 26px wide on a 390px viewport, so it is not fixed yet. Make the mobile keypad use no more than six letter columns per row with thumb-sized keys around 44px or wider, wrapping the alphabet across more rows if needed; keep Backspace and Play as large half-width buttons.',
      description: 'Transcript-only response: ChatGPT provided replacement CSS/JS snippets instead of a complete mountable HTML file.',
    },
    {
      title: 'Return the full fixed file',
      content:
        'That gives me the right replacement pieces, but I need to save and test it directly. Please output the full updated single HTML file with the thumb-sized mobile keypad fix applied, not just the CSS/JS snippets.',
      description: 'Returned the complete final single-file HTML with the thumb-sized mobile keypad fix applied.',
    },
  ]),
}

export const PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: PUZZLE_BOX_ESCAPE_PROJECT_ID,
  sourceRunId: '047c9c81-092e-42db-b505-8ebdbd0be95d',
  href: '/puzzle-box-escape-demo',
  title: 'Puzzle Box Escape',
  description:
    'Five Claude Sonnet 4.6 Max prompts built a tiny puzzle-box escape game, then tightened hint/reset behavior and the final lock message until the clue path felt fair.',
  content:
    'Mira Vale used Claude to build a compact three-room puzzle-box escape game as a single HTML artifact. The run preserves each refinement: visible hints, reset behavior, spoiler-free clue progress, overlay cleanup, and a final honest lock-state message.',
  resultContent:
    'A playable puzzle-box escape artifact embedded directly on the page. The source path preserves every prompt, every response package, every artifact version, and the final verified lock/win flow.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'beginner',
  modelUsed: 'Sonnet 4.6 Max',
  modelRecommendation: 'Claude Sonnet 4.6 Max',
  toolsUsed: ['Claude', 'HTML', 'Browser'],
  tags: ['puzzle', 'escape game', 'html', 'claude', 'source-run', 'mobile'],
  artifactPath: '/artifacts/puzzle-box-escape-claude-sonnet-46-max-step-5.html',
  sourceUrl: 'https://claude.ai/chat/04c00f14-d56c-49bb-89f8-de1f59ba0949',
  authorDisplayName: 'Mira Vale',
  authorUsername: 'MiraVale',
  createdAt: '2026-06-05T00:18:00.000Z',
  updatedAt: '2026-06-05T00:40:37.000Z',
  steps: buildPreparedSteps(PUZZLE_BOX_ESCAPE_PROJECT_ID, [
    {
      title: 'Build the puzzle box',
      content:
        'I want a tiny puzzle-box escape game I can open as one HTML file: three compact rooms, clickable objects, clue-driven inventory, and a final lock that feels fair instead of random.',
      description: 'Artifact v1 saved from Claude code view with a playable three-room puzzle and final lock shell.',
    },
    {
      title: 'Expose hint and reset',
      content:
        'This first version is playable, but the help/reset pieces are too hidden while you are still inside the puzzle. Add a small Hint button with staged nudges, a Reset button that restarts without reloading the page, and keep the room/object controls comfortable for phone taps.',
      description: 'Added visible Hint and Reset controls, but reset while the hint overlay was open left stale hint UI visible.',
    },
    {
      title: 'Clear stale hint state',
      content:
        'The visible Hint and Reset controls help, but reset leaves the hint panel open, so it feels like stale state after restarting. Make reset fully clear/close the hint overlay, and add a compact three-part clue progress strip so players can tell which room clue sources they have found without revealing the answer.',
      description: 'Added the progress strip, but the reset-from-hint overlay bug still reproduced.',
    },
    {
      title: 'Fix reset from inside hint',
      content:
        'The reset bug is still there: after opening Hint, pressing Reset leaves the hint overlay visible. Make reset close every overlay reliably, and add a Reset button inside the hint overlay too so the player can restart without first closing the hint panel. Keep the clue-progress strip spoiler-free and add one short line that explains it.',
      description: 'Reset inside the hint panel closed overlays reliably and the full puzzle solved to the win state.',
    },
    {
      title: 'Make lock messaging honest',
      content:
        'The puzzle path and win state work now. One final polish issue: the lock overlay says "You have gathered what you need" even if someone opens the front door early. Make that line reflect the clue-progress state honestly - nudge the player toward remaining rooms when clues are missing, and only say they are ready once all three clue sources are found. Keep the same solution and win flow.',
      description: 'Final artifact verified early-door messaging, reset-from-hint flow, clue path, final combination, and win screen.',
    },
  ]),
}

export const POCKET_RALLY_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: POCKET_RALLY_PROJECT_ID,
  sourceRunId: 'cfebb4c8-f4aa-4825-a282-eeb9dfc663de',
  href: '/pocket-rally-time-trial-demo',
  title: 'Pocket Rally Time Trial',
  description:
    'Five ChatGPT prompts turned a simple top-down checkpoint racer into a named two-lap rally time trial with mobile controls, minimap, stored best run, and ghost-trail replay hooks.',
  content:
    'Marco Vega used ChatGPT to iterate a single-file rally game from a basic checkpoint sprint into Pocket Rally Time Trial. Each response package shows the game becoming more replayable: clearer track shape, splits, lap structure, ghost trail, and intentional phone controls.',
  resultContent:
    'A playable Pocket Rally Time Trial artifact embedded directly on the page. The source path preserves all five prompt/response packages and every mountable artifact version, with the final mobile-focused version loaded first.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: 'Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes',
  modelRecommendation: 'ChatGPT',
  toolsUsed: ['ChatGPT', 'HTML Canvas', 'Browser'],
  tags: ['racing', 'game', 'mobile', 'html', 'canvas', 'time trial', 'source-run'],
  artifactPath: '/artifacts/pocket-rally-chatgpt.html',
  sourceUrl: 'https://chatgpt.com/c/6a2215f1-71b0-83ea-8a3a-90b16ca53f77',
  authorDisplayName: 'Marco Vega',
  authorUsername: 'MarcoVega',
  createdAt: '2026-06-05T00:17:37.000Z',
  updatedAt: '2026-06-05T00:38:32.000Z',
  steps: buildPreparedSteps(POCKET_RALLY_PROJECT_ID, [
    {
      title: 'Build the rally sprint',
      content:
        'I want a tiny top-down rally time trial I can play in the browser: one HTML file, keyboard driving, phone-friendly touch controls, checkpoints, lap timer, best time, and a little reason to retry.',
      description: 'Initial playable rally sprint with keyboard input, timer, and early checkpoint loop.',
    },
    {
      title: 'Clarify course guidance',
      content:
        'The first version runs, but the course feels a little empty and I lose the racing line after the start. Add a clearer track shape, a next-checkpoint arrow, split feedback, and medal targets so replaying for a better time has more pull. Keep it one HTML file.',
      description: 'Added racing line, checkpoint arrow, split feedback, and medal targets.',
    },
    {
      title: 'Turn it into laps',
      content:
        'This is closer, but it still feels more like a checkpoint sprint than a lap trial. Turn it into a compact loop with a start/finish gate, visible lap count, two-lap mode, and light off-road slowdown so cleaner driving matters. Keep the full updated code in one file.',
      description: 'Added true two-lap loop, start/finish gate, lap count, and off-road slowdown.',
    },
    {
      title: 'Add identity and ghost hooks',
      content:
        'The lap structure is good now, but the replay hook still mostly comes from medals. Add a simple stored best-run ghost/trail, a clearer finish summary showing medal and delta, and rename the game Pocket Rally Time Trial so it has a stronger identity. Keep everything self-contained.',
      description: 'Added Pocket Rally identity, stored best-run ghost/trail, and medal/delta finish summary hooks.',
    },
    {
      title: 'Polish phone controls',
      content:
        "The game looks good on desktop, but I want the phone version to feel intentional instead of just having four generic buttons. Improve the mobile touch controls with a compact steering wheel/pedal layout, add a mini-map/checkpoint progress strip, and make sure the HUD doesn't crowd the canvas on small screens.",
      description: 'Final version with mobile wheel/pedal controls, minimap, progress strip, best/ghost trail, and two-lap timing.',
    },
  ]),
}

export const TRIP_PACKING_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: TRIP_PACKING_PROJECT_ID,
  sourceRunId: '4777cdee-dd14-4102-9e36-94cc9e9b9be9',
  href: '/trip-packing-planner-demo',
  title: 'Trip Packing Planner',
  description:
    'Five Gemini Pro prompts built a practical trip packing checklist generator with saved state, print/export output, style tags, packed filters, and custom-item preservation.',
  content:
    'Miles Turner used Gemini Pro to grow a travel checklist generator from a plain trip form into a usable saved packing planner. The run captures how small follow-up prompts added local storage, export/print, style and destination awareness, and long-list cleanup controls.',
  resultContent:
    'A working Trip Packing Planner embedded directly on the page. The source path preserves every prompt, every verbatim response package, and the final cleanup pass as the default artifact.',
  categorySlug: 'productivity',
  mockCategoryId: 'cat-7',
  difficulty: 'beginner',
  modelUsed: 'Gemini 3.1 Pro',
  modelRecommendation: 'Gemini 3.1 Pro',
  toolsUsed: ['Gemini', 'HTML', 'Browser'],
  tags: ['packing', 'travel', 'checklist', 'productivity', 'html', 'localStorage', 'source-run'],
  artifactPath: '/artifacts/trip-packing-gemini-pro.html',
  sourceUrl: 'https://gemini.google.com/app/2e4c80c922ea4b5d',
  authorDisplayName: 'Miles Turner',
  authorUsername: 'MilesTurner',
  createdAt: '2026-06-05T00:02:00.000Z',
  updatedAt: '2026-06-05T00:24:33.000Z',
  steps: buildPreparedSteps(TRIP_PACKING_PROJECT_ID, [
    {
      title: 'Build the packing generator',
      content:
        'I need a packing checklist generator I can actually use before a trip: make it as a single HTML file where I enter trip length, destination notes, weather/style tags, and activities, and it creates a categorized list I can check off.',
      description: 'Initial generated packing checklist artifact captured from Gemini.',
    },
    {
      title: 'Persist trips and checked items',
      content:
        'This is a good start, but I need it to remember the trip and checked items after I close the browser. Add localStorage, plus quick add/remove item controls in each category while keeping it as one HTML file.',
      description: 'Added localStorage plus quick add/remove item controls.',
    },
    {
      title: 'Add print and export',
      content:
        'The saved checklist is useful now, but it still needs better travel-day output. Add a print-friendly stylesheet, a button to copy/export the current checklist as plain text, and a compact packed-vs-total progress summary.',
      description: 'Added print styling, plain-text export, and packed-vs-total progress summary.',
    },
    {
      title: 'Add style and destination signals',
      content:
        'I realized the inputs still treat style as just weather/activity. Add a small set of style or vibe tags like casual, dressy, minimalist, outdoorsy, and make the destination notes influence suggestions for things like beach, city, flight, or international trips. Keep the mobile layout clean.',
      description: 'Added style/vibe tags and destination-note influence for travel suggestions.',
    },
    {
      title: 'Add long-list cleanup',
      content:
        'This is close, but for a longer checklist I need easier cleanup. Add an All / Unpacked / Packed filter, a Clear Packed button, and make sure custom added items do not vanish when I regenerate the list unless I explicitly clear the saved checklist.',
      description: 'Final/default artifact after filters, Clear Packed, and custom-item preservation.',
    },
  ]),
}

export const FLASHCARD_CRAM_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: FLASHCARD_CRAM_PROJECT_ID,
  sourceRunId: '3dbee174-f631-458c-bd01-2560ea3fac3f',
  href: '/flashcard-cram-drill-demo',
  title: 'Flashcard Cram Drill',
  description:
    'Two Gemini Pro prompts produced a student flashcard cram tool, then fixed the missing edit controls so created cards can be updated instead of only deleted.',
  content:
    'Sofia Patel used Gemini Pro to build a single-file flashcard cram drill with notes-to-cards, quiz marking, local deck storage, and JSON import/export. The second prompt is preserved because it fixed a real verification defect: existing cards needed visible Edit, Save, and Cancel controls.',
  resultContent:
    'A working Flashcard Cram Drill embedded directly on the page. The source path preserves both prompt/response packages, the observed V1 defect, and the fixed default artifact.',
  categorySlug: 'education',
  mockCategoryId: 'cat-6',
  difficulty: 'beginner',
  modelUsed: 'Gemini 3.1 Pro',
  modelRecommendation: 'Gemini 3.1 Pro',
  toolsUsed: ['Gemini', 'HTML', 'Browser'],
  tags: ['flashcards', 'study', 'education', 'html', 'localStorage', 'source-run'],
  artifactPath: '/artifacts/flashcard-cram-gemini-31-pro.html',
  sourceUrl: 'https://gemini.google.com/app/22eaad7a9a49ec21',
  authorDisplayName: 'Sofia Patel',
  authorUsername: 'SofiaPatel',
  createdAt: '2026-06-04T22:49:00.000Z',
  updatedAt: '2026-06-04T22:57:59.000Z',
  steps: buildPreparedSteps(FLASHCARD_CRAM_PROJECT_ID, [
    {
      title: 'Build the flashcard drill',
      content:
        'Make me a polished single-file HTML flashcard cram drill for students where I can paste notes, create and edit cards, quiz myself, mark cards easy or hard, save locally, and export/import the deck.',
      description: 'V1 generated the cram drill but verification found missing edit controls for existing cards.',
    },
    {
      title: 'Add edit controls',
      content:
        "This is close, but I can't edit cards after creating them; the deck only has Delete. Add visible Edit, Save, and Cancel controls for existing cards while keeping it a single self-contained HTML file and preserving localStorage, quiz marking, and JSON import/export.",
      description: 'Final/default artifact after the observed edit-control defect was fixed.',
    },
  ]),
}

export const FOLLOW_UP_CRM_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: FOLLOW_UP_CRM_PROJECT_ID,
  sourceRunId: '7c4f9d44-d233-4816-b4fe-85f80f946dd4',
  href: '/follow-up-crm-tracker-demo',
  title: 'Follow-Up CRM Tracker',
  description:
    'Two ChatGPT prompts produced a freelancer CRM tracker, then added quick follow-up actions so daily use does not require reopening the full edit form.',
  content:
    'Caleb Price used ChatGPT to build a self-contained follow-up CRM for solo operators. The run keeps the inspected workflow improvement visible: after the base CRM worked, the follow-up prompt added today/+1/+7 quick actions and last-contacted timestamps.',
  resultContent:
    'A working Follow-Up CRM Tracker embedded directly on the page. The source path preserves both exact prompts, both response packages, the initial workflow issue, and the improved final artifact.',
  categorySlug: 'marketing',
  mockCategoryId: 'cat-2',
  difficulty: 'beginner',
  modelUsed: 'Latest 5.5',
  modelRecommendation: 'ChatGPT 5.5 Instant',
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['crm', 'follow-up', 'sales', 'freelancer', 'html', 'csv export', 'source-run'],
  artifactPath: '/artifacts/follow-up-crm-chatgpt-gpt55-instant.html',
  sourceUrl: 'https://chatgpt.com/c/6a2200fc-a6f8-8332-855a-ed37c62cde0e',
  authorDisplayName: 'Caleb Price',
  authorUsername: 'CalebPrice',
  createdAt: '2026-06-04T22:43:00.000Z',
  updatedAt: '2026-06-04T22:58:22.098Z',
  steps: buildPreparedSteps(FOLLOW_UP_CRM_PROJECT_ID, [
    {
      title: 'Build the CRM tracker',
      content:
        'Make me a polished single-file browser follow-up CRM tracker for freelancers/solo operators with contacts/opportunities, next follow-up dates, overdue/today/upcoming buckets, notes, local storage, and CSV export.',
      description: 'Initial artifact worked, but routine follow-ups still required reopening the full edit form.',
    },
    {
      title: 'Add quick follow-up actions',
      content:
        'The first version works, but the cards only have Edit/Delete, so using it every day would still mean reopening the full form for routine follow-ups. Add quick card actions to mark followed up today, reschedule +1 day or +7 days, and show a small last-contacted timestamp; keep local storage/CSV export and return the complete updated single HTML file.',
      description: 'Final artifact added quick follow-up actions and last-contacted timestamps.',
    },
  ]),
}

export const REACTION_TRAINER_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: REACTION_TRAINER_PROJECT_ID,
  sourceRunId: 'e0661130-054a-42a5-844d-b2475268a690',
  href: '/reaction-time-trainer-demo',
  title: 'Reaction-Time Trainer',
  description:
    'One Gemini Pro prompt produced a polished reaction-time trainer with randomized rounds, false-start handling, missed-start penalties, saved best times, history, and touch controls.',
  content:
    'Tessa Morgan used Gemini Pro for a one-shot browser reaction trainer. The run stopped after one response because the artifact passed verification and did not need a follow-up prompt to fix an observed defect.',
  resultContent:
    'A working Reaction-Time Trainer embedded directly on the page. The source path preserves the exact prompt, the verbatim response package, the generated artifact, and verification notes.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'beginner',
  modelUsed: 'Gemini 3.1 Pro',
  modelRecommendation: 'Gemini 3.1 Pro',
  toolsUsed: ['Gemini', 'HTML', 'Browser'],
  tags: ['reaction time', 'game', 'trainer', 'html', 'touch', 'source-run'],
  artifactPath: '/artifacts/reaction-trainer-gemini-pro.html',
  sourceUrl: 'https://gemini.google.com/app/9143dac6f331e1e5',
  authorDisplayName: 'Tessa Morgan',
  authorUsername: 'TessaMorgan',
  createdAt: '2026-06-04T18:36:00.000Z',
  updatedAt: '2026-06-04T18:41:13.000Z',
  steps: buildPreparedSteps(REACTION_TRAINER_PROJECT_ID, [
    {
      title: 'Build the trainer',
      content:
        'Make me a polished one-file browser reaction-time trainer with quick randomized rounds, false-start and missed-start penalties, saved local best times/history, touch controls, and an instant replay feeling.',
      description: 'Stopped after one prompt because the artifact passed verification and needed no observed defect fix.',
    },
  ]),
}

export const LANE_DEFENSE_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: LANE_DEFENSE_PROJECT_ID,
  sourceRunId: '7ecc383f-da44-41a4-b46b-f7bc7f58adcb',
  href: '/tiny-lane-defense-demo',
  title: 'Tiny Lane Defense',
  description:
    'One ChatGPT Thinking Heavy prompt produced a tiny lane tower-defense browser game with two turret types, quick waves, and a short learn curve.',
  content:
    'Lena Ortiz used ChatGPT to generate a compact tower-defense game as one self-contained HTML artifact. The source run preserves the one prompt, the captured response package, and the playable lane-defense file.',
  resultContent:
    'A playable Tiny Lane Defense artifact embedded directly on the page. The source path preserves the exact prompt, the verbatim response package, generated HTML, source-run link, and verification notes.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'beginner',
  modelUsed: 'Latest 5.5 / Thinking Heavy (ChatGPT UI)',
  modelRecommendation: 'ChatGPT 5.5 Thinking Heavy',
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['tower defense', 'game', 'html', 'lanes', 'source-run'],
  artifactPath: '/artifacts/lane-defense-chatgpt-gpt55-heavy.html',
  sourceUrl: 'https://chatgpt.com/c/6a21c7cc-6db0-832d-ad5d-a8ad8d85181f',
  authorDisplayName: 'Lena Ortiz',
  authorUsername: 'LenaOrtiz',
  createdAt: '2026-06-04T18:44:00.000Z',
  updatedAt: '2026-06-04T18:49:41.019Z',
  steps: buildPreparedSteps(LANE_DEFENSE_PROJECT_ID, [
    {
      title: 'Build the lane defense game',
      content:
        'Make me a tiny lane tower-defense browser game as one self-contained HTML file, with two placeable turret types, quick waves, and a 15-second learn curve. Please include the complete file in one code block.',
      description: 'One ChatGPT response package produced the captured single-file tower-defense artifact.',
    },
  ]),
}

export const PREPARED_SHOWCASE_PROJECTS = [
  HP_10BII_SHOWCASE_PROJECT,
  TIC_TAC_TOE_SHOWCASE_PROJECT,
  POMODORO_TIMER_SHOWCASE_PROJECT,
  WEEKEND_CHECKLIST_SHOWCASE_PROJECT,
  NEON_BLOCK_PATROL_SHOWCASE_PROJECT,
  SWISH_CITY_SHOWCASE_PROJECT,
  MEETING_COST_SHOWCASE_PROJECT,
  WORD_LADDER_SPRINT_SHOWCASE_PROJECT,
  PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT,
  POCKET_RALLY_SHOWCASE_PROJECT,
  TRIP_PACKING_SHOWCASE_PROJECT,
  FLASHCARD_CRAM_SHOWCASE_PROJECT,
  FOLLOW_UP_CRM_SHOWCASE_PROJECT,
  REACTION_TRAINER_SHOWCASE_PROJECT,
  LANE_DEFENSE_SHOWCASE_PROJECT,
  ...PENDING_SOURCE_RUN_SHOWCASE_PROJECTS,
]

export function getPreparedShowcaseProjectBySourceRunId(sourceRunId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.sourceRunId === sourceRunId) ?? null
}

export function getPreparedShowcaseProjectById(projectId: string) {
  return PREPARED_SHOWCASE_PROJECTS.find(project => project.id === projectId) ?? null
}
