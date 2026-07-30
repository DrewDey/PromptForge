import { handleRequestDeliveryArtifactReader } from '@/lib/build-requests/delivery-reader-adapter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReaderRouteContext = {
  params: Promise<{ artifactId: string }>
}

/**
 * Same-origin private reader. The logical artifact id is the only route input;
 * participant scope, current revision, moderation, sealed digest, object
 * identity, and exact bytes are re-derived on every request.
 */
export async function GET(request: Request, context: ReaderRouteContext) {
  const { artifactId } = await context.params
  const url = new URL(request.url)
  const disposition = url.searchParams.get('download') === '1'
    ? 'download'
    : 'preview'

  return handleRequestDeliveryArtifactReader({
    artifactId,
    disposition,
  })
}

/**
 * Explicit interaction preflight. This intentionally executes the same
 * participant, service-object, byte, and post-read authorization as GET, then
 * omits the body. It is not a weaker metadata-only authority check.
 */
export async function HEAD(request: Request, context: ReaderRouteContext) {
  const response = await GET(request, context)
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  })
}
