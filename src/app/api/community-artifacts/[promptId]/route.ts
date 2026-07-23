import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { COMMUNITY_PROJECT_BUCKET, COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES } from '@/lib/community-project-contract'
import { SUPABASE_CONFIGURED } from '@/lib/data/shared'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const MAX_CACHE_BYTES = 8_000_000
const MAX_CACHE_ENTRIES = 8

type ArtifactManifest = {
  artifact_path: string
  artifact_sha256: string
  artifact_size_bytes: number
}

type CachedArtifact = {
  bytes: Uint8Array
  byteLength: number
}

const artifactByteCache = new Map<string, CachedArtifact>()
let artifactByteCacheSize = 0

function artifactHeaders(sha256: string, byteLength?: number) {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    ...(byteLength === undefined ? {} : { 'Content-Length': String(byteLength) }),
    'Content-Disposition': 'attachment; filename="pathforge-community-project.html.txt"',
    // The browser may retain bytes only if it revalidates. Every request still
    // rechecks the revocable database manifest before returning 200 or 304.
    'Cache-Control': 'public, no-cache, max-age=0, must-revalidate',
    'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ETag: `"sha256-${sha256}"`,
  }
}

function cachedArtifact(cacheKey: string) {
  const cached = artifactByteCache.get(cacheKey)
  if (!cached) return null
  artifactByteCache.delete(cacheKey)
  artifactByteCache.set(cacheKey, cached)
  return cached.bytes
}

function rememberArtifact(cacheKey: string, bytes: Uint8Array) {
  const existing = artifactByteCache.get(cacheKey)
  if (existing) {
    artifactByteCacheSize -= existing.byteLength
    artifactByteCache.delete(cacheKey)
  }
  artifactByteCache.set(cacheKey, { bytes, byteLength: bytes.byteLength })
  artifactByteCacheSize += bytes.byteLength
  while (
    artifactByteCache.size > MAX_CACHE_ENTRIES
    || artifactByteCacheSize > MAX_CACHE_BYTES
  ) {
    const oldestKey = artifactByteCache.keys().next().value
    if (typeof oldestKey !== 'string') break
    const oldest = artifactByteCache.get(oldestKey)
    artifactByteCache.delete(oldestKey)
    artifactByteCacheSize -= oldest?.byteLength ?? 0
  }
}

function responseBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)
  return body
}

function unavailable() {
  return new NextResponse('Community project artifact is unavailable.', {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ promptId: string }> },
) {
  const { promptId } = await params
  if (!UUID_PATTERN.test(promptId)) return unavailable()
  if (!SUPABASE_CONFIGURED) return unavailable()

  try {
    const supabase = createAdminClient()
    const { data: manifestRows, error: manifestError } = await supabase.rpc(
      'get_public_community_project_artifact_manifest',
      { target_prompt: promptId },
    )
    const manifest = (Array.isArray(manifestRows) ? manifestRows[0] : manifestRows) as ArtifactManifest | null
    if (
      manifestError
      || !manifest
      || typeof manifest.artifact_path !== 'string'
      || !SHA256_PATTERN.test(manifest.artifact_sha256)
      || !Number.isInteger(manifest.artifact_size_bytes)
      || manifest.artifact_size_bytes < 1
      || manifest.artifact_size_bytes > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES
    ) return unavailable()

    const responseHeaders = artifactHeaders(
      manifest.artifact_sha256,
      manifest.artifact_size_bytes,
    )
    if (request.headers.get('if-none-match') === responseHeaders.ETag) {
      return new NextResponse(null, { status: 304, headers: responseHeaders })
    }

    const cacheKey = `${manifest.artifact_path}:${manifest.artifact_sha256}`
    const cached = cachedArtifact(cacheKey)
    if (cached && cached.byteLength === manifest.artifact_size_bytes) {
      return new NextResponse(responseBody(cached), {
        status: 200,
        headers: responseHeaders,
      })
    }

    const { data: artifact, error: artifactError } = await supabase.storage
      .from(COMMUNITY_PROJECT_BUCKET)
      .download(manifest.artifact_path)
    if (
      artifactError
      || !artifact
      || artifact.size !== manifest.artifact_size_bytes
    ) {
      return unavailable()
    }

    const bytes = new Uint8Array(await artifact.arrayBuffer())
    const actualSha256 = createHash('sha256').update(bytes).digest('hex')
    if (actualSha256 !== manifest.artifact_sha256) return unavailable()
    rememberArtifact(cacheKey, bytes)

    return new NextResponse(responseBody(bytes), {
      status: 200,
      headers: artifactHeaders(actualSha256, bytes.byteLength),
    })
  } catch {
    return unavailable()
  }
}
