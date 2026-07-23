# Community project pilot launch contract

Status: implementation contract for the invitation-only pilot

Decision date: July 22, 2026

## Decision

PathForge will not launch a broad, self-service "upload a project" feature.
The production feature in this phase is an invitation-only **Submit a project**
pilot. A submission is a versioned evidence bundle that PathForge can review,
publish, suspend, and remove without a code change or deployment.

The canonical PathForge record is the evidence bundle. Provider chats,
repositories, and live URLs are optional supporting references. A provider
link is never treated as the project, proof of authorship, proof of the exact
model, or a durable copy of the build.

## Pilot bundle

Every review-ready submission contains:

1. One self-contained UTF-8 HTML artifact, no more than 2,000,000 bytes.
2. A title, plain-language summary, category, and difficulty.
3. One to five prompt/response checkpoints.
4. An evidence-scope label:
   - `full_run`: the checkpoints represent the complete run.
   - `selected_excerpts`: the contributor deliberately selected only some
     checkpoints.
   - `reconstructed_notes`: the contributor reconstructed the path from
     memory or notes.
5. Builder-reported provider, model, and settings. `Not sure` is an honest
   model value; PathForge must not promote it to verified model proof.
6. An optional public provider share link. It remains private to review unless
   the contributor opts in and an administrator copies it into a clean
   private/incognito browser with no provider account signed in, verifies
   unauthenticated access, and records that point-in-time check at publication.
7. A builder relationship attestation. The pilot accepts only the person who
   built the project; third-party or representative submissions are deferred.
8. Separate affirmative attestations for rights, privacy/secrets review, and
   public display.
9. A separate reuse choice (`view_only` or `allow_pathforge_remix`).

The artifact is useful to a reader; the evidence explains how it was made;
the evidence-scope label states how complete that explanation is.

## Access and rollout boundary

- Administrators are eligible for the internal pilot.
- Exactly one non-admin account may occupy the expiring, seven-day
  `internal_acceptance` lane for owner-operated production acceptance. That
  lane remains usable while external invitations are locked.
- Other non-admin accounts require an active `invited_builder` record and the
  separate external-invitation control.
- Eligibility is enforced by the database and again by the server action; UI
  hiding is not an authorization boundary.
- Anonymous visitors and signed-in nonmembers can read the pilot explanation
  but cannot submit.
- Human review is mandatory. No executable artifact is auto-published.
- The initial live rollout is an internal/adversarial stage. Invitations do
  not expand until every hard launch gate below passes.

## Custody and publication authority

- Incoming artifact bytes are stored in a private Supabase Storage bucket
  under an owner-scoped, generated path. The original filename is metadata,
  never an object path.
- The server decodes and statically scans the artifact before upload. It never
  executes the artifact and never fetches contributor URLs.
- Stored objects use `text/plain` and a `.html.txt` suffix so direct object
  access is not executable HTML.
- The artifact SHA-256, byte length, scanner version, and scanner findings are
  part of the immutable review record.
- A single database transaction creates the approved public project, its
  evidence steps, and the published submission state.
- The existing dynamic `/prompt/[id]` route is the only route needed for a
  community project. Publishing or removing a community project never adds or
  deletes application routes, registry entries, seed packages, or Git files.
- Supabase Storage stays private before and after publication. Anonymous and
  authenticated clients cannot list objects or resolve object paths.
- The server-controlled `/api/community-artifacts/[promptId]` route is the only
  public artifact reader. It resolves the private path with service authority,
  requires both the submission and project to remain public, downloads the
  object privately, recalculates SHA-256, and returns nothing on any mismatch.
- Withdrawal or administrator removal first revokes database publication and
  object access. Storage deletion and private-data purging follow; a failed
  physical deletion leaves a private, unreachable object for cleanup rather
  than a public object.

## Artifact scanner contract

The pilot accepts only `.html` or `.htm` files that:

- decode as UTF-8 and contain an HTML document;
- fit under the 2,000,000-byte limit;
- contain no remote scripts, styles, frames, media, fonts, or other active
  dependencies;
- contain no network APIs such as `fetch`, `XMLHttpRequest`, WebSocket,
  EventSource, or `sendBeacon`;
- contain no embedded frames, plugins, base URL rewriting, or active forms;
- contain none of the high-confidence secret patterns covered by the scanner;
- contain none of the pilot's high-confidence personal-data patterns.

Static acceptance is not a claim that arbitrary HTML is safe. Published HTML
continues to run inside PathForge's opaque-origin iframe, restrictive CSP,
no-network policy, and bounded storage bridge. The community-project viewer
does not install or honor the parent download bridge.

## Public truth contract

Public pages may claim only:

- **Artifact hash verified**: PathForge hashed the stored bytes.
- **Builder reported**: provider, model, settings, and contributor relationship
  came from the submitter.
- **Full run**, **selected excerpts**, or **reconstructed notes**: exactly the
  scope the contributor selected.
- **Source link checked on DATE**: only when an administrator copied the URL
  into a clean private/incognito browser with no provider cookies and recorded
  successful unauthenticated access. This is a point-in-time access fact, not
  an ownership or durability claim.
- **PathForge review passed**: the bundle passed the pilot's automated checks
  and human moderation. It is not a warranty that every factual or copyright
  claim is true.

The public page never exposes private review notes, a review-only provider
link, original filenames, scanner internals, reporter identity, or withdrawn
bundle contents.

## Consent, privacy, and removal

- Consent text is versioned and stored with timestamps.
- Display permission and remix permission are separate.
- The contributor affirms that they may submit the material and that they
  removed secrets and personal information.
- The submission preview states exactly what will become public.
- Before publication, the contributor can withdraw the bundle.
- After publication, the contributor can unpublish it immediately. The public
  page and artifact become unavailable without waiting for a deployment.
- PathForge retains a minimal audit/tombstone record. Private source evidence
  and artifact bytes are purged. Artifact bytes target the next successful
  daily reconciliation (normally within 24 hours), resolved report evidence
  is deleted after 90 days, and removed submission tombstones after 400 days
  unless an open investigation or required legal hold applies. The UI explains that copies lawfully made
  while reuse was allowed may survive outside PathForge.
- Readers can file a structured project report. Administrators can suspend a
  project immediately while reviewing the report.

## Explicit non-goals

This pilot does not accept or perform:

- provider OAuth, account cookies, authenticated scraping, or automated chat
  extraction;
- private `/c/`, `/chat/`, or account-only links as public evidence;
- ZIP archives, executables, PDFs, office files, full provider exports,
  repositories, dependency installs, or remote builds;
- arbitrary images, video, audio, or binary attachments;
- server-side fetching of contributor URLs;
- automatic publication, automatic copyright clearance, or formal exact-model
  verification;
- a promise that revocable external links will remain available;
- broad public signup promotion.
- submissions made on behalf of another builder, organization, or client.

## Threat model

| Threat | Required control | Failure behavior |
|---|---|---|
| Cross-tenant read or delete | Owner/admin RLS and generated owner paths | Deny and log |
| HTML network exfiltration | Static dependency scan plus no-network CSP | Reject at intake; deny at runtime |
| Script escape | Opaque-origin nested sandbox without `allow-same-origin` | Artifact cannot reach the application origin |
| Secret or PII publication | Deterministic scan, contributor attestation, human review | Reject or request repair |
| Provider-link phishing/SSRF | Known public-share host rules; no server fetch | Keep private or reject |
| MIME/polyglot confusion | UTF-8 HTML-only parser contract; store/serve as text | Reject; never execute direct object |
| Duplicate/racing publication | Row lock, advisory lock, idempotent publication RPC | One project or a closed failure |
| Takedown drift | Database status controls route, discovery, and object read | Fail closed everywhere |
| Reviewer mistake | Quarantined code is inspected as inert source with an explicit checklist | No publish action until all gates are recorded |
| Submission spam | Invitation gate and per-account quota | Deny before object retention |
| Report flooding | Server-keyed request fingerprint plus email, project, and global database caps | Bound intake and fail closed without the server secret |

## Hard gates before invitation expansion

All security, authorization, publication-consistency, and removal gates are
hard stops. They are not averaged against engagement.

- Role-matrix tests pass for anonymous, owner A, owner B, and administrator
  across database records and Storage objects.
- Malformed, oversized, remote-dependent, secret-bearing, and personal-data
  fixtures are rejected and never become publicly readable.
- Reviewer races, double publication, failed upload, and withdrawal during
  publication fail closed.
- Database state, dynamic route, discovery, and artifact availability have
  zero reconciliation drift.
- A direct public URL and artifact become unavailable immediately after
  withdrawal or administrator suspension.
- Submission, review, repair, publication, report, and removal work at desktop
  and 390px with keyboard access and no blocking console errors.
- A fresh non-admin account can complete signup, preserve `/build` as its
  return destination, remain unable to upload before admission, and upload
  only after an administrator creates the single expiring internal-acceptance
  membership; `allow_invited_submissions` remains false throughout.
- Publication defaults off and cannot be enabled until authenticated
  reconciliation and report-intake readiness each have a successful record
  less than 26 hours old. The publish RPC rechecks those records.
- Public Terms, Privacy, Community Guidelines, copyright/reporting guidance,
  and reviewer runbooks match the implemented data flow.
- The first 20-30 invited builders remain capped at 50 submissions.
- At least 40% of invited submissions become review-ready without staff
  reconstructing the bundle.
- Median reviewer touch time is at most 15 minutes, p90 at most 30 minutes,
  and 95% of the queue is cleared within 72 hours.
- At least 30% of published-project sessions open the artifact, inspect
  evidence, compare, or fork.

## Launch evidence

Before merge, the PR must contain the scoped diff, migration, rollback notes,
scanner fixtures, static guards, role-matrix evidence, build/type/lint results,
and rendered browser evidence. After deployment, PathForge must repeat the
anonymous flow and the complete fresh-account, admission, signed-in upload
flow against production, publish a disposable test bundle, verify the public
page and artifact, withdraw it, verify immediate denial, and remove the test
data.

The pilot remains internal if policy/counsel review, incident ownership, or
operational response capacity is unresolved. Shipping the controls to
production does not by itself authorize broad community access.
