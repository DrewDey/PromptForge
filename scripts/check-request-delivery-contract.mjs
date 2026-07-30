#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.cwd()
const fixtureRoot = path.join(root, 'test-fixtures', 'request-delivery')

// The production modules are server-only TypeScript. This narrow hook lets the
// deterministic Node guard exercise their real exports without a test-only
// implementation or framework. It does not affect the application build.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (
      (specifier.startsWith('./') || specifier.startsWith('../'))
      && context.parentURL?.endsWith('.ts')
    ) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

const contract = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-custody-contract.ts',
)).href)
const scanner = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-artifact-scanner.ts',
)).href)
const objectIdentityModule = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-object-identity.ts',
)).href)
const custodyService = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-custody-service.ts',
)).href)
const reader = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-reader.ts',
)).href)
const uploadRequest = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/delivery-upload-request.ts',
)).href)

const {
  DELIVERY_ARTIFACT_MAX_FILES,
  DELIVERY_ARTIFACT_MAX_FILE_BYTES,
  DELIVERY_ARTIFACT_MAX_TOTAL_BYTES,
  DeliveryCustodyError,
} = contract
const {
  inspectStoredDeliveryArtifact,
  normalizeDeliveryArtifactName,
  validateDeliveryArtifact,
  validateDeliveryArtifactSet,
} = scanner
const {
  assertDeliveryAuthorityId,
  buildDeliveryObjectKeys,
  normalizeDeliveryCustodyScope,
} = objectIdentityModule
const {
  deliveryArtifactRetentionDisposition,
  finalizeDeliveryArtifactSet,
  planDeliveryStagingOrphans,
  stageDeliveryArtifactSet,
  verifyFinalizedDeliveryArtifactSet,
} = custodyService
const {
  REQUEST_DELIVERY_DOWNLOAD_HEADERS,
  REQUEST_DELIVERY_PREVIEW_HEADERS,
  REQUEST_DELIVERY_READER_HEADERS,
  REQUEST_DELIVERY_READER_MEDIA_TYPES,
  readRequestDeliveryArtifact,
} = reader
const {
  DELIVERY_UPLOAD_MAX_MULTIPART_BYTES,
  DeliveryUploadRequestError,
  assertDeliveryUploadRequestEnvelope,
  readSingleDeliveryArtifact,
} = uploadRequest

function fixture(name) {
  return new Uint8Array(readFileSync(path.join(fixtureRoot, name)))
}

function base64Fixture(name) {
  return new Uint8Array(Buffer.from(
    readFileSync(path.join(fixtureRoot, name), 'utf8').trim(),
    'base64',
  ))
}

function artifact(name, mediaType, bytes = fixture(name)) {
  return { name, mediaType, bytes }
}

function rejected(input, expectedFindings) {
  assert.throws(
    () => validateDeliveryArtifact(input),
    (error) => {
      assert.ok(error instanceof DeliveryCustodyError)
      assert.equal(error.code, 'policy_rejected')
      for (const finding of expectedFindings) {
        assert.ok(
          error.findings.includes(finding),
          `${input.name} must report ${finding}; got ${error.findings.join(', ')}`,
        )
      }
      return true
    },
  )
}

function rejectedSet(inputs, expectedFinding) {
  assert.throws(
    () => validateDeliveryArtifactSet(inputs),
    (error) => (
      error instanceof DeliveryCustodyError
      && error.code === 'policy_rejected'
      && error.findings.includes(expectedFinding)
    ),
  )
}

assert.equal(DELIVERY_ARTIFACT_MAX_FILES, 5)
assert.equal(DELIVERY_ARTIFACT_MAX_FILE_BYTES, 4_000_000)
assert.equal(DELIVERY_ARTIFACT_MAX_TOTAL_BYTES, 12_000_000)
assert.equal(DELIVERY_UPLOAD_MAX_MULTIPART_BYTES, 4_250_000)

function uploadEnvelope(contentLength, overrides = {}) {
  const headers = new Headers({
    origin: 'https://pathforge.test',
    'sec-fetch-site': 'same-origin',
    'content-type': 'multipart/form-data; boundary=pathforge-boundary',
    ...(contentLength === null ? {} : { 'content-length': String(contentLength) }),
    ...overrides,
  })
  return new Request('https://pathforge.test/api/request-deliveries/artifacts', {
    method: 'POST',
    headers,
  })
}

assert.equal(
  assertDeliveryUploadRequestEnvelope(uploadEnvelope(DELIVERY_UPLOAD_MAX_MULTIPART_BYTES)),
  DELIVERY_UPLOAD_MAX_MULTIPART_BYTES,
)
for (const request of [
  uploadEnvelope(null),
  uploadEnvelope('invalid'),
  uploadEnvelope(4_500_000),
  uploadEnvelope(1_000, { origin: 'https://attacker.invalid' }),
]) {
  assert.throws(
    () => assertDeliveryUploadRequestEnvelope(request),
    (error) => error instanceof DeliveryUploadRequestError,
  )
}
for (const byteLength of [3_999_999, 4_000_000]) {
  const form = new FormData()
  form.set('artifact', new File([new Uint8Array(byteLength)], 'boundary.txt', {
    type: 'text/plain',
  }))
  assert.equal(readSingleDeliveryArtifact(form).size, byteLength)
}
const oversizedUpload = new FormData()
oversizedUpload.set('artifact', new File([new Uint8Array(4_000_001)], 'too-large.txt', {
  type: 'text/plain',
}))
assert.throws(
  () => readSingleDeliveryArtifact(oversizedUpload),
  (error) => error instanceof DeliveryUploadRequestError && error.code === 'invalid_file_size',
)
const multipleUpload = new FormData()
multipleUpload.append('artifact', new File(['one'], 'one.txt', { type: 'text/plain' }))
multipleUpload.append('artifact', new File(['two'], 'two.txt', { type: 'text/plain' }))
assert.throws(
  () => readSingleDeliveryArtifact(multipleUpload),
  (error) => error instanceof DeliveryUploadRequestError && error.code === 'invalid_file_count',
)

const accepted = [
  artifact('passive.html', 'text/html'),
  artifact('notes.markdown', 'text/markdown'),
  artifact('readme.txt', 'text/plain'),
  artifact('data.json', 'application/json'),
  artifact('checks.csv', 'text/csv'),
  artifact('pixel.png', 'image/png', base64Fixture('pixel.png.b64')),
  artifact('pixel.jpeg', 'image/jpeg', base64Fixture('pixel.jpg.b64')),
].map(validateDeliveryArtifact)

for (const input of [
  artifact('passive.htm', 'text/html', fixture('passive.html')),
  artifact('notes.md', 'text/markdown', fixture('notes.markdown')),
  artifact('pixel.jpg', 'image/jpeg', base64Fixture('pixel.jpg.b64')),
]) {
  assert.doesNotThrow(() => validateDeliveryArtifact(input))
}
for (const byteLength of [3_999_999, 4_000_000]) {
  assert.doesNotThrow(() => validateDeliveryArtifact(
    artifact(`boundary-${byteLength}.txt`, 'text/plain', new Uint8Array(byteLength).fill(97)),
  ))
}

assert.deepEqual(
  accepted.map(({ format, mediaType }) => [format, mediaType]),
  [
    ['html', 'text/html'],
    ['markdown', 'text/markdown'],
    ['text', 'text/plain'],
    ['json', 'application/json'],
    ['csv', 'text/csv'],
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
  ],
)
for (const validated of accepted) {
  assert.match(validated.sha256, /^[a-f0-9]{64}$/)
  assert.equal(validated.byteLength, validated.bytes.byteLength)
  assert.equal(validated.safeName.includes('/'), false)
  assert.equal(validated.safeName.includes('\\'), false)
}

assert.equal(
  normalizeDeliveryArtifactName('../../ Secret／Report\u0000.TXT'),
  'Secret-Report.txt',
)
assert.ok(normalizeDeliveryArtifactName(` ${'a'.repeat(300)}.txt`).length <= 120)
assert.equal(normalizeDeliveryArtifactName('.../../.txt'), 'artifact.txt')

rejected(artifact('empty.txt', 'text/plain', new Uint8Array()), ['empty_file'])
rejected(
  artifact('large.txt', 'text/plain', new Uint8Array(DELIVERY_ARTIFACT_MAX_FILE_BYTES + 1)),
  ['file_too_large'],
)
rejected(
  artifact('wrong.txt', 'application/json', fixture('readme.txt')),
  ['extension_media_type_mismatch'],
)
rejected(artifact('wrong.png', 'image/png', fixture('readme.txt')), ['signature_mismatch'])
rejected(
  artifact('archive.zip', 'application/zip', base64Fixture('reject-archive.zip.b64')),
  ['unsupported_extension', 'unsupported_media_type'],
)
for (const [name, mediaType] of [
  ['image.svg', 'image/svg+xml'],
  ['document.pdf', 'application/pdf'],
  ['program.js', 'text/javascript'],
]) {
  rejected(
    artifact(name, mediaType, fixture('readme.txt')),
    ['unsupported_extension', 'unsupported_media_type'],
  )
}
rejected(artifact('active.html', 'text/html', fixture('reject-active-script.html')), ['active_html'])
rejected(
  artifact('network.html', 'text/html', fixture('reject-network.html')),
  ['html_external_resource'],
)
rejected(
  artifact('navigation.html', 'text/html', fixture('reject-navigation.html')),
  ['html_navigation', 'html_form'],
)
rejected(
  artifact('active-svg.html', 'text/html', fixture('reject-svg-active.html')),
  ['html_svg_or_math'],
)
const hostileHtml = (body) => new TextEncoder().encode(`<!doctype html><html><body>${body}</body></html>`)
for (const [name, body, findings] of [
  ['event-handler.html', '<div onclick="return false">Click</div>', ['active_html']],
  ['form.html', '<form><input name="value"></form>', ['html_form']],
  ['meta-refresh.html', '<meta http-equiv="refresh" content="0">', ['html_metadata_or_base']],
  ['base.html', '<base href="/">', ['html_metadata_or_base']],
  ['iframe.html', '<iframe srcdoc="safe"></iframe>', ['html_frame_or_plugin']],
  ['object.html', '<object data="about:blank"></object>', ['html_frame_or_plugin']],
  ['embed.html', '<embed src="about:blank">', ['html_frame_or_plugin']],
  ['link.html', '<link rel="stylesheet" href="/style.css">', ['html_external_resource']],
  ['css-import.html', '<style>@import "theme.css";</style>', ['html_external_resource']],
  ['css-url-obfuscated.html', '<style>.x{background:u\\72l(//host.invalid/a)}</style>', ['html_external_resource']],
  ['css-image-set.html', '<style>.x{background:image-set("//host.invalid/a.png" 1x)}</style>', ['html_external_resource']],
  ['css-webkit-image-set.html', '<div style="background:-webkit-image-set(\'//host.invalid/a.png\' 1x)">x</div>', ['html_external_resource']],
  ['css-cross-fade.html', '<style>.x{background:cross-fade("//host.invalid/a.png","//host.invalid/b.png",50%)}</style>', ['html_external_resource']],
  ['legacy-lowsrc.html', '<img lowsrc="//host.invalid/a.png">', ['html_external_resource']],
  ['legacy-manifest.html', '<html manifest="//host.invalid/app.manifest"><body>x</body></html>', ['html_external_resource']],
  ['data-navigation.html', '<a href="data:text/html,unsafe">Open</a>', ['html_navigation', 'dangerous_uri']],
  ['blob-navigation.html', '<a href="blob:unsafe">Open</a>', ['html_navigation', 'dangerous_uri']],
  ['fetch-surface.html', '<div data-code="fetch()">Unsafe</div>', ['active_html']],
  ['location-surface.html', '<div data-code="location.href">Unsafe</div>', ['html_navigation']],
]) {
  rejected(artifact(name, 'text/html', hostileHtml(body)), findings)
}
for (const [name, findings] of [
  ['reject-slash-script.html', ['active_html']],
  ['reject-slash-svg-onload.html', ['html_svg_or_math', 'active_html']],
  ['reject-slash-body-onload.html', ['active_html']],
  ['reject-slash-iframe-srcdoc.html', ['html_frame_or_plugin', 'html_external_resource']],
  ['reject-slash-img-src.html', ['html_external_resource']],
  ['reject-quoted-gt-slash-onload.html', ['active_html']],
  ['reject-quoted-gt-slash-src.html', ['html_external_resource']],
]) {
  rejected(artifact(name, 'text/html', fixture(name)), findings)
}
for (const [name, findings] of [
  ['reject-markdown-inline.md', ['markdown_link', 'dangerous_uri']],
  ['reject-markdown-reference.md', ['markdown_link', 'dangerous_uri']],
  ['reject-markdown-image.md', ['markdown_link', 'dangerous_uri']],
  ['reject-markdown-autolink.md', ['markdown_link', 'markdown_raw_html', 'dangerous_uri']],
  ['reject-markdown-raw-html.md', ['markdown_raw_html', 'dangerous_uri']],
  ['reject-markdown-escaped.md', ['markdown_link', 'dangerous_uri']],
]) {
  rejected(artifact(name, 'text/markdown', fixture(name)), findings)
}
rejected(
  artifact(
    'secret.txt',
    'text/plain',
    new TextEncoder().encode('api_key=sk-proj-aaaaaaaaaaaaaaaaaaaaaaaa'),
  ),
  ['possible_secret'],
)
rejected(
  artifact(
    'customer.txt',
    'text/plain',
    new TextEncoder().encode('customer@example.com'),
  ),
  ['possible_personal_data'],
)
rejected(
  artifact(
    'url.md',
    'text/markdown',
    new TextEncoder().encode('Fetch https://example.invalid/private'),
  ),
  ['dangerous_uri'],
)
rejected(
  artifact('invalid.json', 'application/json', new TextEncoder().encode('{"open":')),
  ['invalid_json'],
)
rejected(
  artifact('invalid.csv', 'text/csv', new TextEncoder().encode('a,b\none,two,three\n')),
  ['invalid_csv'],
)
rejected(
  artifact('formula.csv', 'text/csv', new TextEncoder().encode('name,value\nexternal,=HYPERLINK("remote","open")\n')),
  ['csv_formula'],
)
for (const name of [
  'reject-csv-bom-fullwidth-formula.csv',
  'reject-csv-unicode-minus-formula.csv',
  'reject-csv-whitespace-zero-width-formula.csv',
]) {
  rejected(artifact(name, 'text/csv', fixture(name)), ['csv_formula'])
}
assert.doesNotThrow(() => validateDeliveryArtifact(
  artifact('allow-csv-negative-numeric.csv', 'text/csv', fixture('allow-csv-negative-numeric.csv')),
))

rejectedSet(
  Array.from({ length: DELIVERY_ARTIFACT_MAX_FILES + 1 }, (_, index) => artifact(
    `file-${index}.txt`,
    'text/plain',
    new TextEncoder().encode(String(index)),
  )),
  'too_many_files',
)
rejectedSet([
  artifact('one.txt', 'text/plain', new Uint8Array(3_000_001).fill(97)),
  artifact('two.txt', 'text/plain', new Uint8Array(3_000_001).fill(98)),
  artifact('three.txt', 'text/plain', new Uint8Array(3_000_001).fill(99)),
  artifact('four.txt', 'text/plain', new Uint8Array(3_000_001).fill(100)),
], 'total_bytes_exceeded')
rejectedSet([
  artifact('Report.txt', 'text/plain', new TextEncoder().encode('one')),
  artifact('report.TXT', 'text/plain', new TextEncoder().encode('two')),
], 'duplicate_safe_name')

const scope = {
  requestId: '10000000-0000-4000-8000-000000000001',
  deliveryRevisionId: '20000000-0000-4000-8000-000000000001',
  acceptedBriefRevisionId: '30000000-0000-4000-8000-000000000001',
  builderAssignmentId: '40000000-0000-4000-8000-000000000001',
}
const artifactId = '60000000-0000-4000-8000-000000000001'
const stagingIdentity = [
  'requests',
  scope.requestId,
  'deliveries',
  scope.deliveryRevisionId,
  'artifacts',
  artifactId,
  '80000000-0000-4000-8000-000000000001',
].join('/')
const authorityArtifacts = [{ artifactId, stagingIdentity, artifactOrdinal: 1 }]
const textArtifact = validateDeliveryArtifact(artifact('readme.txt', 'text/plain'))
const keys = buildDeliveryObjectKeys({
  scope,
  artifactId,
  stagingIdentity,
})
assert.equal(keys.objectIdentity, stagingIdentity)
assert.equal(
  keys.objectPrefix,
  `${stagingIdentity.slice(0, stagingIdentity.lastIndexOf('/') + 1)}`,
)
assert.equal(
  keys.revisionPrefix,
  `requests/${scope.requestId}/deliveries/${scope.deliveryRevisionId}/`,
)
assert.equal(keys.objectIdentity.includes(textArtifact.safeName), false)
assert.equal(keys.objectIdentity.includes('..'), false)
const versionEightScope = {
  ...scope,
  deliveryRevisionId: '20000000-0000-8000-8000-000000000001',
}
assert.deepEqual(
  normalizeDeliveryCustodyScope(versionEightScope),
  versionEightScope,
  'canonical UUID v8 delivery revisions remain valid custody authority',
)
for (const invalidAuthorityId of [
  '20000000-0000-9000-8000-000000000001',
  '20000000-0000-8000-c000-000000000001',
  '20000000-0000-8000-8000-00000000001',
  '20000000000080008000000000000001',
]) {
  assert.throws(
    () => assertDeliveryAuthorityId(invalidAuthorityId),
    (error) => error instanceof DeliveryCustodyError && error.code === 'invalid_input',
  )
}
assert.throws(
  () => buildDeliveryObjectKeys({
    scope,
    artifactId,
    stagingIdentity: stagingIdentity.replace(
      scope.requestId,
      '70000000-0000-4000-8000-000000000001',
    ),
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'invalid_input',
)
assert.throws(
  () => buildDeliveryObjectKeys({
    scope: versionEightScope,
    artifactId,
    stagingIdentity: [
      'requests',
      versionEightScope.requestId,
      'deliveries',
      versionEightScope.deliveryRevisionId,
      'artifacts',
      artifactId,
      '80000000-0000-8000-8000-000000000001',
    ].join('/'),
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'invalid_input',
  'the authority-generated object nonce remains explicitly UUID v4',
)

const createdAt = '2026-07-29T12:00:00.000Z'

class MemoryStorage {
  objects = new Map()

  async putIfAbsent(input) {
    if (this.objects.has(input.key)) return 'exists'
    this.objects.set(input.key, {
      bytes: input.bytes.slice(),
      mediaType: input.mediaType,
      metadata: { ...input.metadata },
      createdAt: createdAt,
    })
    return 'created'
  }

  async read(key) {
    const value = this.objects.get(key)
    if (!value) return null
    return {
      ...value,
      bytes: value.bytes.slice(),
      metadata: { ...value.metadata },
    }
  }

  async list(prefix) {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, createdAt: value.createdAt }))
  }
}

const writeAuthority = {
  moderation: 'clear',
  lifecycle: 'building',
  workBlocked: false,
  retentionState: 'retained',
  withdrawn: false,
}
const storage = new MemoryStorage()
const staged = await stageDeliveryArtifactSet({
  storage,
  scope,
  authority: writeAuthority,
  authorityArtifacts,
  files: [artifact('readme.txt', 'text/plain')],
})
assert.equal(staged.artifacts.length, 1)
assert.equal(storage.objects.size, 1)
const finalized = await finalizeDeliveryArtifactSet({
  storage,
  staged,
  authority: writeAuthority,
})
assert.equal(finalized.replayed, false)
assert.equal(storage.objects.size, 1)
const finalizedBindings = finalized.artifacts.map((entry) => ({
  artifactId: entry.artifactId,
  artifactOrdinal: entry.artifactOrdinal,
  safeName: entry.artifact.safeName,
  objectIdentity: entry.objectIdentity,
  sha256: entry.artifact.sha256,
  byteLength: entry.artifact.byteLength,
  mediaType: entry.artifact.mediaType,
}))
assert.equal(await verifyFinalizedDeliveryArtifactSet({
  storage,
  scope,
  bindings: finalizedBindings,
}), true)
const replayedStaged = await stageDeliveryArtifactSet({
  storage,
  scope,
  authority: writeAuthority,
  authorityArtifacts,
  files: [artifact('readme.txt', 'text/plain')],
})
const replayed = await finalizeDeliveryArtifactSet({
  storage,
  staged: replayedStaged,
  authority: writeAuthority,
})
assert.equal(replayed.replayed, true)
assert.deepEqual(replayed.artifacts, finalized.artifacts)
assert.equal(storage.objects.size, 1)

const concurrentStorage = new MemoryStorage()
const concurrentStaged = await stageDeliveryArtifactSet({
  storage: concurrentStorage,
  scope,
  authority: writeAuthority,
  authorityArtifacts,
  files: [artifact('readme.txt', 'text/plain')],
})
const concurrentResults = await Promise.all([
  finalizeDeliveryArtifactSet({
    storage: concurrentStorage,
    staged: concurrentStaged,
    authority: writeAuthority,
  }),
  finalizeDeliveryArtifactSet({
    storage: concurrentStorage,
    staged: concurrentStaged,
    authority: writeAuthority,
  }),
])
assert.equal(
  concurrentResults.filter(({ replayed: wasReplayed }) => !wasReplayed).length,
  2,
)
assert.deepEqual(concurrentResults[0].artifacts, concurrentResults[1].artifacts)
assert.equal(concurrentStorage.objects.size, 1)

for (const authority of [
  { ...writeAuthority, moderation: 'held' },
  { ...writeAuthority, moderation: 'removed' },
  { ...writeAuthority, workBlocked: true },
  { ...writeAuthority, withdrawn: true },
  { ...writeAuthority, lifecycle: 'review_pending' },
  { ...writeAuthority, lifecycle: 'closed' },
]) {
  await assert.rejects(
    stageDeliveryArtifactSet({
      storage: new MemoryStorage(),
      scope,
      authority,
      authorityArtifacts,
      files: [artifact('readme.txt', 'text/plain')],
    }),
    (error) => error instanceof DeliveryCustodyError && error.code === 'authority_blocked',
  )
}
await assert.doesNotReject(
  stageDeliveryArtifactSet({
    storage: new MemoryStorage(),
    scope,
    authority: { ...writeAuthority, retentionState: 'preserved_by_hold' },
    authorityArtifacts,
    files: [artifact('readme.txt', 'text/plain')],
  }),
  'a preservation-only hold must not independently invent a builder work freeze',
)

const finalEntry = finalized.artifacts[0]
const finalObject = storage.objects.get(finalEntry.objectIdentity)
assert.ok(finalObject)
storage.objects.delete(finalEntry.objectIdentity)
await assert.rejects(
  verifyFinalizedDeliveryArtifactSet({
    storage,
    scope,
    bindings: finalizedBindings,
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'missing_object',
)
storage.objects.set(finalEntry.objectIdentity, {
  ...finalObject,
  bytes: new TextEncoder().encode('corrupted'),
})
await assert.rejects(
  verifyFinalizedDeliveryArtifactSet({
    storage,
    scope,
    bindings: finalizedBindings,
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'integrity_mismatch',
)
await assert.rejects(
  stageDeliveryArtifactSet({
    storage,
    scope,
    authority: writeAuthority,
    authorityArtifacts,
    files: [artifact('readme.txt', 'text/plain')],
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'storage_conflict',
)
assert.throws(
  () => inspectStoredDeliveryArtifact(null, {
    sha256: finalEntry.artifact.sha256,
    byteLength: finalEntry.artifact.byteLength,
    mediaType: finalEntry.artifact.mediaType,
    metadata: finalObject.metadata,
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'missing_object',
)
await assert.rejects(
  finalizeDeliveryArtifactSet({
    storage,
    staged: replayedStaged,
    authority: { ...writeAuthority, moderation: 'held' },
  }),
  (error) => error instanceof DeliveryCustodyError && error.code === 'authority_blocked',
)

const orphanStorage = new MemoryStorage()
const orphanKey = [
  'requests',
  scope.requestId,
  'deliveries',
  scope.deliveryRevisionId,
  'artifacts',
  '65000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
].join('/')
orphanStorage.objects.set(
  orphanKey,
  {
    bytes: new Uint8Array([1]),
    mediaType: 'text/plain',
    metadata: {},
    createdAt: '2026-07-01T00:00:00.000Z',
  },
)
orphanStorage.objects.set(
  keys.objectIdentity,
  {
    bytes: new Uint8Array([1]),
    mediaType: 'text/plain',
    metadata: {},
    createdAt: '2026-07-01T00:00:00.000Z',
  },
)
const orphans = await planDeliveryStagingOrphans({
  storage: orphanStorage,
  requestId: scope.requestId,
  authority: writeAuthority,
  referencedObjectPrefixes: new Set([keys.objectPrefix]),
  olderThan: '2026-07-15T00:00:00.000Z',
})
assert.deepEqual(orphans.map(({ key }) => key), [orphanKey])
assert.equal(orphans[0].disposition, 'review_only')
assert.deepEqual(
  await planDeliveryStagingOrphans({
    storage: orphanStorage,
    requestId: scope.requestId,
    authority: { ...writeAuthority, retentionState: 'preserved_by_hold' },
    referencedObjectPrefixes: new Set([keys.objectPrefix]),
    olderThan: '2026-07-15T00:00:00.000Z',
  }),
  [],
)
assert.deepEqual(
  await planDeliveryStagingOrphans({
    storage: orphanStorage,
    requestId: scope.requestId,
    authority: { ...writeAuthority, moderation: 'removed' },
    referencedObjectPrefixes: new Set([keys.objectPrefix]),
    olderThan: '2026-07-15T00:00:00.000Z',
  }),
  orphans,
  'moderation removal without a preservation hold must not retain raw orphans forever',
)
assert.deepEqual(
  await planDeliveryStagingOrphans({
    storage: orphanStorage,
    requestId: scope.requestId,
    authority: {
      ...writeAuthority,
      moderation: 'removed',
      retentionState: 'preserved_by_hold',
    },
    referencedObjectPrefixes: new Set([keys.objectPrefix]),
    olderThan: '2026-07-15T00:00:00.000Z',
  }),
  [],
  'an explicit active retention hold must preserve removed raw objects',
)

assert.equal(
  deliveryArtifactRetentionDisposition({
    authority: {
      ...writeAuthority,
      lifecycle: 'completed',
      retentionState: 'retained',
    },
  }),
  'retain_terminal',
  'a completed case at authority day 89 must remain retained',
)
assert.equal(
  deliveryArtifactRetentionDisposition({
    authority: {
      ...writeAuthority,
      lifecycle: 'completed',
      retentionState: 'cleanup_eligible',
    },
  }),
  'eligible_for_policy_cleanup',
  'a completed case at authority day 91 may become cleanup eligible',
)
assert.equal(
  deliveryArtifactRetentionDisposition({
    authority: {
      ...writeAuthority,
      lifecycle: 'completed',
      retentionState: 'preserved_by_hold',
    },
  }),
  'hold',
  'an active hold must override elapsed terminal retention',
)
assert.equal(
  deliveryArtifactRetentionDisposition({
    authority: {
      ...writeAuthority,
      lifecycle: 'completed',
      moderation: 'removed',
      retentionState: 'cleanup_eligible',
    },
  }),
  'eligible_for_policy_cleanup',
)
assert.equal(
  deliveryArtifactRetentionDisposition({
    authority: {
      ...writeAuthority,
      lifecycle: 'completed',
      moderation: 'removed',
      retentionState: 'preserved_by_hold',
    },
  }),
  'hold',
)

assert.deepEqual(
  [...REQUEST_DELIVERY_READER_MEDIA_TYPES],
  [
    'text/html',
    'text/markdown',
    'text/plain',
    'application/json',
    'text/csv',
    'image/png',
    'image/jpeg',
  ],
)
for (const headers of [
  REQUEST_DELIVERY_READER_HEADERS,
  REQUEST_DELIVERY_PREVIEW_HEADERS,
  REQUEST_DELIVERY_DOWNLOAD_HEADERS,
]) {
  assert.equal(headers['Cache-Control'], 'private, no-store, max-age=0, must-revalidate')
  assert.equal(headers.Pragma, 'no-cache')
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(headers['Referrer-Policy'], 'no-referrer')
  assert.equal(headers['Cross-Origin-Resource-Policy'], 'same-origin')
  assert.match(headers['Permissions-Policy'], /camera=\(\)/)
  assert.match(headers.Vary, /Authorization/)
  assert.match(headers.Vary, /Cookie/)
}
assert.match(REQUEST_DELIVERY_PREVIEW_HEADERS['Content-Security-Policy'], /script-src 'none'/)
assert.match(REQUEST_DELIVERY_PREVIEW_HEADERS['Content-Security-Policy'], /connect-src 'none'/)
assert.match(REQUEST_DELIVERY_PREVIEW_HEADERS['Content-Security-Policy'], /sandbox/)
assert.match(REQUEST_DELIVERY_DOWNLOAD_HEADERS['Content-Security-Policy'], /sandbox/)
assert.equal(REQUEST_DELIVERY_DOWNLOAD_HEADERS['X-Frame-Options'], 'DENY')

const readerBytes = fixture('passive.html')
const readerSha256 = createHash('sha256').update(readerBytes).digest('hex')
const readerManifestDigest = 'b'.repeat(64)
const readerInput = {
  artifactId: 'artifact-01',
  disposition: 'preview',
}
const resolvedReaderArtifact = {
  status: 'authorized',
  requestId: scope.requestId,
  deliveryRevisionId: scope.deliveryRevisionId,
  artifactId: readerInput.artifactId,
  normalizedName: '../../private result.html',
  mediaType: 'text/html',
  byteLength: readerBytes.byteLength,
  sha256: readerSha256,
}
const resolvedReaderObject = {
  status: 'authorized',
  requestId: scope.requestId,
  artifactId: readerInput.artifactId,
  deliveryRevisionId: scope.deliveryRevisionId,
  acceptedBriefRevisionId: scope.acceptedBriefRevisionId,
  builderAssignmentId: scope.builderAssignmentId,
  artifactOrdinal: 1,
  sha256: readerSha256,
  byteLength: readerBytes.byteLength,
  mediaType: 'text/html',
  scannerVersion: 'request-delivery-passive-v1',
  manifestDigest: readerManifestDigest,
  objectIdentity: stagingIdentity,
}

function readerObjectMetadata(
  participant = resolvedReaderArtifact,
  object = resolvedReaderObject,
) {
  return {
    policyVersion: 'request-delivery-passive-v1',
    scannerVersion: object.scannerVersion,
    custodyState: 'staging',
    requestId: object.requestId,
    deliveryRevisionId: object.deliveryRevisionId,
    acceptedBriefRevisionId: object.acceptedBriefRevisionId,
    builderAssignmentId: object.builderAssignmentId,
    artifactId: object.artifactId,
    artifactOrdinal: String(object.artifactOrdinal),
    safeName: participant.normalizedName,
    sha256: object.sha256,
    byteLength: String(object.byteLength),
    mediaType: object.mediaType,
  }
}

function readerDependencies(overrides = {}) {
  return {
    resolveParticipantArtifact: async () => resolvedReaderArtifact,
    resolveObjectIdentity: async () => resolvedReaderObject,
    downloadPrivateObject: async () => ({
      status: 'available',
      object: {
        bytes: readerBytes,
        byteLength: readerBytes.byteLength,
        mediaType: 'text/html',
        metadata: readerObjectMetadata(),
      },
    }),
    ...overrides,
  }
}

const previewResponse = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies(),
)
assert.equal(previewResponse.ok, true)
assert.equal(previewResponse.status, 200)
assert.equal(previewResponse.internalState, 'ready')
assert.equal(previewResponse.headers['Cache-Control'], 'private, no-store, max-age=0, must-revalidate')
assert.deepEqual(previewResponse.body, readerBytes)
assert.equal(previewResponse.headers['Content-Type'], 'text/html; charset=utf-8')
assert.match(previewResponse.headers['Content-Disposition'], /^inline; filename="private-result\.html"$/)
assert.equal(Number(previewResponse.headers['Content-Length']), readerBytes.byteLength)
assert.doesNotMatch(new TextDecoder().decode(previewResponse.body), /requests\/10000000-/)
assert.equal(
  Object.hasOwn(resolvedReaderArtifact, 'manifestDigest'),
  false,
  'participant-safe reader metadata must not contain the sealed manifest digest',
)

for (const metadataField of Object.keys(readerObjectMetadata())) {
  const hostileMetadata = readerObjectMetadata()
  hostileMetadata[metadataField] = metadataField === 'artifactOrdinal'
    ? '2'
    : `rebound-${metadataField}`
  const hostileMetadataResponse = await readRequestDeliveryArtifact(
    readerInput,
    readerDependencies({
      downloadPrivateObject: async () => ({
        status: 'available',
        object: {
          bytes: readerBytes,
          byteLength: readerBytes.byteLength,
          mediaType: 'text/html',
          metadata: hostileMetadata,
        },
      }),
    }),
  )
  assert.equal(
    hostileMetadataResponse.internalState,
    'authority_binding_mismatch',
    `reader rejects rebound private object metadata field ${metadataField}`,
  )
  assert.equal(hostileMetadataResponse.status, 409)
  assert.notDeepEqual(hostileMetadataResponse.body, readerBytes)
}

const missingStorageMetadataResponse = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    downloadPrivateObject: async () => ({
      status: 'available',
      object: {
        bytes: readerBytes,
        byteLength: readerBytes.byteLength,
        mediaType: 'text/html',
        metadata: {},
      },
    }),
  }),
)
assert.equal(missingStorageMetadataResponse.internalState, 'authority_binding_mismatch')
assert.equal(missingStorageMetadataResponse.status, 409)
assert.notDeepEqual(missingStorageMetadataResponse.body, readerBytes)

const serviceReaderBindings = []
const serverDerivedDigestResponse = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    resolveObjectIdentity: async (binding) => {
      serviceReaderBindings.push(binding)
      return resolvedReaderObject
    },
  }),
)
assert.equal(serverDerivedDigestResponse.ok, true)
assert.equal(serviceReaderBindings.length, 2)
for (const binding of serviceReaderBindings) {
  assert.deepEqual(
    Object.keys(binding).sort(),
    ['artifactId', 'deliveryRevisionId', 'requestId'],
    'service object resolution derives digest and custody metadata without browser input',
  )
}

const downloadResponse = await readRequestDeliveryArtifact(
  { ...readerInput, disposition: 'download' },
  readerDependencies(),
)
assert.equal(downloadResponse.ok, true)
assert.deepEqual(downloadResponse.body, readerBytes)
assert.equal(downloadResponse.headers['Content-Type'], 'text/html')
assert.match(downloadResponse.headers['Content-Disposition'], /^attachment; filename="private-result\.html"$/)
assert.doesNotMatch(new TextDecoder().decode(downloadResponse.body), /requests\/10000000-/)

for (const reason of ['unauthorized', 'unrelated', 'not_found']) {
  const response = await readRequestDeliveryArtifact(
    readerInput,
    readerDependencies({
      resolveParticipantArtifact: async () => ({
        status: 'unavailable',
        reason,
        disclosure: 'generic',
      }),
    }),
  )
  assert.equal(response.ok, false)
  assert.equal(response.status, 404)
  assert.equal(new TextDecoder().decode(response.body), 'Private artifact is unavailable.')
}
const participantHeld = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    resolveParticipantArtifact: async () => ({
      status: 'unavailable',
      reason: 'held',
      disclosure: 'participant',
    }),
  }),
)
assert.equal(participantHeld.status, 423)
assert.equal(participantHeld.internalState, 'held')
assert.equal(new TextDecoder().decode(participantHeld.body), 'Private artifact access is held.')

let crossBindingDownloadCalled = false
const crossBinding = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    resolveObjectIdentity: async () => ({
      ...resolvedReaderObject,
      deliveryRevisionId: '70000000-0000-4000-8000-000000000001',
    }),
    downloadPrivateObject: async () => {
      crossBindingDownloadCalled = true
      throw new Error('must not download cross-case bytes')
    },
  }),
)
assert.equal(crossBinding.internalState, 'authority_binding_mismatch')
assert.equal(crossBinding.status, 409)
assert.equal(crossBindingDownloadCalled, false)

for (const [reason, expectedStatus] of [
  ['held', 423],
  ['removed', 410],
  ['withdrawn', 410],
  ['stale_revision', 409],
]) {
  let participantResolutionCount = 0
  let raceDownloadCount = 0
  const response = await readRequestDeliveryArtifact(
    readerInput,
    readerDependencies({
      resolveParticipantArtifact: async () => {
        participantResolutionCount += 1
        return participantResolutionCount === 1
          ? resolvedReaderArtifact
          : { status: 'unavailable', reason, disclosure: 'participant' }
      },
      downloadPrivateObject: async () => {
        raceDownloadCount += 1
        return {
          status: 'available',
          object: {
            bytes: readerBytes,
            byteLength: readerBytes.byteLength,
            mediaType: 'text/html',
            metadata: readerObjectMetadata(),
          },
        }
      },
    }),
  )
  assert.equal(raceDownloadCount, 1, `${reason} race must occur after one private read`)
  assert.equal(response.ok, false, `${reason} race must emit no artifact bytes`)
  assert.equal(response.internalState, reason)
  assert.equal(response.status, expectedStatus)
  assert.notDeepEqual(response.body, readerBytes)
}

let objectResolutionCount = 0
let reboundDownloadCount = 0
const reboundObjectResponse = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    resolveObjectIdentity: async () => {
      objectResolutionCount += 1
      return objectResolutionCount === 1
        ? resolvedReaderObject
        : {
            ...resolvedReaderObject,
            objectIdentity: stagingIdentity.replace(
              '80000000-0000-4000-8000-000000000001',
              '80000000-0000-4000-8000-000000000002',
            ),
          }
    },
    downloadPrivateObject: async () => {
      reboundDownloadCount += 1
      return {
        status: 'available',
        object: {
          bytes: readerBytes,
          byteLength: readerBytes.byteLength,
          mediaType: 'text/html',
          metadata: readerObjectMetadata(),
        },
      }
    },
  }),
)
assert.equal(reboundDownloadCount, 1)
assert.equal(reboundObjectResponse.ok, false)
assert.equal(reboundObjectResponse.internalState, 'authority_binding_mismatch')
assert.equal(reboundObjectResponse.status, 409)
assert.notDeepEqual(reboundObjectResponse.body, readerBytes)

let digestResolutionCount = 0
const reboundDigestResponse = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    resolveObjectIdentity: async () => {
      digestResolutionCount += 1
      return digestResolutionCount === 1
        ? resolvedReaderObject
        : {
            ...resolvedReaderObject,
            manifestDigest: 'c'.repeat(64),
          }
    },
  }),
)
assert.equal(reboundDigestResponse.ok, false)
assert.equal(reboundDigestResponse.internalState, 'authority_binding_mismatch')
assert.equal(reboundDigestResponse.status, 409)
assert.notDeepEqual(reboundDigestResponse.body, readerBytes)

const missingReader = await readRequestDeliveryArtifact(
  readerInput,
  readerDependencies({
    downloadPrivateObject: async () => ({ status: 'missing' }),
  }),
)
assert.equal(missingReader.internalState, 'missing')
assert.equal(missingReader.status, 410)

for (const [label, object, expectedState] of [
  [
    'byte mismatch',
    {
      bytes: readerBytes,
      byteLength: readerBytes.byteLength + 1,
      mediaType: 'text/html',
      metadata: readerObjectMetadata(),
    },
    'byte_mismatch',
  ],
  [
    'type mismatch',
    {
      bytes: readerBytes,
      byteLength: readerBytes.byteLength,
      mediaType: 'image/png',
      metadata: readerObjectMetadata(),
    },
    'type_mismatch',
  ],
  [
    'hash mismatch',
    {
      bytes: new Uint8Array(readerBytes).fill(32, 10, 11),
      byteLength: readerBytes.byteLength,
      mediaType: 'text/html',
      metadata: readerObjectMetadata(),
    },
    'hash_mismatch',
  ],
]) {
  const response = await readRequestDeliveryArtifact(
    readerInput,
    readerDependencies({
      downloadPrivateObject: async () => ({ status: 'available', object }),
    }),
  )
  assert.equal(response.internalState, expectedState, label)
  assert.equal(response.status, 409, label)
}

const textReaderBytes = new TextEncoder().encode('<script>must stay inert</script>')
const textReaderSha256 = createHash('sha256').update(textReaderBytes).digest('hex')
const textResolvedParticipant = {
  ...resolvedReaderArtifact,
  artifactId: 'artifact-02',
  normalizedName: 'notes.txt',
  mediaType: 'text/plain',
  byteLength: textReaderBytes.byteLength,
  sha256: textReaderSha256,
}
const textResolvedObject = {
  ...resolvedReaderObject,
  artifactId: 'artifact-02',
  sha256: textReaderSha256,
  byteLength: textReaderBytes.byteLength,
  mediaType: 'text/plain',
}
const rawTextPreview = await readRequestDeliveryArtifact(
  { ...readerInput, artifactId: 'artifact-02' },
  readerDependencies({
    resolveParticipantArtifact: async () => textResolvedParticipant,
    resolveObjectIdentity: async () => textResolvedObject,
    downloadPrivateObject: async () => ({
      status: 'available',
      object: {
        bytes: textReaderBytes,
        byteLength: textReaderBytes.byteLength,
        mediaType: 'text/plain',
        metadata: readerObjectMetadata(
          textResolvedParticipant,
          textResolvedObject,
        ),
      },
    }),
  }),
)
assert.deepEqual(rawTextPreview.body, textReaderBytes)
assert.equal(rawTextPreview.headers['Content-Type'], 'text/plain; charset=utf-8')
assert.match(rawTextPreview.headers['Content-Security-Policy'], /sandbox/)
assert.match(rawTextPreview.headers['Content-Security-Policy'], /script-src 'none'/)

function maxReaderArtifact(format) {
  const bytes = new Uint8Array(4_000_000)
  let mediaType
  let normalizedName
  if (format === 'html') {
    bytes.fill(97)
    bytes.set(new TextEncoder().encode('<!doctype html><html><body>'), 0)
    mediaType = 'text/html'
    normalizedName = 'maximum.html'
  } else if (format === 'text') {
    bytes.fill(38)
    mediaType = 'text/plain'
    normalizedName = 'maximum.txt'
  } else if (format === 'png') {
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    mediaType = 'image/png'
    normalizedName = 'maximum.png'
  } else {
    bytes.set([0xff, 0xd8], 0)
    bytes.set([0xff, 0xd9], bytes.byteLength - 2)
    mediaType = 'image/jpeg'
    normalizedName = 'maximum.jpg'
  }
  return { bytes, mediaType, normalizedName }
}

for (const format of ['html', 'text', 'png', 'jpeg']) {
  const maximum = maxReaderArtifact(format)
  const sha256 = createHash('sha256').update(maximum.bytes).digest('hex')
  const artifactIdForFormat = `maximum-${format}`
  const maximumParticipant = {
    ...resolvedReaderArtifact,
    artifactId: artifactIdForFormat,
    normalizedName: maximum.normalizedName,
    mediaType: maximum.mediaType,
    byteLength: maximum.bytes.byteLength,
    sha256,
  }
  const maximumObject = {
    ...resolvedReaderObject,
    artifactId: artifactIdForFormat,
    sha256,
    byteLength: maximum.bytes.byteLength,
    mediaType: maximum.mediaType,
  }
  const maximumDependencies = readerDependencies({
    resolveParticipantArtifact: async () => maximumParticipant,
    resolveObjectIdentity: async () => maximumObject,
    downloadPrivateObject: async () => ({
      status: 'available',
      object: {
        bytes: maximum.bytes,
        byteLength: maximum.bytes.byteLength,
        mediaType: maximum.mediaType,
        metadata: readerObjectMetadata(maximumParticipant, maximumObject),
      },
    }),
  })
  for (const disposition of ['preview', 'download']) {
    const response = await readRequestDeliveryArtifact(
      { artifactId: artifactIdForFormat, disposition },
      maximumDependencies,
    )
    assert.equal(response.ok, true, `${format} ${disposition}`)
    assert.equal(response.body.byteLength, 4_000_000, `${format} ${disposition}`)
    assert.equal(Number(response.headers['Content-Length']), 4_000_000, `${format} ${disposition}`)
    if (disposition === 'preview') {
      assert.match(response.headers['Content-Security-Policy'], /sandbox/, format)
      assert.match(response.headers['Content-Disposition'], /^inline;/, format)
    } else {
      assert.match(response.headers['Content-Disposition'], /^attachment;/, format)
    }
  }
}

console.log(
  'Request delivery contract guard passed: 7 passive formats, hostile content, limits, names, PM1-bound object identity, replay/concurrency, corruption, authority freezes and post-read races, protected reader isolation/headers, orphan planning, and retention holds.',
)
