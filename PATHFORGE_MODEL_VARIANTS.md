# PathForge model variants

Model variants are developer-operated reruns of one approved project. They let a canonical project show how the same product brief performs across ChatGPT, Claude, and Gemini without creating duplicate projects, community forks, engagement records, or public identities. Changing the selected model changes the inspected run; it does not fork the project.

## Release contract

Every project-level manifest in `seed-runs/model-variants/` owns:

- one canonical project ID, route, title, and community surface;
- one byte-identical opening prompt and its SHA-256;
- one shared acceptance checklist and adaptive repair policy;
- at least one represented run from each of OpenAI, Anthropic, and Google;
- one verified comparison run selected as the default;
- exact source URLs, model labels, settings, prompts, responses, artifact versions, hashes, and verification metrics.

Every new manifest must declare its origin:

- `existing-project` attaches model history to a real project and preserves exactly one immutable `original-author` historical baseline;
- `model-cohort` launches the canonical project from simultaneous PathForge Labs runs. It has no invented historical author: every run is a verified, developer-operated `comparison-run`.

The eight launch manifests remain frozen in `RAW_VARIANT_SETS` and continue to define the immutable launch snapshot. Post-launch manifests are registered separately in `ACTIVE_ADDITIONAL_VARIANT_SETS`, must declare `originMode`, and are validated together with the launch history at runtime. Never add a post-launch cohort to the launch registry or relabel a Labs run as historical community evidence.

Historical originals remain immutable evidence. If a fresh audit finds a real limitation, the historical row is labeled `known-issue`, stays selectable, and can never be the default. The current comparison run must still meet the full A+ contract. That contrast is part of the model-history value; the release process does not rewrite an old result to make it look better.

Follow-up prompts are not forced to match across providers. A repair prompt is permitted only after verification identifies a concrete defect; a purpose-specific refinement may continue an already passing run when it creates a meaningful product improvement or branch point. Every follow-up needs a nonblank continuation reason, and every package must preserve the exact prompt and response plus all earlier real artifacts. A native provider branch should begin from the intended response when the provider supports it. If that branch needs an adaptive repair, keep the original branch response and add the repair as a later evidenced turn; never replace the failed response or reconstruct a cleaner transcript.

Developer-operated packages may set a checked UUID `source_run_id`. This is the immutable identity shared by the manifest, queue row, release record, and any downstream fork. The importer stores the exact package-byte SHA-256 and canonical intake evidence, and reuses an existing checked ID only when every immutable field matches; a changed prompt, response package, provider/model, profile, source, or fork tuple is rejected. Omit this field for ordinary user submissions whose queue identity should be assigned normally.

## Runtime behavior

`src/lib/project-model-variants.ts` keeps a cheap static registry of checked manifests, then loads and hash-checks the exact source-run packages and artifacts only for the requested project. The shared `PreparedModelVariantSourceRunPage` server component owns query canonicalization, database reconciliation, active-run selection, and comparison selection for every participating route.

The selector order is deterministic and alphabetical by model label. Selecting a run never changes that order or promotes it to the first position. All runs share the canonical project engagement and discussion. Every run may be the source of a real project fork, but selecting another model is never itself a fork.

## Model variants and project forks

A model variant changes which developer-operated run is being inspected inside one canonical project. A project fork is a new child project that continues from one exact response. Do not use community-fork records to represent model comparisons or use model-history rows to represent child projects.

Use [PathForge forks](./PATHFORGE_FORKS.md) as the implementation, import, publication, and browser-verification runbook.

For a fork from a model run, preserve the complete source identity: canonical project ID, model-variant row ID, `source_run_id`, exact response/step ID and number, selected artifact path, and the artifact's lowercase SHA-256. Model releases publish response-level artifact evidence for every selectable path. The model variant, source run, response, artifact path, and hash must agree with that immutable evidence. If an exact response ID is present but cannot be resolved, fail closed; never silently attach the fork to a same-numbered response from another run.

The shared lineage renderer owns both sides of the relationship. On a parent page, the inherited prompt/response path compacts to the left, the exact source response becomes the visible branch socket, and the approved child continuation receives the primary space on the right. A child page reconstructs that same inherited path and source socket before its own continuation and selectable artifacts. Narrow layouts stack the same inherited path -> response socket -> child continuation meaning without requiring horizontal navigation.

Generated HTML never executes directly on the PathForge origin. The mounted result and full-page artifact viewer fetch the checked file, block direct API and external asset access, add a bounded storage bridge, and run it in an opaque-origin iframe sandbox. Release gates reject remote URLs in accepted artifacts. Raw `/artifacts/*.html` responses are attachment-only with a deny-all sandbox policy and MIME sniffing disabled, so a pasted file URL cannot bypass that boundary.

Checked manifests are the explicit local/offline fallback. When public Supabase reads are configured, the runtime requires every row known to the deployed manifest and reconciles its immutable evidence exactly. It may ignore newer public history that an older deployment does not know yet, which makes a database-first rollout safe. An empty, partial, or drifted database result still fails closed. A transport error or timeout is distinguished from evidence drift: the checked release remains available with a visible retry notice.

Each manifest variant declares whether it is the current provider release. A later release stays in the same alphabetical selector, sets `supersedesSourceRunId` to the immediately prior same-provider release, and leaves every earlier run inspectable as previous history. The lineage is one unbroken chain per provider: no skipped predecessor, branching successor, or backdated rerun is accepted.

The manifest supplies the checked release and local/offline default. In configured production, `set_project_model_variant_default` may select another current verified run without rewriting evidence; the runtime accepts that one mutable database choice while continuing to reconcile every immutable field and current/history flag.

## Adding or updating a project

1. Choose and record `originMode`. Use `existing-project` only when a real original-author run exists; use `model-cohort` for a simultaneous developer-operated launch.
2. Start fresh sessions on the required provider sites and record the visible model label and settings before sending anything.
3. Send the manifest opening prompt byte-for-byte. Do not show providers another model's artifact or response.
4. Preserve exact visible prompt and response evidence, every real artifact version, and a public provider share URL whenever the provider exposes one. If Claude does not expose a conversation-share control, use the authenticated owner-session URL only with checked `source_access.mode: authenticated_owner_session`, `public_share_unavailable: true`, and an explicit visitor-facing note. Never invent a `/share/` URL: the exact transcript and package hash remain the durable evidence, and the page must say that the provider link may require the owner's signed-in account. Set a checked `source_run_id` only when the run needs stable developer-operated identity across import and release.
5. Verify static safety, script parsing, the project-specific workflow, desktop layout, and measured 390-by-844 layout. Repair only observed defects in the same session.
6. Add or update the release manifest and static runtime import.
   The July 10 manifest builder is launch-only and refuses to overwrite a manifest after additional model history has been appended. Future runs must be added append-only: preserve every prior source-run ID, demote only the immediately prior same-provider run, set `supersedesSourceRunId` to that exact run, and keep the launch snapshot intact. Append no more than one new run per provider in a release transaction; sequential reruns are released sequentially so each database ID can be bound before the next run is added.
7. Run `npm run check:model-variants`, `npm run check:source-run-showcases`, and the full `npm run autoreview` suite.
8. Measure the final artifacts in real mobile emulation and save fresh visual proof for review:

   ```bash
   npm run measure:artifacts -- \
     --screenshots-dir /tmp/pathforge-model-variant-proof \
     public/artifacts/<final-artifact>.html
   ```

   Zero page overflow is necessary but not sufficient. Inspect the generated 390px image for squeezed, clipped, or unreachable controls before accepting the run.
9. Preview database rows without writing:

   ```bash
   npm run release:model-variants -- --manifest <manifest-name>
   ```

10. After the code and artifacts are the exact release candidate, register the immutable rows with a local server-only Supabase secret or legacy service-role environment file:

   ```bash
   npm run release:model-variants -- \
     --manifest <manifest-name> \
     --env-file /absolute/path/to/.env.local \
     --apply
   ```

   Operators using an authenticated database connector instead of a local secret can emit a two-phase checked handoff:

   ```bash
   npm run release:model-variants -- \
     --all \
     --emit-payload \
     --output /tmp/pathforge-model-variant-cohort.json
   ```

   `cohort_releases` is the exact `publish_project_model_variant_cohort` input. After that RPC returns database row IDs, resolve each evidence-plan `source_run_id` to its `model_variant_id` and call `publish_project_model_variant_artifact_evidence` with the complete project-wide evidence rows. Without `--output`, emit mode writes JSON only to stdout. Superseding releases must use `--apply` so prior database IDs and response evidence are resolved safely.

11. Commit the exact release candidate locally without pushing it. Then roll out in this order: publish the checked database cohort from that clean commit, verify the currently deployed site still serves its known history, and only then push or deploy the code and artifacts that expose the new rows. Never deploy a manifest that expects rows which have not committed. Vercel's prebuild registry check rejects a deployment whose checked rows are not already visible in the intended Supabase project. Older code intentionally ignores newer valid history and keeps its own checked default until the matching deployment arrives.

The release command is idempotent. It requires a clean committed worktree, refuses an unexpected Supabase project, preserves the complete public history, resolves explicit supersession links, verifies every provider share is publicly reachable, recomputes every artifact SHA-256 from repository bytes, binds each artifact to its exact response, ignores retired or failed private rows, and rejects mismatched immutable evidence. Reapplying a release preserves the operator-selected database default; if that exact provider run is superseded, its verified successor inherits the default. When a same-provider run is appended, the database transaction verifies that its pointer targets the most recently registered provider run, demotes that prior current/default row, and inserts the new current row atomically; a failure rolls the cohort transaction back. The immediately following response-evidence RPC validates the entire project-wide evidence set atomically and is fail-closed: until it succeeds, exact-response forks cannot import or publish. One manifest uses the same transaction path as a cohort; `--all` publishes every guarded project in one database transaction with deterministic project-lock ordering, then backfills each project's evidence. Authenticated clients and the service role cannot write the tables directly: releases go through audited security-definer functions, which validate artifact paths, response evidence, metric structure, current/default state, append lineage, and A+ defaults before committing. Profile owners can update presentation fields only; `profiles.role` remains service-controlled so the admin gate cannot be self-granted.

For emergency recovery, roll back the web deployment first; the older checked deployment ignores newer valid database history. Do not delete or rewrite immutable evidence. A genuinely bad run should be replaced by a verified append-only successor, or withdrawn through an owner-reviewed retirement migration when keeping it public would be unsafe. There is intentionally no public retirement RPC.

## Current launch cohort

The immutable launch snapshot contains eight canonical projects and twenty-four unique source runs. `scripts/check-project-model-variant-cohort.mjs` requires every one of those launch runs to remain inspectable while allowing later append-only model history. It also enforces global source/package/artifact ownership, provider coverage, no more than one current run per provider, A+ defaults, route wiring, and exact contract parity.

Post-launch additions are checked separately by `scripts/check-project-model-variant-active.mjs`. It keeps configuration and runtime registration identical, re-hashes every package and artifact, verifies the model-cohort origin and three-provider coverage, and requires every continuation after the invariant opener to explain why it exists. Keeping this separate prevents a later project from silently redefining the immutable eight-project launch snapshot.
