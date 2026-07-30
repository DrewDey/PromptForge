import 'server-only'

import { DELIVERY_ARTIFACT_MAX_FILE_BYTES } from './delivery-custody-contract'

export const DELIVERY_UPLOAD_MAX_MULTIPART_BYTES = 4_250_000

export type DeliveryUploadRequestErrorCode =
  | 'invalid_origin'
  | 'invalid_content_type'
  | 'invalid_content_length'
  | 'request_too_large'
  | 'invalid_file_count'
  | 'invalid_file_size'

export class DeliveryUploadRequestError extends Error {
  readonly code: DeliveryUploadRequestErrorCode
  readonly status: number

  constructor(code: DeliveryUploadRequestErrorCode, status = 400) {
    super('The private delivery upload request is invalid.')
    this.name = 'DeliveryUploadRequestError'
    this.code = code
    this.status = status
  }
}

export function assertDeliveryUploadRequestEnvelope(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get('origin')
  if (!origin || origin !== requestUrl.origin) {
    throw new DeliveryUploadRequestError('invalid_origin', 403)
  }
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new DeliveryUploadRequestError('invalid_origin', 403)
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''
  if (
    !contentType.startsWith('multipart/form-data;')
    || !/(?:^|;)\s*boundary=[^;\s]{1,200}(?:;|$)/i.test(contentType)
  ) {
    throw new DeliveryUploadRequestError('invalid_content_type', 415)
  }

  const rawLength = request.headers.get('content-length')
  if (!rawLength || !/^[1-9]\d{0,9}$/.test(rawLength)) {
    throw new DeliveryUploadRequestError('invalid_content_length', 411)
  }
  const contentLength = Number(rawLength)
  if (!Number.isSafeInteger(contentLength)) {
    throw new DeliveryUploadRequestError('invalid_content_length', 411)
  }
  if (contentLength > DELIVERY_UPLOAD_MAX_MULTIPART_BYTES) {
    throw new DeliveryUploadRequestError('request_too_large', 413)
  }
  return contentLength
}

export function readSingleDeliveryArtifact(formData: FormData) {
  const artifacts = formData.getAll('artifact')
  const files = [...formData.values()].filter((value): value is File => value instanceof File)
  if (
    artifacts.length !== 1
    || files.length !== 1
    || !(artifacts[0] instanceof File)
    || artifacts[0] !== files[0]
  ) {
    throw new DeliveryUploadRequestError('invalid_file_count')
  }
  const file = files[0]
  if (file.size < 1 || file.size > DELIVERY_ARTIFACT_MAX_FILE_BYTES) {
    throw new DeliveryUploadRequestError('invalid_file_size', 413)
  }
  return file
}
