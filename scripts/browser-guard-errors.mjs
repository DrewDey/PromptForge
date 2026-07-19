export function isExpectedLocalActivationFailure(baseUrl, entry) {
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  if (!entry?.url || !/\b503\b/.test(entry.text ?? '')) return false

  const request = new URL(entry.url, base)
  return request.origin === base.origin && request.pathname === '/api/activation-events'
}
