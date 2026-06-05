#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_BASE_URL = 'https://prompt-forge-sandy.vercel.app'
const SOURCE_PROJECT_FILE = 'src/lib/pending-source-run-showcases.ts'
const FEATURED_PROJECTS_FILE = 'src/lib/featured-projects.ts'

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.PATHFORGE_PUBLIC_BASE_URL || DEFAULT_BASE_URL,
    skipDb: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--skip-db') {
      args.skipDb = true
      continue
    }
    if (arg === '--base-url' && i + 1 < argv.length) {
      args.baseUrl = argv[i + 1]
      i += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  args.baseUrl = args.baseUrl.replace(/\/$/, '')
  return args
}

function read(path) {
  if (!existsSync(path)) throw new Error(`${path} does not exist.`)
  return readFileSync(path, 'utf8')
}

function loadEnvFile(path) {
  if (!existsSync(path)) return

  for (const line of read(path).split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, value] = match
    if (!process.env[key]) process.env[key] = value.replace(/^['"]|['"]$/g, '')
  }
}

function parseFeaturedProjectIds() {
  const constants = new Map()
  const content = read(FEATURED_PROJECTS_FILE)
  const pattern = /export const ([A-Z0-9_]+) = ['"]([^'"]+)['"]/g
  let match
  while ((match = pattern.exec(content))) {
    constants.set(match[1], match[2])
  }
  return constants
}

function stringField(block, fieldName) {
  const match = block.match(new RegExp(`${fieldName}:\\s*["']([^"']+)["']`))
  return match?.[1] ?? ''
}

function identifierField(block, fieldName) {
  const match = block.match(new RegExp(`${fieldName}:\\s*([A-Z0-9_]+)`))
  return match?.[1] ?? ''
}

function stringArrayFieldCount(block, fieldName) {
  const fieldIndex = block.indexOf(`${fieldName}: [`)
  if (fieldIndex === -1) return 0

  const arrayStart = block.indexOf('[', fieldIndex)
  if (arrayStart === -1) return 0

  let depth = 0
  let arrayEnd = -1
  for (let index = arrayStart; index < block.length; index += 1) {
    const char = block[index]
    if (char === '[') depth += 1
    if (char === ']') depth -= 1
    if (depth === 0) {
      arrayEnd = index
      break
    }
  }

  if (arrayEnd === -1) return 0
  const arrayBody = block.slice(arrayStart + 1, arrayEnd)
  const stringMatches = arrayBody.match(/"(?:[^"\\]|\\.)*"/g)
  return stringMatches?.length ?? 0
}

function parsePendingSourceRunProjects() {
  const featuredProjectIds = parseFeaturedProjectIds()
  const content = read(SOURCE_PROJECT_FILE)
  const projects = []
  const pattern = /export const ([A-Z0-9_]+)_SHOWCASE_PROJECT = buildPendingSourceRunProject\(\{([\s\S]*?)\n\}\)/g
  let match

  while ((match = pattern.exec(content))) {
    const [, exportName, block] = match
    const projectIdConstant = identifierField(block, 'projectId')
    const projectId = featuredProjectIds.get(projectIdConstant) ?? ''
    projects.push({
      exportName,
      projectIdConstant,
      projectId,
      sourceRunId: stringField(block, 'sourceRunId'),
      href: stringField(block, 'href'),
      title: stringField(block, 'title'),
      authorUsername: stringField(block, 'authorUsername'),
      expectedStepCount: stringArrayFieldCount(block, 'prompts'),
    })
  }

  return projects
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  })
  const text = await response.text()
  return { status: response.status, text, url }
}

function hasSourceRunStandardMarkup(html) {
  return (
    html.includes('data-source-run-node="prompt"') &&
    html.includes('data-source-run-node="response"') &&
    html.includes('Source-run path') &&
    html.includes('Fork this path')
  )
}

function verifyCatalogUniqueness(projects, failures) {
  const checks = [
    ['projectId', 'project id'],
    ['sourceRunId', 'source-run id'],
    ['href', 'public href'],
  ]

  for (const [field, label] of checks) {
    const seen = new Map()
    for (const project of projects) {
      const value = project[field]
      if (!value) continue
      const existing = seen.get(value)
      if (existing) {
        failures.push(`catalog: duplicate ${label} "${value}" in ${existing.exportName} and ${project.exportName}`)
      } else {
        seen.set(value, project)
      }
    }
  }

  const titleAuthorSeen = new Map()
  for (const project of projects) {
    if (!project.title || !project.authorUsername) continue
    const key = `${project.authorUsername}::${project.title}`
    const existing = titleAuthorSeen.get(key)
    if (existing) {
      failures.push(`catalog: duplicate author/title "${project.title}" for ${project.authorUsername} in ${existing.exportName} and ${project.exportName}`)
    } else {
      titleAuthorSeen.set(key, project)
    }
  }
}

async function verifyPublicPages(baseUrl, projects, failures) {
  for (const project of projects) {
    const page = await fetchText(`${baseUrl}${project.href}`)
    if (page.status !== 200) {
      failures.push(`${project.href}: expected HTTP 200, got ${page.status}`)
      continue
    }
    if (!page.text.includes(project.title)) {
      failures.push(`${project.href}: missing project title "${project.title}"`)
    }
    if (!hasSourceRunStandardMarkup(page.text)) {
      failures.push(`${project.href}: missing shared source-run prompt/response/fork markup`)
    }
  }
}

async function verifyPathsListing(baseUrl, projects, failures) {
  const listing = await fetchText(`${baseUrl}/paths?panel=open`)
  if (listing.status !== 200) {
    failures.push(`/paths?panel=open: expected HTTP 200, got ${listing.status}`)
    return
  }

  for (const project of projects) {
    if (!listing.text.includes(project.href)) {
      failures.push(`/paths?panel=open: missing ${project.href}`)
    }
    if (!listing.text.includes(project.title)) {
      failures.push(`/paths?panel=open: missing title "${project.title}"`)
    }
  }
}

async function verifyProfiles(baseUrl, projects, failures) {
  for (const project of projects) {
    const profile = await fetchText(`${baseUrl}/user/${project.authorUsername}`)
    if (profile.status !== 200) {
      failures.push(`/user/${project.authorUsername}: expected HTTP 200, got ${profile.status}`)
      continue
    }
    if (!profile.text.includes(project.title)) {
      failures.push(`/user/${project.authorUsername}: missing "${project.title}"`)
    }
  }
}

async function verifyPublicDatabase(projects, failures) {
  loadEnvFile('.env.local')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    failures.push('Public database verification needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, anonKey)
  const projectIds = projects.map((project) => project.projectId)
  const { data, error } = await supabase
    .from('prompts')
    .select('id,title,status,author:profiles(username)')
    .in('id', projectIds)

  if (error) {
    failures.push(`public prompts query failed: ${error.message}`)
    return
  }

  const { data: stepRows, error: stepsError } = await supabase
    .from('prompt_steps')
    .select('prompt_id,step_number,title')
    .in('prompt_id', projectIds)

  if (stepsError) {
    failures.push(`public prompt_steps query failed: ${stepsError.message}`)
    return
  }

  const stepsByPromptId = new Map()
  for (const step of stepRows ?? []) {
    const steps = stepsByPromptId.get(step.prompt_id) ?? []
    steps.push(step)
    stepsByPromptId.set(step.prompt_id, steps)
  }

  const rowsById = new Map((data ?? []).map((row) => [row.id, row]))
  for (const project of projects) {
    const row = rowsById.get(project.projectId)
    if (!row) {
      failures.push(`prompts: missing public row for ${project.title} (${project.projectId})`)
      continue
    }
    if (row.status !== 'approved') {
      failures.push(`prompts: ${project.title} should be approved, got ${row.status}`)
    }
    if (row.title !== project.title) {
      failures.push(`prompts: ${project.projectId} title mismatch: ${row.title}`)
    }
    if (row.author?.username !== project.authorUsername) {
      failures.push(`prompts: ${project.title} author mismatch: ${row.author?.username ?? 'none'}`)
    }

    const steps = (stepsByPromptId.get(project.projectId) ?? [])
      .sort((a, b) => a.step_number - b.step_number)
    if (steps.length !== project.expectedStepCount) {
      failures.push(`prompt_steps: ${project.title} expected ${project.expectedStepCount}, got ${steps.length}`)
    }
    for (let index = 0; index < steps.length; index += 1) {
      if (steps[index].step_number !== index + 1) {
        failures.push(`prompt_steps: ${project.title} has non-sequential step ${steps[index].step_number}`)
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const failures = []
  const projects = parsePendingSourceRunProjects()

  if (projects.length === 0) {
    throw new Error(`No source-run projects parsed from ${SOURCE_PROJECT_FILE}.`)
  }

  for (const project of projects) {
    if (!project.projectId) failures.push(`${project.exportName}: missing project id for ${project.projectIdConstant}`)
    if (!project.sourceRunId) failures.push(`${project.exportName}: missing sourceRunId`)
    if (!project.href) failures.push(`${project.exportName}: missing href`)
    if (!project.title) failures.push(`${project.exportName}: missing title`)
    if (!project.authorUsername) failures.push(`${project.exportName}: missing authorUsername`)
    if (project.expectedStepCount === 0) failures.push(`${project.exportName}: missing parsed prompt steps`)
  }

  verifyCatalogUniqueness(projects, failures)
  await verifyPublicPages(args.baseUrl, projects, failures)
  await verifyPathsListing(args.baseUrl, projects, failures)
  await verifyProfiles(args.baseUrl, projects, failures)
  if (!args.skipDb) await verifyPublicDatabase(projects, failures)

  if (failures.length > 0) {
    console.error('Source-run publication verification failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log(JSON.stringify({
    ok: true,
    base_url: args.baseUrl,
    verified_projects: projects.length,
    checked: [
      'direct public routes',
      'shared source-run markup',
      '/paths?panel=open listing',
      'author profile pages',
      'catalog duplicate checks',
      args.skipDb ? 'public database skipped' : 'public database rows and prompt steps',
    ],
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
