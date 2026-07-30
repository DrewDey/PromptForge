import 'server-only'

import {
  DeliveryCustodyError,
  type DeliveryCustodyScope,
} from './delivery-custody-contract'

const AUTHORITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
// PM1 creates the final path segment with PostgreSQL gen_random_uuid(), which
// is a version 4 UUID. It is not an actor-supplied authority identifier.
const SERVER_OBJECT_NONCE = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

export function assertDeliveryAuthorityId(value: string) {
  if (typeof value !== 'string' || !AUTHORITY_ID.test(value)) {
    throw new DeliveryCustodyError('invalid_input')
  }
  return value.toLowerCase()
}

export function normalizeDeliveryCustodyScope(
  scope: DeliveryCustodyScope,
): DeliveryCustodyScope {
  return {
    requestId: assertDeliveryAuthorityId(scope.requestId),
    deliveryRevisionId: assertDeliveryAuthorityId(scope.deliveryRevisionId),
    acceptedBriefRevisionId: assertDeliveryAuthorityId(scope.acceptedBriefRevisionId),
    builderAssignmentId: assertDeliveryAuthorityId(scope.builderAssignmentId),
  }
}

/**
 * Validate the exact private object identity allocated by PM1's service-only
 * custody authority. This module never creates an identity and never exposes
 * one to a browser.
 */
export function buildDeliveryObjectKeys(input: {
  scope: DeliveryCustodyScope
  artifactId: string
  stagingIdentity: string
}) {
  const scope = normalizeDeliveryCustodyScope(input.scope)
  const artifactId = assertDeliveryAuthorityId(input.artifactId)
  const expectedIdentity = new RegExp(
    `^requests/${scope.requestId}/deliveries/${scope.deliveryRevisionId}/artifacts/${artifactId}/${SERVER_OBJECT_NONCE}$`,
    'i',
  )
  if (!expectedIdentity.test(input.stagingIdentity)) {
    throw new DeliveryCustodyError('invalid_input')
  }
  const objectIdentity = input.stagingIdentity.toLowerCase()
  return {
    objectIdentity,
    objectPrefix: objectIdentity.slice(0, objectIdentity.lastIndexOf('/') + 1),
    revisionPrefix: `requests/${scope.requestId}/deliveries/${scope.deliveryRevisionId}/`,
  }
}
