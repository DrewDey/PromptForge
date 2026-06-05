---
name: pathforge-seed-iteration
description: Run PathForge seed iterations with authorized logged-in model accounts and the live PathForge site. Use when Codex should open ChatGPT, Claude, Gemini, or OpenRouter in Chrome, generate one-shot or multi-prompt build paths, preserve exact prompts/responses/artifacts, verify the result, then submit the run to PathForge through source-run intake as a queued review item. Do not create public/upvote project pages unless explicitly asked.
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
- Submit seeds to PathForge as queued source-run intake through the normal Build flow/importer unless the user explicitly asks to approve/publish.
- Preserve exact prompts and exact model responses. Summaries are allowed only in addition to exact text.
- Always feed the run to the PathForge source-run agent flow. Manual entry is closed for now and must stay unavailable unless the user explicitly reopens it in a later turn.
- Submit from a dedicated non-admin PathForge seed/profile account when available. Do not submit from the user's personal/admin profile by default.
- Do not create real third-party accounts, email accounts, or credentials. For PathForge seed profiles, use a project-owned seed-profile provisioner/admin workflow when one exists; otherwise use the user-in-browser signup/login boundary.
- Track every profile created or used for this workflow in `references/profile-registry.md`. Never store passwords, OTPs, recovery codes, session cookies, API keys, or other secrets there.
- Pick models with latency in mind. For simple seed artifacts, prefer the fastest model likely to produce a usable artifact; avoid heavy/pro/max reasoning models unless the user asks for them or the seed truly needs that depth.
- Reject weak seeds before upload. Do not submit blank, broken, generic, unsafe, or low-value artifacts just so the queue grows.
- If a run generates multiple artifact versions, capture every artifact version so the eventual public page can make each one selectable in the top mounted display.
- Do not reject or abort a multi-prompt candidate mid-chain because an early step is slow, preview-only, or awkward to capture. Let the lane finish, then judge the completed package.

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
- PathForge shows the Build page with source-run submission controls and a disabled manual-entry card marked "Not available for now", or the user account in the header.

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

Use an appropriate model for the seed. A seed should usually optimize for realistic user workflow, artifact quality, and iteration speed, not maximum model depth or loyalty to any one provider.

- Primary model lanes are the user's normal ChatGPT, Gemini, and Claude accounts. OpenRouter is optional variety, not a default and not forced. Use it only when a specific random/frontier/specialized model is a good fit for the seed or helps keep the library diverse. Record the exact OpenRouter model name, provider route when visible, settings, and source URL; never describe the model only as "OpenRouter."
- Prefer fast/default tiers such as Gemini Flash, Claude Sonnet, ChatGPT default/fast models, or equivalent models for one-shot browser tools and simple games.
- Use heavier models such as Claude Opus Max, GPT Pro/extended thinking, or Gemini Pro only when the user requested that exact model or the brief clearly needs deeper reasoning.
- If a high-thinking or model-finalizing attempt shows no useful progress, wait much longer before treating it as blocked. Do not use quick fallback as the default for premium/deep-thinking runs.
- If a normal provider lane hits a real usage-limit wall, do not wait for reset. Move that lane to OpenRouter with a cheaper routed model appropriate to the seed, then record OpenRouter as the service/provider plus the exact routed model, upstream route when visible, settings, and source URL. This fallback is for explicit quota/limit blockers, not ordinary slow finalizing.
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

If a lane has a 2-10 prompt target or the builder has already decided the next
prompt is justified, let that chain finish before pass/reject review. Do not
panic-cancel a candidate because prompt 1 produced a Claude Visualize/Gemini/
ChatGPT preview without an immediately mountable file. Capture the exact
prompt/response and continue. If the lane hits an explicit usage limit, move to
a cheaper OpenRouter routed model instead of waiting for reset. Only stop early
for hard blockers that cannot be routed around, such as login/CAPTCHA, missing
source link/export, unsafe content, or user interruption.

For preview-only steps:

- Preserve the exact prompt and exact visible response text.
- Record the preview/capture limitation in `notes`.
- Leave `artifact_version_path` absent or null unless a real artifact file was
  saved under `public/artifacts/`.
- Do not turn preview-frame text, screenshots, summaries, or local-only capture
  notes into fake selectable artifact versions.
- If the final artifact works and the rest of the package is complete, the run
  can still pass.

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

Good first prompts usually include:

- the artifact type,
- the self-contained constraint when relevant,
- one clear quality target,
- one audience or usage context.

Do not treat examples, prior successful seeds, or the phrase "single-file HTML"
as a template. Across a batch, avoid cloned first prompts where only the artifact
name changes. Do not replace one repeated opener with another fixed opener list;
write the request naturally for the actual use case.

Bad first prompts are either too empty (`make an app`) or too monstrous (`make a full SaaS with 40 features, auth, payments, admin, analytics, and mobile apps`).

Use `references/seed-idea-quality.md` when choosing ideas or writing first prompts.

For multi-prompt seeds, each prompt should naturally respond to the previous output:

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

Close-but-rejected candidates should be saved under `seed-runs/rejected/` with
the source link, prompt count, exact captured evidence, rejection reason, and
repair notes. Do not upload them until they pass the normal gates.

## Browser Cleanup

Close every Chrome browser tab group opened for the seed lane before the lane is
complete or blocked. When using the Chrome browser tooling, call
`browser.tabs.finalize({ keep: [] })` unless a tab is explicitly waiting on user
login, CAPTCHA, or another handoff blocker.

## PathForge Submission Workflow

Use the project-owned source-run intake path by default. A submission is not a project page. It is only the normal Build page intake fields: title, real AI session link, AI service/provider, exact model as free text, optional model settings, and notes for review. Do not create or populate public/upvote-page fields such as story, description, category, difficulty, outcome, build path, prompt steps, votes, comments, forks, or discussion unless the user explicitly asks for the later admin page-build/publish step.

In this repo, create a seed package JSON under `seed-runs/`, then run `scripts/import-pathforge-source-run.mjs` with the dedicated seed profile username. The importer may only queue a `source_run_submissions` intake item under a realistic non-admin profile. It must not insert into `prompts` or `prompt_steps`.

Only use `https://prompt-forge-sandy.vercel.app/build` when intentionally testing the public UI.

When the user expects Chrome to remain signed into a non-admin seed profile, create or reuse that PathForge profile through Chrome first. Use a realistic public handle, keep the generated password in memory only for the current run, and never put it in the registry. If a same-turn backend import must use that exact browser-created account, run the importer with `--auth-mode password --email <login>` and provide the generated password through the `PATHFORGE_SEED_PASSWORD` environment variable for that process only.

Use source-run mode every time:

1. Capture or create the source-run package with exact prompts/responses, provider/model, artifact path, verification result, the submitting profile registry ID, any transcript-only preview steps, and any abandoned slow model attempts.
2. Queue the package with `scripts/import-pathforge-source-run.mjs --package <path> --username <profile-username>`. The script uses the service-role provisioner path when available; otherwise it tries normal public signup with a generated synthetic account and proceeds only if PathForge returns an active session. For a browser-created profile in the same run, use `--auth-mode password --email <login>` so the intake item and Chrome session belong to the same profile.
3. If public signup requires email confirmation, stop and report that the app needs either a service-role key locally or an app-owned seed-profile endpoint.
4. Confirm the result lands in the admin Pending Review queue as a source-run intake item labeled "Let the agent structure it", not as a manual project draft.
5. Do not use `--submit-draft`. That old direct-draft path is disabled because it bypassed the intended source-run review boundary.
6. Update `references/profile-registry.md` plus the seed package submission fields.

Browser UI fallback:

1. Select `SOURCE RUN / Let the agent structure it`.
2. Add a short title for the source-run intake.
3. Paste the source-run URL.
4. Confirm or select the AI service/provider. If `Other`, enter the custom service name.
5. Add the exact model as free text; type `Not sure` only when the session truly does not show the exact model. OpenRouter is the service/router, not the model, so OpenRouter runs still need the actual routed model in this field.
6. Add optional model settings when visible.
7. Add the same review notes.
8. Submit to the queue.

If the source-run importer cannot parse, no real source URL/export exists, or the backend is not ready, stop and report the blocker. Manual entry is closed for now; do not switch to manual entry or direct project-page creation unless the user explicitly reopens it in a later turn.

Submit fields:

- Title: clear source-run title.
- AI session link: a real supported source URL.
- Provider: detected from the link when possible, selected by the submitter, or entered as a custom service through `Other`.
- Model used: exact visible model as free text when known; `Not sure` is allowed only when the session does not expose the model.
- Model settings: optional visible thinking/speed/tools/settings context.
- Notes for review: concise notes for the reviewer/agent, including profile registry ID, prompt count, final artifact clue, verification notes, artifact versions, transcript-only/preview-only steps, and any private/exclusion notes.

After submission, confirm the source-run intake row lands in pending review/admin with a Review intake action. Do not approve, publish, or create a project/upvote page unless explicitly instructed.

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
- `../../PATHFORGE_HOURLY_SEED_MANAGER.md`: hourly manager/subagent prompt and rejection gates.
