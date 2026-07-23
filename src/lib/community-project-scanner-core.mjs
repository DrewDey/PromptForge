/** @type {Array<[string, RegExp]>} */
export const communityArtifactActiveResourcePatterns = [
  ['embedded frame or plugin', /<(?:iframe|frame|frameset|object|embed|applet)\b/i],
  ['base URL rewriting', /<base\b/i],
  ['active form submission', /<form\b|formaction\s*=/i],
  ['automatic redirect', /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i],
  ['external script dependency', /<script\b[^>]*\bsrc\s*=/i],
  ['external stylesheet dependency', /<link\b[^>]*\bhref\s*=/i],
  ['external CSS dependency', /@import\b/i],
  ['network request API', /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\s*\(/i],
  ['WebRTC network API', /\b(?:RTCPeerConnection|webkitRTCPeerConnection|mozRTCPeerConnection|RTCIceTransport|RTCIceGatherer)\b/i],
  ['beacon API', /\bnavigator\s*\.\s*sendBeacon\s*\(/i],
  ['dynamic image request', /\bnew\s+Image\s*\(/i],
  ['external hyperlink', /\bhref\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['popup or external navigation API', /\b(?:window\s*\.\s*open|(?:window\s*\.\s*)?(?:document\s*\.\s*)?location(?:\s*\.\s*(?:href|assign|replace))?)\s*(?:\(|=)/i],
  ['obvious non-terminating loop', /\bwhile\s*\(\s*(?:true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)/i],
  ['automatic file generation', /\b(?:showSaveFilePicker|URL\s*\.\s*createObjectURL)\s*\(|\bdownload\s*=/i],
]

const mediaResourcePattern = /<(?:img|audio|video|source|track)\b[^>]*\b(?:src|srcset|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
const cssUrlPattern = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi

function isInlineResource(value) {
  return /^(?:data:|blob:|#)/i.test(value.trim())
}

function containsExternalResource(text, pattern) {
  pattern.lastIndex = 0
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const value = match[1] ?? match[2] ?? match[3] ?? ''
    if (!isInlineResource(value)) return true
  }
  return false
}

/** @type {Array<[string, RegExp]>} */
export const communityArtifactSecretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['OpenAI-style API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['database URL with credentials', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s@/]+@/i],
  ['bearer token', /\bBearer\s+[A-Za-z0-9._~+\/-]{24,}={0,2}\b/i],
  ['secret assignment', /\b(?:API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD)\s*=\s*["'][^"'\s]{12,}["']/i],
]

export function decodeCommunityArtifactBytes(filename, bytes, maxBytes = 2_000_000) {
  if (!/\.html?$/i.test(String(filename).trim())) {
    throw new Error('Upload one .html or .htm file for the pilot.')
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > maxBytes) {
    throw new Error('The HTML artifact must be between 1 byte and 2 MB.')
  }

  let html
  try {
    html = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  } catch {
    throw new Error('The artifact must be a UTF-8 text HTML file.')
  }
  if (html.includes('\0')) throw new Error('The artifact contains binary null bytes and was rejected.')
  if (!/(?:<!doctype\s+html|<html\b)/i.test(html)) {
    throw new Error('The file does not contain a complete HTML document.')
  }
  return html
}

export function communityArtifactPiiFindings(text) {
  const findings = []
  const withoutSafeExamples = text
    .replace(/[A-Z0-9._%+-]+@example\.(?:com|org|net)/gi, '')
    .replace(/\b(?:555[-. ]?)?01\d[-. ]?\d{4}\b/g, '')

  if (/\b\d{3}-\d{2}-\d{4}\b/.test(withoutSafeExamples)) findings.push('possible US Social Security number')
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(withoutSafeExamples)) findings.push('personal email address')
  if (/(?:\+?1[-. (]*)?(?:\d{3}[). -]*)\d{3}[-. ]*\d{4}\b/.test(withoutSafeExamples)) findings.push('phone number')
  if (/\b(?:\d[ -]*?){13,19}\b/.test(withoutSafeExamples)) findings.push('long payment-card-like number')
  return findings
}

export function scanCommunityArtifactText(text) {
  const findings = []
  for (const [label, pattern] of communityArtifactActiveResourcePatterns) {
    if (pattern.test(text)) findings.push(label)
  }
  if (containsExternalResource(text, mediaResourcePattern)) {
    findings.push('external media dependency')
  }
  if (containsExternalResource(text, cssUrlPattern)) {
    findings.push('external CSS dependency')
  }
  for (const [label, pattern] of communityArtifactSecretPatterns) {
    if (pattern.test(text)) findings.push(label)
  }
  findings.push(...communityArtifactPiiFindings(text))
  return [...new Set(findings)]
}

export function scanCommunityEvidenceText(text) {
  const findings = []
  for (const [label, pattern] of communityArtifactSecretPatterns) {
    if (pattern.test(text)) findings.push(label)
  }
  findings.push(...communityArtifactPiiFindings(text))
  return [...new Set(findings)]
}
