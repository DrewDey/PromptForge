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

## Publication readiness

`allow_publication` defaults to `false`. Before enabling it:

1. `CRON_SECRET` and `REPORT_RATE_LIMIT_SECRET` must each be dedicated
   server-only values at least 32 characters long, and
   `COMMUNITY_PROJECT_ALERT_WEBHOOK_URL` must be a working HTTPS endpoint.
2. Call `/api/cron/community-project-reconcile` with the production Bearer
   secret and confirm an HTTP 200 healthy result. The database records the
   successful reconciliation.
3. In `/admin/community-projects`, choose **Verify readiness and enable
   publication**. The server sends a real non-PII operator-alert probe and,
   only after delivery, records report-rate-limit and alert-delivery HMAC
   receipts without storing either secret.
4. The database enables publication only when both readiness records are
   successful and less than 26 hours old, alert delivery is verified, and no
   open report has a pending notification. Every publish transaction repeats
   those checks, so a stale control row does not authorize publication.
5. After the first disposable project is public, file and resolve a real test
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

`COMMUNITY_PROJECT_ALERT_WEBHOOK_URL` receives non-PII JSON for a new report, a
readiness probe, or a failed reconciliation. A public report is stored first
with `pending` notification state. PathForge attempts delivery twice in the
request, records `delivered` or `failed`, and daily reconciliation retries a
bounded pending/failed batch. Any undelivered open-report notification makes
both readiness and reconciliation unhealthy. Vercel error logs are the
secondary audit trail, not the primary notification mechanism. The webhook
payload never includes report contact/details, submitted evidence, artifact
bytes, or secrets. The persisted `alert_attempt_count` measures delivery
cycles; each cycle makes no more than two bounded HTTP attempts and rejects
redirects.

- Privacy, malware, exploitation, credential, or imminent-harm report: an
  administrator acknowledges and disables public access within 4 hours.
- Other reports and failed reconciliation: acknowledge within 1 business day.
- Normal submission review: first decision within 3 business days.
- Report resolution or documented escalation: target 7 calendar days.

If the primary does not acknowledge inside half the applicable window, the
backup owns the incident. If neither is available, disable invited submissions
and publication until coverage resumes.

## Daily reconciliation

Vercel calls `/api/cron/community-project-reconcile` daily at `07:17 UTC` with
`CRON_SECRET`. Each run obtains a 55-second database lease and uses bounded
batches. It:

1. removes withdrawn/removed artifacts and stale storage orphans;
2. re-downloads up to 20 least-recently-checked published artifacts, verifies
   their size and SHA-256, and automatically removes mismatches;
3. retries pending or failed report alerts and fails while any open-report
   notification remains undelivered;
4. fails on database/publication/storage drift;
5. purges resolved/dismissed reports after 90 days and deidentified removed
   submission tombstones after 400 days;
6. sends a non-PII readiness probe, records report/alert readiness only after
   delivery, and records status, metrics, and last success in
   `community_project_operations`.

The admin queue is unhealthy when the latest run failed or the last success is
older than 26 hours. Do not expand invitations while unhealthy.

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
- Direct profile or Auth-user deletion is deliberately blocked while a
  community submission still references that contributor. An account-deletion
  request must first route every submission through withdrawal/removal,
  physical artifact purge, and the documented retention or investigation-hold
  process; operators must never use a cascading profile deletion to bypass
  those controls.

## Release and rollback

Before merge: run `npm run check:community-project-pilot`,
`npm run check:community-project-db`, `npm run typecheck`, `npm run lint`, the
full build, `npm run check:community-project-auth-browser -- --base-url <url>`,
and signed-in/anonymous browser tests. Confirm production migration history and
apply any pending members of this five-migration chain in filename order before
deploying code that calls their RPCs:

1. `20260723054558_community_project_pilot.sql`
2. `20260723140556_harden_immediate_artifact_purge_confirmation.sql`
3. `20260723152046_restore_legacy_source_run_compatibility_and_source_privacy.sql`
4. `20260723173000_harden_community_project_release_review.sql`
5. `20260723191235_enforce_community_invitation_and_report_alert_readiness.sql`

The compatibility migration deliberately restores only owned, untouched,
queue-only source-run inserts; it does not restore browser publication. The
final readiness migration makes report-alert failures durable and prevents a
browser confirmation from opening external invitations.

After the migration and application are live, run the disposable deployed gate
with production server credentials and
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
