#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const SOURCE_PROJECT_FILE = 'src/lib/pending-source-run-showcases.ts'
const FEATURED_PROJECTS_FILE = 'src/lib/featured-projects.ts'

function parseArgs(argv) {
  const args = {
    apply: false,
    sql: false,
  }

  for (const arg of argv) {
    if (arg === '--apply') {
      args.apply = true
      continue
    }
    if (arg === '--sql') {
      args.sql = true
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (args.apply && args.sql) {
    throw new Error('Use either --apply or --sql, not both.')
  }

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

function stringArrayField(block, fieldName) {
  const fieldIndex = block.indexOf(`${fieldName}: [`)
  if (fieldIndex === -1) return []

  const arrayStart = block.indexOf('[', fieldIndex)
  if (arrayStart === -1) return []

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

  if (arrayEnd === -1) return []
  const arrayBody = block.slice(arrayStart + 1, arrayEnd)
  return (arrayBody.match(/"(?:[^"\\]|\\.)*"/g) ?? []).map((value) => JSON.parse(value))
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
    const prompts = stringArrayField(block, 'prompts')
    if (!projectId || prompts.length === 0) {
      throw new Error(`${exportName}: could not parse project id or prompts.`)
    }

    projects.push({
      exportName,
      projectId,
      title: stringField(block, 'title'),
      createdAt: stringField(block, 'createdAt'),
      prompts,
    })
  }

  return projects
}

function stepRowsForProjects(projects) {
  return projects.flatMap((project) => (
    project.prompts.map((prompt, index) => ({
      prompt_id: project.projectId,
      step_number: index + 1,
      title: index === 0 ? 'Start the build' : `Refine the build ${index + 1}`,
      content: prompt,
      result_content: null,
      description: index === project.prompts.length - 1
        ? 'Final response package that produced the mounted public artifact.'
        : 'Captured source-run prompt preserved before its response package.',
      created_at: project.createdAt,
    }))
  ))
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function buildBackfillSql(projects, rows) {
  const projectIds = projects.map((project) => sqlLiteral(project.projectId)).join(',\n  ')
  const values = rows.map((row) => `(
  ${sqlLiteral(row.prompt_id)},
  ${row.step_number},
  ${sqlLiteral(row.title)},
  ${sqlLiteral(row.content)},
  ${sqlLiteral(row.result_content)},
  ${sqlLiteral(row.description)},
  ${sqlLiteral(row.created_at)}
)`).join(',\n')

  return [
    '-- Prepared source-run prompt_steps backfill.',
    `-- Projects: ${projects.length}`,
    `-- Prompt steps: ${rows.length}`,
    'begin;',
    '',
    'delete from public.prompt_steps',
    'where prompt_id in (',
    `  ${projectIds}`,
    ');',
    '',
    'insert into public.prompt_steps (',
    '  prompt_id,',
    '  step_number,',
    '  title,',
    '  content,',
    '  result_content,',
    '  description,',
    '  created_at',
    ') values',
    `${values};`,
    '',
    'commit;',
  ].join('\n')
}

async function assertPromptStepsForProjects(supabase, projects) {
  const projectIds = projects.map((project) => project.projectId)
  const { data, error } = await supabase
    .from('prompt_steps')
    .select('prompt_id,step_number,title')
    .in('prompt_id', projectIds)

  if (error) throw error

  const stepsByPromptId = new Map()
  for (const row of data ?? []) {
    const rows = stepsByPromptId.get(row.prompt_id) ?? []
    rows.push(row)
    stepsByPromptId.set(row.prompt_id, rows)
  }

  for (const project of projects) {
    const rows = (stepsByPromptId.get(project.projectId) ?? [])
      .sort((a, b) => a.step_number - b.step_number)
    if (rows.length !== project.prompts.length) {
      throw new Error(`${project.title}: expected ${project.prompts.length} prompt steps after backfill, found ${rows.length}.`)
    }
    for (let index = 0; index < rows.length; index += 1) {
      if (rows[index].step_number !== index + 1) {
        throw new Error(`${project.title}: non-sequential prompt step ${rows[index].step_number} after backfill.`)
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const projects = parsePendingSourceRunProjects()
  const rows = stepRowsForProjects(projects)

  if (!args.apply) {
    if (args.sql) {
      console.log(buildBackfillSql(projects, rows))
      return
    }

    console.log(JSON.stringify({
      dry_run: true,
      projects: projects.length,
      prompt_steps: rows.length,
      next_step: 'Run with --apply and SUPABASE_SERVICE_ROLE_KEY, or run with --sql to print a reviewed SQL transaction for the Supabase SQL editor.',
    }, null, 2))
    return
  }

  loadEnvFile('.env.local')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Refusing to backfill with public credentials.')

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const projectIds = projects.map((project) => project.projectId)

  const { error: deleteError } = await supabase
    .from('prompt_steps')
    .delete()
    .in('prompt_id', projectIds)

  if (deleteError) throw deleteError

  const { error: insertError } = await supabase
    .from('prompt_steps')
    .insert(rows)

  if (insertError) throw insertError
  await assertPromptStepsForProjects(supabase, projects)

  console.log(JSON.stringify({
    ok: true,
    projects: projects.length,
    prompt_steps: rows.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
