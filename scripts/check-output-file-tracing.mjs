import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sourceRunRuntimeRoutes from '../config/source-run-runtime-routes.json' with { type: 'json' }

const root = process.cwd()
const appTraceRoot = path.join(root, '.next', 'server', 'app')

if (!existsSync(appTraceRoot)) {
  throw new Error('Build output is missing. Run npm run build before checking output traces.')
}

function walkFiles(directory, predicate = () => true) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkFiles(file, predicate)
    return predicate(file) ? [file] : []
  })
}

function routeForTrace(traceFile) {
  const relative = path.relative(appTraceRoot, traceFile).replaceAll(path.sep, '/')
  const withoutFile = relative.replace(/\/(?:page|route)\.js\.nft\.json$/, '')
  return withoutFile === 'page.js.nft.json' ? '/' : `/${withoutFile}`
}

function routePatternMatches(pattern, route) {
  const expression = pattern
    .replaceAll('\\[', '[')
    .replaceAll('\\]', ']')
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${expression}$`).test(route)
}

function resolvedTraceFiles(traceFile) {
  const trace = JSON.parse(readFileSync(traceFile, 'utf8'))
  return trace.files.map((file) => path.resolve(path.dirname(traceFile), file))
}

const traceFiles = walkFiles(appTraceRoot, (file) => file.endsWith('.nft.json'))
const traces = traceFiles.map((traceFile) => ({
  route: routeForTrace(traceFile),
  traceFile,
  files: resolvedTraceFiles(traceFile),
}))

const forbiddenProjectPaths = [
  'next.config.ts',
  'scripts/',
  'skills/',
  'src/',
  'supabase/',
]

for (const trace of traces) {
  const leaked = trace.files.flatMap((file) => {
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) return []
    const relative = path.relative(root, file).replaceAll(path.sep, '/')
    return forbiddenProjectPaths.some((entry) => (
      entry.endsWith('/') ? relative.startsWith(entry) : relative === entry
    )) ? [relative] : []
  })
  if (leaked.length > 0) {
    throw new Error(`${trace.route} traces raw project files: ${leaked.slice(0, 5).join(', ')}`)
  }
}

const evidenceFiles = [
  ...walkFiles(path.join(root, 'seed-runs'), (file) => file.endsWith('.json')),
  ...walkFiles(path.join(root, 'public', 'artifacts')),
]
const evidenceSet = new Set(evidenceFiles.map((file) => path.resolve(file)))
const preparedArtifactFiles = walkFiles(path.join(root, 'public', 'artifacts'))
const preparedArtifactSet = new Set(preparedArtifactFiles.map((file) => path.resolve(file)))

for (const routePattern of sourceRunRuntimeRoutes) {
  const matchedTraces = traces.filter((trace) => routePatternMatches(routePattern, trace.route))
  if (matchedTraces.length === 0) {
    throw new Error(`No build trace matched source-run runtime route ${routePattern}.`)
  }
  for (const trace of matchedTraces) {
    const includedEvidence = new Set(trace.files.filter((file) => evidenceSet.has(file)))
    if (includedEvidence.size !== evidenceSet.size) {
      throw new Error(
        `${trace.route} includes ${includedEvidence.size}/${evidenceSet.size} required source-run evidence files.`,
      )
    }
  }
}

const preparedArtifactTraces = traces.filter((trace) => (
  routePatternMatches('/api/prepared-artifacts/*', trace.route)
))
if (preparedArtifactTraces.length === 0) {
  throw new Error('No build trace matched the prepared artifact access-control route.')
}
for (const trace of preparedArtifactTraces) {
  const includedArtifacts = new Set(trace.files.filter((file) => preparedArtifactSet.has(file)))
  if (includedArtifacts.size !== preparedArtifactSet.size) {
    throw new Error(
      `${trace.route} includes ${includedArtifacts.size}/${preparedArtifactSet.size} prepared artifact files.`,
    )
  }
}

for (const controlRoute of [
  '/about',
  '/auth/login',
  '/browse',
  '/paths',
  '/settings/profile',
  '/user/[username]',
  '/what-to-build',
]) {
  const trace = traces.find((candidate) => candidate.route === controlRoute)
  if (!trace) throw new Error(`Missing control trace for ${controlRoute}.`)
  const evidenceCount = trace.files.filter((file) => evidenceSet.has(file)).length
  if (evidenceCount !== 0) {
    throw new Error(`${controlRoute} unexpectedly traces ${evidenceCount} source-run evidence files.`)
  }
}

const runtimeTraceCount = traces.filter((trace) => (
  sourceRunRuntimeRoutes.some((pattern) => routePatternMatches(pattern, trace.route))
)).length
const controlBytes = statSync(traces.find((trace) => trace.route === '/about').traceFile).size

console.log(
  `Output tracing guard passed: ${traces.length} app traces, ${runtimeTraceCount} evidence routes, ` +
  `${evidenceSet.size} runtime evidence files, control trace ${controlBytes} bytes.`,
)
