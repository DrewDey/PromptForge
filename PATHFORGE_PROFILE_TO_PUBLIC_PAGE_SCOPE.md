# Profile-To-Public-Page Scope

## Goal

Create a repeatable PathForge workflow where a non-admin profile submits a real source-run intake, an admin later decides whether to build a project page from that intake, and publishing only happens after an explicit approval step.

This is the workflow the user means when they ask an agent to "upload the project" through the Build page: title, real AI session link, and agent notes first. A public/upvote project page is a later, separate action.

For the first successful workflow proof, use an extremely basic low-hanging-fruit project. The point is proving the workflow, not proving a novel project idea. Good candidates are common browser artifacts such as Tic-Tac-Toe, Pong, Breakout, a stopwatch, a calculator, or a simple to-do list. Avoid clever, niche, or "interesting" ideas until this workflow is reliable.

## Non-Negotiables

- Use a dedicated non-admin PathForge profile for the submission, not the user's personal/admin profile.
- Keep passwords, OTPs, cookies, service-role keys, and recovery codes out of chat, source, logs, and profile registry files.
- Preserve exact prompts, exact model responses, generated artifacts, and verification notes.
- Use source-run intake first. Manual entry is closed for now; do not bypass into a manual prompt draft unless the user explicitly reopens manual entry in a later turn.
- A submission is not a project page. The intake must not create story, category, difficulty, build-path, vote, comment, fork, or discussion fields.
- Keep daytime testing local unless the user explicitly approves touching the live site or production database.
- Do not create a page, approve, or publish anything until the source-run intake has been verified and the user/admin explicitly asks for the page-building step.

## Existing Repo Path

The repo already has the intended pieces:

- Profile registry: `skills/pathforge-seed-iteration/references/profile-registry.md`
- Seed profile provisioner: `scripts/create-pathforge-seed-profile.mjs`
- Source-run package shape: `skills/pathforge-seed-iteration/references/pathforge-seed-package.md`
- Source-run importer: `scripts/import-pathforge-source-run.mjs`
- Admin pending queue: `src/app/admin/page.tsx`
- Source-run review detail: `src/app/admin/source-runs/[id]/page.tsx`
- Later page-build form/action, when intentionally used: `src/app/admin/source-runs/[id]/CreateDraftFromSourceRunForm.tsx`
- Later page-build logic, when intentionally used: `src/lib/data.ts:createDraftProjectFromSourceRun`
- Approval action: `src/lib/actions.ts:approvePrompt`

Before changing source-run submission behavior, run:

```bash
npm run check:source-run-intake
```

That guard must keep passing. It exists to prevent agents from reintroducing direct prompt/upvote-page creation into the source-run upload path.

## Happy Path

1. Pick or create a dedicated profile.
   - Read the profile registry.
   - Prefer an existing active non-admin seed profile if it is valid for this run.
   - If a new profile is needed, use the project provisioner or browser signup boundary.
   - Record only non-secret profile details in the registry.

2. Capture the model run.
   - Use an authorized model account.
   - Use a basic prompt, for example: `Make me a playable Tic-Tac-Toe game as a single self-contained HTML file.`
   - Decide from the model output whether follow-up prompts are needed. Follow up only for normal reasons: the artifact is broken, incomplete, awkward, or missing an obvious expected behavior.
   - Capture exact prompt(s), exact response(s), provider/model, source URL, generated files, screenshots if useful, and verification notes.
   - Save runnable artifacts under `public/artifacts/` when applicable.

3. Create a seed package.
   - Store it under `seed-runs/`.
   - Use the package shape in `skills/pathforge-seed-iteration/references/pathforge-seed-package.md`.
   - Include the submitting profile registry ID.

4. Submit the source-run intake under the non-admin profile.
   - Preferred command shape:
     ```bash
     node scripts/import-pathforge-source-run.mjs --package seed-runs/<package>.json --username <ProfileUsername>
     ```
   - This should create a `source_run_submissions` row with status `queued`, not a public prompt.

5. Verify admin queue intake.
   - Open `/admin?tab=pending`.
   - Confirm the item appears as "Let the agent structure it."
   - Confirm the author is the non-admin profile.
   - Open `/admin/source-runs/<id>`.

6. Stop after intake unless the user explicitly asks to build the page.
   - A correct upload is already done when `/admin/source-runs/<id>` shows `PENDING SOURCE-RUN REVIEW`, the real AI session link, and the agent notes.
   - Do not open `/prompt/<id>` or create one as proof of upload.

7. If explicitly asked, structure the pending draft.
   - Extract the final artifact first.
   - Preserve exact prompts and responses in the steps.
   - Use the source-run detail form or equivalent server action to create the draft.
   - The draft must be owned by the original source-run submitter.
   - Confirm `source_run_submissions.extracted_prompt_id` points to the new prompt.

8. Approve the draft.
   - Review `/prompt/<id>` while still pending.
   - Approve through the admin prompt row/action.
   - Do not publish until the draft page is structurally correct.

9. Verify the public result.
   - `/prompt/<id>` loads for public viewing.
   - `/user/<username>` shows the project under the submitting profile.
   - `/paths` includes the project if it belongs in the public library.
   - Votes/bookmarks/comments are real empty or real persisted states, not fake seeded engagement.
   - Any mounted artifact route, if used, shows the actual artifact and correct metadata.

## Interactive Checkpoints

Stop and ask the user before:

- Creating or using a live profile if the account/session state is unclear.
- Entering or requesting any credential, OTP, CAPTCHA, or email confirmation step.
- Running production-affecting scripts without an explicit approval.
- Approving/publishing a pending draft.
- Adding a new special mounted route instead of using the generic `/prompt/<id>` page.

Continue without asking when:

- Reading local code.
- Creating or editing local scope/runbook files.
- Running dry-run scripts.
- Building a local seed package.
- Running local typechecks and browser verification.

## Common Failure Modes

- The agent submits from the admin profile instead of the seed profile.
- The importer uses any direct prompt/page creation path and bypasses source-run review.
- Public signup requires email confirmation and no service-role provisioner is available.
- Admin draft creation cannot assign the prompt to the original source-run author without `SUPABASE_SERVICE_ROLE_KEY`.
- The resulting public page is generic text instead of artifact-first.
- The generated artifact exists only in the local repo and is not available to the live site, so the live project page can only print the artifact path instead of rendering it.
- The profile page does not show the project because mock/fallback profile IDs or public-library filters are wrong.
- The agent approves before checking the actual public page and profile page.

## Success Definition

For an upload-only request, the workflow is complete when the source-run intake is visible at `/admin/source-runs/<id>` with status `PENDING SOURCE-RUN REVIEW`, the real AI session link, and agent notes.

For an explicit publish request, the workflow is complete only when there is a verified public PathForge project page, owned by the non-admin profile that submitted the source run, visible from that profile page, and approved through the admin path with exact source-run evidence preserved.
