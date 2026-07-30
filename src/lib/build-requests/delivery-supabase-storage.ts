import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DELIVERY_ARTIFACT_BUCKET,
  type DeliveryArtifactMediaType,
  type DeliveryArtifactObjectMetadata,
  type DeliveryArtifactStorage,
  type DeliveryArtifactStorageObject,
} from './delivery-custody-contract'

const MAX_LISTED_OBJECTS = 2_000
const PAGE_SIZE = 100

type StorageErrorLike = {
  message?: unknown
  status?: unknown
  statusCode?: unknown
}

function storageErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const candidate = error as StorageErrorLike
  const value = candidate.statusCode ?? candidate.status
  return typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d{3}$/.test(value)
      ? Number(value)
      : null
}

function storageErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return ''
  const value = (error as StorageErrorLike).message
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function isMissingObject(error: unknown) {
  const status = storageErrorStatus(error)
  const message = storageErrorMessage(error)
  return status === 404 || message.includes('object not found') || message.includes('not found')
}

function isExistingObject(error: unknown) {
  const status = storageErrorStatus(error)
  const message = storageErrorMessage(error)
  return status === 409
    || message.includes('already exists')
    || message.includes('duplicate')
    || message.includes('resource already exists')
}

function requirePrivateObjectKey(key: string) {
  if (
    !key.startsWith('requests/')
    || key.startsWith('/')
    || key.endsWith('/')
    || key.includes('\\')
    || key.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Invalid private delivery object identity.')
  }
  return key
}

function stringMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string | number | boolean] => (
        ['string', 'number', 'boolean'].includes(typeof entry[1])
      ))
      .map(([key, item]) => [key, String(item)]),
  )
}

/**
 * Service-role-only adapter for the private Request delivery bucket.
 *
 * The supplied client must never be a participant client. Callers obtain
 * object identities only from PM1's server-only, state-bound resolver.
 */
export function createDeliverySupabaseStorage(
  admin: SupabaseClient,
): DeliveryArtifactStorage {
  const bucket = admin.storage.from(DELIVERY_ARTIFACT_BUCKET)

  return {
    async putIfAbsent(input: {
      key: string
      bytes: Uint8Array
      mediaType: DeliveryArtifactMediaType
      metadata: DeliveryArtifactObjectMetadata
    }) {
      const key = requirePrivateObjectKey(input.key)
      const { error } = await bucket.upload(key, input.bytes, {
        cacheControl: '0',
        contentType: input.mediaType,
        metadata: input.metadata,
        upsert: false,
      })
      if (!error) return 'created'
      if (isExistingObject(error)) return 'exists'
      throw error
    },

    async read(key: string): Promise<DeliveryArtifactStorageObject | null> {
      const safeKey = requirePrivateObjectKey(key)
      const [{ data: info, error: infoError }, { data: body, error: bodyError }] = await Promise.all([
        bucket.info(safeKey),
        bucket.download(safeKey),
      ])
      if (infoError || bodyError) {
        const error = infoError ?? bodyError
        if (isMissingObject(error)) return null
        throw error
      }
      if (!info || !body) return null
      return {
        bytes: new Uint8Array(await body.arrayBuffer()),
        mediaType: info.contentType ?? 'application/octet-stream',
        metadata: stringMetadata(info.metadata),
        createdAt: info.createdAt,
      }
    },

    async remove(key: string) {
      const safeKey = requirePrivateObjectKey(key)
      const { error } = await bucket.remove([safeKey])
      if (error && !isMissingObject(error)) throw error
    },

    async list(prefix: string) {
      const safePrefix = requirePrivateObjectKey(`${prefix.replace(/\/+$/, '')}/placeholder`)
        .slice(0, -'/placeholder'.length)
      const pending = [safePrefix.replace(/\/+$/, '')]
      const visited = new Set<string>()
      const objects: { key: string; createdAt: string }[] = []

      while (pending.length > 0) {
        const directory = pending.shift()
        if (!directory) break
        if (visited.has(directory)) continue
        visited.add(directory)
        if (visited.size > MAX_LISTED_OBJECTS) {
          throw new Error('Private delivery reconciliation scope exceeded.')
        }
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const { data, error } = await bucket.list(directory, {
            limit: PAGE_SIZE,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          })
          if (error) throw error
          const entries = data ?? []
          for (const entry of entries) {
            const key = `${directory}/${entry.name}`
            if (entry.id === null) {
              pending.push(key)
              continue
            }
            if (!entry.created_at) continue
            objects.push({ key, createdAt: entry.created_at })
            if (objects.length > MAX_LISTED_OBJECTS) {
              throw new Error('Private delivery reconciliation scope exceeded.')
            }
          }
          if (entries.length < PAGE_SIZE) break
        }
      }
      return objects
    },
  }
}
