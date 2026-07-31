import {
  getRequestPublicServerService,
} from '@/lib/build-requests/server'
import {
  createRequestPublicMaintenanceHttpHandler,
} from '@/lib/build-requests/request-public-maintenance-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createRequestPublicMaintenanceHttpHandler({
  readCronSecret: () => process.env.CRON_SECRET,
  createService: getRequestPublicServerService,
})
