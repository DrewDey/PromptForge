import 'server-only'

import type {
  RequestNotificationDeliveryV1,
} from '@/lib/request-public-architecture'
import type {
  RequestPublicServerService,
} from '@/lib/request-public-service'
import { getAbsoluteSiteUrl } from '@/lib/site-url'

export type RequestNotificationWorkerResult = {
  controlEnabled: boolean
  eventsProjected: number
  reportsProjected: number
  claimed: number
  delivered: number
  suppressed: number
  retried: number
  dead: number
  failed: number
}

export interface RequestNotificationTransport {
  send(input: {
    idempotencyKey: string
    recipient: string
    subject: string
    text: string
  }): Promise<{ ok: true } | { ok: false; code: string }>
}

const copy: Record<
  RequestNotificationDeliveryV1['templateKey'],
  { subject: string; message: string }
> = {
  request_submitted: {
    subject: 'Your private PathForge request was received',
    message:
      'Your private Request a Build case has a new submission receipt.',
  },
  request_action_needed: {
    subject: 'Your private PathForge request needs attention',
    message:
      'A participant-safe next action is waiting in your private Request a Build case.',
  },
  request_delivery_ready: {
    subject: 'Your reviewed PathForge delivery is ready',
    message:
      'A reviewed delivery update is available in your private Request a Build case.',
  },
  request_status_changed: {
    subject: 'Your private PathForge request changed',
    message:
      'The status of your private Request a Build case changed.',
  },
  request_report_received: {
    subject: 'A private Request report needs operator review',
    message:
      'A participant report is waiting in the private Request a Build operations queue.',
  },
}

function normalizeTransportCode(value: string) {
  return /^[a-z][a-z0-9_]{0,63}$/.test(value)
    ? value
    : 'transport_failed'
}

function isMailbox(value: string) {
  return value.length >= 3 &&
    value.length <= 320 &&
    /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(value)
}

function isSender(value: string) {
  if (isMailbox(value)) return true
  if (value.length > 424 || /[\0\r\n]/.test(value)) return false
  const match = /^([^<>]{1,100}) <([^<>]+)>$/.exec(value)
  return Boolean(match && match[1].trim() === match[1] && isMailbox(match[2]))
}

export function createRequestNotificationWorker(dependencies: {
  service: RequestPublicServerService
  transport: RequestNotificationTransport
  concurrency?: number
}) {
  const requestedConcurrency = dependencies.concurrency ?? 5
  const concurrency = Math.max(
    1,
    Math.min(
      10,
      Number.isFinite(requestedConcurrency)
        ? Math.trunc(requestedConcurrency)
        : 5,
    ),
  )

  return {
    async run(limit = 50): Promise<RequestNotificationWorkerResult> {
      const boundedLimit = Number.isFinite(limit)
        ? Math.min(100, Math.max(1, Math.trunc(limit)))
        : 50
      const projection = await dependencies.service.projectNotifications(
        Math.min(500, boundedLimit),
      )
      const result: RequestNotificationWorkerResult = {
        controlEnabled: projection.controlEnabled,
        eventsProjected: projection.eventsProjected,
        reportsProjected: projection.reportsProjected,
        claimed: 0,
        delivered: 0,
        suppressed: 0,
        retried: 0,
        dead: 0,
        failed: 0,
      }
      if (!projection.controlEnabled) return result

      const claims = await dependencies.service.claimNotifications(
        boundedLimit,
      )
      result.claimed = claims.items.length
      for (let index = 0; index < claims.items.length; index += concurrency) {
        await Promise.all(
          claims.items.slice(index, index + concurrency).map(async (claim) => {
            let sendBinding: Awaited<
              ReturnType<RequestPublicServerService['resolveNotificationSend']>
            >
            try {
              sendBinding =
                await dependencies.service.resolveNotificationSend({
                  deliveryId: claim.deliveryId,
                  claimToken: claim.claimToken,
                })
            } catch {
              result.failed += 1
              return
            }
            if (sendBinding.status === 'suppressed') {
              result.suppressed += 1
              return
            }
            const template = copy[sendBinding.templateKey]
            let sent: Awaited<ReturnType<RequestNotificationTransport['send']>>
            try {
              // The authority resolver runs immediately before the external
              // transport call. No database transaction can cover a remote
              // provider send; provider idempotency closes retry ambiguity.
              sent = await dependencies.transport.send({
                idempotencyKey: sendBinding.deliveryId,
                recipient: sendBinding.recipient,
                subject: template.subject,
                text: `${template.message}\n\nOpen the private case: ${getAbsoluteSiteUrl(sendBinding.requestPath)}\n\nThis message contains no brief or delivery content.`,
              })
            } catch {
              sent = { ok: false, code: 'transport_failed' }
            }
            try {
              const finish = await dependencies.service.finishNotification({
                deliveryId: sendBinding.deliveryId,
                claimToken: sendBinding.claimToken,
                succeeded: sent.ok,
                errorCode: sent.ok
                  ? null
                  : normalizeTransportCode(sent.code),
              })
              if (finish.deliveryState === 'delivered') result.delivered += 1
              else if (finish.deliveryState === 'retry') result.retried += 1
              else result.dead += 1
            } catch {
              result.failed += 1
            }
          }),
        )
      }
      return result
    },
  }
}

export function createResendRequestNotificationTransport(
  apiKey: string,
  from: string,
): RequestNotificationTransport {
  const configured = !(
    apiKey.length < 20 ||
    apiKey.length > 256 ||
    /\s|[\0\r\n]/.test(apiKey) ||
    !isSender(from)
  )
  return {
    async send(input) {
      if (!configured) {
        return { ok: false, code: 'transport_unconfigured' }
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [input.recipient],
          subject: input.subject,
          text: input.text,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      })
      if (response.ok) return { ok: true }
      if (response.status === 429) {
        return { ok: false, code: 'provider_rate_limited' }
      }
      if (response.status >= 500) {
        return { ok: false, code: 'provider_unavailable' }
      }
      return { ok: false, code: 'provider_rejected' }
    },
  }
}
