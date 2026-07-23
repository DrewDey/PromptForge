#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')

const alertRoute = read('src/app/api/cron/community-project-alerts/route.ts')
const reconcileRoute = read('src/app/api/cron/community-project-reconcile/route.ts')
const alerts = read('src/lib/community-project-alerts.ts')
const migration = read('supabase/migrations/20260723204000_close_community_report_operational_gaps.sql')
const queueData = read('src/lib/data/community-projects.ts')
const adminQueue = read('src/app/admin/community-projects/page.tsx')
const queueComponent = read('src/app/admin/community-projects/AdminCommunityProjectReportQueue.tsx')
const projectDetail = read('src/app/admin/community-projects/[id]/page.tsx')
const qaReleaseControls = read('src/app/qa/community-release-controls/page.tsx')
const reportPage = read('src/app/admin/community-project-reports/[id]/page.tsx')
const recoveryWorkflow = read('.github/workflows/community-project-alert-recovery.yml')
const vercelConfig = JSON.parse(read('vercel.json'))
const runbook = read('docs/community-project-pilot-operations.md')

assert.match(alertRoute, /REPORT_ALERT_RETRY_BATCH_LIMIT = 50/)
assert.match(alertRoute, /REPORT_ALERT_CONCURRENCY = 10/)
assert.match(alertRoute, /begin_community_project_report_alert_delivery/)
assert.match(alertRoute, /get_community_project_report_alert_batch/)
assert.match(alertRoute, /record_community_project_report_alert_delivery/)
assert.match(alertRoute, /finish_community_project_report_alert_delivery/)
assert.match(alertRoute, /criticalRemaining/)
assert.match(alertRoute, /independentAlertChannels: endpointsReady \? 2 : 0/)
assert.match(alertRoute, /status: succeeded \? 200 : 503/)
assert.doesNotMatch(reconcileRoute, /REPORT_ALERT_RETRY_BATCH_LIMIT|record_community_project_report_alert_delivery/)

assert.match(alerts, /COMMUNITY_PROJECT_ALERT_WEBHOOK_URL/)
assert.match(alerts, /COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL/)
assert.match(alerts, /primary\.href === escalation\.href/)
assert.match(alerts, /Promise\.all/)
assert.match(alerts, /results\.every\(Boolean\)/)
assert.match(alerts, /channel,/)

for (const required of [
  "'report_alerts'",
  'private.begin_community_project_report_alert_delivery',
  'private.finish_community_project_report_alert_delivery',
  'private.get_community_project_report_alert_batch',
  'private.get_community_project_report_queue',
  'private.get_community_project_report_queue_counts',
  "NOW() - INTERVAL '1 hour'",
  "operation.last_metrics->>'independentAlertChannels' = '2'",
  'community_project_reports_moderation_queue_idx',
]) {
  assert.ok(migration.includes(required), `Operational-gap migration is missing ${required}.`)
}
assert.match(
  migration,
  /ORDER BY[\s\S]*'privacy'[\s\S]*'malware'[\s\S]*END DESC,[\s\S]*COALESCE\(report\.alert_last_attempt_at, report\.created_at\)/,
)
assert.match(
  migration,
  /REVOKE ALL ON FUNCTION public\.get_community_project_report_queue[\s\S]*GRANT EXECUTE ON FUNCTION public\.get_community_project_report_queue/,
)

assert.match(queueData, /getCommunityProjectReportQueueForAdmin/)
assert.match(queueData, /COMMUNITY_PROJECT_REPORT_QUEUE_PAGE_SIZE = 25/)
assert.match(queueData, /get_community_project_report_queue_counts/)
assert.match(queueData, /encodeCommunityProjectReportCursor/)
assert.match(adminQueue, /reportQueue\.totalCount/)
assert.match(adminQueue, /reportQueue\.undeliveredCount/)
assert.match(adminQueue, /AdminCommunityProjectReportQueue/)
assert.match(queueComponent, /Oldest critical/)
assert.match(queueComponent, /Next 25 reports/)
assert.match(queueComponent, /\/admin\/community-project-reports\/\$\{report\.id\}/)
assert.match(projectDetail, /reportList\.totalCount/)
assert.match(projectDetail, /Open the complete unresolved queue for this project/)
assert.match(qaReleaseControls, /AdminCommunityProjectReportQueue/)
assert.match(qaReleaseControls, /totalCount: 125/)
assert.match(reportPage, /getCommunityProjectReportForAdmin/)

assert.match(recoveryWorkflow, /cron: '7,22,37,52 \* \* \* \*'/)
assert.match(recoveryWorkflow, /PATHFORGE_PRODUCTION_URL/)
assert.match(recoveryWorkflow, /PATHFORGE_CRON_SECRET/)
assert.match(recoveryWorkflow, /--fail-with-body/)
assert.match(recoveryWorkflow, /\/api\/cron\/community-project-alerts/)
assert.ok(
  vercelConfig.crons.some((cron) => (
    cron.path === '/api/cron/community-project-alerts'
    && cron.schedule === '47 19 * * *'
  )),
  'Vercel must retain a daily alert-recovery fallback on Hobby-compatible cadence.',
)

assert.match(runbook, /fifteen minutes|15 minutes/i)
assert.match(runbook, /250/)
assert.match(runbook, /dual-channel|two distinct/i)
assert.match(runbook, /GitHub Actions/)

const MAX_DAILY_REPORT_INGRESS = 250
const RETRY_BATCH_SIZE = 50
const RETRY_INTERVAL_MINUTES = 15
const ENDPOINT_OUTAGE_MINUTES = 45
const CRITICAL_RESPONSE_WINDOW_MINUTES = 4 * 60

const reports = Array.from({ length: MAX_DAILY_REPORT_INGRESS }, (_, index) => ({
  id: index,
  critical: index < 150,
  createdAt: index,
  lastAttemptAt: 0,
  deliveredAt: null,
  primaryAttempts: 0,
  escalationAttempts: 0,
}))

for (
  let elapsed = RETRY_INTERVAL_MINUTES;
  elapsed <= CRITICAL_RESPONSE_WINDOW_MINUTES;
  elapsed += RETRY_INTERVAL_MINUTES
) {
  const batch = reports
    .filter((report) => (
      report.deliveredAt === null
      && elapsed - report.lastAttemptAt >= 10
    ))
    .sort((left, right) => (
      Number(right.critical) - Number(left.critical)
      || left.lastAttemptAt - right.lastAttemptAt
      || left.createdAt - right.createdAt
      || left.id - right.id
    ))
    .slice(0, RETRY_BATCH_SIZE)

  for (const report of batch) {
    report.primaryAttempts += 1
    report.escalationAttempts += 1
    report.lastAttemptAt = elapsed
    if (elapsed >= ENDPOINT_OUTAGE_MINUTES) report.deliveredAt = elapsed
  }
}

assert.ok(
  reports.every((report) => report.deliveredAt !== null),
  'A permitted 250-report outage backlog must drain inside four hours.',
)
assert.ok(
  Math.max(...reports.map((report) => report.deliveredAt)) <= CRITICAL_RESPONSE_WINDOW_MINUTES,
  'The worst-case report must recover inside the documented critical window.',
)
assert.ok(
  Math.max(...reports.filter((report) => report.critical).map((report) => report.deliveredAt))
    <= Math.min(...reports.filter((report) => !report.critical).map((report) => report.deliveredAt)),
  'Critical reports must be delivered before warning reports during backlog recovery.',
)
assert.ok(
  reports.every((report) => report.primaryAttempts > 0 && report.escalationAttempts > 0),
  'Every durable report must exercise both independent delivery channels.',
)

console.log(
  `Community report alert recovery check passed: ${MAX_DAILY_REPORT_INGRESS} reports recovered by minute ${Math.max(...reports.map((report) => report.deliveredAt))}.`,
)
