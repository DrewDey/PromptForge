# Community project pilot operations

This runbook is the operating contract for the PathForge community-project
pilot. The application can be deployed with external invitations locked. That
internal stage is not permission to invite builders.

## Launch states

1. **Internal/adversarial:** administrators plus one owner-operated,
   seven-day `internal_acceptance` account may run disposable production
   tests. `allow_invited_submissions` remains `false`. This is the lane used
   for the owner handoff and fresh-account upload trial.
2. **Named invitation:** at most 20-30 builders and 50 active submissions.
   This state may begin only after every expansion gate below is recorded.
3. **Broader access:** out of scope. It requires a new product, abuse, privacy,
   legal, and capacity decision.

The database control row defaults with internal acceptance available,
external invitations locked, and publication paused. Access and publication
changes go through authenticated administrator server actions backed by
service-only RPCs; the browser never receives database service credentials.
Turn publication and external invitations back off immediately when response
capacity or required controls are unavailable.

## Server credential boundary

Use `SUPABASE_SECRET_KEY` with a current opaque `sb_secret_…` value for the
application, operator scripts, and deployed acceptance harness. The shared
server client sends it as `apikey` and removes only the client library's exact
`Authorization: Bearer <same opaque key>` duplicate. It preserves a different
user/session bearer token. `SUPABASE_SERVICE_ROLE_KEY` accepts only the legacy
JWT-based service-role value and is a temporary migration fallback.

Run `npm run check:supabase-server-key-transport` before merge. The executable
guard covers Data API queries and RPCs, Auth admin, Storage, and Functions,
proves the opaque key is absent from `Authorization`, proves a real session
bearer is preserved, and proves the legacy service-role JWT transport remains
unchanged. Before disabling the legacy key or opening external invitations,
run the deployed acceptance harness with the production `sb_secret_…`
credential so the real Auth/RPC/Storage lifecycle is verified.

## Publication readiness

`allow_publication` defaults to `false`. Before enabling it:

1. `CRON_SECRET` and `REPORT_RATE_LIMIT_SECRET` must each be dedicated
   server-only values at least 32 characters long, and
   `COMMUNITY_PROJECT_ALERT_WEBHOOK_URL` plus
   `COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL` must be working, distinct
   HTTPS destinations owned by the primary and backup response paths.
2. Call `/api/cron/community-project-reconcile` with the production Bearer
   secret and confirm an HTTP 200 healthy result. The database records the
   successful reconciliation.
3. Call `/api/cron/community-project-alerts` with the same Bearer secret and
   confirm an HTTP 200 result plus a `report_alerts` database heartbeat showing
   two independent alert channels. Configure the repository
   `PATHFORGE_PRODUCTION_URL` variable and `PATHFORGE_CRON_SECRET` secret, run
   **Community project alert recovery** manually, and verify the scheduled
   workflow is enabled.
4. In `/admin/community-projects`, choose **Verify readiness and enable
   publication**. The server sends a real non-PII operator-alert probe and,
   only after delivery to both destinations, records report-rate-limit and
   alert-delivery HMAC receipts without storing either secret.
5. The database enables publication only when reconciliation and report
   readiness are less than 26 hours old, alert recovery succeeded within one
   hour with two distinct channels, and no open report has a pending
   notification. Every publish transaction repeats those checks, so a stale
   control row does not authorize publication.
6. After the first disposable project is public, file and resolve a real test
   report, run reconciliation again, and record the production evidence.

## Expansion record and ownership

Before enabling invited submissions, the private launch record must contain:

- primary incident commander name, account, phone, and coverage window;
- a different backup administrator with the same information;
- the tested operator-alert destination and timestamp of the test alert;
- confirmation that Supabase Auth leaked-password protection is enabled and a
  fresh security-advisor run no longer reports
  `auth_leaked_password_protection`;
- written disposition for provider sharing terms, contributor license,
  copyright/takedown process, minors, and applicable privacy obligations;
- the date the role-matrix, database, desktop, 390px, and withdrawal production
  tests passed;
- the current queue size and the hours available for review that week.

Blank ownership, one-person coverage, an untested alert endpoint, or an
unresolved policy/counsel question is a hard stop. Disabled leaked-password
protection is also a hard stop for external invitations. No names are invented
in source control. The administrator enters only a non-secret ID or date for
the private record; PathForge persists that reference with the fresh
reconciliation and alert-readiness snapshot. The database refuses enablement
without that snapshot and rechecks the same operational gates on every invited
builder eligibility decision.

## Alerts and service levels

`COMMUNITY_PROJECT_ALERT_WEBHOOK_URL` and
`COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL` receive the same non-PII JSON
through two distinct destinations for a new report, readiness probe, or failed
reconciliation. A delivery cycle is successful only when both channels accept
the alert. A public report is stored first with `pending` notification state.
PathForge attempts each destination twice in the request and records
`delivered` or `failed`.

GitHub Actions invokes `/api/cron/community-project-alerts` every 15 minutes,
at minutes 7, 22, 37, and 52 of every hour. The endpoint holds a database lease, processes up to
50 reports in ten-way bounded concurrency, prioritizes critical reasons, and
orders equally urgent reports by least-recent attempt and age. A permitted
250-report daily backlog therefore receives a delivery cycle within five
scheduled batches—75 minutes after both destinations recover. Vercel invokes
the same endpoint once daily as a scheduler-independent fallback compatible
with Hobby cron limits. Any remaining backlog returns HTTP 503, making the
scheduled GitHub job fail visibly; successful empty/backlog-cleared runs store
a `report_alerts` heartbeat. A missing or hour-old heartbeat closes new
publication and invited-builder intake at the database boundary.

Any undelivered open-report notification makes alert recovery, readiness, and
reconciliation unhealthy. The GitHub workflow failure plus Vercel function
logs are independent audit trails, not substitutes for the two paging
destinations. The webhook payload never includes report contact/details,
submitted evidence, artifact bytes, or secrets. The persisted
`alert_attempt_count` measures delivery cycles; each channel within a cycle
makes no more than two bounded HTTP attempts and rejects redirects.

- Privacy, malware, exploitation, credential, or imminent-harm report: an
  administrator acknowledges and disables public access within 4 hours.
- Other reports and failed reconciliation: acknowledge within 1 business day.
- Normal submission review: first decision within 3 business days.
- Report resolution or documented escalation: target 7 calendar days.

If the primary does not acknowledge inside half the applicable window, the
backup owns the incident. If neither is available, disable invited submissions
and publication until coverage resumes.

The moderation page uses a critical-first, oldest-first keyset queue with exact
open, retained, critical, and undelivered counts. It shows 25 reports at a time
and supports active, all-retained, and individual-status views plus reason,
alert-state, ID/email/detail search. Every retained report has a stable
administrator URL, including resolved or dismissed reports beyond a project's
100-row detail preview. An operator must never infer backlog or retained-history
size from the visible page alone.

## Daily reconciliation

Vercel calls `/api/cron/community-project-reconcile` daily at `07:17 UTC` with
`CRON_SECRET`. Each run obtains a 55-second database lease and uses bounded
batches. It:

1. removes withdrawn/removed artifacts and stale storage orphans;
2. re-downloads up to 20 least-recently-checked published artifacts, verifies
   their size and SHA-256, and automatically removes mismatches;
3. checks the dedicated report-alert recovery backlog and fails while any
   open-report notification remains undelivered;
4. fails on database/publication/storage drift;
5. purges resolved/dismissed reports after 90 days and deidentified removed
   submission tombstones after 400 days;
6. sends a non-PII readiness probe to both alert destinations, records
   report/alert readiness only after dual delivery, and records status,
   metrics, and last success in
   `community_project_operations`.

The admin queue is unhealthy when reconciliation/report readiness is stale,
the dedicated alert heartbeat is more than one hour old, either alert channel
is unavailable, or any report alert is undelivered. Do not publish or expand
invitations while unhealthy.

## Incident procedure

1. Open `/admin/community-projects`; record the report/reconciliation ID and
   time. Do not copy private evidence into chat, tickets, or logs.
2. For possible active harm, remove the project first. Database status revokes
   the page, discovery record, and server artifact route immediately. Storage
   remains private at all times; physical artifact deletion follows
   reconciliation.
3. Review quarantined code only in the inert source-text reviewer. Never open
   contributor HTML directly or run it outside the protected viewer.
   For an opted-in provider source URL, use the copy-only control and paste it
   into a clean private/incognito browser with no provider account signed in;
   the ordinary signed-in review tab is not evidence of anonymous access.
4. Classify the incident: privacy, exposed credentials, malware, exploitation,
   imminent harm, rights/copyright, abuse, misleading provenance, integrity
   drift, or service failure.
5. Repair or remove the bundle; record a factual resolution note without
   unnecessary personal information.
6. Run the reconciliation endpoint, confirm zero drift and a fresh successful
   operation record, then repeat anonymous page/artifact denial or availability
   checks as appropriate.
7. Restore invitation/publication controls only after the primary and backup
   agree that the failure is contained and the regression test passes.

## Retention and withdrawal

- Public access ends in the withdrawal/removal transaction before storage
  cleanup starts.
- Artifact bytes, original filename, hash, scan output, and private source link
  are purged by the next successful daily reconciliation; the operational
  target is within 24 hours.
- Resolved/dismissed report contact and evidence are deleted 90 days after
  resolution. Open/reviewing reports remain on investigation hold.
- Withdrawn/removed submission and lifecycle tombstones are deleted after 400
  days once artifact cleanup is confirmed and no report is open. Any rejected
  prompt record required by foreign keys is deidentified, and every copied
  prompt/response step is deleted in the same retention transaction.
- Queued, repair-needed, or declined submissions remain until the owner
  withdraws them or an administrator removes them, after which the same purge
  windows apply.
- A requested repair may replace private quarantined bytes while an otherwise
  admitted member is temporarily paused by operational gates. Revoked,
  expired, not-admitted, signed-out, or unverifiable accounts cannot upload a
  repair; the page, server action, and database RPC enforce the same policy.
- Direct profile or Auth-user deletion is deliberately blocked while a
  community submission still references that contributor. An account-deletion
  request must first route every submission through withdrawal/removal,
  physical artifact purge, and the documented retention or investigation-hold
  process; operators must never use a cascading profile deletion to bypass
  those controls.

## Release and rollback

Before merge: run `npm run check:supabase-server-key-transport`,
`npm run check:community-project-pilot`,
`npm run check:community-project-alert-recovery`,
`npm run check:community-project-db`, `npm run typecheck`, `npm run lint`, the
full build, `npm run check:community-project-auth-browser -- --base-url <url>`,
and signed-in/anonymous browser tests. Confirm production migration history and
apply any pending members of this seven-migration chain in filename order before
deploying code that calls their RPCs:

1. `20260723054558_community_project_pilot.sql`
2. `20260723140556_harden_immediate_artifact_purge_confirmation.sql`
3. `20260723152046_restore_legacy_source_run_compatibility_and_source_privacy.sql`
4. `20260723173000_harden_community_project_release_review.sql`
5. `20260723191235_enforce_community_invitation_and_report_alert_readiness.sql`
6. `20260723204000_close_community_report_operational_gaps.sql`
7. `20260724032412_distinguish_community_pilot_admission_status.sql`

The compatibility migration deliberately restores only owned, untouched,
queue-only source-run inserts; it does not restore browser publication. The
fifth migration makes report-alert failures durable and prevents a browser
confirmation from opening external invitations. The sixth adds leased,
dual-channel alert recovery, an hourly-fresh database heartbeat, exact
moderation counts, and keyset pagination across both the active queue and all
retained report statuses. The seventh preserves the same fail-closed submission
authorization while giving signed-in builders distinct not-admitted, expired,
revoked, temporarily-paused, and eligible states.

After the migration and application are live, run the disposable deployed gate
with the production `SUPABASE_SECRET_KEY` and
`COMMUNITY_PROJECT_ACCEPTANCE_EMAIL` loaded locally (never print or commit
them). The mailbox must be operator-controlled and accept unique plus-address
aliases:
`npm run check:community-project-live-acceptance -- --base-url <production-url>
--screenshot-dir <private-evidence-directory>`. It submits the real public
signup form, requires the unconfirmed state, generates an operator-only
Supabase magic-link token, consumes that token through PathForge's real
`/auth/callback`, and verifies the resulting account/profile/session. This
proves signup and callback behavior but deliberately does **not** claim that
production email delivery reached the mailbox; perform that final delivery
check manually. The gate then proves denial before owner-operated admission,
uploads a real private fixture at 390px with external invitations still
locked, verifies the desktop owner receipt and withdrawal, and exits
successfully only after verifying its exact account, membership, submission,
and quarantine objects are gone and the one acceptance slot is empty.

The production acceptance run uses a fresh non-admin account and never turns
on external invitations:

1. Open `/build` in a clean browser and choose create account with `/build`
   preserved as the return destination. Open the real confirmation email and
   verify that its link returns through `/auth/callback` to `/build`.
2. Confirm the verified account sees the pilot explanation and no file input.
3. In `/admin/community-projects`, enter the exact handle—including any
   underscores—and admit it as **Owner-operated acceptance account**. The
   database permits one such active account and expires it after seven days.
4. Refresh `/build`, upload `test-fixtures/community-project/valid.html`, and
   confirm the owner receipt/status page.
5. Run authenticated reconciliation, enable publication readiness, perform the
   inert-source human review, and publish. Verify the public page, discovery,
   profile, embedded artifact, and **Open safely** at desktop and 390px.
6. File and resolve a disposable public report. Withdraw the project as its
   owner and verify the page, server artifact route, discovery, profile, and
   direct Storage access all fail closed immediately.
7. Reconcile physical cleanup, revoke the acceptance membership, and delete
   only the exact disposable account and test records. Leave the acceptance
   slot empty so the product owner can repeat steps 1–4 personally.

For application rollback, keep invited submissions locked and deploy the prior
application commit. Keep the exact-column source-run compatibility migration
in place so pre-pilot global forks and private source-run intake do not break.
Do not roll back the additive database objects while any community submission
exists. For a data/control incident, first set
`allow_invited_submissions=false` and `allow_publication=false`, remove affected
public records, run reconciliation, and preserve the audit record for review.
