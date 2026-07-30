export const REQUEST_DELIVERY_PREPARE_ROUTE = '/api/request-deliveries/prepare'
export const REQUEST_DELIVERY_UPLOAD_ROUTE = '/api/request-deliveries/artifacts'
export const REQUEST_DELIVERY_SUBMIT_ROUTE = '/api/request-deliveries/submit'

const SAFE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  auth_required: 'Sign in again before continuing this private delivery.',
  forbidden: 'The current participant is not allowed to perform this delivery action.',
  held: 'This case is held. Delivery work is unavailable.',
  removed: 'This case was removed. Delivery work is unavailable.',
  stale_version: 'The case changed. Reload and try the action again.',
  rate_limited: 'Too many delivery attempts were made. Wait briefly and try again.',
  artifact_staging_limit: 'This revision reached its lifetime staging limit. Begin a fresh authorized repair or revision path if one is available.',
  invalid_upload: 'The file did not meet the private delivery requirements.',
  integrity_failed: 'The file could not pass the private integrity check.',
  unavailable: 'The private delivery service is temporarily unavailable.',
}

export class DeliveryUiError extends Error {}

export async function safeDeliveryJson(response: Response) {
  try {
    return await response.json() as Record<string, unknown>
  } catch {
    return {}
  }
}

export function safeDeliveryError(
  payload: Record<string, unknown>,
  fallback: string,
) {
  return typeof payload.code === 'string'
    ? SAFE_ERROR_MESSAGES[payload.code] ?? fallback
    : fallback
}

export function requestDeliveryReceiptVersion(
  payload: Record<string, unknown>,
  expected: {
    minimumVersion: number
    requireArtifactId?: boolean
  },
) {
  if (
    typeof payload.requestVersion !== 'number'
    || !Number.isSafeInteger(payload.requestVersion)
    || payload.requestVersion < expected.minimumVersion
    || (
      expected.requireArtifactId
      && (
        typeof payload.artifactId !== 'string'
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          payload.artifactId,
        )
      )
    )
  ) {
    throw new DeliveryUiError('The delivery authority returned an inconsistent receipt.')
  }
  return payload.requestVersion
}

export type RequestDeliveryArtifactIntent = {
  artifactOrdinal: number
  clientFileId: string
  file: File
}

export type RequestDeliveryPreparationIntent = {
  revisionLabel: FormDataEntryValue | null
  summary: FormDataEntryValue | null
  builderEvidence: readonly {
    acceptanceCheckId: string
    result: FormDataEntryValue | null
    evidenceText: FormDataEntryValue | null
    evidenceRef: null
  }[]
  builderAttestation: FormDataEntryValue | null
} | null

export async function executeRequestDeliveryOneClickFlow(input: {
  requestId: string
  deliveryRevisionId: string
  expectedVersion: number
  artifacts: readonly RequestDeliveryArtifactIntent[]
  preparation: RequestDeliveryPreparationIntent
  fetcher?: typeof fetch
  onProgress?: (message: string) => void
}) {
  const fetcher = input.fetcher ?? fetch
  let requestVersion = input.expectedVersion

  for (const [index, artifact] of input.artifacts.entries()) {
    input.onProgress?.(
      `Securing file ${index + 1} of ${input.artifacts.length}…`,
    )
    const upload = new FormData()
    upload.set('requestId', input.requestId)
    upload.set('expectedVersion', String(requestVersion))
    upload.set('deliveryRevisionId', input.deliveryRevisionId)
    upload.set('artifactOrdinal', String(artifact.artifactOrdinal))
    upload.set('clientFileId', artifact.clientFileId)
    upload.set(
      'idempotencyKey',
      `delivery-stage-${input.deliveryRevisionId}-${artifact.artifactOrdinal}-${artifact.clientFileId}`,
    )
    upload.set('artifact', artifact.file)
    const response = await fetcher(REQUEST_DELIVERY_UPLOAD_ROUTE, {
      method: 'POST',
      body: upload,
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    const payload = await safeDeliveryJson(response)
    if (!response.ok) {
      throw new DeliveryUiError(safeDeliveryError(
        payload,
        `File ${index + 1} could not be secured.`,
      ))
    }
    requestVersion = requestDeliveryReceiptVersion(payload, {
      minimumVersion: requestVersion,
      requireArtifactId: true,
    })
  }

  if (input.preparation) {
    input.onProgress?.('Preparing the exact evidence and rights record…')
    const response = await fetcher(REQUEST_DELIVERY_PREPARE_ROUTE, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: input.requestId,
        expectedVersion: requestVersion,
        deliveryRevisionId: input.deliveryRevisionId,
        idempotencyKey: `delivery-prepare-${input.deliveryRevisionId}`,
        revisionLabel: input.preparation.revisionLabel,
        summary: input.preparation.summary,
        builderEvidence: input.preparation.builderEvidence,
        builderAttestation: input.preparation.builderAttestation,
      }),
    })
    const payload = await safeDeliveryJson(response)
    if (!response.ok) {
      throw new DeliveryUiError(safeDeliveryError(
        payload,
        'The delivery revision could not be prepared.',
      ))
    }
    requestVersion = requestDeliveryReceiptVersion(payload, {
      minimumVersion: requestVersion,
    })
  }

  input.onProgress?.('Sealing the exact revision for independent review…')
  const response = await fetcher(REQUEST_DELIVERY_SUBMIT_ROUTE, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestId: input.requestId,
      expectedVersion: requestVersion,
      deliveryRevisionId: input.deliveryRevisionId,
      idempotencyKey: `delivery-seal-submit-${input.deliveryRevisionId}-${requestVersion}`,
    }),
  })
  const payload = await safeDeliveryJson(response)
  if (!response.ok) {
    throw new DeliveryUiError(safeDeliveryError(
      payload,
      'The exact delivery revision could not be submitted.',
    ))
  }
  requestVersion = requestDeliveryReceiptVersion(payload, {
    minimumVersion: requestVersion,
  })
  if (
    payload.submissionStatus !== 'submitted'
    && payload.submissionStatus !== 'sealed_waiting_for_reviewer'
  ) {
    throw new DeliveryUiError('The delivery authority returned an inconsistent receipt.')
  }
  return {
    requestVersion,
    submissionStatus: payload.submissionStatus,
  }
}
