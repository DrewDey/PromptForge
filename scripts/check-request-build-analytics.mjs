import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const failures = []

function requireText(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label}: missing ${JSON.stringify(needle)}`)
}

function rejectText(source, needle, label) {
  if (source.includes(needle)) failures.push(`${label}: forbidden ${JSON.stringify(needle)}`)
}

const analyticsPath = 'src/lib/build-requests/analytics.ts'
const componentPath = 'src/components/requests/RequestAnalytics.tsx'
const activationContractPath = 'src/lib/activation/contract.ts'
const activationValidationPath = 'src/lib/activation/validation.ts'
const analyticsMigrationPath = 'supabase/migrations/20260729235900_request_build_product_analytics.sql'
const analytics = read(analyticsPath)
const component = read(componentPath)
const activationContract = read(activationContractPath)
const activationValidation = read(activationValidationPath)
const analyticsMigration = read(analyticsMigrationPath)
const rootLayout = read('src/app/layout.tsx')
const packageJson = JSON.parse(read('package.json'))

for (const eventName of [
  'intake_started',
  'submitted',
  'intake_failed',
  'status_viewed',
  'clarification_submitted',
  'delivery_opened',
  'usefulness_recorded',
]) {
  requireText(analytics, `'${eventName}'`, `${analyticsPath} event allowlist`)
  requireText(activationContract, `'${eventName}'`, `${activationContractPath} event allowlist`)
  requireText(analyticsMigration, `'${eventName}'`, `${analyticsMigrationPath} database allowlist`)
}

for (const failureReason of [
  'client_validation',
  'auth_required',
  'controls_closed',
  'capacity_full',
  'rate_limited',
  'duplicate',
  'stale_version',
  'forbidden_input',
  'invalid_reference',
  'service_unavailable',
  'unknown',
]) {
  requireText(analytics, `'${failureReason}'`, `${analyticsPath} failure allowlist`)
}

requireText(analytics, "import { trackActivationEvent } from '@/lib/activation/track'", `${analyticsPath} bounded first-party transport`)
requireText(
  analytics,
  'return trackActivationEvent({',
  `${analyticsPath} first-party delivery`,
)
requireText(analytics, "'/requests/[id]'", `${analyticsPath} canonical private requester path`)
requireText(analytics, "'/admin/build-requests/[id]'", `${analyticsPath} canonical private admin path`)
requireText(activationValidation, 'Request analytics cannot include private identifiers.', `${activationValidationPath} identifier rejection`)
requireText(component, 'const sentKeys = useRef(new Set<string>())', `${componentPath} keyed event emission`)
requireText(component, 'sentKeys.current.has(emissionKey)', `${componentPath} stable rerender dedupe`)
requireText(component, 'window.setTimeout(', `${componentPath} deferred route-owned emission`)
requireText(
  read('src/components/requests/RequestAnalyticsTransitionFixture.tsx'),
  'data-request-analytics-transition',
  'fail-to-submitted deterministic analytics fixture',
)
requireText(rootLayout, "import { Analytics } from '@vercel/analytics/next'", 'global Vercel Analytics preserved')
requireText(rootLayout, "import { SpeedInsights } from '@vercel/speed-insights/next'", 'global Speed Insights preserved')
requireText(rootLayout, '<Analytics />', 'global Vercel Analytics mount preserved')
requireText(rootLayout, '<SpeedInsights />', 'global Speed Insights mount preserved')
rejectText(rootLayout, 'RequestAnalytics', 'Request analytics must remain route owned')
rejectText(analytics, "from '@vercel/analytics'", `${analyticsPath} direct vendor transport`)

for (const sensitiveName of [
  'requestId',
  'request_id',
  'userId',
  'user_id',
  'receiptId',
  'receipt_id',
  'commandId',
  'command_id',
  'idempotencyKey',
  'idempotency_key',
  'projectId',
  'project_id',
  'sourceRunId',
  'source_run_id',
  'title:',
  'body:',
  'url:',
  'hash:',
  'filename:',
]) {
  rejectText(
    analytics.slice(0, analytics.indexOf('export type RequestAnalyticsTransportEvent')),
    sensitiveName,
    `${analyticsPath} public event contract`,
  )
}

const requestAnalyticsSources = [
  analyticsPath,
  componentPath,
  ...[
    'src/app/requests',
    'src/app/admin/build-requests',
    'src/components/requests',
    'src/lib/build-requests',
  ].flatMap((relativeDirectory) => {
    const absoluteDirectory = path.join(root, relativeDirectory)
    if (!fs.existsSync(absoluteDirectory)) return []
    return fs.readdirSync(absoluteDirectory, { recursive: true })
      .filter((entry) => typeof entry === 'string' && /\.(?:ts|tsx)$/.test(entry))
      .map((entry) => path.join(relativeDirectory, entry))
  }),
]

for (const sourcePath of requestAnalyticsSources) {
  if (sourcePath === analyticsPath || sourcePath === componentPath) continue
  const source = read(sourcePath)
  rejectText(source, "from '@vercel/analytics'", `${sourcePath} direct vendor analytics`)
  rejectText(source, 'trackActivationEvent(', `${sourcePath} legacy identifier-capable analytics`)
}

if (packageJson.scripts?.['check:request-build-analytics'] !== 'node scripts/check-request-build-analytics.mjs') {
  failures.push('package.json: missing exact check:request-build-analytics script')
}

if (failures.length > 0) {
  console.error(`Request build analytics checks failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('Request build analytics checks passed: events are categorical, private routes use canonical first-party paths, and global telemetry remains intact.')
