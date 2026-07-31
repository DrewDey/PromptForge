import {
  getRequestPublicServerService,
} from '@/lib/build-requests/server'
import {
  createRequestNotificationHttpHandler,
} from '@/lib/build-requests/request-notification-http'
import {
  createRequestNotificationWorker,
  createResendRequestNotificationTransport,
} from '@/lib/build-requests/request-notification-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = createRequestNotificationHttpHandler({
  readCronSecret: () => process.env.CRON_SECRET,
  createWorker() {
    return createRequestNotificationWorker({
      service: getRequestPublicServerService(),
      concurrency: 10,
      transport: createResendRequestNotificationTransport(
        process.env.RESEND_API_KEY ?? '',
        process.env.REQUEST_BUILD_NOTIFICATION_FROM ?? '',
      ),
    })
  },
})
