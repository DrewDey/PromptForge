# PathForge forks

This is the durable entrypoint for implementing, importing, publishing, and verifying project forks. Model changes are not forks; see [PathForge model variants](./PATHFORGE_MODEL_VARIANTS.md). For the complete public-page shell and approval workflow, use the [publish-source-run project skill](./skills/publish-source-run-project/SKILL.md) and its [consistency contract](./skills/publish-source-run-project/references/consistency-contract.md).

## Identity contract

A fork is a new child project continuing from one exact source response. The canonical source identity is:

- source project ID;
- source model-variant row ID and `source_run_id` for a model-run fork;
- exact response `source_step_id` plus its display `source_step_number`;
- selected production artifact path and lowercase SHA-256;
- prompt family, parent fork, depth, and branch index for graph placement.

`source_step_id` is authoritative. If it is present and does not resolve, fail closed; never attach the child to a same-numbered response from another run. Model-run forks require both the canonical step ID and positive step number. The model variant, source run, response, artifact path, and hash must stay together. The database may resolve a missing variant row ID from the canonical project plus source run, but it must write the canonical row ID before accepting the record.

## Shared renderer contract

Parent and child routes use the same lineage workspace:

- inherited prompts and responses compact to the left;
- the exact source response becomes the green branch socket;
- the child continuation and its selectable artifacts receive the primary space on the right;
- any original continuation after the fork point remains visible but muted;
- the child route reconstructs the same inherited path, socket, continuation, and artifact choices as the parent route.

At narrow widths, the desktop inherited rail collapses into a disclosure and the relationship stacks as inherited path -> response socket -> child continuation. The 390px layout must not require horizontal scrolling.

Forks are nested-ready. `prompt_family_id` groups the tree, `parent_fork_id` links the immediate parent, and `fork_depth`/`fork_branch_index` locate a node. Prepared pages resolve the complete root-to-current registry trail with cycle and missing-parent rejection; they do not hard-code one parent hop. A complete lineage has at most 10 total display levels and nine response-to-prompt edges: the original project is level 1, and fork descendants are levels 2 through 10. For compatibility, the first fork stores `fork_depth = 0`, so valid fork depths are `0` through `8`; stored depth `9` is invalid legacy evidence that must be reported and denied rather than rendered as level 11. Branch width remains 10, with `fork_branch_index` values `0` through `9`. Do not bypass those limits in route code or seed data.

## Source-run package

Put lineage in the package's structured `fork_source` object. The accepted keys are:

```text
source_project_id
source_project_title
source_model_variant_id
source_run_id
source_step_id
source_step_number
source_artifact_path
source_artifact_sha256
parent_fork_id
prompt_family_id
fork_depth
fork_branch_index
```

For a model-run fork, `source_run_id` requires a real `public/artifacts/...` source artifact and a 64-character SHA-256. A verified prepared child final may also become the exact source of a nested fork without inventing a model-variant row: its approved project, immutable source-run intake, exact final response, artifact path, and SHA must all agree. Keep exact prompts, responses, repairs, and every real artifact version in the package. The full package shape is documented in the [seed package reference](./skills/pathforge-seed-iteration/references/pathforge-seed-package.md).

## Import and publish order

1. Apply `supabase/migrations/20260711145005_variant_aware_project_forks.sql`, then `supabase/migrations/20260728024959_authoritative_project_fork_lineage.sql`, before importing a structured fork. The latter preflights existing lineage, rejects stored depth 9+, installs database monotonicity enforcement, and exposes the bounded public read. Missing lineage authority is a hard blocker; there is no notes-only fallback.
2. Run the structural checks below.
3. Import only through source-run intake:

   ```bash
   node scripts/import-pathforge-source-run.mjs \
     --package seed-runs/<fork-package>.json \
     --username <non-admin-profile>
   ```

   If the operator has an authenticated database connector but no local service-role secret, emit the exact checked queue-row payload instead of attempting a database write:

   ```bash
   node scripts/import-pathforge-source-run.mjs \
     --package seed-runs/<package>.json \
     --emit-intake-json \
     --profile-id <exact-non-admin-profile-uuid>
   ```

   Emit mode writes JSON only to stdout. After confirming the UUID belongs to the intended non-admin profile, pass that object unchanged as one queued `source_run_submissions` insert through the authenticated connector. For a model-run fork, register the model cohort first and put its exact `source_model_variant_id` in `fork_source`; emit mode fails closed when that row ID is still unresolved. For a nested fork from a verified prepared child final, leave `source_model_variant_id` absent and provide the exact approved child project/run/response/artifact tuple instead.

4. Confirm the queued intake and exact lineage in admin review. The importer stores the exact package-byte SHA-256 plus canonical intake evidence and rejects a checked ID whose immutable evidence differs. Import does not create a public project.
5. Publish through the prepared-source/admin flow. Publishing exact-compares the intake, prepared descriptor, package fork tuple, model variant, response, path, and SHA. One security-definer transaction creates the approved project under the intake author and advances the queue row; there is no non-atomic prompt-insert fallback.
6. Confirm the intake left Pending Review, the approved child resolves on its intended route, and both parent and child pass the browser guard.

The migration validates variant-aware lineage on both `source_run_submissions` and `prompts`. `project_model_variant_artifacts` binds each public artifact path and SHA to its exact model variant response; aliases may share a response but cannot drift in step identity. `validate_variant_aware_project_fork` resolves or checks the public model-variant row and requires one exact evidence tuple. `allocate_project_fork_branch_index` ignores client-supplied slots on first approval, takes a transaction advisory lock, and assigns the first free approved branch slot from `0` through `9`; a unique index prevents duplicate public slots under concurrency. `publish_prepared_showcase_source_run` is the only prepared publication path. Public, anonymous, and ordinary authenticated clients cannot call the internal validation/release helpers or write approval, engagement, admin, and fork-identity fields directly.

Fork records describe lineage, not engagement. Never seed fork counts, votes, saves, comments, or discussion to make a branch look active. Only approved child projects appear as real fork branches.

## Verification

Run structural and shared-page guards first:

```bash
npm run check:project-forks
npm run check:source-run-showcases
npm run typecheck
```

For release-level coverage, run:

```bash
npm run autoreview
```

Then start the app in one terminal:

```bash
npm run dev -- --port 3012
```

In another terminal, verify the actual parent and child routes:

```bash
npm run check:project-fork-browser -- \
  --base-url http://localhost:3012 \
  --parent-route '/<parent-route>#source-run-path' \
  --child-route '/<child-route>#source-run-path'
```

The browser guard requires one shared workspace on each route, exact parent/child inherited-path and response-socket parity, matching continuation, working inline child artifact mounting, no console errors, and a collapsed non-overflowing 390px child layout. Its local-only grandchild fixture proves three-generation ancestry and immediate-response anchoring. When the parent exposes three model variants, it also verifies that each selected run shows only its own fork branch.
