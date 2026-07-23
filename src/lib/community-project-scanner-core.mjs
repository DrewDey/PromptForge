/** @type {Array<[string, RegExp]>} */
export const communityArtifactActiveResourcePatterns = [
  ['embedded frame or plugin', /<(?:iframe|frame|frameset|object|embed|applet|portal|fencedframe)\b|\bcreateElement(?:NS)?\s*\(\s*["'](?:iframe|frame|frameset|object|embed|applet|portal|fencedframe)["']/i],
  ['base URL rewriting', /<base\b/i],
  ['active form submission', /<form\b|formaction\s*=/i],
  ['automatic redirect', /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i],
  ['active SVG animation', /<(?:animate|animatemotion|animatetransform|set)\b/i],
  ['external script dependency', /<script\b[^>]*\bsrc\s*=/i],
  ['external stylesheet dependency', /<link\b[^>]*\bhref\s*=/i],
  ['external CSS dependency', /@import\b/i],
  ['external media dependency', /\b(?:srcset|imagesrcset)\s*=/i],
  ['navigation ping', /<(?:a|area)\b[^>]*\bping\s*=/i],
  ['network request API', /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\s*\(/i],
  ['WebRTC network API', /\b(?:RTCPeerConnection|webkitRTCPeerConnection|mozRTCPeerConnection|RTCIceTransport|RTCIceGatherer)\b/i],
  ['dynamic HTML API', /\bsetHTML(?:Unsafe)?\s*\(/i],
  ['beacon API', /\bnavigator\s*\.\s*sendBeacon\s*\(/i],
  ['dynamic image request', /\bnew\s+Image\s*\(/i],
  ['external hyperlink', /\bhref\s*=\s*["']?\s*(?:https?:)?\/\//i],
  ['popup or external navigation API', /\b(?:window\s*\.\s*open|(?:window\s*\.\s*)?(?:document\s*\.\s*)?location(?:\s*\.\s*(?:href|assign|replace))?)\s*(?:\(|=)/i],
  ['obvious non-terminating loop', /\bwhile\s*\(\s*(?:true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)/i],
  ['automatic file generation', /\b(?:showSaveFilePicker|URL\s*\.\s*createObjectURL)\s*\(|\bdownload\s*=/i],
]

const mediaResourcePattern = /<(?:img|audio|video|source|track|input|image|use|feimage|filter|pattern|lineargradient|radialgradient|textpath|mpath|animate|animatemotion|set|cursor|body|table|td|th)\b[^>]*\b(?:src|poster|background|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
const cssUrlPattern = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi
const hyperlinkPattern = /<(?:a|area)\b[^>]*\b(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
const metaHttpEquivPattern = /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi

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

function containsNavigableHyperlink(text) {
  hyperlinkPattern.lastIndex = 0
  for (let match = hyperlinkPattern.exec(text); match; match = hyperlinkPattern.exec(text)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    if (!value.startsWith('#')) return true
  }
  return false
}

function decodeHtmlNumericReferences(value) {
  return value.replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (reference, hex, decimal) => {
    const codePoint = Number.parseInt(hex ?? decimal, hex ? 16 : 10)
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) return reference
    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return reference
    }
  })
}

function containsMetaRefresh(text) {
  metaHttpEquivPattern.lastIndex = 0
  for (let match = metaHttpEquivPattern.exec(text); match; match = metaHttpEquivPattern.exec(text)) {
    const value = decodeHtmlNumericReferences(match[1] ?? match[2] ?? match[3] ?? '')
    if (value.trim().toLowerCase() === 'refresh') return true
  }
  return false
}

const hiddenPresentationPattern = /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*(?:0+(?:\.0+)?|\.0+))\s*(?:!important\s*)?(?:;|$)/i
const voidElementNames = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function hiddenStylesheetSelectors(text) {
  const styleText = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .map((match) => match[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
  const selectors = []
  for (const rule of styleText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!hiddenPresentationPattern.test(rule[2])) continue
    selectors.push(
      ...rule[1]
        .split(',')
        .map((selector) => selector.trim())
        .filter((selector) => selector && !selector.startsWith('@')),
    )
  }
  return selectors
}

function attributeValue(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`, 'i'),
  )
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null
}

function hasBooleanAttribute(attributes, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'=<>\\x60]+))?(?=\\s|\\/?>|$)`, 'i')
    .test(attributes)
}

function simpleSelectorMatches(selector, tagName, attributes) {
  const lastCompound = selector
    .replace(/::?[a-z-]+(?:\([^)]*\))?/gi, '')
    .split(/\s+|>/)
    .filter(Boolean)
    .at(-1)
  if (!lastCompound) return false

  const id = attributeValue(attributes, 'id')
  const classes = new Set((attributeValue(attributes, 'class') ?? '').split(/\s+/).filter(Boolean))
  const requiredTag = lastCompound.match(/^[a-z][a-z0-9-]*/i)?.[0]?.toLowerCase()
  if (requiredTag && requiredTag !== tagName) return false
  if (lastCompound.includes('*') && lastCompound !== '*') return false
  if (lastCompound === '*') return true

  for (const requiredId of lastCompound.matchAll(/#([a-z0-9_-]+)/gi)) {
    if (id !== requiredId[1]) return false
  }
  for (const requiredClass of lastCompound.matchAll(/\.([a-z0-9_-]+)/gi)) {
    if (!classes.has(requiredClass[1])) return false
  }
  if (/\[\s*hidden(?:\s*=[^\]]+)?\s*\]/i.test(lastCompound) && !hasBooleanAttribute(attributes, 'hidden')) {
    return false
  }
  if (/\[\s*aria-hidden\s*=\s*(?:"true"|'true'|true)\s*\]/i.test(lastCompound)) {
    if (attributeValue(attributes, 'aria-hidden')?.toLowerCase() !== 'true') return false
  }

  return Boolean(
    requiredTag
      || /#[a-z0-9_-]+/i.test(lastCompound)
      || /\.[a-z0-9_-]+/i.test(lastCompound)
      || /\[\s*(?:hidden|aria-hidden)/i.test(lastCompound),
  )
}

function elementIsHidden(tagName, attributes, hiddenSelectors) {
  if (hasBooleanAttribute(attributes, 'hidden')) return true
  if (attributeValue(attributes, 'aria-hidden')?.toLowerCase() === 'true') return true
  if (hiddenPresentationPattern.test(attributeValue(attributes, 'style') ?? '')) return true
  return hiddenSelectors.some((selector) => simpleSelectorMatches(selector, tagName, attributes))
}

function staticPreviewContent(text) {
  const bodyMatch = text.match(/<body\b([^>]*)>([\s\S]*?)<\/body\s*>/i)
  const bodyAttributes = bodyMatch?.[1] ?? ''
  const body = bodyMatch?.[2] ?? ''
  const hiddenSelectors = hiddenStylesheetSelectors(text)
  const htmlAttributes = text.match(/<html\b([^>]*)>/i)?.[1] ?? ''
  const rootHidden = elementIsHidden('html', htmlAttributes, hiddenSelectors)
    || elementIsHidden('body', bodyAttributes, hiddenSelectors)
  const renderedMarkup = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, ' ')

  const stack = [{ name: 'body', hidden: rootHidden }]
  const visibleTextParts = []
  let inlineImage = false
  let svgDrawing = false
  let visibleLayoutElements = 0

  for (const token of renderedMarkup.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (!token.startsWith('<')) {
      if (!stack.at(-1)?.hidden) visibleTextParts.push(token)
      continue
    }
    if (/^<\s*[!/?]/.test(token)) {
      const closingName = token.match(/^<\s*\/\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase()
      if (closingName) {
        for (let index = stack.length - 1; index > 0; index -= 1) {
          const entry = stack.pop()
          if (entry?.name === closingName) break
        }
      }
      continue
    }

    const open = token.match(/^<\s*([a-z0-9-]+)\b([\s\S]*?)\/?\s*>$/i)
    if (!open) continue
    const tagName = open[1].toLowerCase()
    const attributes = open[2] ?? ''
    const hidden = Boolean(stack.at(-1)?.hidden)
      || elementIsHidden(tagName, attributes, hiddenSelectors)

    if (!hidden) {
      if (
        tagName === 'img'
        && /^data:image\//i.test(attributeValue(attributes, 'src') ?? '')
      ) {
        inlineImage = true
      }
      if (/^(?:path|rect|circle|ellipse|line|polyline|polygon|text|use)$/.test(tagName)) {
        svgDrawing = true
      }
      if (/^(?:article|aside|button|div|footer|header|li|main|nav|section|span)$/.test(tagName)) {
        visibleLayoutElements += 1
      }
    }

    if (!voidElementNames.has(tagName) && !/\/\s*>$/.test(token)) {
      stack.push({ name: tagName, hidden })
    }
  }

  const visibleText = visibleTextParts
    .join(' ')
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9-]*);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    inlineImage,
    renderedMarkup,
    svgDrawing,
    visibleLayoutElements,
    visibleText,
  }
}

function staticPreviewHasUsefulContent(text) {
  const {
    inlineImage,
    svgDrawing,
    visibleLayoutElements,
    visibleText,
  } = staticPreviewContent(text)
  if (visibleText.length >= 24) return true

  if (inlineImage || svgDrawing) return true

  const styleText = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .map((match) => match[1])
    .join('\n')
  return visibleLayoutElements >= 5
    && /(?:background|border|display|grid|flex|height|position|width)\s*:/i.test(styleText)
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
  if (containsNavigableHyperlink(text)) {
    findings.push('navigation-capable hyperlink')
  }
  if (containsMetaRefresh(text)) {
    findings.push('automatic redirect')
  }
  for (const [label, pattern] of communityArtifactSecretPatterns) {
    if (pattern.test(text)) findings.push(label)
  }
  findings.push(...communityArtifactPiiFindings(text))
  if (!staticPreviewHasUsefulContent(text)) {
    findings.push('no useful script-disabled preview')
  }
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
