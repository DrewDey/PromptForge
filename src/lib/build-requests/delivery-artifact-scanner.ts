import 'server-only'

import { createHash } from 'node:crypto'
import {
  DELIVERY_ARTIFACT_MAX_FILES,
  DELIVERY_ARTIFACT_MAX_FILE_BYTES,
  DELIVERY_ARTIFACT_MAX_IMAGE_HEIGHT,
  DELIVERY_ARTIFACT_MAX_IMAGE_PIXELS,
  DELIVERY_ARTIFACT_MAX_IMAGE_WIDTH,
  DELIVERY_ARTIFACT_MAX_TOTAL_BYTES,
  DELIVERY_ARTIFACT_POLICY_VERSION,
  DeliveryCustodyError,
  type DeliveryArtifactFinding,
  type DeliveryArtifactFormat,
  type DeliveryArtifactInput,
  type DeliveryArtifactMediaType,
  type DeliveryArtifactObjectMetadata,
  type DeliveryArtifactStorageObject,
  type ValidatedDeliveryArtifact,
} from './delivery-custody-contract'

type SupportedFormat = {
  format: DeliveryArtifactFormat
  mediaType: DeliveryArtifactMediaType
}

const SUPPORTED_EXTENSIONS: Readonly<Record<string, SupportedFormat>> = {
  '.html': { format: 'html', mediaType: 'text/html' },
  '.htm': { format: 'html', mediaType: 'text/html' },
  '.md': { format: 'markdown', mediaType: 'text/markdown' },
  '.markdown': { format: 'markdown', mediaType: 'text/markdown' },
  '.txt': { format: 'text', mediaType: 'text/plain' },
  '.json': { format: 'json', mediaType: 'application/json' },
  '.csv': { format: 'csv', mediaType: 'text/csv' },
  '.png': { format: 'png', mediaType: 'image/png' },
  '.jpg': { format: 'jpeg', mediaType: 'image/jpeg' },
  '.jpeg': { format: 'jpeg', mediaType: 'image/jpeg' },
}

const SAFE_NAME_MAX_LENGTH = 120
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true })
const HTML_FORBIDDEN_TAGS = [
  'script',
  'noscript',
  'form',
  'input',
  'button',
  'select',
  'option',
  'textarea',
  'fieldset',
  'legend',
  'datalist',
  'output',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'portal',
  'fencedframe',
  'svg',
  'math',
  'meta',
  'base',
  'link',
  'a',
  'area',
].join('|')

function uniqueFindings(findings: DeliveryArtifactFinding[]) {
  return [...new Set(findings)]
}

function extensionOf(name: string) {
  const match = name.match(/(\.[A-Za-z0-9]+)$/)
  return match?.[1]?.toLowerCase() ?? ''
}

export function normalizeDeliveryArtifactName(value: string) {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\\/]/g, '-')
    .trim()
  const extension = extensionOf(normalized)
  const rawStem = extension ? normalized.slice(0, -extension.length) : normalized
  const stem = rawStem
    .replace(/[^A-Za-z0-9._ -]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/[\s._-]+$/g, '')
    .replace(/^[\s._-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, Math.max(1, SAFE_NAME_MAX_LENGTH - extension.length))
    || 'artifact'
  return `${stem}${extension}`.slice(0, SAFE_NAME_MAX_LENGTH)
}

function decodeUtf8(bytes: Uint8Array, findings: DeliveryArtifactFinding[]) {
  try {
    return UTF8_DECODER.decode(bytes)
  } catch {
    findings.push('invalid_utf8')
    return null
  }
}

function decodeHtmlEntitiesForSafety(value: string) {
  return value
    .replace(/&#x([0-9a-f]{1,6});?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint <= 0x10FFFF ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/&#([0-9]{1,7});?/g, (_match, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10)
      return codePoint <= 0x10FFFF ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/&(colon|sol|bsol|commat|period|lpar|rpar);?/gi, (_match, name: string) => {
      const entities: Record<string, string> = {
        colon: ':',
        sol: '/',
        bsol: '\\',
        commat: '@',
        period: '.',
        lpar: '(',
        rpar: ')',
      }
      return entities[name.toLowerCase()] ?? ''
    })
}

function decodeCssForSafety(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      return codePoint <= 0x10FFFF ? String.fromCodePoint(codePoint) : ''
    })
    .replace(/\\([^\r\n0-9a-f])/gi, '$1')
}

function hasPaymentCardNumber(value: string) {
  const candidates = value.match(/(?:\d[ -]?){13,19}/g) ?? []
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false
    let sum = 0
    let double = false
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index])
      if (double) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      double = !double
    }
    return sum % 10 === 0
  })
}

function scanTextSafety(value: string, findings: DeliveryArtifactFinding[]) {
  const normalized = decodeHtmlEntitiesForSafety(value.normalize('NFKC'))
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u.test(normalized)) {
    findings.push('unsafe_control_characters')
  }
  if (
    /(?:https?|ftp|file|data|javascript|vbscript|blob|wss?|mailto|tel)\s*:/i.test(normalized)
    || /\bwww\.[a-z0-9-]+\.[a-z]{2,}\b/i.test(normalized)
    || /\b[a-z][a-z0-9+.-]{1,20}:\/\/\S+/i.test(normalized)
    || /(?:^|[\s("'=])\/\/[a-z0-9.-]+(?:\/|\b)/i.test(normalized)
  ) findings.push('dangerous_uri')
  if (
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i.test(normalized)
    || /\b(?:api[_ -]?key|access[_ -]?token|client[_ -]?secret|password|passwd|authorization)\s*[:=]/i.test(normalized)
    || /\b(?:sk-(?:proj-)?|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{16,}\b/.test(normalized)
    || /\bAKIA[A-Z0-9]{16}\b/.test(normalized)
    || /\bAIza[0-9A-Za-z_-]{30,}\b/.test(normalized)
    || /\bBearer\s+[A-Za-z0-9._~+/-]{16,}={0,2}\b/i.test(normalized)
  ) findings.push('possible_secret')
  if (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalized)
    || /\b\d{3}[- ]\d{2}[- ]\d{4}\b/.test(normalized)
    || /(?:^|[^\d])(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?:[^\d]|$)/m.test(normalized)
    || hasPaymentCardNumber(normalized)
  ) findings.push('possible_personal_data')
}

function scanMarkdown(value: string, findings: DeliveryArtifactFinding[]) {
  const decoded = decodeHtmlEntitiesForSafety(value)
    .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, '$1')
  if (
    /<\/?[a-z][^>\r\n]*>/i.test(decoded)
    || /<!--[\s\S]*?-->/i.test(decoded)
  ) findings.push('markdown_raw_html')
  if (
    /!?\[[^\]\r\n]*\]\s*\([^)\r\n]*\)/m.test(decoded)
    || /!?\[[^\]\r\n]+\]\s*\[[^\]\r\n]*\]/m.test(decoded)
    || /^\s{0,3}\[[^\]\r\n]+\]:\s*\S+/m.test(decoded)
    || /<(?:https?:\/\/|\/\/|mailto:)[^>\s]+>/i.test(decoded)
  ) findings.push('markdown_link')
}

function containsHtmlTag(value: string, names: string) {
  return new RegExp(`<\\s*\\/?\\s*(?:${names})(?=[\\s/>])`, 'i').test(value)
}

type ParsedHtmlTag = {
  name: string
  closing: boolean
  attributes: ReadonlyMap<string, string | null>
}

function parseHtmlTags(value: string): ParsedHtmlTag[] {
  const tags: ParsedHtmlTag[] = []
  for (let start = value.indexOf('<'); start >= 0; start = value.indexOf('<', start + 1)) {
    let quote: '"' | "'" | null = null
    let end = start + 1
    for (; end < value.length; end += 1) {
      const character = value[end]
      if (quote) {
        if (character === quote) quote = null
      } else if (character === '"' || character === "'") {
        quote = character
      } else if (character === '>') {
        break
      }
    }
    if (end >= value.length) continue
    const token = value.slice(start, end + 1)
    const match = /^<\s*(\/?)\s*([a-z][a-z0-9:-]*)(?=[\s/>])/i.exec(token)
    if (!match) {
      start = end
      continue
    }
    const closing = match[1] === '/'
    const attributes = new Map<string, string | null>()
    let cursor = match[0].length
    while (!closing && cursor < token.length - 1) {
      while (/[\s/]/.test(token[cursor] ?? '')) cursor += 1
      if (cursor >= token.length - 1 || token[cursor] === '>') break
      const nameStart = cursor
      while (cursor < token.length && !/[\s/=>]/.test(token[cursor])) cursor += 1
      if (cursor === nameStart) {
        cursor += 1
        continue
      }
      const name = token.slice(nameStart, cursor).toLowerCase()
      while (/\s/.test(token[cursor] ?? '')) cursor += 1
      let attributeValue: string | null = null
      if (token[cursor] === '=') {
        cursor += 1
        while (/\s/.test(token[cursor] ?? '')) cursor += 1
        const attributeQuote = token[cursor]
        if (attributeQuote === '"' || attributeQuote === "'") {
          cursor += 1
          const valueStart = cursor
          while (cursor < token.length && token[cursor] !== attributeQuote) cursor += 1
          attributeValue = token.slice(valueStart, cursor)
          if (token[cursor] === attributeQuote) cursor += 1
        } else {
          const valueStart = cursor
          while (cursor < token.length && !/[\s>]/.test(token[cursor])) cursor += 1
          attributeValue = token.slice(valueStart, cursor)
        }
      }
      attributes.set(name, attributeValue)
    }
    tags.push({ name: match[2].toLowerCase(), closing, attributes })
    start = end
  }
  return tags
}

function scanHtml(value: string, findings: DeliveryArtifactFinding[]) {
  const decoded = decodeHtmlEntitiesForSafety(value)
  const cssDecoded = decodeCssForSafety(decoded)
  if (!/(?:<!doctype\s+html|<html(?:\s|>))/i.test(decoded)) findings.push('invalid_html')
  if (/^\s*<\?xml\b/i.test(decoded) || /<!ENTITY\b/i.test(decoded)) findings.push('invalid_html')
  if (/<!DOCTYPE\b[^>]*(?:SYSTEM|PUBLIC|\[)/i.test(decoded)) findings.push('html_external_resource')
  const tagPattern = new RegExp(`<\\s*\\/?\\s*(?:${HTML_FORBIDDEN_TAGS})(?=[\\s/>])`, 'i')
  if (tagPattern.test(decoded)) {
    if (containsHtmlTag(decoded, 'script|noscript')) findings.push('active_html')
    if (containsHtmlTag(decoded, 'form|input|button|select|option|textarea|fieldset|legend|datalist|output')) findings.push('html_form')
    if (containsHtmlTag(decoded, 'iframe|frame|frameset|object|embed|applet|portal|fencedframe')) findings.push('html_frame_or_plugin')
    if (containsHtmlTag(decoded, 'svg|math')) findings.push('html_svg_or_math')
    if (containsHtmlTag(decoded, 'a|area')) findings.push('html_navigation')
    if (containsHtmlTag(decoded, 'meta|base')) findings.push('html_metadata_or_base')
    if (containsHtmlTag(decoded, 'link')) findings.push('html_external_resource')
  }
  const parsedTags = parseHtmlTags(decoded)
  const resourceAttributes = new Set([
    'src', 'srcdoc', 'srcset', 'href', 'xlink:href', 'action', 'formaction',
    'poster', 'background', 'cite', 'ping', 'manifest', 'lowsrc', 'dynsrc',
    'longdesc',
  ])
  for (const tag of parsedTags) {
    if (/^(?:script|noscript)$/.test(tag.name)) findings.push('active_html')
    if (/^(?:form|input|button|select|option|textarea|fieldset|legend|datalist|output)$/.test(tag.name)) {
      findings.push('html_form')
    }
    if (/^(?:iframe|frame|frameset|object|embed|applet|portal|fencedframe)$/.test(tag.name)) {
      findings.push('html_frame_or_plugin')
    }
    if (/^(?:svg|math)$/.test(tag.name)) findings.push('html_svg_or_math')
    if (/^(?:a|area)$/.test(tag.name)) findings.push('html_navigation')
    if (/^(?:meta|base)$/.test(tag.name)) findings.push('html_metadata_or_base')
    if (/^(?:link|audio|video|source|track|picture)$/.test(tag.name)) {
      findings.push('html_external_resource')
    }
    for (const [name, attributeValue] of tag.attributes) {
      if (/^on[a-z0-9_-]+$/.test(name)) findings.push('active_html')
      if (resourceAttributes.has(name)) findings.push('html_external_resource')
      if (name === 'download') findings.push('html_navigation')
      if (
        name === 'style'
        && attributeValue
        && /(?:url\s*\(|@import\b|expression\s*\(|-moz-binding\b|behavior\s*:|(?:-webkit-)?image-set\s*\(|cross-fade\s*\(|image\s*\()/i.test(
          decodeCssForSafety(attributeValue),
        )
      ) findings.push('html_external_resource')
    }
  }
  // In HTML tokenization, a slash before an attribute is only a separator
  // unless it immediately closes the tag. Treat it exactly like whitespace so
  // malformed forms such as <body/onload=...> cannot bypass the passive gate.
  if (/<[^>]+(?:\s|\/)+on[a-z0-9_-]+\s*=/i.test(decoded)) findings.push('active_html')
  if (/<[^>]+(?:\s|\/)+(?:src|srcdoc|srcset|href|xlink:href|action|formaction|poster|background|cite|ping|manifest|lowsrc|dynsrc|longdesc)\s*=/i.test(decoded)) {
    findings.push('html_external_resource')
  }
  if (/<[^>]+(?:\s|\/)+download(?:\s|=|\/?>)/i.test(decoded)) findings.push('html_navigation')
  if (/<[^>]+(?:\s|\/)+style\s*=\s*(?:"[^"]*(?:url\s*\(|@import|expression\s*\(|-moz-binding|(?:-webkit-)?image-set\s*\(|cross-fade\s*\(|image\s*\()[^"]*"|'[^']*(?:url\s*\(|@import|expression\s*\(|-moz-binding|(?:-webkit-)?image-set\s*\(|cross-fade\s*\(|image\s*\()[^']*')/i.test(decoded)) {
    findings.push('html_external_resource')
  }
  if (/<style\b[^>]*>[\s\S]*?(?:url\s*\(|@import|expression\s*\(|-moz-binding|(?:-webkit-)?image-set\s*\(|cross-fade\s*\(|image\s*\()[\s\S]*?<\/style\s*>/i.test(decoded)) {
    findings.push('html_external_resource')
  }
  if (
    /(?:url\s*\(|@import\b|expression\s*\(|-moz-binding\b|behavior\s*:|(?:-webkit-)?image-set\s*\(|cross-fade\s*\(|image\s*\()/i.test(cssDecoded)
  ) findings.push('html_external_resource')
  if (containsHtmlTag(decoded, 'audio|video|source|track|picture')) {
    findings.push('html_external_resource')
  }
  if (
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|sendBeacon|RTCPeerConnection)\b/i.test(decoded)
  ) findings.push('active_html')
  if (
    /\b(?:window\s*\.\s*open|location\s*(?:\.|\[)|history\s*\.\s*(?:pushState|replaceState)|showSaveFilePicker|createObjectURL)\b/i.test(decoded)
  ) findings.push('html_navigation')
}

function csvFormulaCell(value: string) {
  const normalized = value
    .normalize('NFKC')
    .replace(/^(?:\s|[\uFEFF\u200B-\u200D\u2060])+/u, '')
    .replace(/^[\u2212\uFE63]/u, '-')
  if (!normalized) return false
  if (/^[=+@]/.test(normalized)) return true
  if (!normalized.startsWith('-')) return false
  return !/^-(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)
}

function validateCsv(value: string, findings: DeliveryArtifactFinding[]) {
  let quoted = false
  let afterQuote = false
  let columns = 1
  let expectedColumns: number | null = null
  let rows = 0
  let cell = ''
  const finishCell = () => {
    if (csvFormulaCell(cell)) findings.push('csv_formula')
    cell = ''
    afterQuote = false
  }
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
        afterQuote = true
      } else {
        cell += character
      }
    } else if (character === '"' && cell.length === 0 && !afterQuote) {
      quoted = true
    } else if (character === ',' && !quoted) {
      finishCell()
      columns += 1
      if (columns > 256) {
        findings.push('invalid_csv')
        return
      }
    } else if ((character === '\n' || character === '\r') && !quoted) {
      finishCell()
      if (character === '\r' && value[index + 1] === '\n') index += 1
      if (expectedColumns === null) expectedColumns = columns
      else if (columns !== expectedColumns) {
        findings.push('invalid_csv')
        return
      }
      rows += 1
      columns = 1
      if (rows > 50_000) {
        findings.push('invalid_csv')
        return
      }
    } else if (afterQuote) {
      findings.push('invalid_csv')
      return
    } else {
      cell += character
    }
  }
  if (!quoted) finishCell()
  if (quoted || (expectedColumns !== null && columns !== expectedColumns && columns !== 1)) {
    findings.push('invalid_csv')
  }
}

function uint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000
    + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3]
  ) >>> 0
}

function crc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xFFFFFFFF
  for (let index = start; index < end; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function validateDimensions(
  width: number,
  height: number,
  findings: DeliveryArtifactFinding[],
) {
  if (
    width < 1
    || height < 1
    || width > DELIVERY_ARTIFACT_MAX_IMAGE_WIDTH
    || height > DELIVERY_ARTIFACT_MAX_IMAGE_HEIGHT
    || width * height > DELIVERY_ARTIFACT_MAX_IMAGE_PIXELS
  ) findings.push('image_dimensions_exceeded')
}

function inspectPng(bytes: Uint8Array, findings: DeliveryArtifactFinding[]) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value)) {
    findings.push('signature_mismatch')
    return { width: null, height: null }
  }
  const allowedChunks = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'cHRM', 'gAMA', 'sRGB', 'pHYs'])
  let offset = 8
  let width: number | null = null
  let height: number | null = null
  let sawIdat = false
  let sawEnd = false
  while (offset + 12 <= bytes.length) {
    const length = uint32(bytes, offset)
    const chunkEnd = offset + 12 + length
    if (length > DELIVERY_ARTIFACT_MAX_FILE_BYTES || chunkEnd > bytes.length) {
      findings.push('invalid_image')
      break
    }
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8))
    if (!/^[A-Za-z]{4}$/.test(type) || !allowedChunks.has(type)) {
      findings.push(type === 'tEXt' || type === 'zTXt' || type === 'iTXt' || type === 'eXIf' ? 'image_metadata' : 'invalid_image')
    }
    if (crc32(bytes, offset + 4, offset + 8 + length) !== uint32(bytes, offset + 8 + length)) {
      findings.push('invalid_image')
    }
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) findings.push('invalid_image')
      else {
        width = uint32(bytes, offset + 8)
        height = uint32(bytes, offset + 12)
        validateDimensions(width, height, findings)
        const bitDepth = bytes[offset + 16]
        const colorType = bytes[offset + 17]
        const validDepths: Record<number, readonly number[]> = {
          0: [1, 2, 4, 8, 16],
          2: [8, 16],
          3: [1, 2, 4, 8],
          4: [8, 16],
          6: [8, 16],
        }
        if (
          !validDepths[colorType]?.includes(bitDepth)
          || bytes[offset + 18] !== 0
          || bytes[offset + 19] !== 0
          || ![0, 1].includes(bytes[offset + 20])
        ) findings.push('invalid_image')
      }
    }
    if (type === 'IDAT') sawIdat = true
    if (type === 'IEND') {
      if (length !== 0 || chunkEnd !== bytes.length) findings.push('invalid_image')
      sawEnd = true
      break
    }
    offset = chunkEnd
  }
  if (!sawIdat || !sawEnd || width === null || height === null) findings.push('invalid_image')
  return { width, height }
}

function inspectJpeg(bytes: Uint8Array, findings: DeliveryArtifactFinding[]) {
  if (
    bytes.length < 12
    || bytes[0] !== 0xFF
    || bytes[1] !== 0xD8
    || bytes[bytes.length - 2] !== 0xFF
    || bytes[bytes.length - 1] !== 0xD9
  ) {
    findings.push('signature_mismatch')
    return { width: null, height: null }
  }
  let offset = 2
  let width: number | null = null
  let height: number | null = null
  let foundEnd = false
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xFF) {
      findings.push('invalid_image')
      break
    }
    while (bytes[offset] === 0xFF) offset += 1
    const marker = bytes[offset]
    offset += 1
    if (marker === 0xD9) {
      foundEnd = offset === bytes.length
      break
    }
    if (marker >= 0xD0 && marker <= 0xD7) continue
    if (marker === 0x01 || marker === 0xD8 || offset + 2 > bytes.length) {
      findings.push('invalid_image')
      break
    }
    const length = bytes[offset] * 256 + bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) {
      findings.push('invalid_image')
      break
    }
    if (marker >= 0xE1 && marker <= 0xEF || marker === 0xFE) findings.push('image_metadata')
    if (marker === 0xE0) {
      const label = String.fromCharCode(...bytes.slice(offset + 2, offset + Math.min(length, 7)))
      if (label !== 'JFIF\u0000' && label !== 'JFXX\u0000') findings.push('image_metadata')
    }
    const isSof = [0xC0, 0xC1, 0xC2].includes(marker)
    const isUnsupportedSof = marker >= 0xC0 && marker <= 0xCF
      && ![0xC0, 0xC1, 0xC2, 0xC4, 0xC8, 0xCC].includes(marker)
    if (isUnsupportedSof || marker === 0xCC) findings.push('invalid_image')
    if (isSof) {
      if (length < 8 || width !== null || height !== null) findings.push('invalid_image')
      else {
        height = bytes[offset + 3] * 256 + bytes[offset + 4]
        width = bytes[offset + 5] * 256 + bytes[offset + 6]
        validateDimensions(width, height, findings)
      }
    }
    if (marker === 0xDA) {
      offset += length
      let foundMarker = false
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xFF) {
          offset += 1
          continue
        }
        const next = bytes[offset + 1]
        if (next === 0x00 || (next >= 0xD0 && next <= 0xD7)) {
          offset += 2
          continue
        }
        foundMarker = true
        break
      }
      if (!foundMarker) findings.push('invalid_image')
      continue
    }
    offset += length
  }
  if (!foundEnd || width === null || height === null) findings.push('invalid_image')
  return { width, height }
}

export function validateDeliveryArtifact(input: DeliveryArtifactInput): ValidatedDeliveryArtifact {
  const findings: DeliveryArtifactFinding[] = []
  if (!(input.bytes instanceof Uint8Array) || typeof input.name !== 'string' || typeof input.mediaType !== 'string') {
    throw new DeliveryCustodyError('invalid_input')
  }
  const safeName = normalizeDeliveryArtifactName(input.name)
  const extension = extensionOf(safeName)
  const supported = SUPPORTED_EXTENSIONS[extension]
  if (!supported) findings.push('unsupported_extension')
  const normalizedMediaType = input.mediaType.trim().toLowerCase()
  const knownMediaType = Object.values(SUPPORTED_EXTENSIONS).some(({ mediaType }) => mediaType === normalizedMediaType)
  if (!knownMediaType) findings.push('unsupported_media_type')
  if (supported && normalizedMediaType !== supported.mediaType) findings.push('extension_media_type_mismatch')
  if (input.bytes.byteLength < 1) findings.push('empty_file')
  if (input.bytes.byteLength > DELIVERY_ARTIFACT_MAX_FILE_BYTES) findings.push('file_too_large')

  let imageWidth: number | null = null
  let imageHeight: number | null = null
  if (supported && input.bytes.byteLength > 0 && input.bytes.byteLength <= DELIVERY_ARTIFACT_MAX_FILE_BYTES) {
    if (supported.format === 'png') {
      const dimensions = inspectPng(input.bytes, findings)
      imageWidth = dimensions.width
      imageHeight = dimensions.height
    } else if (supported.format === 'jpeg') {
      const dimensions = inspectJpeg(input.bytes, findings)
      imageWidth = dimensions.width
      imageHeight = dimensions.height
    } else {
      const text = decodeUtf8(input.bytes, findings)
      if (text !== null) {
        scanTextSafety(text, findings)
        if (supported.format === 'html') scanHtml(text, findings)
        if (supported.format === 'markdown') scanMarkdown(text, findings)
        if (supported.format === 'json') {
          try {
            JSON.parse(text)
          } catch {
            findings.push('invalid_json')
          }
        }
        if (supported.format === 'csv') validateCsv(text, findings)
      }
    }
  }

  if (findings.length || !supported) {
    throw new DeliveryCustodyError('policy_rejected', uniqueFindings(findings))
  }
  const bytes = input.bytes.slice()
  return {
    bytes,
    safeName,
    extension,
    format: supported.format,
    mediaType: supported.mediaType,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.byteLength,
    imageWidth,
    imageHeight,
    policyVersion: DELIVERY_ARTIFACT_POLICY_VERSION,
  }
}

export function validateDeliveryArtifactSet(
  inputs: readonly DeliveryArtifactInput[],
): ValidatedDeliveryArtifact[] {
  if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > DELIVERY_ARTIFACT_MAX_FILES) {
    throw new DeliveryCustodyError(
      inputs.length > DELIVERY_ARTIFACT_MAX_FILES ? 'policy_rejected' : 'invalid_input',
      inputs.length > DELIVERY_ARTIFACT_MAX_FILES ? ['too_many_files'] : [],
    )
  }
  const validated = inputs.map(validateDeliveryArtifact)
  const totalBytes = validated.reduce((total, artifact) => total + artifact.byteLength, 0)
  if (totalBytes > DELIVERY_ARTIFACT_MAX_TOTAL_BYTES) {
    throw new DeliveryCustodyError('policy_rejected', ['total_bytes_exceeded'])
  }
  const names = new Set<string>()
  for (const artifact of validated) {
    const identity = artifact.safeName.toLocaleLowerCase('en-US')
    if (names.has(identity)) {
      throw new DeliveryCustodyError('policy_rejected', ['duplicate_safe_name'])
    }
    names.add(identity)
  }
  return validated
}

function metadataMatches(
  actual: Readonly<Record<string, string>>,
  expected: DeliveryArtifactObjectMetadata,
) {
  return (Object.keys(expected) as (keyof DeliveryArtifactObjectMetadata)[])
    .every((key) => actual[key] === expected[key])
}

export function inspectStoredDeliveryArtifact(
  stored: DeliveryArtifactStorageObject | null,
  expected: {
    sha256: string
    byteLength: number
    mediaType: DeliveryArtifactMediaType
    metadata: DeliveryArtifactObjectMetadata
  },
) {
  if (!stored) throw new DeliveryCustodyError('missing_object')
  if (
    stored.bytes.byteLength !== expected.byteLength
    || stored.mediaType !== expected.mediaType
    || !metadataMatches(stored.metadata, expected.metadata)
  ) throw new DeliveryCustodyError('integrity_mismatch')
  const actualSha256 = createHash('sha256').update(stored.bytes).digest('hex')
  if (actualSha256 !== expected.sha256) throw new DeliveryCustodyError('integrity_mismatch')
  const rescanned = validateDeliveryArtifact({
    name: expected.metadata.safeName,
    mediaType: expected.mediaType,
    bytes: stored.bytes,
  })
  if (
    rescanned.sha256 !== expected.sha256
    || rescanned.byteLength !== expected.byteLength
  ) throw new DeliveryCustodyError('integrity_mismatch')
  return rescanned
}
