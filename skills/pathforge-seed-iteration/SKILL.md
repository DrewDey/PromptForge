---
name: pathforge-seed-iteration
description: Run PathForge seed iterations with authorized logged-in model accounts and the live PathForge site. Use when Codex should open ChatGPT, Claude, Gemini, or OpenRouter in Chrome, generate one-shot or multi-prompt build paths, preserve exact prompts/responses/artifacts, verify the result, then log into PathForge and submit the seed through the Build page as a pending draft/review item.
---

# PathForge Seed Iteration

## Goal

Generate real PathForge seed candidates by running real AI model sessions, capturing the exact output, verifying the artifact, and submitting the result into PathForge for review.

This skill is for the operating loop: model site -> artifact -> verification -> PathForge `/build` submission.

## Required Inputs

Before starting, determine:

- Provider: `chatgpt`, `claude`, `gemini`, or `openrouter`.
- Chain type: `one-shot`, `multi-prompt`, or `fork`.
- Build brief: the artifact the model should create.
- Category/domain: usually `games` or `productivity` unless the user says otherwise.
- PathForge account state: logged into the dedicated PathForge seed profile in Chrome or user available to complete login/profile creation.

If no brief is given, pick one small, useful first-taste build:

- game: one-file playable browser game,
- productivity: one-file useful work tool,
- fork: improvement to an existing PathForge seed.

Default to obvious low-hanging fruit before niche or complex projects. A new visitor should understand why the artifact is interesting within 15 seconds.

## Hard Rules

- Use only logged-in accounts or API keys the user controls.
- Do not create third-party accounts or bypass login/CAPTCHA/2FA.
- Do not submit fake votes, bookmarks, comments, or fake user activity.
- Submit seeds to PathForge as `pending` review through the normal Build flow unless the user explicitly asks to approve/publish.
- Preserve exact prompts and exact model responses. Summaries are allowed only in addition to exact text.
- Always feed the run to the PathForge source-run agent flow. Do not submit through manual entry unless the user explicitly asks for manual entry in that turn.
- Submit from a dedicated non-admin PathForge seed/profile account when available. Do not submit from the user's personal/admin profile by default.
- Do not create real third-party accounts, email accounts, or credentials. For PathForge seed profiles, use a project-owned seed-profile provisioner/admin workflow when one exists; otherwise use the user-in-browser signup/login boundary.
- Track every profile created or used for this workflow in `references/profile-registry.md`. Never store passwords, OTPs, recovery codes, session cookies, API keys, or other secrets there.
- Pick models with latency in mind. For simple seed artifacts, prefer the fastest model likely to produce a usable artifact; avoid heavy/pro/max reasoning models unless the user asks for them or the seed truly needs that depth.

## Profile Provisioning Workflow

Prefer an app-owned seed-profile provisioner over raw database edits or fake public signup. The storage layer may be Supabase, but the workflow should be owned by the PathForge project so it stays auditable and repeatable.

1. Read `references/profile-registry.md`.
2. Pick the next planned or unused registry ID, such as `pathforge-seed-001`.
3. Generate or reuse a realistic public builder identity from the registry. Use normal-looking names/handles, not labels like `seed`, `test`, `agent`, or `bot`.
4. Look for a project-owned seed-profile provisioner first: a script, admin-only page, server action, or documented SQL/admin path designed for synthetic seed actors.
5. If a provisioner exists, use it exactly as documented. This repo's local script is `scripts/create-pathforge-seed-profile.mjs`; it requires `SUPABASE_SERVICE_ROLE_KEY`, creates a confirmed synthetic auth user/profile, and does not print or store the generated password.
6. If no provisioner exists, open the PathForge sign-up/login flow in Chrome and automate public/non-secret fields only: display name, username/handle, profile URL slug, and a user-approved email/login identifier if provided.
7. Stop for the user to enter or approve passwords, OTPs, email confirmations, CAPTCHA, password-manager prompts, or any other credential/security step.
8. After provisioning or user credential completion, confirm the header/profile URL shows the dedicated seed profile, not the personal/admin profile.
9. Update `references/profile-registry.md` with the visible non-secret profile details, provisioning method, status, creation/use date, and any blocker.
10. Use that profile registry ID in source-run agent notes and seed-package metadata.

Do not improvise raw Supabase writes from the skill. If the app lacks a provisioner and the user wants synthetic accounts, propose adding a small project-owned seed-profile provisioner first.

## Chrome Access Check

Use Chrome because it has the user's logged-in sessions.

Check these URLs:

- ChatGPT: `https://chatgpt.com/`
- Claude: `https://claude.ai/new`
- Gemini: `https://gemini.google.com/app`
- OpenRouter: `https://openrouter.ai/chat`
- PathForge Build: `https://prompt-forge-sandy.vercel.app/build`

Ready signals:

- ChatGPT shows a message composer and the user's plan/account.
- Claude shows `New chat` and a message composer.
- Gemini shows a prompt box and recent chats.
- OpenRouter shows the chat playground and model picker.
- PathForge shows the Build page with either source-run/manual submission controls or the user account in the header.

If a login page appears, stop at the login screen and ask the user to complete login in Chrome. Do not ask for passwords in chat.

For PathForge specifically, confirm the header/profile is the dedicated seed profile before submission. If Chrome is logged into the user's personal/admin profile, switch/log out and stop at the login/profile screen for the user to complete the dedicated seed profile login. Do not submit under the admin profile just because it is already signed in.

## Profile Registry

Before creating, switching, or using a PathForge seed profile, read `references/profile-registry.md`.

Update the registry whenever:

- the user creates or authorizes a profile for seed submissions,
- a profile is used to submit or prepare a source run,
- a profile is retired, blocked, renamed, or discovered to be the wrong account,
- a new provider/profile is created specifically for PathForge seed work.

Use a stable registry ID in notes and submissions, such as `pathforge-seed-001`. Record only non-secret identifiers: site, display name/handle, profile URL, creation date, purpose, status, and whether the user completed login. If an email/login identifier is needed, store it only when it is visible and useful; never store passwords or auth tokens.

The public-facing PathForge profile name should be a realistic pseudonymous builder name or handle, not an operational label like `pathforge-seed-001`, `test-user`, or `agent`. Keep operational IDs internal to the registry.

## Model Selection And Timing

Use the fastest adequate model for routine seed generation. A seed should usually optimize for realistic user workflow, artifact quality, and iteration speed, not maximum model depth.

- Prefer fast/default tiers such as Gemini Flash, Claude Sonnet, ChatGPT default/fast models, or equivalent OpenRouter models for one-shot browser tools and simple games.
- Use heavier models such as Claude Opus Max, GPT Pro/extended thinking, or Gemini Pro only when the user requested that exact model or the brief clearly needs deeper reasoning.
- If a simple seed prompt shows no useful progress after a short wait, capture that as a slow/blocked attempt and switch to a faster adequate model instead of waiting indefinitely.
- Record slow or abandoned model attempts in notes when they affect the final source package.

## Provider Run Workflow

1. Open the chosen provider in Chrome.
2. Start a new chat.
3. Select the requested model/settings when the UI allows it.
4. Pick the initial target chain length using `references/chain-realism.md` unless the user gave a specific length.
5. Send only the first seed prompt.
6. Wait for the response to finish.
7. Inspect the actual response and artifact before deciding whether another prompt is needed.
8. Continue only when there is a real reason: broken behavior, missing expected feature, weak UX, poor mobile fit, unclear copy, a remembered requirement, or a useful fork/improvement that naturally follows from the output.
9. Capture:
   - exact prompt,
   - exact response,
   - model/provider,
   - date/time,
   - source URL,
   - generated code blocks,
   - generated files/downloads if available,
   - screenshots if the UI or artifact matters.
10. If the response includes runnable HTML, save the exact code as an artifact file in the repo under `public/artifacts/`.
11. Verify the artifact locally or from the deployed static artifact URL.

## Chain Realism

Most seeds should be short. The library should feel like real people opening a model, making something, noticing an issue, and either stopping or asking for a specific fix.

Do not script prompt 2, 3, or 4 before seeing prompt 1's output. A target length is only a planning prior, not a script. After each response, run this decision:

- **Stop** when the artifact works and the path already teaches something useful.
- **Fix** when verification finds a concrete defect.
- **Refine** when the output is usable but has an obvious improvement a normal user would notice.
- **Remember** when the next prompt adds a requirement the user plausibly forgot to include in the first prompt.
- **Fork** when the response suggests a meaningfully different version.
- **Reject** when continuing would only create fake-looking filler.

If a multi-prompt chain has no relationship to the artifact actually produced, mark it as low quality and do not submit it.

## Seed Prompt Pattern

Keep first prompts simple, but not stupid. They should read like a real person asking for something they actually want to make.

For one-shot seeds, use one sentence unless the user asks for a more complex chain. The sentence can be well-written and specific; it should not become a giant requirements list.

Examples:

```text
Make me a playable Breakout game as a single self-contained HTML file.
```

```text
Make me a single-file meeting-cost calculator that feels polished and works in the browser.
```

Good first prompts usually include:

- the artifact type,
- the self-contained constraint when relevant,
- one clear quality target,
- one audience or usage context.

Bad first prompts are either too empty (`make an app`) or too monstrous (`make a full SaaS with 40 features, auth, payments, admin, analytics, and mobile apps`).

Use `references/seed-idea-quality.md` when choosing ideas or writing first prompts.

For multi-prompt seeds, each prompt should naturally respond to the previous output:

```text
Make me a single-file browser habit tracker with local storage.
```

```text
Now improve it with a weekly streak view and exportable CSV.
```

```text
Now make the empty state and mobile layout feel production-ready.
```

Better continuation prompts reference observed output:

```text
The game works, but the paddle movement feels too slippery. Tighten the controls and add a small start screen.
```

```text
I forgot to ask for saved history. Add local storage and a clear-all button without making the layout busier.
```

```text
This is close, but on mobile the controls are cramped. Redesign the controls for touch first.
```

Bad continuation prompts sound prewritten:

```text
Now add advanced features.
```

```text
Continue with step 2.
```

## Artifact Verification

For runnable HTML:

1. Save exact model code to `public/artifacts/<slug>.html`.
2. Open it in a browser.
3. Confirm it renders.
4. Try the main interaction.
5. Check there is no blank screen.
6. Capture a screenshot under `screenshots/` if useful.

If verification fails, keep the seed as `blocked` and record why. Do not submit broken work as ready.

## PathForge Submission Workflow

Use the project-owned source-run intake path by default. In this repo, create a seed package JSON under `seed-runs/`, then run `scripts/import-pathforge-source-run.mjs` with the dedicated seed profile username. By default this queues a `source_run_submissions` intake item under a realistic synthetic profile; it must not create a pending `prompts` draft until an extraction/page-composer agent has actually structured the source run.

Only use `https://prompt-forge-sandy.vercel.app/build` when intentionally testing the public UI.

When the user expects Chrome to remain signed into a non-admin seed profile, create or reuse that PathForge profile through Chrome first. Use a realistic public handle, keep the generated password in memory only for the current run, and never put it in the registry. If a same-turn backend import must use that exact browser-created account, run the importer with `--auth-mode password --email <login>` and provide the generated password through the `PATHFORGE_SEED_PASSWORD` environment variable for that process only.

Use source-run mode every time:

1. Capture or create the source-run package with exact prompts/responses, provider/model, artifact path, verification result, the submitting profile registry ID, and any abandoned slow model attempts.
2. Queue the package with `scripts/import-pathforge-source-run.mjs --package <path> --username <profile-username>`. The script uses the service-role provisioner path when available; otherwise it tries normal public signup with a generated synthetic account and proceeds only if PathForge returns an active session. For a browser-created profile in the same run, use `--auth-mode password --email <login>` so the intake item and Chrome session belong to the same profile.
3. If public signup requires email confirmation, stop and report that the app needs either a service-role key locally or an app-owned seed-profile endpoint.
4. Confirm the result lands in the admin Pending Review queue as a source-run intake item labeled "Let the agent structure it", not as a manual project draft.
5. Use `--submit-draft` only after an extraction/page-composer agent has converted the source run into the final-artifact-first project page with exact prompts, responses, artifacts, and verification attached.
6. Update `references/profile-registry.md` plus the seed package submission fields.

Browser UI fallback:

1. Select `SOURCE RUN / Let the agent structure it`.
2. Add a short title for the source-run intake.
3. Paste the source-run URL.
4. Add the same agent notes.
5. Run `PREPARE SOURCE RUN` or the equivalent agent-structuring action.

If the source-run importer cannot parse or the backend is not ready, stop and report the blocker. Do not switch to manual entry unless the user explicitly asks for manual submission.

Submit fields:

- Title: clear artifact title.
- Description: what the run produced.
- Outcome/result: final artifact summary and verification note.
- Category: broad domain.
- Difficulty: usually `beginner` for one-shot first-taste examples.
- Model/provider: exact provider/model label when available.
- Tags: include `one-shot`, `multi-prompt`, `fork`, `game`, `productivity`, `token-maxing`, or similar true labels.
- Steps: each prompt/response pair with exact text.
- Source-run title: required for intake so admin can open and review the pending source-run record before drafting.
- Source run URL: required for source-run intake.
- Artifact path: include the saved file path or URL.

After submission, confirm the project lands in pending review/admin. Do not approve it unless explicitly instructed.

## Output To User

Report:

- which provider/model ran,
- prompt count,
- artifact created,
- verification result,
- PathForge submission URL or pending ID,
- anything blocked.

Keep it factual. Do not over-explain policy unless the task is blocked by login/account limits.

## References

- `references/pathforge-seed-package.md`: required seed-package shape.
- `references/profile-registry.md`: persistent non-secret registry for seed profiles/accounts.
- `references/browser-capture-notes.md`: practical Chrome capture notes.
- `references/chain-realism.md`: weighted prompt-count policy and realistic continuation rules.
- `references/seed-idea-quality.md`: simple game/productivity idea selection and first-prompt quality bar.
