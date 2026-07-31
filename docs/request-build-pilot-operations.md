# Request a Build pilot operations

Request a Build is a private, invited, capacity-controlled managed service. It
is not a public request board, response feed, marketplace, or publication
shortcut.

This release installs the private authority and participant experience with
intake and assignment controls off. Deploying the code or migration does not
authorize the pilot to accept work.

## Operating contract

- A confirmed, admitted requester may have one nonterminal case.
- The triager searches for an existing PathForge resolution before accepting
  net-new work.
- Accepting a case atomically assigns one builder and a target date.
- The requester, builder, and reviewer are three different people.
- One independent reviewer approves the exact sealed revision or requests a
  repair.
- The builder remains the credited author. The requester receives
  non-exclusive private use and download rights.
- Confidential, exclusive, work-for-hire, repository, provider-account,
  customer-data, and secret-bearing requests are out of scope.
- Request state never publishes a case or artifact. The separately controlled
  consent and public-outcome airlock are installed for future use, but every
  publication gate remains off and outside the private pilot authorization.

## Activation gate

Keep `accepting_requests=false` and `assigning_requests=false` until all of the
following are true:

1. Counsel has approved the participant-facing rights language.
2. One accountable triager is named and can respond within three business
   days.
3. Every accepted case has an available builder and a different available
   reviewer.
4. The operator can sustain at most four active cases and the control remains
   `active_case_capacity=4`.
5. The production migration, private storage bucket, RLS/grant matrix,
   maintenance endpoint, and scheduled maintenance workflow are green.
6. Desktop and exact 390 px participant/operator checks pass against the
   deployed version.
7. No community-publication control has been enabled as a side effect.

The database requires a ready operator roster plus current legal,
incident-owner, and responsive-QA evidence before even invited intake can be
enabled. Submission repeats those checks so expiry closes intake without
depending on an operator to notice and flip the control.

Admit confirmed accounts explicitly. Admission is self-scoped and does not
promise capacity. Once staffing and the four-case capacity are real, enable
assignment and intake together during an attended operating window. Re-read
the controls after the update; never infer success from a redirect or page
query.

## Daily operation

The canonical states are:

`submitted -> triage <-> clarification_requested -> accepted -> building -> review_pending <-> repair_required -> delivery_ready -> delivered -> completed`

- `completed` means the requester confirmed usefulness. It never means public.
- A failed original acceptance check may return a delivered case to repair.
  A new feature request becomes a linked new case.
- After 14 days without requester confirmation, close as `no_response`; do not
  treat silence as acceptance.
- Terminal close reasons are bounded authority values. Duplicate closure never
  reveals another private case identifier.
- Moderation `held` freezes work, delivery, and any future public projection.
  `removed` makes the case inaccessible without rewriting its history.
- Use the transactional Request event ledger for operational truth. Product
  analytics are best-effort diagnostics only.

## Retention and maintenance

- Participant artifact access ends at the exact 90-day terminal-retention
  boundary.
- Raw brief and clarification text, plus private artifact objects, become
  cleanup-eligible at that boundary unless an active retention or moderation
  hold preserves them.
- A cleanup worker claims one exact artifact before deletion. Once the
  database records deletion start, recovery must converge that deletion even
  if a later hold appears; the hold still blocks final audit expiry.
- A missing object is recorded as `preexisting_missing` and is never counted
  as worker-deleted bytes. A verified worker removal is recorded separately as
  `worker_removed`.
- The deidentified audit tombstone is retained for roughly 400 days. Final
  expiry is blocked by raw text, stored objects, unresolved cleanup claims,
  active delivery workspaces, or holds.
- The scheduled endpoint returns aggregate categories only. It must never log
  or return request IDs, artifact IDs, object keys, digests, provider errors,
  or participant text.

The project already uses both Vercel Hobby cron slots. Request maintenance is
therefore invoked once daily by its dedicated GitHub Actions workflow using
the existing production origin variable and cron secret. That workflow calls
both private artifact/raw-data retention and the separate report, publication,
risk-grant, notification, and readiness-evidence retention endpoint.
Transactional notification delivery has its own bounded 15-minute GitHub
Actions worker. Both route families must return 404 before constructing a
service-role client when the secret is absent, short, or incorrect. A failed
item or remaining page returns a non-2xx status so the scheduled workflow fails
visibly and can be retried without erasing authority evidence.

## Stop and recovery

For an intake, staffing, integrity, privacy, or review incident:

1. Set `accepting_requests=false`.
2. Set `assigning_requests=false`.
3. Place a moderation or legal hold only through the authorized case
   operation.
4. Preserve all cases, events, revisions, reviews, receipts, and objects.
5. Roll back the application deployment only if needed; do not run a
   destructive database down migration.
6. Repair a committed authority defect with a new forward migration.

Turning controls off stops new promises without deleting active work. It does
not publish, silently close, or rewrite a case.

## Four-case pilot decision

Advance beyond the first four real cases only when:

- at least three qualify,
- at least three receive a decision or clarification within three business
  days,
- at least two become requester-confirmed useful within 14 days,
- every delivery reconciles to its exact review, provenance, and event ledger,
- there are zero trust incidents,
- at least eight of ten usability checks pass, and
- coordination plus review stays below five hours per week.

Stop expansion for a material trust incident, fewer than two qualified cases,
zero useful outcomes after one repair cycle, or more than eight operating
hours per week for two consecutive weeks.
