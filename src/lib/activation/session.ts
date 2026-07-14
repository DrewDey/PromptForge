import 'server-only'

import type { NextRequest } from 'next/server'

export const ACTIVATION_SESSION_COOKIE = 'pf_activation_session'
export const ACTIVATION_SESSION_MAX_AGE = 30 * 60

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CLOCK_SKEW_SECONDS = 60
const encoder = new TextEncoder()

function signingSecret() {
  const secret = process.env.ACTIVATION_COOKIE_SECRET ?? process.env.ACTIVATION_INGEST_SECRET
  if (!secret) throw new Error('Activation event sessions require a server-side signing secret.')
  return `pathforge-activation-session-v1:${secret}`
}

async function signingKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function decodeBase64Url(value: string) {
  try {
    return new Uint8Array(Buffer.from(value, 'base64url'))
  } catch {
    return null
  }
}

function sessionPayload(sessionId: string, issuedAt: number) {
  return `${sessionId}.${issuedAt}`
}

async function signSession(sessionId: string, issuedAt: number) {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(),
    encoder.encode(sessionPayload(sessionId, issuedAt)),
  )
  return Buffer.from(signature).toString('base64url')
}

async function verifySessionToken(value: string | undefined) {
  if (!value) return null
  const [sessionId, encodedIssuedAt, encodedSignature, extra] = value.split('.')
  const issuedAt = Number.parseInt(encodedIssuedAt, 10)
  const now = Math.floor(Date.now() / 1000)
  if (
    extra ||
    !UUID_PATTERN.test(sessionId) ||
    !/^\d+$/.test(encodedIssuedAt) ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + MAX_CLOCK_SKEW_SECONDS ||
    issuedAt < now - ACTIVATION_SESSION_MAX_AGE ||
    !encodedSignature
  ) return null
  const signature = decodeBase64Url(encodedSignature)
  if (!signature) return null
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(),
    signature,
    encoder.encode(sessionPayload(sessionId, issuedAt)),
  )
  return valid ? sessionId : null
}

export async function resolveActivationSession(request: NextRequest) {
  const existing = await verifySessionToken(request.cookies.get(ACTIVATION_SESSION_COOKIE)?.value)
  const sessionId = existing ?? crypto.randomUUID()
  const issuedAt = Math.floor(Date.now() / 1000)
  return {
    sessionId,
    cookieValue: `${sessionPayload(sessionId, issuedAt)}.${await signSession(sessionId, issuedAt)}`,
  }
}
