import 'server-only'

import { createHash } from 'node:crypto'
import { RequestContractError } from '@/lib/request-lifecycle'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function requestDeliveryReceiptEmissionKey(commandId: string) {
  if (!UUID.test(commandId)) {
    throw new RequestContractError('Delivery receipt is invalid.')
  }
  const digest = createHash('sha256')
    .update(`request-delivery-outcome:${commandId}`)
    .digest('base64url')
    .slice(0, 32)
  return `delivery-outcome-event:${digest}`
}
