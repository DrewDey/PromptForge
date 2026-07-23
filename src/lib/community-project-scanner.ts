import 'server-only'

import { createHash } from 'node:crypto'
import {
  COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES,
  COMMUNITY_PROJECT_SCANNER_VERSION,
  type CommunityProjectScanReport,
} from './community-project-contract'
import {
  decodeCommunityArtifactBytes,
  scanCommunityArtifactText,
  scanCommunityEvidenceText,
} from './community-project-scanner-core.mjs'

type ScannedCommunityArtifact = {
  bytes: Uint8Array
  html: string
  report: CommunityProjectScanReport
}

export async function scanCommunityProjectArtifact(file: File): Promise<ScannedCommunityArtifact> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const html = decodeCommunityArtifactBytes(
    file.name,
    bytes,
    COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES,
  )

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const findings = scanCommunityArtifactText(html)
  const report: CommunityProjectScanReport = {
    passed: findings.length === 0,
    scanner_version: COMMUNITY_PROJECT_SCANNER_VERSION,
    scanned_at: new Date().toISOString(),
    sha256,
    byte_length: bytes.byteLength,
    findings,
  }

  return { bytes, html, report }
}

export function scanCommunityProjectEvidenceText(value: string) {
  return scanCommunityEvidenceText(value)
}
