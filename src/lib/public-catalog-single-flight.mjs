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

/**
 * Keep the small durable-revision lookup from stampeding when several server
 * renders arrive together. A failed or malformed revision read opens a short
 * circuit so those renders can use the static catalog without immediately
 * retrying the database.
 */
export function createPublicCatalogRevisionReader({
  readRevision,
  now = Date.now,
  failureBackoffMs = 1_000,
}) {
  if (typeof readRevision !== 'function') {
    throw new TypeError('readRevision must be a function.')
  }
  if (typeof now !== 'function') {
    throw new TypeError('now must be a function.')
  }
  if (!Number.isFinite(failureBackoffMs) || failureBackoffMs < 0) {
    throw new RangeError('failureBackoffMs must be a non-negative number.')
  }

  const runRevisionRead = createPublicCatalogSingleFlight()
  let retryAfter = 0

  return async function readPublicCatalogRevision() {
    if (now() < retryAfter) return null

    return runRevisionRead('public-catalog-revision', async () => {
      if (now() < retryAfter) return null

      let revision = null
      try {
        revision = await readRevision()
      } catch {
        revision = null
      }

      if (typeof revision !== 'string' || !/^\d+$/.test(revision)) {
        retryAfter = now() + failureBackoffMs
        return null
      }

      retryAfter = 0
      return revision
    })
  }
}

/**
 * Route catalog renders by the durable revision. Revision failure is
 * deliberately fail-closed: it returns the bundled public catalog and never
 * calls the database-backed cached readers.
 */
export function createPublicCatalogReader({
  readRevision,
  readCachedCategories,
  readCachedPrompts,
  readFallbackCategories,
  readFallbackPrompts,
}) {
  for (const [name, value] of Object.entries({
    readRevision,
    readCachedCategories,
    readCachedPrompts,
    readFallbackCategories,
    readFallbackPrompts,
  })) {
    if (typeof value !== 'function') {
      throw new TypeError(`${name} must be a function.`)
    }
  }

  const runPublicCatalogRead = createPublicCatalogSingleFlight()

  return {
    async readCategories() {
      const catalogRevision = await readRevision()
      if (catalogRevision === null) return readFallbackCategories()
      return runPublicCatalogRead(
        `categories:${catalogRevision}`,
        () => readCachedCategories(catalogRevision),
      )
    },

    async readPrompts(options) {
      const catalogRevision = await readRevision()
      if (catalogRevision === null) return readFallbackPrompts(options)
      const key = JSON.stringify([
        'prompts',
        catalogRevision,
        options?.categorySlug ?? null,
        options?.difficulty ?? null,
        options?.status ?? null,
        options?.search ?? null,
        options?.limit ?? null,
        options?.sort ?? null,
      ])
      return runPublicCatalogRead(
        key,
        () => readCachedPrompts(catalogRevision, options),
      )
    },
  }
}
