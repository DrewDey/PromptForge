# scripts/seed-submission.mjs

Deprecated compatibility shim.

Use the canonical source-run importer:

```bash
node scripts/import-pathforge-source-run.mjs \
  --package seed-runs/example.json \
  --username JordanLee \
  --dry-run
```

The old `--title` / `--link` / `--notes` / `--profile` flow is intentionally
refused because it bypassed the current package checks for provider and exact
model metadata.

The canonical importer creates only a queued `source_run_submissions` intake.
It does not create public prompt pages, votes, bookmarks, approvals, or
published showcase routes.
