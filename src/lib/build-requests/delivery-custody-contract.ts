import 'server-only'

export const DELIVERY_ARTIFACT_POLICY_VERSION = 'request-delivery-passive-v1'
export const DELIVERY_ARTIFACT_MAX_FILES = 5
export const DELIVERY_ARTIFACT_MAX_FILE_BYTES = 4_000_000
export const DELIVERY_ARTIFACT_MAX_TOTAL_BYTES = 12_000_000
export const DELIVERY_ARTIFACT_MAX_IMAGE_WIDTH = 8_192
export const DELIVERY_ARTIFACT_MAX_IMAGE_HEIGHT = 8_192
export const DELIVERY_ARTIFACT_MAX_IMAGE_PIXELS = 24_000_000
export const DELIVERY_ARTIFACT_BUCKET = 'request-build-deliveries'

export type DeliveryArtifactFormat =
  | 'html'
  | 'markdown'
  | 'text'
  | 'json'
  | 'csv'
  | 'png'
  | 'jpeg'

export type DeliveryArtifactMediaType =
  | 'text/html'
  | 'text/markdown'
  | 'text/plain'
  | 'application/json'
  | 'text/csv'
  | 'image/png'
  | 'image/jpeg'

export type DeliveryArtifactFinding =
  | 'empty_file'
  | 'too_many_files'
  | 'file_too_large'
  | 'total_bytes_exceeded'
  | 'unsupported_extension'
  | 'unsupported_media_type'
  | 'extension_media_type_mismatch'
  | 'signature_mismatch'
  | 'invalid_utf8'
  | 'unsafe_control_characters'
  | 'dangerous_uri'
  | 'possible_secret'
  | 'possible_personal_data'
  | 'invalid_html'
  | 'markdown_link'
  | 'markdown_raw_html'
  | 'active_html'
  | 'html_form'
  | 'html_frame_or_plugin'
  | 'html_svg_or_math'
  | 'html_navigation'
  | 'html_external_resource'
  | 'html_metadata_or_base'
  | 'invalid_json'
  | 'invalid_csv'
  | 'csv_formula'
  | 'invalid_image'
  | 'image_dimensions_exceeded'
  | 'image_metadata'
  | 'duplicate_safe_name'

export type DeliveryCustodyErrorCode =
  | 'invalid_input'
  | 'policy_rejected'
  | 'authority_blocked'
  | 'storage_unavailable'
  | 'storage_conflict'
  | 'integrity_mismatch'
  | 'missing_object'

const ERROR_MESSAGES: Record<DeliveryCustodyErrorCode, string> = {
  invalid_input: 'The private delivery artifact input is invalid.',
  policy_rejected: 'The private delivery artifact did not pass the passive-file safety policy.',
  authority_blocked: 'Private delivery custody is unavailable for the current case state.',
  storage_unavailable: 'Private delivery storage is temporarily unavailable.',
  storage_conflict: 'The private delivery object identity is already bound to different bytes.',
  integrity_mismatch: 'The private delivery artifact failed its integrity check.',
  missing_object: 'The private delivery artifact is unavailable.',
}

export class DeliveryCustodyError extends Error {
  readonly code: DeliveryCustodyErrorCode
  readonly findings: readonly DeliveryArtifactFinding[]

  constructor(
    code: DeliveryCustodyErrorCode,
    findings: readonly DeliveryArtifactFinding[] = [],
  ) {
    super(ERROR_MESSAGES[code])
    this.name = 'DeliveryCustodyError'
    this.code = code
    this.findings = [...new Set(findings)]
  }
}

export type DeliveryArtifactInput = {
  name: string
  mediaType: string
  bytes: Uint8Array
}

export type ValidatedDeliveryArtifact = {
  bytes: Uint8Array
  safeName: string
  extension: string
  format: DeliveryArtifactFormat
  mediaType: DeliveryArtifactMediaType
  sha256: string
  byteLength: number
  imageWidth: number | null
  imageHeight: number | null
  policyVersion: typeof DELIVERY_ARTIFACT_POLICY_VERSION
}

export type DeliveryCustodyScope = {
  requestId: string
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  builderAssignmentId: string
}

export type DeliveryCustodyAuthority = {
  moderation: 'clear' | 'held' | 'removed'
  lifecycle:
    | 'submitted'
    | 'triage'
    | 'clarification_requested'
    | 'accepted'
    | 'building'
    | 'review_pending'
    | 'repair_required'
    | 'delivery_ready'
    | 'delivered'
    | 'completed'
    | 'closed'
  /** Explicit authority projection for whether builder custody work is frozen. */
  workBlocked: boolean
  /**
   * PM1-owned retention decision. PM3 must not derive this from a client clock,
   * reconstruct terminalAt + policy duration, or infer it from moderation.
   */
  retentionState: 'retained' | 'preserved_by_hold' | 'cleanup_eligible'
  withdrawn: boolean
}

export type DeliveryArtifactObjectMetadata = {
  policyVersion: typeof DELIVERY_ARTIFACT_POLICY_VERSION
  scannerVersion: typeof DELIVERY_ARTIFACT_POLICY_VERSION
  custodyState: 'staging' | 'final'
  requestId: string
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  builderAssignmentId: string
  artifactId: string
  artifactOrdinal: string
  safeName: string
  sha256: string
  byteLength: string
  mediaType: DeliveryArtifactMediaType
}

export type DeliveryArtifactStorageObject = {
  bytes: Uint8Array
  mediaType: string
  metadata: Readonly<Record<string, string>>
  createdAt?: string
}

export interface DeliveryArtifactStorage {
  putIfAbsent(input: {
    key: string
    bytes: Uint8Array
    mediaType: DeliveryArtifactMediaType
    metadata: DeliveryArtifactObjectMetadata
  }): Promise<'created' | 'exists'>
  read(key: string): Promise<DeliveryArtifactStorageObject | null>
  /** Server-maintenance only; callers must freshly resolve cleanup authority. */
  remove?(key: string): Promise<void>
  list?(prefix: string): Promise<readonly { key: string; createdAt: string }[]>
}

export type DeliveryArtifactCustodyBinding = {
  artifactId: string
  artifactOrdinal: number
  safeName: string
  /** Server-only object identity resolved from PM1 authority. */
  objectIdentity: string
  sha256: string
  byteLength: number
  mediaType: DeliveryArtifactMediaType
}
