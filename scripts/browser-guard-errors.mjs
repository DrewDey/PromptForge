function isConfiguredLocalActivationUrl(baseUrl, requestUrl) {
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  if (!requestUrl) return false

  const request = new URL(requestUrl, base)
  return request.origin === base.origin && request.pathname === '/api/activation-events'
}

export function isExpectedLocalActivationFailure(baseUrl, entry) {
  return /\b503\b/.test(entry?.text ?? '') && isConfiguredLocalActivationUrl(baseUrl, entry?.url)
}

export function isExpectedLocalActivationResponseFailure(baseUrl, response) {
  return response?.status === 503 && isConfiguredLocalActivationUrl(baseUrl, response?.url)
}
