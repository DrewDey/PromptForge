# Request a Build public-ready architecture

Status: implementation contract; every public expansion gate defaults off

Decision date: July 30, 2026

## Outcome

Request a Build is a private managed service that can safely expand from an
invited four-case pilot to broad, signed-in intake without changing the case
authority, weakening participant privacy, or turning requests into a public
popularity board.

Public-ready means the deployed system can:

1. accept bounded private briefs from either invited accounts or any confirmed
   non-anonymous account;
2. queue demand separately from the smaller number of builds PathForge can
   actively fulfill;
3. assign only explicitly rostered operators within their declared workload
   limits;
4. enforce actor, network, and global intake limits before storing a public-mode
   brief;
5. record the exact terms, privacy, acceptable-use, and rights versions accepted
   at intake;
6. deliver durable in-app notifications and support a separately enabled
   transactional-delivery worker;
7. accept private participant reports and expose a bounded operator queue;
8. show aggregate operational readiness without exposing participant or case
   identities; and
9. publish only a separately written safe outcome summary after requester and
   builder consent, independent review, and binding to an already approved
   PathForge project.

The architecture does not create a public request feed, voting, open responses,
self-assignment, automatic building, a marketplace, bounties, or automatic
publication.

## Independent control planes

The database is authoritative for every control. Application copy and hidden
UI cannot grant access.

### Intake

- `accepting_requests` is the emergency and operating kill switch.
- `intake_audience` is `invited` or `authenticated`.
- Invited mode requires an active pilot admission.
- Authenticated mode requires a confirmed, non-anonymous account and a fresh
  server-issued risk grant bound to the actor, idempotency key, and a
  pseudonymized network source.
- `active_case_capacity` bounds all nonterminal cases.
- `fulfillment_case_capacity` independently bounds cases from acceptance
  through delivery.
- One nonterminal case per requester remains the default.

Authenticated-public intake cannot be enabled unless risk screening and
operator-roster enforcement are enabled. No raw IP address, email address,
user-agent string, brief text, URL, secret, or case identifier enters public
analytics. The application server canonicalizes the trusted network address
and HMACs it with `REQUEST_BUILD_RATE_LIMIT_SECRET`; only the 64-character
digest reaches Supabase. The grant and digest are deleted after 30 days,
including after successful intake. The durable intake attestation retains only
the opaque grant receipt identifier, verification time, and risk-engine
version.

### Operators

Triager, builder, and reviewer eligibility comes from an explicit versioned
operator membership. Each role has its own workload limit and availability
state. Requester, builder, and reviewer remain pairwise distinct. A paused,
expired, revoked, or full operator cannot receive a new assignment but retains
historical attribution.

Roster readiness means the required in-window memberships exist; it does not
mean every operator currently has a free assignment slot. This preserves the
separate private demand queue when fulfillment is full. Exact assignment still
locks and enforces the selected operator's workload limit.

Existing assignments remain operable when assignment intake is paused. Turning
assignment controls off never abandons work or rewrites history.

### Notifications

The Request event ledger remains the source of truth. In-app unread state is
always available to current participants. After terminal closure, access is
retained only through the configured retention boundary for the requester and
the exact final delivery author and approving reviewer; superseded builders and
reviewers do not regain access. Transactional delivery is a separate
default-off projection:

- one durable delivery per recipient, event, and channel;
- bounded templates containing no brief, clarification, report, object, or
  review text;
- claim, lease, retry, and terminal suppression states;
- aggregate worker responses only; and
- no marketing or general preference center.

An external delivery adapter and its credentials are activation requirements,
not database authority.

### Reports and moderation

A current participant may submit a bounded private safety, privacy, integrity,
rights, or service report. Reports are stored before notification. The operator
queue is oldest-first within severity, keyset paginated, and non-enumerable to
unrelated users. Reporting never automatically publishes, deletes, or rewrites
a case. Existing hold and removal commands remain the moderation authority.

### Publication

Request state never directly makes a brief or delivery public.

A publication proposal:

- is available only for a requester-confirmed useful completed case;
- binds one exact approved delivery revision and manifest digest;
- contains a new participant-safe title and summary rather than copying the
  private brief;
- records requester consent, optional requester attribution, builder consent,
  builder attribution, reuse permission, and policy versions separately;
- requires the exact builder author and requester to consent;
- can be declined or withdrawn without affecting the private case;
- reaches the airlock only while publication-consent controls are enabled; and
- becomes public only when a service-only confirmation binds it to an already
  approved PathForge project whose public-truth authority is still valid.

The public outcome projection contains no request ID, raw brief, clarification,
private evidence, review notes, storage identity, digest, email, or account ID.
Withdrawal or moderation removal immediately removes the public projection. A
moderation hold temporarily suppresses the projection and release restores it
only if every publication authority still remains valid. The underlying
approved project follows its own existing publication and removal authority.

## Default production state

The migration preserves existing cases and installs these defaults:

- `accepting_requests = false`
- `assigning_requests = false`
- `intake_audience = invited`
- `active_case_capacity = 4`
- `fulfillment_case_capacity = 4`
- `operator_roster_required = true`
- `public_intake_risk_screening = true`
- `transactional_notifications_enabled = false`
- `publication_consent_enabled = false`
- `publication_airlock_enabled = false`
- `public_outcomes_enabled = false`

No migration, deployment, admin page, or scheduled worker may change those
values as a side effect.

## Installed application surfaces

The architecture is complete behind those controls:

- `/requests` reads the self-scoped service and queue posture without exposing
  private demand.
- `/requests/new` records a structured brief, a fresh risk grant when required,
  and exact versioned policy attestations.
- `/requests/policies` and its five policy documents provide the exact
  service, privacy, acceptable-use, requester-rights, and optional-publication
  language linked from each visible acknowledgement.
- `/requests/[id]` remains the participant-scoped private case, adding private
  reporting, transactional-email preference, and separately authorized
  publication-consent tools.
- `/my-forge?tab=requests` remains the requester and assigned-operator
  continuation surface.
- `/admin/build-requests` exposes capacity, operator roster, readiness
  evidence, private reports, and the safe-summary publication queue.
- `/requests/outcomes` and `/requests/outcomes/[slug]` expose only the narrow
  consented safe projection while the public-outcomes gate is enabled. The
  catalog uses a stable opaque timestamp-and-slug cursor so older outcomes
  remain reachable without exposing a private case identifier.
- `/api/cron/request-build-notifications` runs the bounded transactional
  delivery worker.
- `/api/cron/request-build-maintenance` and
  `/api/cron/request-build-public-maintenance` run the two independent
  retention authorities.

All application surfaces consume typed RPC services. They do not select or
mutate the authority tables directly. Service-role clients exist only behind
server-only risk, notification, retention, custody, and final publication
adapters.

## Any-intake activation gate

Invited intake and broad authenticated intake both fail closed unless the
operator roster is ready and the legal, incident-owner, and responsive-QA
evidence is current. This is enforced again at submission time so an expired
readiness receipt closes intake even if the stored control still says on.

## Broad-intake activation gate

Before changing `intake_audience` to `authenticated` and enabling intake:

1. Counsel approves the five displayed Request policy documents and their
   authority-bound version labels.
2. At least one active triager, builder, and reviewer are rostered, with the
   builder and reviewer available as distinct accounts.
3. Queue and fulfillment capacities reflect staffed weekly capacity.
4. The production server can issue and consume network-pseudonymous risk
   grants, and database actor/network/global limit fixtures pass.
5. A Vercel WAF rate-limit rule protects the intake endpoint and has first run
   in log mode against normal traffic.
6. The participant-report queue and operator incident owner are ready.
7. Notification delivery is either proven or the public service clearly commits
   only to in-app status.
8. Desktop and exact 390 px public-mode, queue-full, report, consent, withdraw,
   and unavailable states pass.
9. One attended real lifecycle with distinct requester, builder, and reviewer
   accounts reconciles to the event ledger.

Policy versions are release authority, not an editable live setting. They may
be rotated only while intake, publication consent, the airlock, and public
outcomes are all disabled. A new legal-readiness receipt must bind the complete
new policy-version snapshot before any dependent control can be re-enabled.

## Publication activation gate

Publication controls remain off until the existing community/public-truth
airlock has fresh successful reconciliation, report-alert recovery, and
withdrawal/removal proof. The Request bridge adds no bypass around those
requirements.

## Production activation sequence

Installing this architecture makes future activation an operating decision,
not a new product rebuild. Activation still must be attended and evidence
driven:

1. Apply the canonical migrations and deploy the application while every
   control remains off.
2. Verify the production controls row, RPC grants, RLS, empty or preserved
   case inventory, worker-secret failure behavior, and private storage
   authority.
3. Configure the production origin and cron secret for both GitHub Actions
   workers. Configure `RESEND_API_KEY` and
   `REQUEST_BUILD_NOTIFICATION_FROM` only after the sender is verified. Set a
   dedicated `REQUEST_BUILD_RATE_LIMIT_SECRET` before broad intake can be
   enabled.
4. Record versioned readiness evidence, roster the accountable triager,
   builders, and independent reviewers, and set queue and fulfillment caps to
   staffed capacity.
5. Run an attended lifecycle with three distinct accounts, exact delivery
   review, participant report, notification opt-in/out, retention, consent,
   withdrawal, and moderation checks.
6. Enable only the specific control plane being exercised. Re-read the
   authoritative controls and worker results after each change.
7. Keep public outcomes off until a fresh community reconciliation and
   report-alert recovery prove the existing publication airlock healthy.
8. Expand intake from `invited` to `authenticated` only after the broad-intake
   gate above is complete and network protection has been observed in log
   mode.

Emergency rollback is always the inverse control operation first; it never
requires deleting cases, receipts, reports, consent records, or delivery
evidence.

## Rollback

Rollback is forward-only:

1. disable intake, assignment, transactional notification, consent, airlock,
   and public-outcome controls;
2. revoke the affected entry RPC if necessary;
3. roll back the application deployment;
4. preserve cases, events, consents, reports, delivery revisions, and receipts;
5. repair committed database defects with a new migration.

No down migration may destructively reinterpret or remove production Request
records.
