import 'server-only'

import { createHash } from 'node:crypto'

/**
 * Protected Request-delivery reader core.
 *
 * This module is deliberately route and storage-provider agnostic. The caller
 * must inject an actor-derived authority resolver which re-checks the current
 * request/revision/moderation/digest state and returns the private object
 * identity only to server code. A client can never select or supply that
 * identity.
 */

export const REQUEST_DELIVERY_MAX_ARTIFACT_BYTES = 4_000_000

export const REQUEST_DELIVERY_READER_MEDIA_TYPES = [
  'text/html',
  'text/markdown',
  'text/plain',
  'application/json',
  'text/csv',
  'image/png',
  'image/jpeg',
] as const

export type RequestDeliveryReaderMediaType =
  (typeof REQUEST_DELIVERY_READER_MEDIA_TYPES)[number]

export type RequestDeliveryDisposition = 'preview' | 'download'

const ALLOWED_MEDIA_TYPES = new Set<string>(REQUEST_DELIVERY_READER_MEDIA_TYPES)
const LOGICAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const SHA256_PATTERN = /^(?:sha256:)?([a-f0-9]{64})$/i
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true })
const GENERIC_UNAVAILABLE_MESSAGE = 'Private artifact is unavailable.'

const ERROR_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const PREVIEW_CSP = [
  'sandbox',
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'none'",
  "font-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  "frame-src 'none'",
  "img-src data:",
  "media-src 'none'",
  "object-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "worker-src 'none'",
].join('; ')

const DOWNLOAD_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  'sandbox',
].join('; ')

export const REQUEST_DELIVERY_READER_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'display-capture=()',
    'geolocation=()',
    'gyroscope=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  Vary: 'Authorization, Cookie',
} satisfies Readonly<Record<string, string>>)

export const REQUEST_DELIVERY_PREVIEW_HEADERS = Object.freeze({
  ...REQUEST_DELIVERY_READER_HEADERS,
  'Content-Security-Policy': PREVIEW_CSP,
  'X-Frame-Options': 'SAMEORIGIN',
} satisfies Readonly<Record<string, string>>)

export const REQUEST_DELIVERY_DOWNLOAD_HEADERS = Object.freeze({
  ...REQUEST_DELIVERY_READER_HEADERS,
  'Content-Security-Policy': DOWNLOAD_CSP,
  'X-Frame-Options': 'DENY',
} satisfies Readonly<Record<string, string>>)

export interface RequestDeliveryReaderInput {
  artifactId: string
  disposition: RequestDeliveryDisposition
}

export type RequestDeliveryAuthorityUnavailableReason =
  | 'unauthenticated'
  | 'unauthorized'
  | 'unrelated'
  | 'not_found'
  | 'stale_revision'
  | 'held'
  | 'removed'
  | 'withdrawn'
  | 'closed'

export interface RequestDeliveryAuthorityUnavailable {
  status: 'unavailable'
  reason: RequestDeliveryAuthorityUnavailableReason
  /**
   * Only the authority service may decide that a state is safe to disclose to
   * a known participant. Omitted/default remains generic to prevent case
   * enumeration and authorization oracles.
   */
  disclosure?: 'generic' | 'participant'
}

export interface RequestDeliveryResolvedArtifact {
  status: 'authorized'
  requestId: string
  deliveryRevisionId: string
  artifactId: string
  manifestDigest: string
  normalizedName: string
  mediaType: RequestDeliveryReaderMediaType
  byteLength: number
  sha256: string
}

export interface RequestDeliveryResolvedObject<TObjectIdentity> {
  status: 'authorized'
  artifactId: string
  deliveryRevisionId: string
  manifestDigest: string
  objectIdentity: TObjectIdentity
}

export type RequestDeliveryParticipantAuthorityResult =
  | RequestDeliveryAuthorityUnavailable
  | RequestDeliveryResolvedArtifact

export type RequestDeliveryObjectAuthorityResult<TObjectIdentity> =
  | RequestDeliveryAuthorityUnavailable
  | RequestDeliveryResolvedObject<TObjectIdentity>

export interface RequestDeliveryPrivateObject {
  bytes: Uint8Array | ArrayBuffer
  /**
   * Provider metadata is checked when present, but never trusted in place of
   * byte-level validation.
   */
  mediaType?: string | null
  byteLength?: number | null
}

export type RequestDeliveryPrivateDownload =
  | { status: 'available'; object: RequestDeliveryPrivateObject }
  | { status: 'missing' }

export interface RequestDeliveryReaderDependencies<TObjectIdentity extends string> {
  resolveParticipantArtifact: (
    artifactId: string,
  ) => Promise<RequestDeliveryParticipantAuthorityResult>
  resolveObjectIdentity: (binding: {
    artifactId: string
    deliveryRevisionId: string
    manifestDigest: string
  }) => Promise<RequestDeliveryObjectAuthorityResult<TObjectIdentity>>
  downloadPrivateObject: (
    objectIdentity: TObjectIdentity,
  ) => Promise<RequestDeliveryPrivateDownload>
}

export type RequestDeliveryReaderInternalState =
  | 'ready'
  | 'invalid_request'
  | 'unauthenticated'
  | 'unauthorized'
  | 'unrelated'
  | 'not_found'
  | 'stale_revision'
  | 'held'
  | 'removed'
  | 'withdrawn'
  | 'closed'
  | 'authority_binding_mismatch'
  | 'missing'
  | 'storage_error'
  | 'empty'
  | 'too_large'
  | 'byte_mismatch'
  | 'hash_mismatch'
  | 'type_mismatch'
  | 'invalid_content'

export interface RequestDeliveryReaderResponse {
  ok: boolean
  status: number
  internalState: RequestDeliveryReaderInternalState
  headers: Readonly<Record<string, string>>
  body: Uint8Array
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function normalizeDigest(value: string): string | null {
  const match = SHA256_PATTERN.exec(value.trim())
  return match?.[1]?.toLowerCase() ?? null
}

function validLogicalId(value: string): boolean {
  return LOGICAL_ID_PATTERN.test(value)
}

function validInput(input: RequestDeliveryReaderInput): boolean {
  return (
    validLogicalId(input.artifactId) &&
    (input.disposition === 'preview' || input.disposition === 'download')
  )
}

function errorHeaders(): Readonly<Record<string, string>> {
  return {
    ...REQUEST_DELIVERY_READER_HEADERS,
    'Content-Security-Policy': ERROR_CSP,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': 'inline',
    'X-Frame-Options': 'DENY',
  }
}

function failure(
  internalState: RequestDeliveryReaderInternalState,
  status: number,
  message = GENERIC_UNAVAILABLE_MESSAGE,
): RequestDeliveryReaderResponse {
  const body = encode(message)
  return {
    ok: false,
    status,
    internalState,
    headers: {
      ...errorHeaders(),
      'Content-Length': String(body.byteLength),
    },
    body,
  }
}

function authorityFailure(
  result: RequestDeliveryAuthorityUnavailable,
): RequestDeliveryReaderResponse {
  if (result.disclosure !== 'participant') {
    return failure(result.reason, result.reason === 'unauthenticated' ? 401 : 404)
  }

  switch (result.reason) {
    case 'held':
      return failure('held', 423, 'Private artifact access is held.')
    case 'removed':
      return failure('removed', 410, 'Private artifact was removed.')
    case 'stale_revision':
      return failure('stale_revision', 409, 'This delivery revision is no longer current.')
    case 'withdrawn':
    case 'closed':
      return failure(result.reason, 410, 'Private artifact is no longer available.')
    default:
      return failure(result.reason, result.reason === 'unauthenticated' ? 401 : 404)
  }
}

function participantBindingIsValid(
  input: RequestDeliveryReaderInput,
  resolved: RequestDeliveryResolvedArtifact,
): boolean {
  const resolvedManifestDigest = normalizeDigest(resolved.manifestDigest)
  const resolvedSha256 = normalizeDigest(resolved.sha256)

  return (
    resolved.artifactId === input.artifactId &&
    validLogicalId(resolved.requestId) &&
    validLogicalId(resolved.deliveryRevisionId) &&
    resolvedManifestDigest !== null &&
    resolvedSha256 !== null &&
    ALLOWED_MEDIA_TYPES.has(resolved.mediaType) &&
    Number.isSafeInteger(resolved.byteLength) &&
    resolved.byteLength > 0 &&
    resolved.byteLength <= REQUEST_DELIVERY_MAX_ARTIFACT_BYTES
  )
}

function objectBindingMatches<TObjectIdentity>(
  participant: RequestDeliveryResolvedArtifact,
  object: RequestDeliveryResolvedObject<TObjectIdentity>,
) {
  return (
    object.artifactId === participant.artifactId
    && object.deliveryRevisionId === participant.deliveryRevisionId
    && normalizeDigest(object.manifestDigest) === normalizeDigest(participant.manifestDigest)
  )
}

function participantBindingsMatch(
  first: RequestDeliveryResolvedArtifact,
  second: RequestDeliveryResolvedArtifact,
) {
  return (
    first.requestId === second.requestId
    && first.deliveryRevisionId === second.deliveryRevisionId
    && first.artifactId === second.artifactId
    && normalizeDigest(first.manifestDigest) === normalizeDigest(second.manifestDigest)
    && first.normalizedName === second.normalizedName
    && first.mediaType === second.mediaType
    && first.byteLength === second.byteLength
    && normalizeDigest(first.sha256) === normalizeDigest(second.sha256)
  )
}

function isPng(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return (
    bytes.byteLength >= signature.length &&
    signature.every((byte, index) => bytes[index] === byte)
  )
}

function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.byteLength - 2] === 0xff &&
    bytes[bytes.byteLength - 1] === 0xd9
  )
}

function decodeText(bytes: Uint8Array): string | null {
  try {
    const text = UTF8_DECODER.decode(bytes)
    return text.includes('\0') ? null : text
  } catch {
    return null
  }
}

type ValidatedContent =
  | { valid: true; text: string | null }
  | { valid: false; state: 'type_mismatch' | 'invalid_content' }

function validateContent(
  bytes: Uint8Array,
  mediaType: RequestDeliveryReaderMediaType,
): ValidatedContent {
  if (mediaType === 'image/png') {
    return isPng(bytes)
      ? { valid: true, text: null }
      : { valid: false, state: 'type_mismatch' }
  }

  if (mediaType === 'image/jpeg') {
    return isJpeg(bytes)
      ? { valid: true, text: null }
      : { valid: false, state: 'type_mismatch' }
  }

  if (isPng(bytes) || isJpeg(bytes)) {
    return { valid: false, state: 'type_mismatch' }
  }

  const text = decodeText(bytes)
  if (text === null) return { valid: false, state: 'type_mismatch' }

  if (mediaType === 'application/json') {
    try {
      JSON.parse(text)
    } catch {
      return { valid: false, state: 'invalid_content' }
    }
  }

  return { valid: true, text }
}

function safeDownloadName(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 120)

  return normalized || 'pathforge-private-delivery'
}

function previewMediaType(mediaType: RequestDeliveryReaderMediaType) {
  if (
    mediaType === 'text/markdown'
    || mediaType === 'application/json'
    || mediaType === 'text/csv'
  ) return 'text/plain; charset=utf-8'
  if (mediaType === 'text/html' || mediaType === 'text/plain') {
    return `${mediaType}; charset=utf-8`
  }
  return mediaType
}

/**
 * Resolve, retrieve, and byte-verify one private Request delivery artifact.
 *
 * The returned `internalState` is intended for defensive server logs and
 * participant-safe UI mapping. It must not be placed in analytics with logical
 * identifiers. Authorization failures use the same generic response unless the
 * authority resolver explicitly marks a state participant-disclosable.
 */
export async function readRequestDeliveryArtifact<TObjectIdentity extends string>(
  input: Readonly<RequestDeliveryReaderInput>,
  dependencies: RequestDeliveryReaderDependencies<TObjectIdentity>,
): Promise<RequestDeliveryReaderResponse> {
  if (!validInput(input)) return failure('invalid_request', 404)

  let resolved: RequestDeliveryParticipantAuthorityResult
  try {
    resolved = await dependencies.resolveParticipantArtifact(input.artifactId)
  } catch {
    return failure('authority_binding_mismatch', 503)
  }

  if (resolved.status === 'unavailable') return authorityFailure(resolved)
  if (!participantBindingIsValid(input, resolved)) {
    return failure('authority_binding_mismatch', 409)
  }

  let resolvedObject: RequestDeliveryObjectAuthorityResult<TObjectIdentity>
  try {
    resolvedObject = await dependencies.resolveObjectIdentity({
      artifactId: resolved.artifactId,
      deliveryRevisionId: resolved.deliveryRevisionId,
      manifestDigest: resolved.manifestDigest,
    })
  } catch {
    return failure('authority_binding_mismatch', 503)
  }
  if (resolvedObject.status === 'unavailable') return authorityFailure(resolvedObject)
  if (!objectBindingMatches(resolved, resolvedObject)) {
    return failure('authority_binding_mismatch', 409)
  }

  let download: RequestDeliveryPrivateDownload
  try {
    download = await dependencies.downloadPrivateObject(resolvedObject.objectIdentity)
  } catch {
    return failure('storage_error', 503)
  }

  if (download.status === 'missing') {
    return failure('missing', 410, 'Private artifact is missing.')
  }

  const bytes = download.object.bytes instanceof Uint8Array
    ? download.object.bytes
    : new Uint8Array(download.object.bytes)

  if (bytes.byteLength === 0) return failure('empty', 409, 'Private artifact is empty.')
  if (bytes.byteLength > REQUEST_DELIVERY_MAX_ARTIFACT_BYTES) {
    return failure('too_large', 409, 'Private artifact exceeds the supported size.')
  }
  if (
    download.object.byteLength !== undefined &&
    download.object.byteLength !== null &&
    download.object.byteLength !== bytes.byteLength
  ) {
    return failure('byte_mismatch', 409, 'Private artifact byte length does not match.')
  }
  if (bytes.byteLength !== resolved.byteLength) {
    return failure('byte_mismatch', 409, 'Private artifact byte length does not match.')
  }

  const providerMediaType = download.object.mediaType?.split(';', 1)[0]?.trim().toLowerCase()
  if (providerMediaType && providerMediaType !== resolved.mediaType) {
    return failure('type_mismatch', 409, 'Private artifact type does not match.')
  }

  const expectedSha256 = normalizeDigest(resolved.sha256)
  const actualSha256 = createHash('sha256').update(bytes).digest('hex')
  if (!expectedSha256 || actualSha256 !== expectedSha256) {
    return failure('hash_mismatch', 409, 'Private artifact integrity check failed.')
  }

  const validated = validateContent(bytes, resolved.mediaType)
  if (!validated.valid) {
    const message = validated.state === 'type_mismatch'
      ? 'Private artifact type does not match.'
      : 'Private artifact content is invalid.'
    return failure(validated.state, 409, message)
  }

  // A 4 MB private-object read can overlap a hold, removal, withdrawal, later
  // revision, or resolver rebinding. Re-resolve both authority layers after
  // byte verification and require the exact same immutable binding before any
  // bytes are emitted. A prior receipt or first resolver result is never a
  // cached authorization grant.
  let currentParticipant: RequestDeliveryParticipantAuthorityResult
  try {
    currentParticipant = await dependencies.resolveParticipantArtifact(input.artifactId)
  } catch {
    return failure('authority_binding_mismatch', 503)
  }
  if (currentParticipant.status === 'unavailable') {
    return authorityFailure(currentParticipant)
  }
  if (
    !participantBindingIsValid(input, currentParticipant)
    || !participantBindingsMatch(resolved, currentParticipant)
  ) {
    return failure('authority_binding_mismatch', 409)
  }

  let currentObject: RequestDeliveryObjectAuthorityResult<TObjectIdentity>
  try {
    currentObject = await dependencies.resolveObjectIdentity({
      artifactId: currentParticipant.artifactId,
      deliveryRevisionId: currentParticipant.deliveryRevisionId,
      manifestDigest: currentParticipant.manifestDigest,
    })
  } catch {
    return failure('authority_binding_mismatch', 503)
  }
  if (currentObject.status === 'unavailable') return authorityFailure(currentObject)
  if (
    !objectBindingMatches(currentParticipant, currentObject)
    || currentObject.objectIdentity !== resolvedObject.objectIdentity
  ) {
    return failure('authority_binding_mismatch', 409)
  }

  if (input.disposition === 'download') {
    return {
      ok: true,
      status: 200,
      internalState: 'ready',
      headers: {
        ...REQUEST_DELIVERY_DOWNLOAD_HEADERS,
        'Content-Type': resolved.mediaType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${safeDownloadName(resolved.normalizedName)}"`,
      },
      body: bytes,
    }
  }

  return {
    ok: true,
    status: 200,
    internalState: 'ready',
    headers: {
      ...REQUEST_DELIVERY_PREVIEW_HEADERS,
      'Content-Type': previewMediaType(resolved.mediaType),
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `inline; filename="${safeDownloadName(resolved.normalizedName)}"`,
    },
    body: bytes,
  }
}
