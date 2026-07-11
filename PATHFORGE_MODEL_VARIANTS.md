# PathForge model variants

Model variants are developer-operated reruns of one approved project. They let a canonical project show how the same product brief performs across ChatGPT, Claude, and Gemini without creating duplicate projects, community forks, engagement records, or public identities.

## Release contract

Every project-level manifest in `seed-runs/model-variants/` owns:

- one canonical project ID, route, title, and community surface;
- one byte-identical opening prompt and its SHA-256;
- one shared acceptance checklist and adaptive repair policy;
- exactly one historical original-author run;
- at least one represented run from each of OpenAI, Anthropic, and Google;
- one verified comparison run selected as the default;
- exact source URLs, model labels, settings, prompts, responses, artifact versions, hashes, and verification metrics.

Historical originals remain immutable evidence. If a fresh audit finds a real limitation, the historical row is labeled `known-issue`, stays selectable, and can never be the default. The current comparison run must still meet the full A+ contract. That contrast is part of the model-history value; the release process does not rewrite an old result to make it look better.

Follow-up prompts are not forced to match across providers. They are permitted only after verification identifies a concrete defect, and the package must preserve the defect, repair reason, response, and earlier real artifact.

## Runtime behavior

`src/lib/project-model-variants.ts` keeps a cheap static registry of checked manifests, then loads and hash-checks the exact source-run packages and artifacts only for the requested project. The shared `PreparedModelVariantSourceRunPage` server component owns query canonicalization, database reconciliation, active-run selection, and comparison selection for every participating route.

The selector order is deterministic and alphabetical by model label. Selecting a run never changes that order. All runs share the canonical project engagement and discussion. Only the historical run retains ordinary community-fork behavior.

Generated HTML never executes directly on the PathForge origin. The mounted result and full-page artifact viewer fetch the checked file, block direct API and external asset access, add a bounded storage bridge, and run it in an opaque-origin iframe sandbox. Release gates reject remote URLs in accepted artifacts. Raw `/artifacts/*.html` responses are attachment-only with a deny-all sandbox policy and MIME sniffing disabled, so a pasted file URL cannot bypass that boundary.

Checked manifests are the explicit local/offline fallback. When public Supabase reads are configured, the runtime requires every row known to the deployed manifest and reconciles its immutable evidence exactly. It may ignore newer public history that an older deployment does not know yet, which makes a database-first rollout safe. An empty, partial, or drifted database result still fails closed. A transport error or timeout is distinguished from evidence drift: the checked release remains available with a visible retry notice.

Each manifest variant declares whether it is the current provider release. A later release stays in the same alphabetical selector, sets `supersedesSourceRunId` to the immediately prior same-provider release, and leaves every earlier run inspectable as previous history. The lineage is one unbroken chain per provider: no skipped predecessor, branching successor, or backdated rerun is accepted.

The manifest supplies the checked release and local/offline default. In configured production, `set_project_model_variant_default` may select another current verified run without rewriting evidence; the runtime accepts that one mutable database choice while continuing to reconcile every immutable field and current/history flag.

## Adding or updating a project

1. Start fresh sessions on the required provider sites and record the visible model label and settings before sending anything.
2. Send the historical opening prompt byte-for-byte. Do not show providers another model's artifact or response.
3. Preserve exact visible prompt and response evidence, a public provider share URL, and every real artifact version.
4. Verify static safety, script parsing, the project-specific workflow, desktop layout, and measured 390-by-844 layout. Repair only observed defects in the same session.
5. Add or update the release manifest and static runtime import.
   The July 10 manifest builder is launch-only and refuses to overwrite a manifest after additional model history has been appended. Future runs must be added append-only: preserve every prior source-run ID, demote only the immediately prior same-provider run, set `supersedesSourceRunId` to that exact run, and keep the launch snapshot intact. Append no more than one new run per provider in a release transaction; sequential reruns are released sequentially so each database ID can be bound before the next run is added.
6. Run `npm run check:model-variants`, `npm run check:source-run-showcases`, and the full `npm run autoreview` suite.
7. Measure the final artifacts in real mobile emulation and save fresh visual proof for review:

   ```bash
   npm run measure:artifacts -- \
     --screenshots-dir /tmp/pathforge-model-variant-proof \
     public/artifacts/<final-artifact>.html
   ```

   Zero page overflow is necessary but not sufficient. Inspect the generated 390px image for squeezed, clipped, or unreachable controls before accepting the run.
8. Preview database rows without writing:

   ```bash
   npm run release:model-variants -- --manifest <manifest-name>
   ```

9. After the code and artifacts are the exact release candidate, register the immutable rows with a local server-only Supabase secret or legacy service-role environment file:

   ```bash
   npm run release:model-variants -- \
     --manifest <manifest-name> \
     --env-file /absolute/path/to/.env.local \
     --apply
   ```

   Operators using an authenticated database connector instead of a local secret can emit the already-checked initial cohort payload and pass that JSON to `publish_project_model_variant_cohort`:

   ```bash
   npm run release:model-variants -- \
     --all \
     --emit-payload \
     --output /tmp/pathforge-model-variant-cohort.json
   ```

   Without `--output`, emit mode writes JSON only to stdout. Superseding releases must use `--apply` so prior database IDs are resolved safely.

10. Commit the exact release candidate locally without pushing it. Then roll out in this order: publish the checked database cohort from that clean commit, verify the currently deployed site still serves its known history, and only then push or deploy the code and artifacts that expose the new rows. Never deploy a manifest that expects rows which have not committed. Vercel's prebuild registry check rejects a deployment whose checked rows are not already visible in the intended Supabase project. Older code intentionally ignores newer valid history and keeps its own checked default until the matching deployment arrives.

The release command is idempotent. It requires a clean committed worktree, refuses an unexpected Supabase project, preserves the complete public history, resolves explicit supersession links, verifies every provider share is publicly reachable, ignores retired or failed private rows, and rejects mismatched immutable evidence. Reapplying a release preserves the operator-selected database default; if that exact provider run is superseded, its verified successor inherits the default. When a same-provider run is appended, the database transaction verifies that its pointer targets the most recently registered provider run, demotes that prior current/default row, and inserts the new current row atomically; a failure rolls the whole release back. One manifest uses the same transaction path as a cohort; `--all` publishes every guarded project in one database transaction with deterministic project-lock ordering. Authenticated clients and the service role cannot write the table directly: releases go through the audited security-definer functions, which validate artifact paths, metric structure, current/default state, append lineage, and A+ defaults before committing. Profile owners can update presentation fields only; `profiles.role` remains service-controlled so the admin gate cannot be self-granted.

For emergency recovery, roll back the web deployment first; the older checked deployment ignores newer valid database history. Do not delete or rewrite immutable evidence. A genuinely bad run should be replaced by a verified append-only successor, or withdrawn through an owner-reviewed retirement migration when keeping it public would be unsafe. There is intentionally no public retirement RPC.

## Current launch cohort

The immutable launch snapshot contains eight canonical projects and twenty-four unique source runs. `scripts/check-project-model-variant-cohort.mjs` requires every one of those launch runs to remain inspectable while allowing later append-only model history. It also enforces global source/package/artifact ownership, provider coverage, no more than one current run per provider, A+ defaults, route wiring, and exact contract parity.
