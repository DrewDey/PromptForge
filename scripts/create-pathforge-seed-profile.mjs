#!/usr/bin/env node

import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createSupabaseServerClient,
  resolveSupabaseServerKey,
} from '../src/lib/supabase/server-client.mjs'
import {
  assertAuthoritativePreparedLegacyProfileBinding,
  assertPreparedLegacyPackageBinding,
  preparedLegacySourceRunBindings,
} from '../src/lib/prepared-legacy-source-runs.mjs'

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
    displayName: '',
    email: '',
    bio: 'PathForge-operated seed builder for verified source-run projects.',
    package: '',
    dryRun: false,
    usernameExplicit: false,
    displayNameExplicit: false,
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
      if (key === 'username') args.usernameExplicit = true
      if (key === 'displayName') args.displayNameExplicit = true
      i += 1
    }
  }

  args.displayName = args.displayName.trim() || args.username
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .trim()
  args.email = args.email.trim()

  return args
}

function loadPreparedBinding(args) {
  if (!args.package) return null
  const packagePath = resolve(process.cwd(), args.package)
  const seedRunsRoot = resolve(process.cwd(), 'seed-runs')
  if (!packagePath.startsWith(`${seedRunsRoot}/`)) {
    throw new Error('--package must point to a JSON file under seed-runs/.')
  }
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
  const binding = assertPreparedLegacyPackageBinding(pkg)
  if (!binding) {
    throw new Error('--package must name a registered prepared legacy source-run package.')
  }
  if (args.usernameExplicit && args.username !== binding.username) {
    throw new Error(`Package requires username ${binding.username}.`)
  }
  if (args.displayNameExplicit && args.displayName !== binding.displayName) {
    throw new Error(`Package requires display name ${binding.displayName}.`)
  }
  args.username = binding.username
  args.displayName = binding.displayName
  args.email = args.email.trim() || makeSyntheticEmail(args.username)
  return binding
}

function makePassword() {
  return `${randomBytes(32).toString('base64url')}aA1!`
}

function makeSyntheticEmail(username) {
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${username.toLowerCase()}.${suffix}@pathforge-seed.example.com`
}

function publicResult({
  userId,
  username,
  displayName,
  email,
  bio,
  dryRun,
  binding = null,
  existing = false,
}) {
  return {
    dry_run: dryRun,
    user_id: userId,
    username,
    display_name: displayName,
    email,
    profile_url: `/user/${username}`,
    bio,
    registry_id: binding?.registryId ?? null,
    prepared_project_id: binding?.projectId ?? null,
    source_run_id: binding?.sourceRunId ?? null,
    existing,
    password_stored: false,
  }
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, character => `\\${character}`)
}

async function readVerifiedProfile(supabase, binding, username) {
  const { data: matches, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, role')
    .ilike('username', escapeLikePattern(username))
    .limit(5)
  if (profileError) throw profileError
  const exactMatches = (matches ?? []).filter(
    (profile) => profile.username?.toLowerCase() === username.toLowerCase(),
  )
  if (exactMatches.length > 1) {
    throw new Error(`Multiple profiles resolve to ${username}.`)
  }
  const profile = exactMatches[0]
  if (!profile) return null

  if (binding) {
    const { data: verifiedRows, error: verifiedError } = await supabase.rpc(
      'check_prepared_legacy_seed_profile_binding',
      {
        target_profile_id: profile.id,
        expected_username: binding.username,
        expected_display_name: binding.displayName,
      },
    )
    if (verifiedError) throw verifiedError
    const verified = Array.isArray(verifiedRows) ? verifiedRows[0] : verifiedRows
    if (!verified || verified.profile_id !== profile.id) {
      throw new Error(
        `${username} exists but lacks its confirmed private seed-operator binding.`,
      )
    }
    assertAuthoritativePreparedLegacyProfileBinding(binding, verified)
    return {
      id: verified.profile_id,
      username: verified.username,
      display_name: verified.display_name,
      role: verified.role,
    }
  }

  const { data: provenance, error: provenanceError } = await supabase
    .from('profile_provenance')
    .select('profile_id, kind')
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (provenanceError) throw provenanceError
  if (profile.role !== 'user' || provenance?.kind !== 'pathforge_seed') {
    throw new Error(`${username} exists but is not a non-admin PathForge seed profile.`)
  }
  return profile
}

async function findAuthUsersByPreparedUsername(supabase, username) {
  const normalizedUsername = username.toLowerCase()
  const matches = []
  const perPage = 200

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) throw error
    const users = data?.users ?? []
    for (const user of users) {
      const authUsername = typeof user.user_metadata?.username === 'string'
        ? user.user_metadata.username.trim().toLowerCase()
        : ''
      const normalizedEmail = typeof user.email === 'string'
        ? user.email.trim().toLowerCase()
        : ''
      const controlledEmailMatch = normalizedEmail.startsWith(
        `${normalizedUsername}.`,
      ) && normalizedEmail.endsWith('@pathforge-seed.example.com')
      if (
        authUsername === normalizedUsername ||
        controlledEmailMatch
      ) {
        matches.push(user)
      }
    }
    if (users.length < perPage) break
    if (page === 100) {
      throw new Error(
        `Auth reconciliation for ${username} exceeded the bounded user scan.`,
      )
    }
  }

  return matches
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env.local'))

  const args = parseArgs(process.argv.slice(2))
  const binding = loadPreparedBinding(args)
  const protectedHandle = preparedLegacySourceRunBindings().find(
    (candidate) => (
      candidate.username.toLowerCase() === args.username.toLowerCase()
    ),
  )
  if (protectedHandle && !binding) {
    throw new Error(
      `Protected seed handle ${protectedHandle.username} may only be provisioned from its exact prepared package.`,
    )
  }
  args.email = args.email || makeSyntheticEmail(args.username)
  const result = publicResult({
    userId: args.dryRun ? 'dry-run-user-id' : undefined,
    username: args.username,
    displayName: args.displayName,
    email: args.email,
    bio: args.bio,
    dryRun: args.dryRun,
    binding,
  })

  if (args.dryRun) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serverKey = resolveSupabaseServerKey(process.env)

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  }
  const supabase = createSupabaseServerClient(supabaseUrl, serverKey)
  const existingProfile = await readVerifiedProfile(
    supabase,
    binding,
    args.username,
  )
  if (existingProfile) {
    console.log(JSON.stringify(publicResult({
      userId: existingProfile.id,
      username: existingProfile.username,
      displayName: existingProfile.display_name,
      email: null,
      bio: args.bio,
      dryRun: false,
      binding,
      existing: true,
    }), null, 2))
    return
  }

  if (binding) {
    const authMatches = await findAuthUsersByPreparedUsername(
      supabase,
      binding.username,
    )
    if (authMatches.length > 0) {
      throw new Error(
        `${binding.username} has ${authMatches.length} Auth ${
          authMatches.length === 1 ? 'identity' : 'identities'
        } without the exact verified profile binding. Repair that partial account before provisioning; no duplicate was created.`,
      )
    }
  }

  const password = makePassword()
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
    app_metadata: {
      pathforge_seed: true,
    },
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

  const verifiedProfile = await readVerifiedProfile(supabase, binding, args.username)
  if (!verifiedProfile || verifiedProfile.id !== userId) {
    throw new Error('Created seed profile failed exact identity and provenance readback.')
  }

  console.log(JSON.stringify(publicResult({
    userId,
    username: args.username,
    displayName: args.displayName,
    email: args.email,
    bio: args.bio,
    dryRun: false,
    binding,
  }), null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
