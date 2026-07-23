import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { COMMUNITY_PROJECT_BUCKET, COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES } from '@/lib/community-project-contract'
import { SUPABASE_CONFIGURED } from '@/lib/data/shared'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function unavailable() {
  return new NextResponse('Community project artifact is unavailable.', {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ promptId: string }> },
) {
  const { promptId } = await params
  if (!UUID_PATTERN.test(promptId)) return unavailable()
  if (!SUPABASE_CONFIGURED) return unavailable()

  try {
    const supabase = createAdminClient()
    const [{ data: path, error: pathError }, { data: capsuleRows, error: capsuleError }] = await Promise.all([
      supabase.rpc('get_public_community_project_artifact_path', { target_prompt: promptId }),
      supabase.rpc('get_public_community_project', { target_prompt: promptId }),
    ])
    const capsule = Array.isArray(capsuleRows) ? capsuleRows[0] : capsuleRows
    if (pathError || capsuleError || typeof path !== 'string' || !capsule) return unavailable()

    const { data: artifact, error: artifactError } = await supabase.storage
      .from(COMMUNITY_PROJECT_BUCKET)
      .download(path)
    if (artifactError || !artifact || artifact.size < 1 || artifact.size > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES) {
      return unavailable()
    }

    const bytes = new Uint8Array(await artifact.arrayBuffer())
    const actualSha256 = createHash('sha256').update(bytes).digest('hex')
    if (actualSha256 !== capsule.artifact_sha256) return unavailable()

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': 'attachment; filename="pathforge-community-project.html.txt"',
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        ETag: `"sha256-${actualSha256}"`,
      },
    })
  } catch {
    return unavailable()
  }
}
