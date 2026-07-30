import {
  createRequestDeliveryMaintenanceRunner,
} from '@/lib/build-requests/delivery-retention-runner'
import {
  createDeliverySupabaseStorage,
} from '@/lib/build-requests/delivery-supabase-storage'
import {
  createRequestBuildMaintenanceHttpHandler,
} from '@/lib/build-requests/request-maintenance-http'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily, service-role Request retention worker.
 *
 * The HTTP boundary authenticates before invoking this factory, so malformed
 * or missing scheduler credentials cannot construct an admin client, inspect
 * maintenance work, or touch the private storage bucket.
 */
export const GET = createRequestBuildMaintenanceHttpHandler({
  readCronSecret: () => process.env.CRON_SECRET,
  createRunner() {
    const admin = createAdminClient()
    return createRequestDeliveryMaintenanceRunner({
      serviceRoleClient: admin,
      storage: createDeliverySupabaseStorage(admin),
    })
  },
})
