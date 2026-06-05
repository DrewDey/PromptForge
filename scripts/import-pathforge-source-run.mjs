#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}

function parseArgs(argv) {
  const args = {
    package: '',
    username: 'JordanLee',
    displayName: 'Jordan Lee',
    email: '',
    authMode: 'auto',
    passwordEnv: 'PATHFORGE_SEED_PASSWORD',
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (arg === '--submit-draft') {
      throw new Error(
        '--submit-draft has been disabled. Source-run imports may only create ' +
        'source_run_submissions queue entries. Build/public prompt pages must be ' +
        'created later by an explicit admin review/publish step.'
      )
    }
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())
      args[key] = argv[i + 1]
      i += 1
    }
  }

  if (!args.package) {
    throw new Error('Usage: node scripts/import-pathforge-source-run.mjs --package seed-runs/example.json [--username JordanLee] [--auth-mode auto|public-signup|password] [--dry-run]')
  }

  return args
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Seed package is missing ${fieldName}.`)
  }
  return value.trim()
}

function optionalString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatModelSettings(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(optionalString).filter(Boolean).join('; ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entry]) => {
        const text = typeof entry === 'string' ? entry.trim() : JSON.stringify(entry)
        return text ? `${key}: ${text}` : ''
      })
      .filter(Boolean)
      .join('; ')
  }
  return String(value).trim()
}

function packageNotes(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim()
        if (entry && typeof entry === 'object') return JSON.stringify(entry)
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function makeAgentNotes(pkg) {
  const provider = optionalString(pkg.provider)
  const modelUsed = optionalString(pkg.model || pkg.model_used)
  const modelSettings = formatModelSettings(pkg.model_settings)
  const notes = packageNotes(pkg.agent_notes)

  return [
    `Provider: ${provider || 'Not specified'}`,
    `Model used: ${modelUsed || 'Not specified'}`,
    `Model settings: ${modelSettings || 'Not specified'}`,
    notes,
  ].filter(Boolean).join('\n\n')
}

function publicResult({ sourceRunId, pkg, profile, dryRun, loginIdentifier }) {
  const result = {
    dry_run: dryRun,
    mode: 'source-run-intake',
    title: pkg.title,
    status: 'queued',
    author_username: profile?.username ?? null,
    author_profile_url: profile?.username ? `/user/${profile.username}` : null,
    profile_id: profile?.id ?? null,
    source_url: pkg.source_url || null,
    artifact_path: pkg.final_artifact_path || null,
    login_identifier: loginIdentifier ?? null,
    deduplicated: Boolean(pkg.deduplicated),
  }

  return {
    ...result,
    source_run_submission_id: sourceRunId,
    admin_queue: 'pending review',
    next_step: 'Admin reviews the source-run intake. No prompt/upvote page is created by this importer.',
  }
}

function makePassword() {
  return `${randomBytes(32).toString('base64url')}aA1!`
}

function makeSyntheticEmail(username) {
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${username.toLowerCase()}.${suffix}@pathforge-seed.example.com`
}

async function createServiceRoleClient(supabaseUrl, serviceRoleKey) {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function createSyntheticSessionClient(supabaseUrl, anonKey, args) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const email = args.email || makeSyntheticEmail(args.username)
  const password = makePassword()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: args.username,
        display_name: args.displayName,
      },
    },
  })

  if (error) throw error
  if (!data.session || !data.user) {
    throw new Error('Public signup created no active session. Email confirmation is probably required; use the service-role provisioner path.')
  }

  return {
    supabase,
    profile: {
      id: data.user.id,
      username: args.username,
    },
    createdEmail: email,
  }
}

async function createPasswordSessionClient(supabaseUrl, anonKey, args) {
  const password = process.env[args.passwordEnv]
  if (!args.email) {
    throw new Error('Password auth mode requires --email for the existing seed profile.')
  }
  if (!password) {
    throw new Error(`Password auth mode requires ${args.passwordEnv} in the environment. Do not put it in source or the profile registry.`)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: args.email,
    password,
  })

  if (error) throw error
  if (!data.session || !data.user) {
    throw new Error('Password sign-in did not return an active session.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw new Error('Signed-in user has no PathForge profile row.')

  return {
    supabase,
    profile,
    loginIdentifier: args.email,
  }
}

async function insertSourceRunSubmission(importClient, pkg, profile) {
  const sourceUrl = requireString(pkg.source_url, 'source_url')
  async function findExistingSourceRun() {
    const { data: existingRows, error: existingError } = await importClient
      .from('source_run_submissions')
      .select('id')
      .eq('author_id', profile.id)
      .eq('source_url', sourceUrl)
      .neq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingError) throw existingError
    return existingRows?.[0] ?? null
  }
  function activeSourceRunDuplicate(error) {
    const message = String(error?.message || '').toLowerCase()
    return error?.code === '23505' && (
      message.includes('idx_source_run_submissions_active_author_source_url') ||
      message.includes('source_run_submissions')
    )
  }

  const existingRow = await findExistingSourceRun()
  if (existingRow?.id) return { id: existingRow.id, deduplicated: true }

  const payload = {
    title: pkg.title,
    source_url: sourceUrl,
    file_name: null,
    notes: makeAgentNotes(pkg),
    author_id: profile.id,
    status: 'queued',
  }

  const { data, error } = await importClient
    .from('source_run_submissions')
    .insert(payload)
    .select('id')
    .single()

  if (!error) return { ...data, deduplicated: false }
  if (activeSourceRunDuplicate(error)) {
    const duplicateRow = await findExistingSourceRun()
    if (duplicateRow?.id) return { id: duplicateRow.id, deduplicated: true }
  }

  const message = String(error.message || '').toLowerCase()
  if (error.code !== '42703' && !(message.includes('title') && message.includes('source_run_submissions'))) {
    throw error
  }

  const { data: fallbackData, error: fallbackError } = await importClient
    .from('source_run_submissions')
    .insert({
      source_url: sourceUrl,
      file_name: null,
      notes: [`Title: ${pkg.title}`, payload.notes].join('\n\n'),
      author_id: profile.id,
      status: 'queued',
    })
    .select('id')
    .single()

  if (activeSourceRunDuplicate(fallbackError)) {
    const duplicateRow = await findExistingSourceRun()
    if (duplicateRow?.id) return { id: duplicateRow.id, deduplicated: true }
  }
  if (fallbackError) throw fallbackError
  return { ...fallbackData, deduplicated: false }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const args = parseArgs(process.argv.slice(2))
  const packagePath = resolve(process.cwd(), args.package)
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))

  pkg.title = requireString(pkg.title, 'title')
  pkg.source_url = requireString(pkg.source_url, 'source_url')
  pkg.provider = requireString(pkg.provider, 'provider')
  pkg.model = requireString(pkg.model || pkg.model_used, 'model')

  if (args.dryRun) {
    console.log(JSON.stringify(publicResult({
      sourceRunId: 'dry-run-source-run-submission-id',
      pkg,
      profile: {
        id: 'dry-run-user-id',
        username: args.username,
      },
      dryRun: true,
    }), null, 2))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.')

  const useServiceRole = serviceRoleKey && !['public-signup', 'password'].includes(args.authMode)
  const supabase = useServiceRole
    ? await createServiceRoleClient(supabaseUrl, serviceRoleKey)
    : null

  let profile
  let importClient = supabase
  let createdEmail = null
  let loginIdentifier = null

  if (useServiceRole) {
    const { data: foundProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', args.username)
      .maybeSingle()

    if (profileError) throw profileError
    if (!foundProfile) {
      throw new Error(`No profile found for ${args.username}. Run scripts/create-pathforge-seed-profile.mjs first.`)
    }

    profile = foundProfile
  } else if (args.authMode === 'password') {
    const signedIn = await createPasswordSessionClient(supabaseUrl, anonKey, args)
    importClient = signedIn.supabase
    profile = signedIn.profile
    loginIdentifier = signedIn.loginIdentifier
  } else {
    const created = await createSyntheticSessionClient(supabaseUrl, anonKey, args)
    importClient = created.supabase
    profile = created.profile
    createdEmail = created.createdEmail
    loginIdentifier = created.createdEmail
  }

  const sourceRun = await insertSourceRunSubmission(importClient, pkg, profile)
  pkg.deduplicated = sourceRun.deduplicated

  console.log(JSON.stringify(publicResult({
    sourceRunId: sourceRun.id,
    pkg,
    profile,
    dryRun: false,
    loginIdentifier,
  }), null, 2))

  if (createdEmail) {
    console.error(`Synthetic signup email used: ${createdEmail}`)
    console.error('Generated password was not stored or printed.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
