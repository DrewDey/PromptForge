function isConfiguredLocalActivationUrl(baseUrl, requestUrl) {
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  if (!requestUrl) return false

  const request = new URL(requestUrl, base)
  return request.origin === base.origin && request.pathname === '/api/activation-events'
}

function isConfiguredLocalVercelScriptUrl(baseUrl, requestUrl) {
  const base = new URL(baseUrl)
  if (base.hostname !== 'localhost' && base.hostname !== '127.0.0.1') return false
  if (!requestUrl) return false

  const request = new URL(requestUrl, base)
  return (
    request.origin === base.origin &&
    [
      '/_vercel/insights/script.js',
      '/_vercel/speed-insights/script.js',
    ].includes(request.pathname)
  )
}

export function isExpectedLocalActivationFailure(baseUrl, entry) {
  return /\b503\b/.test(entry?.text ?? '') && isConfiguredLocalActivationUrl(baseUrl, entry?.url)
}

export function isExpectedLocalActivationResponseFailure(baseUrl, response) {
  return response?.status === 503 && isConfiguredLocalActivationUrl(baseUrl, response?.url)
}

export function isExpectedLocalVercelScriptFailure(baseUrl, entry) {
  const text = entry?.text ?? ''
  if (!/\b404\b/.test(text) && !/strict MIME type checking/.test(text)) return false
  if (isConfiguredLocalVercelScriptUrl(baseUrl, entry?.url)) return true

  const base = new URL(baseUrl)
  return [
    '/_vercel/insights/script.js',
    '/_vercel/speed-insights/script.js',
  ].some((scriptPath) => (
    text.includes(`'${new URL(scriptPath, base).href}'`) &&
    isConfiguredLocalVercelScriptUrl(baseUrl, new URL(scriptPath, base).href)
  ))
}

export function isExpectedLocalVercelScriptResponseFailure(baseUrl, response) {
  return response?.status === 404 && isConfiguredLocalVercelScriptUrl(baseUrl, response?.url)
}
