import 'server-only'
import {
  createSupabaseServerClient,
  resolveSupabaseServerKey,
} from './server-client.mjs'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    throw new Error('Creating source-run drafts requires server-only Supabase credentials.')
  }

  return createSupabaseServerClient(
    supabaseUrl,
    resolveSupabaseServerKey(process.env),
  )
}
