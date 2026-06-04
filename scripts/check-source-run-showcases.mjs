#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
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

const sharedComponent = 'src/components/SourceRunShowcase.tsx'
const sharedComponentContent = read(sharedComponent)
mustInclude(sharedComponent, sharedComponentContent, 'packages.length > 0', 'shared showcase must render an artifact selector when artifacts exist')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must keep artifact package selection state')
mustInclude(sharedComponent, sharedComponentContent, 'defaultStepNumber', 'shared showcase must support final-artifact default selection')
mustInclude(sharedComponent, sharedComponentContent, 'Verbatim artifact', 'shared showcase must preserve long generated code as collapsible artifact text')
mustNotInclude(sharedComponent, sharedComponentContent, 'ProjectEngagementBar', 'shared showcase should not own page-shell engagement controls')

for (const deletedExplorer of [
  'src/app/hp-10bii-calculator-demo/Hp10BiiSourceRunExplorer.tsx',
  'src/app/weekend-plan-checklist-demo/WeekendPlanChecklistSourceRunExplorer.tsx',
  'src/app/neon-block-patrol-demo/NeonBlockPatrolSourceRunExplorer.tsx',
  'src/app/swish-city-timing-hoops-demo/SwishCitySourceRunExplorer.tsx',
]) {
  if (existsSync(deletedExplorer)) failures.push(`${deletedExplorer}: old one-off source-run explorer must not come back`)
}

const featuredProjects = read('src/lib/featured-projects.ts')
const preparedShowcase = read('src/lib/prepared-showcase-projects.ts')
const projectLinks = read('src/lib/project-links.ts')
const data = read('src/lib/data.ts')
const engagement = read('src/lib/project-engagement.ts')
const mockData = read('src/lib/mock-data.ts')

for (const project of sourceRunProjects) {
  const routeContent = read(project.route)
  mustInclude(project.route, routeContent, "from '@/components/SourceRunShowcase'", `${project.name} must use the shared source-run showcase`)
  mustInclude(project.route, routeContent, 'defaultStepNumber', `${project.name} must explicitly default the mounted artifact`)
  mustInclude(project.route, routeContent, 'ProjectEngagementBar', `${project.name} must keep the public project shell`)
  mustInclude(project.route, routeContent, 'ProjectCommunityPanel', `${project.name} must keep the community panel`)

  mustInclude('src/lib/featured-projects.ts', featuredProjects, project.projectId, `${project.name} must have a featured project id`)
  mustInclude('src/lib/prepared-showcase-projects.ts', preparedShowcase, project.showcaseExport, `${project.name} must have prepared showcase metadata`)
  mustInclude('src/lib/prepared-showcase-projects.ts', preparedShowcase, project.href, `${project.name} prepared showcase must point to its special route`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.projectId, `${project.name} must have a route override`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.href, `${project.name} route override must point to the special page`)
  mustInclude('src/lib/data.ts', data, project.projectId, `${project.name} must be approved in public fallback data`)
  mustInclude('src/lib/project-engagement.ts', engagement, project.projectId, `${project.name} must be non-persistable until a real prompts row exists`)
  mustInclude('src/lib/mock-data.ts', mockData, project.showcaseExport, `${project.name} must be present in mock prompt/profile data`)

  const pkg = parseJson(project.packagePath)
  if (!pkg) continue
  if (!Array.isArray(pkg.steps) || pkg.steps.length === 0) {
    failures.push(`${project.packagePath}: source-run package must have steps`)
    continue
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
}

if (failures.length > 0) {
  console.error('Source-run showcase guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run showcase guard passed.')
