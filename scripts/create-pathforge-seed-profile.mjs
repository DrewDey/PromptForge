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
    username: 'JordanLee',
    displayName: 'Jordan Lee',
    email: 'jordan.lee.seed@pathforge.invalid',
    bio: 'Explores practical AI build paths and small browser tools.',
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())
      args[key] = argv[i + 1]
      i += 1
    }
  }

  return args
}

function makePassword() {
  return `${randomBytes(32).toString('base64url')}aA1!`
}

function publicResult({ userId, username, displayName, email, bio, dryRun }) {
  return {
    dry_run: dryRun,
    user_id: userId,
    username,
    display_name: displayName,
    email,
    profile_url: `/user/${username}`,
    bio,
    password_stored: false,
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const args = parseArgs(process.argv.slice(2))
  const result = publicResult({
    userId: args.dryRun ? 'dry-run-user-id' : undefined,
    username: args.username,
    displayName: args.displayName,
    email: args.email,
    bio: args.bio,
    dryRun: args.dryRun,
  })

  if (args.dryRun) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Add it locally; never expose it as NEXT_PUBLIC_.')
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const password = makePassword()
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
    user_metadata: {
      username: args.username,
      display_name: args.displayName,
    },
  })

  if (createError) throw createError
  const userId = created.user?.id
  if (!userId) throw new Error('Supabase did not return a user id.')

  const now = new Date().toISOString()
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username: args.username,
      display_name: args.displayName,
      bio: args.bio,
      role: 'user',
      updated_at: now,
    }, { onConflict: 'id' })

  if (profileError) throw profileError

  console.log(JSON.stringify(publicResult({
    userId,
    username: args.username,
    displayName: args.displayName,
    email: args.email,
    bio: args.bio,
    dryRun: false,
  }), null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
