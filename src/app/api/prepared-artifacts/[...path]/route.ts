import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { preparedProjectIdsForArtifact } from '@/lib/prepared-artifact-publication'
import { preparedArtifactHasPublicProject } from '@/lib/prepared-release-gates'

export const dynamic = 'force-dynamic'

function unavailable() {
  return new NextResponse('Prepared artifact is unavailable.', {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path
  if (
    !Array.isArray(segments) ||
    segments.length < 1 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))
  ) return unavailable()

  const relative = segments.join('/')
  const artifactPath = `public/artifacts/${relative}`
  const isSharedViewerAsset = artifactPath === 'public/artifacts/pathforge-artifact-banner.js'

  try {
    if (!isSharedViewerAsset) {
      const projectIds = [...preparedProjectIdsForArtifact(artifactPath)]
      if (!(await preparedArtifactHasPublicProject(projectIds))) return unavailable()
    }
    const bytes = await readFile(path.join(process.cwd(), 'public', 'artifacts', ...segments))
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${isSharedViewerAsset ? 'pathforge-artifact-banner.js.txt' : 'pathforge-prepared-artifact.html.txt'}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    })
  } catch {
    return unavailable()
  }
}
