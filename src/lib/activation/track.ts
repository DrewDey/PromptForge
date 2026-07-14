'use client'

import {
  ACTIVATION_SCHEMA_VERSION,
  type ActivationEventInput,
  type ActivationEventPayload,
} from './contract'

const STORAGE_KEY = 'pathforge:activation-events:v1'
const MAX_STORED_FINGERPRINTS = 80
const DELIVERY_TIMEOUT_MS = 1_200
const pendingFingerprints = new Set<string>()
let deliveryQueue: Promise<unknown> = Promise.resolve()

function cleanText(value: string | undefined, maxLength: number) {
  if (!value) return undefined
  const cleaned = value.trim().replace(/[\u0000-\u001F\u007F]/g, '')
  return cleaned ? cleaned.slice(0, maxLength) : undefined
}

function storedFingerprints() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string').slice(-MAX_STORED_FINGERPRINTS)
  } catch {
    return []
  }
}

function rememberFingerprint(fingerprint: string) {
  try {
    const next = [...storedFingerprints().filter((value) => value !== fingerprint), fingerprint]
      .slice(-MAX_STORED_FINGERPRINTS)
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Analytics remains best-effort when storage is unavailable or disabled.
  }
}

function eventFingerprint(input: ActivationEventInput, path: string) {
  return input.dedupeKey ?? [
    input.eventName,
    path,
    input.surface ?? '',
    input.action ?? '',
    input.projectId ?? '',
    input.sourceRunId ?? '',
  ].join('|')
}

async function deliver(payload: ActivationEventPayload) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)
  try {
    const response = await fetch('/api/activation-events', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } finally {
    window.clearTimeout(timeout)
  }
}

export function trackActivationEvent(input: ActivationEventInput): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)

  const path = cleanText(input.path ?? window.location.pathname, 240) ?? '/'
  const fingerprint = eventFingerprint(input, path)
  if (pendingFingerprints.has(fingerprint) || storedFingerprints().includes(fingerprint)) {
    return Promise.resolve(true)
  }

  const payload: ActivationEventPayload = {
    eventId: input.eventId ?? window.crypto.randomUUID(),
    eventName: input.eventName,
    path,
    surface: input.surface,
    action: input.action,
    projectId: cleanText(input.projectId, 200),
    projectTitle: cleanText(input.projectTitle, 180),
    sourceRunId: cleanText(input.sourceRunId, 200),
    metricValue: Number.isInteger(input.metricValue) ? input.metricValue : undefined,
    schemaVersion: ACTIVATION_SCHEMA_VERSION,
  }

  pendingFingerprints.add(fingerprint)
  const delivery = deliveryQueue
    .catch(() => undefined)
    .then(() => deliver(payload))
    .then((accepted) => {
      if (accepted) rememberFingerprint(fingerprint)
      return accepted
    })
    .catch(() => false)
    .finally(() => {
      pendingFingerprints.delete(fingerprint)
    })

  deliveryQueue = delivery
  return delivery
}
