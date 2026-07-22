import {
  AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
  AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
  AIRLOCK_ZERO_GPT_FORK_PROJECT_ID,
  AIRLOCK_ZERO_PROJECT_ID,
} from './featured-projects'
import type { PreparedShowcaseProject, PreparedShowcaseStep } from './prepared-showcase-projects'

export const AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID = '562f5775-9739-4704-be3e-d85efbbd2a5c'
export const AIRLOCK_ZERO_GPT_SOURCE_RUN_ID = '2e526efa-191c-48ea-9ba0-5ff073403770'
export const AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID = '248f4672-d557-4b01-8756-c1cec7290925'

export const AIRLOCK_ZERO_CLAUDE_FORK_SOURCE_RUN_ID = 'fabb195e-18e9-4f24-8880-f6d784305bc5'
export const AIRLOCK_ZERO_GPT_FORK_SOURCE_RUN_ID = '19453950-e191-4f1c-9cdb-b58c46616167'
export const AIRLOCK_ZERO_GEMINI_FORK_SOURCE_RUN_ID = '5ca61d12-390f-4b60-a9eb-39e347de9d1f'

const CANONICAL_TITLE = 'Airlock Zero: Reactor Run'
const AUTHOR_DISPLAY_NAME = 'PathForge Projects'
const AUTHOR_USERNAME = 'pathforge_projects'
const CREATED_AT = '2026-07-11T16:00:00.000Z'
const UPDATED_AT = '2026-07-11T20:00:00.000Z'

function step(
  projectId: string,
  stepNumber: number,
  title: string,
  content: string,
  description: string,
): PreparedShowcaseStep {
  return {
    id: `${projectId}-step-${stepNumber}`,
    stepNumber,
    title,
    content,
    resultContent: '',
    description,
  }
}

function forkStepId(sourceRunId: string, stepNumber = 2) {
  return `${AIRLOCK_ZERO_PROJECT_ID}:${sourceRunId}:step:${stepNumber}`
}

function promptFamilyId(sourceRunId: string, stepNumber = 2) {
  return `${AIRLOCK_ZERO_PROJECT_ID}:${forkStepId(sourceRunId, stepNumber)}`
}

export const AIRLOCK_ZERO_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: AIRLOCK_ZERO_PROJECT_ID,
  sourceRunId: AIRLOCK_ZERO_GPT_SOURCE_RUN_ID,
  sourceRunPackageFile: 'model-variants/airlock-zero-reactor-run-chatgpt-56-sol-max-source-run.json',
  href: '/airlock-zero-reactor-run-demo',
  title: CANONICAL_TITLE,
  description:
    'A polished offline ray-cast FPS mission compared across Claude, ChatGPT, and Gemini, with three reactor cells, hostile drones, oxygen pressure, and a return sprint to the airlock.',
  content:
    'PathForge Labs gave the same Airlock Zero mission contract to Sonnet 5 Max, 5.6 Sol Max, and Gemini 3.5 Flash in independent developer-operated runs. The model selector keeps those runs together as one evolving project, while every run preserves its own exact prompts, responses, artifact versions, and exact response-anchored fork point.',
  resultContent:
    'Choose a model to play and inspect its complete offline Reactor Run, compare the model paths, or follow the genuine branch attached to an exact response in that run.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: '5.6 Sol Max',
  modelRecommendation: 'Compare Sonnet 5 Max, 5.6 Sol Max, and Gemini 3.5 Flash',
  promptFamilyId: `${AIRLOCK_ZERO_PROJECT_ID}:model-cohort`,
  toolsUsed: ['Claude', 'ChatGPT', 'Gemini', 'HTML', 'Browser'],
  tags: ['first-person shooter', 'ray casting', 'space station', 'browser game', 'offline', 'model comparison', 'forks'],
  artifactPath: '/artifacts/airlock-zero-gpt-56-sol-max-step-2.html',
  sourceUrl: 'https://chatgpt.com/s/t_6a52674159308191a89bf09314bb30f1',
  authorDisplayName: AUTHOR_DISPLAY_NAME,
  authorUsername: AUTHOR_USERNAME,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  steps: [
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      1,
      'Build Airlock Zero',
      'Build me a self-contained browser FPS called Airlock Zero: Reactor Run. I want a short ray-cast space-station mission where I move through corridors, pulse security drones, recover three reactor cells, and reach the airlock before oxygen runs out. Make it polished and playable with keyboard and mouse plus a touch-friendly fallback, and keep everything in one offline HTML file with no external assets.',
      'The shared opening contract used for all three independent model runs.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      2,
      'Complete the shared mission build',
      'Continue the same Airlock Zero build from the first response and produce the next complete, verified artifact version.',
      'A complete early artifact remains selectable even when a model later needs verification-driven repairs.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      3,
      'Refine mission readability',
      'Refine the mission flow where the active run needs clearer objectives, navigation, or end-state feedback.',
      'A run-specific continuation shown only when that model needed or benefited from it.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      4,
      'Repair objective completion',
      'Repair the concrete objective or exit defect found while verifying this model run.',
      'A run-specific evidence-based repair, preserved with its earlier artifact version.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      5,
      'Restore combat and controls',
      'Restore the combat, timing, touch, and scorecard behavior proven missing during verification.',
      'A final run-specific repair whose exact prompt and response come from the captured package.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      6,
      'Bound the renderer workload',
      'Repair the active-play freeze by bounding the internal render buffer, ray work, and sprite columns.',
      'A Gemini-specific performance repair preserved after the first five-part mission build.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      7,
      'Restore the offline FPS surface',
      'Remove remote dependencies and restore the rendered corridor, fallback turning, firing, and mobile controls.',
      'A Gemini-specific regression repair that restored the complete offline play surface.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      8,
      'Make the airlock honest',
      'Make the exit reachable only after three distinct cells and restore elapsed time to the final scorecard.',
      'A preserved Gemini endgame repair that passed mission-purpose checks before desktop mouse-aim verification exposed one final control defect.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      9,
      'Restore real mouse aim',
      'Repair the advertised desktop mouse aiming so horizontal pointer movement actually changes the player view while preserving drag, keyboard, touch, and mission controls.',
      'The final Gemini control repair and default production artifact.',
    ),
    step(
      AIRLOCK_ZERO_PROJECT_ID,
      10,
      'Finish the verified release repair',
      'Continue the measured release repair until the active run returns its complete final artifact and every verified defect is resolved.',
      'A source-faithful continuation used by the Claude run after its long repair response stopped before final delivery.',
    ),
  ],
}

export const AIRLOCK_ZERO_CLAUDE_FORK_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
  sourceRunId: AIRLOCK_ZERO_CLAUDE_FORK_SOURCE_RUN_ID,
  sourceRunPackageFile: 'airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
  href: '/airlock-zero-blackout-shift-fork-demo',
  title: 'Airlock Zero: Blackout Shift',
  description:
    'A genuine Sonnet 5 Max branch from Reactor Run response 10 adds station-wide darkness, flashlight power management, and detection-driven drone pressure.',
  content:
    'PathForge Labs branched the verified Sonnet 5 Max Reactor Run at its exact final response. The inherited build remains visible as compact shared history on the left, while Blackout Shift owns the prominent continuation path and inline artifact on the right.',
  resultContent:
    'A self-contained blackout variant with the original mission foundation plus limited visibility, flashlight decisions, and a distinct stealth-combat rhythm.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: 'Sonnet 5 Max',
  modelRecommendation: 'Sonnet 5 Max',
  promptFamilyId: promptFamilyId(AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID, 10),
  toolsUsed: ['Claude', 'HTML', 'Browser'],
  tags: ['fork', 'first-person shooter', 'blackout', 'flashlight', 'stealth', 'offline', 'browser game'],
  artifactPath: '/artifacts/airlock-zero-blackout-shift-claude-sonnet-5-max.html',
  sourceUrl: 'https://claude.ai/chat/0f3006ec-ae0a-4fb9-be8d-3a7e6ca3d710',
  authorDisplayName: AUTHOR_DISPLAY_NAME,
  authorUsername: AUTHOR_USERNAME,
  forkSource: {
    sourceProjectId: AIRLOCK_ZERO_PROJECT_ID,
    sourceProjectTitle: CANONICAL_TITLE,
    sourceModelVariantId: 'b533b3c9-62cd-411f-acf6-1197a3ffdcad',
    sourceRunId: AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID,
    sourceStepId: forkStepId(AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID, 10),
    sourceStepNumber: 10,
    sourceArtifactPath: 'public/artifacts/airlock-zero-claude-sonnet-5-max-step-10.html',
    sourceArtifactSha256: '11cca990f198047304a4fb802e6345ac1bd735ea7cb3e37455c7886996a7637e',
    depth: 0,
    branchIndex: 0,
    promptFamilyId: promptFamilyId(AIRLOCK_ZERO_CLAUDE_SOURCE_RUN_ID, 10),
  },
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  steps: [
    step(
      AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
      11,
      'Branch into Blackout Shift',
      'Fork the verified Reactor Run into Airlock Zero: Blackout Shift, built around darkness, limited flashlight power, drone detection, and deliberate stun timing.',
      'Claude began the source-faithful child from the exact verified Sonnet 5 Max response-10 socket.',
    ),
    step(
      AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
      12,
      'Continue the blackout build',
      'Continue',
      'The same active build continued after Claude reached a visible tool-use boundary.',
    ),
    step(
      AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
      13,
      'Continue blackout verification',
      'Continue',
      'Claude continued black-box verification and refinement in the same source session.',
    ),
    step(
      AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID,
      14,
      'Complete verified Blackout Shift',
      'Continue',
      'Claude completed the verified artifact and its final regression pass.',
    ),
  ],
}

export const AIRLOCK_ZERO_GPT_FORK_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: AIRLOCK_ZERO_GPT_FORK_PROJECT_ID,
  sourceRunId: AIRLOCK_ZERO_GPT_FORK_SOURCE_RUN_ID,
  sourceRunPackageFile: 'airlock-zero-swarm-shift-gpt-56-sol-max-fork.json',
  href: '/airlock-zero-swarm-shift-fork-demo',
  title: 'Airlock Zero: Swarm Shift',
  description:
    'A genuine 5.6 Sol Max branch from Reactor Run response 02 turns each recovered cell into an escalating drone wave before a final airlock lockdown.',
  content:
    'PathForge Labs branched the 5.6 Sol Max Reactor Run at its exact second response. The shared two-response build stays collapsed and traceable on the left; Swarm Shift begins at the response socket and owns the continuation path on the right.',
  resultContent:
    'A self-contained combat variant with escalating waves, between-cell upgrades, a 30-second lockdown finale, and a dedicated performance scorecard.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: '5.6 Sol Max',
  modelRecommendation: '5.6 Sol Max',
  promptFamilyId: promptFamilyId(AIRLOCK_ZERO_GPT_SOURCE_RUN_ID),
  toolsUsed: ['ChatGPT', 'HTML', 'Browser'],
  tags: ['fork', 'first-person shooter', 'drone swarm', 'upgrades', 'lockdown', 'offline', 'browser game'],
  artifactPath: '/artifacts/airlock-zero-swarm-shift-gpt-56-sol-max.html',
  sourceUrl: 'https://chatgpt.com/s/t_6a52711d758481918aeedcca8e18c564',
  authorDisplayName: AUTHOR_DISPLAY_NAME,
  authorUsername: AUTHOR_USERNAME,
  forkSource: {
    sourceProjectId: AIRLOCK_ZERO_PROJECT_ID,
    sourceProjectTitle: CANONICAL_TITLE,
    sourceModelVariantId: 'c5d4c314-e286-46c6-8a3d-213bc62415cc',
    sourceRunId: AIRLOCK_ZERO_GPT_SOURCE_RUN_ID,
    sourceStepId: forkStepId(AIRLOCK_ZERO_GPT_SOURCE_RUN_ID),
    sourceStepNumber: 2,
    sourceArtifactPath: 'public/artifacts/airlock-zero-gpt-56-sol-max-step-2.html',
    sourceArtifactSha256: '810f7733cf41de09c553ee5e9b1005bdfd30f367ff0221b58ec0ef56dc93acd3',
    depth: 0,
    branchIndex: 0,
    promptFamilyId: promptFamilyId(AIRLOCK_ZERO_GPT_SOURCE_RUN_ID),
  },
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  steps: [
    step(
      AIRLOCK_ZERO_GPT_FORK_PROJECT_ID,
      3,
      'Branch into Swarm Shift',
      'Fork the verified Reactor Run into Airlock Zero: Swarm Shift with an escalating drone wave after each recovered cell, useful upgrade choices, and a final 30-second airlock lockdown with its own scorecard.',
      'The child prompt continues from the exact 5.6 Sol Max response-02 socket.',
    ),
  ],
}

export const AIRLOCK_ZERO_GEMINI_FORK_SHOWCASE_PROJECT: PreparedShowcaseProject = {
  id: AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
  sourceRunId: AIRLOCK_ZERO_GEMINI_FORK_SOURCE_RUN_ID,
  sourceRunPackageFile: 'airlock-zero-hull-breach-gemini-35-flash-fork.json',
  href: '/airlock-zero-hull-breach-fork-demo',
  title: 'Airlock Zero: Hull Breach',
  description:
    'A genuine Gemini 3.5 Flash branch from Reactor Run response 02 adds spreading decompression hazards, sealable bulkheads, and a more tactical oxygen race.',
  content:
    'PathForge Labs branched the Gemini 3.5 Flash Reactor Run at its exact second response. The inherited model run remains visible as compact shared history, while Hull Breach shows its own continuation prompts, repairs, and final mounted artifact beside that exact branch socket.',
  resultContent:
    'A self-contained decompression variant with spreading hull hazards, seal decisions, restored objective completion, a complete scorecard, and a generation-safe restart lifecycle.',
  categorySlug: 'personal',
  mockCategoryId: 'cat-10',
  difficulty: 'intermediate',
  modelUsed: 'Gemini 3.5 Flash',
  modelRecommendation: 'Gemini 3.5 Flash',
  promptFamilyId: promptFamilyId(AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID),
  toolsUsed: ['Gemini', 'HTML', 'Browser'],
  tags: ['fork', 'first-person shooter', 'hull breach', 'oxygen', 'bulkheads', 'offline', 'browser game'],
  artifactPath: '/artifacts/airlock-zero-hull-breach-gemini-35-flash-verified-final.html',
  sourceUrl: 'https://share.gemini.google/j7nvMivcAOa6',
  authorDisplayName: AUTHOR_DISPLAY_NAME,
  authorUsername: AUTHOR_USERNAME,
  forkSource: {
    sourceProjectId: AIRLOCK_ZERO_PROJECT_ID,
    sourceProjectTitle: CANONICAL_TITLE,
    sourceModelVariantId: '62a2d0f4-7e61-46cf-a5a2-26229e930b0f',
    sourceRunId: AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID,
    sourceStepId: forkStepId(AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID),
    sourceStepNumber: 2,
    sourceArtifactPath: 'public/artifacts/airlock-zero-gemini-35-flash-step-2.html',
    sourceArtifactSha256: '7b14d660c95d448ae7c8bd8df9953819f608c8236fbe35e4a328a9de3a834497',
    depth: 0,
    branchIndex: 0,
    promptFamilyId: promptFamilyId(AIRLOCK_ZERO_GEMINI_SOURCE_RUN_ID),
  },
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  steps: [
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      3,
      'Branch into Hull Breach',
      'Fork the verified Reactor Run into Airlock Zero: Hull Breach with spreading decompression, sealable bulkheads, and oxygen-routing decisions.',
      'The first child prompt continues from the exact Gemini 3.5 Flash response-02 socket.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      4,
      'Complete the scorecard',
      'Repair the missing outcome metrics found during verification and preserve the complete one-file game.',
      'Evidence-based scorecard repair in the same Gemini branch.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      5,
      'Restore the exit path',
      'Repair the blocked objective and airlock completion path found during verification.',
      'Evidence-based objective-completion repair in the same Gemini branch.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      6,
      'Make mobile launch reliable',
      'Repair the clipped 390px briefing so its body can scroll, the Start control remains reachable, and the game reliably enters play.',
      'A preserved evidence-based mobile repair; later active-play verification exposed a separate performance blocker.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      7,
      'Bound active rendering work',
      'Bound the ray-cast and sprite work to the fixed render buffer and guarantee one animation frame chain.',
      'The exact 3.5 Flash performance repair, preserved after rapid restart testing exposed a loop-generation race.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      8,
      'Make restart generations atomic',
      'Invalidate stale animation generations across pause, failure, restart, and success while clearing held input.',
      'The lifecycle repair that removed the stale-callback race; preserved after one camera-plane reference regressed.',
    ),
    step(
      AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID,
      9,
      'Restore billboard projection',
      'Repair the undefined camera-plane reference in drawBillboards and regression-test the complete lifecycle.',
      'Final exact Gemini 3.5 Flash artifact; passed all 26 hard gates twice consecutively.',
    ),
  ],
}

export const AIRLOCK_ZERO_PREPARED_PROJECTS = [
  AIRLOCK_ZERO_SHOWCASE_PROJECT,
  AIRLOCK_ZERO_CLAUDE_FORK_SHOWCASE_PROJECT,
  AIRLOCK_ZERO_GPT_FORK_SHOWCASE_PROJECT,
  AIRLOCK_ZERO_GEMINI_FORK_SHOWCASE_PROJECT,
] as const
