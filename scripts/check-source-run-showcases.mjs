#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const failures = []

const sourceRunProjects = [
  {
    name: 'HP 10Bii+',
    route: 'src/app/hp-10bii-calculator-demo/page.tsx',
    projectId: 'HP_10BII_PROJECT_ID',
    showcaseExport: 'HP_10BII_SHOWCASE_PROJECT',
    href: '/hp-10bii-calculator-demo',
    packagePath: 'seed-runs/hp-10bii-financial-calculator-claude-opus-48.json',
  },
  {
    name: 'Pomodoro Focus Timer',
    route: 'src/app/pomodoro-timer-demo/page.tsx',
    projectId: 'POMODORO_TIMER_PROJECT_ID',
    showcaseExport: 'POMODORO_TIMER_SHOWCASE_PROJECT',
    href: '/pomodoro-timer-demo',
    artifactPaths: [
      'public/artifacts/pomodoro-step-1.html',
      'public/artifacts/pomodoro-step-2.html',
      'public/artifacts/pomodoro-step-3.html',
      'public/artifacts/pomodoro-step-4.html',
      'public/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    ],
  },
  {
    name: 'Weekend Plan Checklist',
    route: 'src/app/weekend-plan-checklist-demo/page.tsx',
    projectId: 'WEEKEND_CHECKLIST_PROJECT_ID',
    showcaseExport: 'WEEKEND_CHECKLIST_SHOWCASE_PROJECT',
    href: '/weekend-plan-checklist-demo',
    packagePath: 'seed-runs/weekend-plan-checklist-chatgpt-6prompt-fixed.json',
  },
  {
    name: 'Neon Block Patrol',
    route: 'src/app/neon-block-patrol-demo/page.tsx',
    projectId: 'NEON_BLOCK_PATROL_PROJECT_ID',
    showcaseExport: 'NEON_BLOCK_PATROL_SHOWCASE_PROJECT',
    href: '/neon-block-patrol-demo',
    packagePath: 'seed-runs/gta-style-fps-chatgpt-gpt55-heavy-five-prompt.json',
  },
  {
    name: 'Swish City',
    route: 'src/app/swish-city-timing-hoops-demo/page.tsx',
    projectId: 'SWISH_CITY_PROJECT_ID',
    showcaseExport: 'SWISH_CITY_SHOWCASE_PROJECT',
    href: '/swish-city-timing-hoops-demo',
    packagePath: 'seed-runs/swish-city-claude-opus-4-8-source-run.json',
  },
  {
    name: 'Meeting Cost',
    route: 'src/app/meeting-cost-calculator-demo/page.tsx',
    projectId: 'MEETING_COST_PROJECT_ID',
    showcaseExport: 'MEETING_COST_SHOWCASE_PROJECT',
    href: '/meeting-cost-calculator-demo',
    packagePath: 'seed-runs/meeting-cost-calculator-chatgpt-source-run.json',
  },
  {
    name: 'Word Ladder Sprint',
    route: 'src/app/word-ladder-sprint-demo/page.tsx',
    projectId: 'WORD_LADDER_SPRINT_PROJECT_ID',
    showcaseExport: 'WORD_LADDER_SPRINT_SHOWCASE_PROJECT',
    href: '/word-ladder-sprint-demo',
    packagePath: 'seed-runs/word-ladder-sprint-chatgpt-source-run.json',
  },
  {
    name: 'Puzzle Box Escape',
    route: 'src/app/puzzle-box-escape-demo/page.tsx',
    projectId: 'PUZZLE_BOX_ESCAPE_PROJECT_ID',
    showcaseExport: 'PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT',
    href: '/puzzle-box-escape-demo',
    packagePath: 'seed-runs/puzzle-box-escape-claude-sonnet-46-max-source-run.json',
  },
  {
    name: 'Pocket Rally',
    route: 'src/app/pocket-rally-time-trial-demo/page.tsx',
    projectId: 'POCKET_RALLY_PROJECT_ID',
    showcaseExport: 'POCKET_RALLY_SHOWCASE_PROJECT',
    href: '/pocket-rally-time-trial-demo',
    packagePath: 'seed-runs/pocket-rally-chatgpt-source-run.json',
  },
  {
    name: 'Trip Packing',
    route: 'src/app/trip-packing-planner-demo/page.tsx',
    projectId: 'TRIP_PACKING_PROJECT_ID',
    showcaseExport: 'TRIP_PACKING_SHOWCASE_PROJECT',
    href: '/trip-packing-planner-demo',
    packagePath: 'seed-runs/trip-packing-gemini-pro-source-run.json',
  },
  {
    name: 'Flashcard Cram',
    route: 'src/app/flashcard-cram-drill-demo/page.tsx',
    projectId: 'FLASHCARD_CRAM_PROJECT_ID',
    showcaseExport: 'FLASHCARD_CRAM_SHOWCASE_PROJECT',
    href: '/flashcard-cram-drill-demo',
    packagePath: 'seed-runs/flashcard-cram-gemini-31-pro-source-run.json',
  },
  {
    name: 'Follow-Up CRM',
    route: 'src/app/follow-up-crm-tracker-demo/page.tsx',
    projectId: 'FOLLOW_UP_CRM_PROJECT_ID',
    showcaseExport: 'FOLLOW_UP_CRM_SHOWCASE_PROJECT',
    href: '/follow-up-crm-tracker-demo',
    packagePath: 'seed-runs/follow-up-crm-chatgpt-gpt55-instant-source-run.json',
  },
  {
    name: 'Reaction-Time Trainer',
    route: 'src/app/reaction-time-trainer-demo/page.tsx',
    projectId: 'REACTION_TRAINER_PROJECT_ID',
    showcaseExport: 'REACTION_TRAINER_SHOWCASE_PROJECT',
    href: '/reaction-time-trainer-demo',
    packagePath: 'seed-runs/reaction-trainer-gemini-pro-source-run.json',
  },
  {
    name: 'Tiny Lane Defense',
    route: 'src/app/tiny-lane-defense-demo/page.tsx',
    projectId: 'LANE_DEFENSE_PROJECT_ID',
    showcaseExport: 'LANE_DEFENSE_SHOWCASE_PROJECT',
    href: '/tiny-lane-defense-demo',
    packagePath: 'seed-runs/lane-defense-chatgpt-gpt55-heavy-oneshot.json',
  },
]

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing required file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function parseJson(path) {
  try {
    return JSON.parse(read(path))
  } catch (error) {
    failures.push(`${path}: invalid JSON: ${error.message}`)
    return null
  }
}

function mustInclude(path, content, text, message) {
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, content, text, message) {
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustComeBefore(path, content, beforeText, afterText, message) {
  const beforeIndex = content.indexOf(beforeText)
  const afterIndex = content.indexOf(afterText)

  if (beforeIndex === -1 || afterIndex === -1 || beforeIndex > afterIndex) {
    failures.push(`${path}: ${message}`)
  }
}

function routeDefaultStepNumber(routeContent) {
  const match = routeContent.match(/defaultStepNumber=\{(\d+)\}/)
  return match ? Number(match[1]) : null
}

function generatedArtifactFilesForStep(step) {
  const files = new Set()

  if (typeof step.artifact_version_path === 'string' && step.artifact_version_path.startsWith('public/artifacts/')) {
    files.add(step.artifact_version_path)
  }

  if (Array.isArray(step.generated_files)) {
    for (const filePath of step.generated_files) {
      if (typeof filePath === 'string' && filePath.startsWith('public/artifacts/')) files.add(filePath)
    }
  }

  return [...files]
}

function stepNumberForArtifactPath(steps, artifactPath) {
  if (!artifactPath) return null

  const step = steps.find((item) => generatedArtifactFilesForStep(item).includes(artifactPath))
  return step ? Number(step.step_number) : null
}

function finalArtifactStepNumber(pkg) {
  const steps = Array.isArray(pkg.steps) ? pkg.steps : []
  const explicitFinalStep = stepNumberForArtifactPath(steps, pkg.final_artifact_path)
  if (explicitFinalStep) return explicitFinalStep

  const artifactStepNumbers = steps
    .filter((step) => generatedArtifactFilesForStep(step).length > 0)
    .map((step) => Number(step.step_number))
    .filter((stepNumber) => Number.isFinite(stepNumber))

  return artifactStepNumbers.length > 0 ? Math.max(...artifactStepNumbers) : null
}

function sharedShowcaseRoutes() {
  return readdirSync('src/app', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((routePath) => existsSync(routePath))
    .filter((routePath) => {
      const routeContent = readFileSync(routePath, 'utf8')
      return (
        routeContent.includes("from '@/components/SourceRunShowcase'") ||
        routeContent.includes("from '@/components/PreparedSourceRunPage'")
      )
    })
}

const sharedComponent = 'src/components/SourceRunShowcase.tsx'
const sharedComponentContent = read(sharedComponent)
mustInclude(sharedComponent, sharedComponentContent, 'packages.length > 0', 'shared showcase must render an artifact selector when artifacts exist')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must keep artifact package selection state')
mustInclude(sharedComponent, sharedComponentContent, 'defaultStepNumber', 'shared showcase must support final-artifact default selection')
mustInclude(sharedComponent, sharedComponentContent, 'artifactVersions?: SourceRunShowcaseArtifactVersion[]', 'shared showcase must allow multiple artifact versions per response package')
mustInclude(sharedComponent, sharedComponentContent, 'isDefaultArtifact', 'shared showcase must support an explicit default artifact version')
mustInclude(sharedComponent, sharedComponentContent, '<ExactResponseBlock', 'shared showcase must render verbatim response text for each response package')
mustInclude(sharedComponent, sharedComponentContent, '<ArtifactCodeBlock', 'shared showcase must render long generated artifacts as collapsible code')
mustInclude(sharedComponent, sharedComponentContent, '<SourceLink', 'shared showcase must expose the full provider source-run link in each response package')
mustInclude(sharedComponent, sharedComponentContent, 'pathforgeSourceRunUrl', 'shared showcase must allow a PathForge source-run record link')
mustInclude(sharedComponent, sharedComponentContent, 'Verbatim artifact', 'shared showcase must preserve long generated code as collapsible artifact text')
mustInclude(sharedComponent, sharedComponentContent, 'data-source-run-node={variant}', 'shared showcase must label prompt and response nodes for layout verification')
mustInclude(sharedComponent, sharedComponentContent, 'variant="prompt"', 'shared showcase must render prompts as their own pipe nodes')
mustInclude(sharedComponent, sharedComponentContent, 'variant="response"', 'shared showcase must render response packages as their own pipe nodes')
mustNotInclude(sharedComponent, sharedComponentContent, 'ProjectEngagementBar', 'shared showcase should not own page-shell engagement controls')
mustComeBefore(sharedComponent, sharedComponentContent, '<ArtifactFrame', 'Source-run path', 'shared showcase must mount the artifact before the prompt/response path')
mustComeBefore(sharedComponent, sharedComponentContent, '<PromptText text={step.prompt}', '<ResponsePackageCard', 'shared showcase must render each prompt before its response package')
mustComeBefore(sharedComponent, sharedComponentContent, 'variant="prompt"', 'variant="response"', 'shared showcase must connect prompt and response as separate sequential pipe nodes')

for (const deletedExplorer of [
  'src/app/hp-10bii-calculator-demo/Hp10BiiSourceRunExplorer.tsx',
  'src/app/weekend-plan-checklist-demo/WeekendPlanChecklistSourceRunExplorer.tsx',
  'src/app/neon-block-patrol-demo/NeonBlockPatrolSourceRunExplorer.tsx',
  'src/app/swish-city-timing-hoops-demo/SwishCitySourceRunExplorer.tsx',
  'src/app/pomodoro-timer-demo/PomodoroSourceRunExplorer.tsx',
]) {
  if (existsSync(deletedExplorer)) failures.push(`${deletedExplorer}: old one-off source-run explorer must not come back`)
}

const featuredProjects = read('src/lib/featured-projects.ts')
const preparedShowcase = read('src/lib/prepared-showcase-projects.ts')
const projectLinks = read('src/lib/project-links.ts')
const data = read('src/lib/data.ts')
const engagement = read('src/lib/project-engagement.ts')
const mockData = read('src/lib/mock-data.ts')
const adminDashboard = read('src/app/admin/page.tsx')
const adminSourceRunDetail = read('src/app/admin/source-runs/[id]/page.tsx')
const preparedSourceRunPage = read('src/components/PreparedSourceRunPage.tsx')
const guardedRouteSet = new Set(sourceRunProjects.map((project) => project.route))

for (const routePath of sharedShowcaseRoutes()) {
  if (!guardedRouteSet.has(routePath)) {
    failures.push(`${routePath}: shared source-run showcase route must be covered by check-source-run-showcases.mjs`)
  }
}

mustInclude('src/app/admin/page.tsx', adminDashboard, 'Prepared page ready', 'admin dashboard must make prepared source-run rows obvious')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'Publish prepared page', 'admin dashboard prepared source-run action must be explicit')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'Source-run review', 'admin dashboard queued source runs must read as normal review items')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'No prepared public page yet.', 'admin dashboard must explain the unprepared source-run next step')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminSourceRunDetail, 'Next action: publish this prepared page from the review item.', 'admin detail must show the prepared-page next action')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminSourceRunDetail, 'Next action: structure a prepared public page, then return here to publish or decline it.', 'admin detail must show the unprepared source-run next action')

for (const project of sourceRunProjects) {
  const routeContent = read(project.route)
  const usesPreparedWrapper = routeContent.includes("from '@/components/PreparedSourceRunPage'")
  const routeShellContent = usesPreparedWrapper ? `${routeContent}\n${preparedSourceRunPage}` : routeContent
  if (!routeContent.includes("from '@/components/SourceRunShowcase'") && !usesPreparedWrapper) {
    failures.push(`${project.route}: ${project.name} must use the shared source-run showcase or PreparedSourceRunPage wrapper`)
  }
  mustInclude(project.route, routeShellContent, 'defaultStepNumber', `${project.name} must explicitly default the mounted artifact`)
  mustInclude(project.route, routeShellContent, 'sourceRunUrl=', `${project.name} must pass the full provider source-run link to the shared showcase`)
  mustInclude(project.route, routeShellContent, 'ProjectEngagementBar', `${project.name} must keep the public project shell`)
  mustInclude(project.route, routeShellContent, 'ProjectCommunityPanel', `${project.name} must keep the community panel`)

  mustInclude('src/lib/featured-projects.ts', featuredProjects, project.projectId, `${project.name} must have a featured project id`)
  mustInclude('src/lib/prepared-showcase-projects.ts', preparedShowcase, project.showcaseExport, `${project.name} must have prepared showcase metadata`)
  mustInclude('src/lib/prepared-showcase-projects.ts', preparedShowcase, project.href, `${project.name} prepared showcase must point to its special route`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.projectId, `${project.name} must have a route override`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.href, `${project.name} route override must point to the special page`)
  mustInclude('src/lib/data.ts', data, project.projectId, `${project.name} must be approved in public fallback data`)
  mustInclude('src/lib/project-engagement.ts', engagement, project.projectId, `${project.name} must be non-persistable until a real prompts row exists`)
  mustInclude('src/lib/mock-data.ts', mockData, project.showcaseExport, `${project.name} must be present in mock prompt/profile data`)

  for (const artifactPath of project.artifactPaths ?? []) {
    if (!existsSync(artifactPath)) failures.push(`${project.name}: missing artifact file ${artifactPath}`)
  }

  if (project.name === 'Pomodoro Focus Timer') {
    mustInclude(project.route, routeContent, 'artifactVersions: step.stepNumber === 4', 'Pomodoro must preserve the captured step 4 and public final artifacts as selectable versions')
    mustInclude(project.route, routeContent, 'pomodoro-focus-timer-gpt55-instant.html', 'Pomodoro must keep the current public final artifact selectable')
    mustInclude(project.route, routeContent, 'isDefault: true', 'Pomodoro must default to the current public final artifact')
    mustInclude(project.route, routeContent, 'response: code', 'Pomodoro must use the captured HTML file as the exact response text')
  }

  if (!project.packagePath) continue

  const pkg = parseJson(project.packagePath)
  if (!pkg) continue
  if (!Array.isArray(pkg.steps) || pkg.steps.length === 0) {
    failures.push(`${project.packagePath}: source-run package must have steps`)
    continue
  }

  const defaultStepNumber = routeDefaultStepNumber(routeContent)
  const finalStepNumber = finalArtifactStepNumber(pkg)
  if (usesPreparedWrapper) {
    mustInclude(
      'src/components/PreparedSourceRunPage.tsx',
      preparedSourceRunPage,
      'final_artifact_path',
      `${project.name} wrapper must derive the default mounted artifact from final_artifact_path`,
    )
  } else if (finalStepNumber && defaultStepNumber !== finalStepNumber) {
    failures.push(`${project.route}: defaultStepNumber must point to final artifact response step ${finalStepNumber}`)
  }

  if (pkg.pathforge_submission_url || pkg.pathforge_pending_id || pkg.source_run_submission_id) {
    mustInclude(project.route, routeShellContent, 'pathforgeSourceRunUrl=', `${project.name} must expose the PathForge source-run record link`)
    mustInclude(project.route, routeShellContent, 'sourceRunId=', `${project.name} must expose the PathForge source-run id`)
  }

  for (const step of pkg.steps) {
    const stepLabel = `${project.packagePath} step ${step.step_number ?? '?'}`
    if (!step.prompt_exact) failures.push(`${stepLabel}: missing prompt_exact`)
    if (!step.response_exact) failures.push(`${stepLabel}: missing response_exact`)
    const response = String(step.response_exact ?? '')
    for (const forbidden of [
      'exact response and code are preserved in the source session link',
      'exact response is preserved in the source session link',
      'captured code for this version is saved at',
      'captured final code is saved at',
      'saved verbatim at',
    ]) {
      if (response.includes(forbidden)) {
        failures.push(`${stepLabel}: response_exact must not defer exact text to a source link or artifact summary`)
      }
    }

    if (step.artifact_version_path) {
      const artifactPath = String(step.artifact_version_path)
      if (!artifactPath.startsWith('public/artifacts/')) {
        failures.push(`${stepLabel}: artifact_version_path must be production-servable under public/artifacts`)
      } else if (!existsSync(artifactPath)) {
        failures.push(`${stepLabel}: missing artifact file ${artifactPath}`)
      }
      if (!Array.isArray(step.generated_files) || !step.generated_files.includes(artifactPath)) {
        failures.push(`${stepLabel}: generated_files must include ${basename(artifactPath)} for the response package`)
      }
    }
  }

  const artifactVersions = Array.isArray(pkg.artifact_versions) ? pkg.artifact_versions : []
  const generatedArtifactPaths = new Set()
  for (const step of pkg.steps) {
    if (!Array.isArray(step.generated_files)) continue
    for (const filePath of step.generated_files) {
      if (typeof filePath === 'string' && filePath.startsWith('public/artifacts/')) {
        generatedArtifactPaths.add(filePath)
      }
    }
  }

  for (const artifactVersion of artifactVersions) {
    const artifactPath = typeof artifactVersion === 'string' ? artifactVersion : artifactVersion.path
    if (typeof artifactPath !== 'string') {
      failures.push(`${project.packagePath}: artifact_versions entries must include a path`)
      continue
    }
    if (!artifactPath.startsWith('public/artifacts/')) {
      failures.push(`${project.packagePath}: artifact version ${artifactPath} is not production-servable`)
    } else if (!existsSync(join(process.cwd(), artifactPath))) {
      failures.push(`${project.packagePath}: artifact version file missing at ${artifactPath}`)
    }
  }

  if (project.name === 'HP 10Bii+') {
    mustInclude(project.route, routeContent, 'artifactVersionsForStep', 'HP must map every generated artifact file into selectable showcase versions')
    mustInclude(project.route, routeContent, 'isDefault: filePath === finalArtifactPath', 'HP must default to the verified public mounted artifact')
    if (artifactVersions.length !== generatedArtifactPaths.size) {
      failures.push(`${project.packagePath}: HP artifact_versions must match generated public artifact files so every version can mount above`)
    }
  }
}

if (failures.length > 0) {
  console.error('Source-run showcase guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run showcase guard passed.')
