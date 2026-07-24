import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { COMMUNITY_PROJECT_BUCKET, COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES } from '@/lib/community-project-contract'
import { SUPABASE_CONFIGURED } from '@/lib/data/shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function unavailable(status = 404) {
  return new NextResponse('Private artifact is unavailable.', {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) return unavailable()
  if (!SUPABASE_CONFIGURED) return unavailable()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unavailable(401)

    // RLS returns this row only to its owner or an administrator.
    const { data: submission, error } = await supabase
      .from('community_project_submissions')
      .select('artifact_path,artifact_sha256,artifact_size_bytes')
      .eq('id', id)
      .maybeSingle()
    if (error || !submission?.artifact_path || !submission.artifact_sha256) return unavailable()

    const { data: artifact, error: artifactError } = await createAdminClient().storage
      .from(COMMUNITY_PROJECT_BUCKET)
      .download(submission.artifact_path)
    if (artifactError || !artifact || artifact.size < 1 || artifact.size > COMMUNITY_PROJECT_MAX_ARTIFACT_BYTES) {
      return unavailable()
    }
    const bytes = new Uint8Array(await artifact.arrayBuffer())
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (sha256 !== submission.artifact_sha256) return unavailable()

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': 'attachment; filename="pathforge-private-review.html.txt"',
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        ETag: `"sha256-${sha256}"`,
      },
    })
  } catch {
    return unavailable()
  }
}
