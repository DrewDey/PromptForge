# PathForge Seed Profile Registry

Persistent non-secret registry for profiles/accounts created or used for PathForge seed iteration.

Do not store passwords, OTPs, recovery codes, session cookies, API keys, backup codes, private tokens, or security answers here.

## Required Update Moments

- Before using PathForge for a seed run, check this registry.
- After Codex provisions public profile fields or the user creates/authorizes a new seed profile, add it here.
- After a profile prepares/submits a source run, update `last_used_at` and notes.
- If a profile is blocked, retired, renamed, or discovered to be wrong, update its status.

## Fields

- `registry_id`: stable ID, for example `pathforge-seed-001`.
- `service`: PathForge, Google, OpenAI, Anthropic, OpenRouter, etc.
- `purpose`: why this profile exists.
- `display_name`: visible account/profile name. Use a realistic pseudonymous builder name, not an internal seed/test label.
- `handle_or_profile_url`: public or visible profile identifier when useful.
- `login_identifier`: optional non-secret identifier only if visible and useful.
- `created_at`: date the user created or authorized it.
- `created_by`: usually `user_in_browser`, `codex_in_chrome`, or `project_provisioner` for PathForge-owned synthetic seed profiles. Never create third-party accounts.
- `provisioning_method`: `project_provisioner`, `admin_ui`, `public_signup_browser`, `public_signup_fallback`, `user_in_browser`, or `unknown`.
- `status`: `planned`, `active`, `blocked`, `retired`, or `do-not-use-for-seeds`.
- `last_used_at`: date last used for seed workflow.
- `notes`: short operational notes.

## Provisioning Automation

Codex may automate realistic public identity selection, form navigation, public username/display-name entry, and registry updates. Prefer a project-owned seed-profile provisioner or admin workflow over raw database edits or fake public signup. If no provisioner exists, the user must complete or approve passwords, email verification, OTPs, CAPTCHA, browser password-manager prompts, and any other credential/security step in Chrome. Keep internal registry IDs separate from public handles.

Current project-owned provisioner: `scripts/create-pathforge-seed-profile.mjs`.
Current project-owned source-run importer: `scripts/import-pathforge-source-run.mjs`. It queues source-run intake by default; `--submit-draft` is reserved for an agent-structured project draft after extraction.

Example dry run:

```bash
node scripts/create-pathforge-seed-profile.mjs --dry-run
```

Live use prefers `SUPABASE_SERVICE_ROLE_KEY` in the local environment or `.env.local`. Do not put service-role keys in chat, source control, or any `NEXT_PUBLIC_` variable. If no service-role key is present, the importer tries normal public signup with a generated synthetic account and continues only if the app returns an active session.

Source-run intake dry run:

```bash
node scripts/import-pathforge-source-run.mjs --package seed-runs/decision-matrix-gemini-flash-oneshot.json --dry-run
```

## Registry

| registry_id | service | purpose | display_name | handle_or_profile_url | login_identifier | created_at | created_by | provisioning_method | status | last_used_at | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pathforge-admin-drew | PathForge | Existing personal/admin profile observed during setup; do not use for normal seed submissions. | Drew | `/user/Drew` |  | observed 2026-05-28 | existing | user_in_browser | do-not-use-for-seeds | 2026-05-29 | Used only for explicit admin repair: requeued the decision-matrix Gemini source-run intake and rejected the incorrect direct prompt draft. Do not use for normal seed submissions. |
| pathforge-seed-001 | PathForge | Dedicated non-admin profile for source-run seed submissions. | Jordan Lee | `/user/JordanLee` | `jordanlee.20260529033628@pathforge-seed.example.com` | 2026-05-29 | project_provisioner | public_signup_fallback | active | 2026-05-29 | Originally submitted direct prompt draft `761b5b40-f3ed-4019-9c03-a00dec07a037` for the decision-matrix Gemini Flash run; that draft was rejected during the 2026-05-29 admin repair because it bypassed source-run intake. Generated password was not stored or printed, so this profile is an author record, not the reusable Chrome session. |
| pathforge-seed-002 | PathForge | Dedicated non-admin browser session for future source-run seed workflow. | MayaChen | `/user/MayaChen` | `mayachen.20260529033902@pathforge-seed.example.com` | 2026-05-29 | codex_in_chrome | public_signup_browser | active | 2026-05-29 | Chrome is signed into this profile. Created to keep future seed iteration out of the personal/admin profile without storing credentials. No duplicate decision-matrix submission was created under this profile. |
| pathforge-seed-003 | PathForge | Dedicated non-admin profile used to replicate true source-run upload for the decision-matrix seed. | Riley Park | `/user/RileyPark` | `rileypark.20260529150254@pathforge-seed.example.com` | 2026-05-29 | project_provisioner | public_signup_fallback | active | 2026-05-29 | Submitted source-run intake `ee3641c3-6137-4fa6-8fc3-4561af7cfcde` for the decision-matrix Gemini Flash run. Generated password was not stored or printed, so this profile is an author record, not the reusable Chrome session. |
| pathforge-seed-004 | PathForge | Dedicated non-admin profile used for the basic profile-to-public-page workflow proof. | Alex Rivera | `/user/AlexRivera` | `alexrivera.20260530213330@pathforge-seed.example.com` | 2026-05-30 | project_provisioner | public_signup_fallback | active | 2026-05-30 | Submitted source-run intake `08b06ee4-203b-40c8-a4da-aa299bc79d48` for the Gemini Flash Tic-Tac-Toe workflow proof. Generated password was not stored or printed, so this profile is an author record, not the reusable Chrome session. |
| pathforge-seed-005 | PathForge | Dedicated non-admin profile used for the Claude HP 10Bii+ calculator source-run upload. | Taylor Grant | `/user/TaylorGrant` | `taylorgrant.20260601013545@pathforge-seed.example.com` | 2026-06-01 | project_provisioner | public_signup_fallback | active | 2026-06-01 | Submitted source-run intake `cb968686-6546-4218-93df-14c5113b1624` for the Claude Opus 4.8 Max HP 10Bii+ financial calculator run. Generated password was not stored or printed, so this profile is an author record, not the reusable Chrome session. |
