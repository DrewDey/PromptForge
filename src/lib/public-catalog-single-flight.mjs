/**
 * Coalesce identical catalog reads while one request is already filling the
 * shared Next.js cache. This protects a warm server process from a cold-cache
 * stampede; Next's distributed cache remains the durable cross-process layer.
 */
export function createPublicCatalogSingleFlight() {
  const pendingReads = new Map()

  return async function runPublicCatalogRead(key, read) {
    const pending = pendingReads.get(key)
    if (pending) return pending

    const request = Promise.resolve().then(read)
    pendingReads.set(key, request)
    try {
      return await request
    } finally {
      if (pendingReads.get(key) === request) pendingReads.delete(key)
    }
  }
}
