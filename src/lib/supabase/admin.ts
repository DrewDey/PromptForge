import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Supabase's current server-only key format is `sb_secret_…`. Keep the
  // legacy service-role variable as a migration fallback so existing local
  // operations are not interrupted while deployment configuration changes.
  const serverKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serverKey) {
    throw new Error('Creating source-run drafts requires server-only Supabase credentials.')
  }

  return createClient(supabaseUrl, serverKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
