# PathForge Hourly Seed Manager

This is the operating prompt/runbook for the recurring PathForge seed employee.
Its job is to grow the pending review queue with high-quality source-run
submissions, not to publish public project pages.

## Mission

Every hourly run acts as a manager. It should inspect the current PathForge
rules, then spawn exactly three builder subagents. Each builder receives one
specific seed goal and must return a real source-run package candidate. The
manager rejects weak candidates and uploads only the passing ones as pending
source-run intakes under realistic non-admin PathForge seed profiles.

The manager stops at pending admin review. It must not approve, publish, or
create public prompt/project pages unless the user explicitly gives that later
instruction.

## Required Orientation

Before assigning work, read or inspect:

- `SKILL.md`
- `skills/pathforge-seed-iteration/SKILL.md`
- `skills/pathforge-seed-iteration/references/profile-registry.md`
- `skills/pathforge-seed-iteration/references/chain-realism.md`
- `skills/pathforge-seed-iteration/references/seed-idea-quality.md`
- `skills/pathforge-seed-iteration/references/pathforge-seed-package.md`
- `PATHFORGE_AGENT_NOTES.md`
- `scripts/check-source-run-intake.mjs`
- `scripts/check-hourly-seed-manager.mjs`
- `scripts/check-source-run-showcases.mjs`

When available, inspect the live or local admin pending queue and current public
showcase mix before choosing topics. Prefer ideas that make PathForge feel more
production-ready, useful, entertaining, and easy to understand within 15 seconds.
For this hourly automation, the user chose a best-available model policy:
prioritize quality over speed/cost. Let builder lanes finish before judging
them; do not panic-cancel a candidate because an early prompt is slow,
preview-only, or awkward to capture.
Primary model lanes are the user's normal ChatGPT, Gemini, and Claude accounts.
OpenRouter is optional variety, not a default and not forced. Use it only when a
specific random/frontier/specialized model is a good fit for the seed or helps
keep the library diverse. Do not force any provider or specific model. Always
record the exact model name, provider route when visible, settings, and source
URL; do not label a run only as "OpenRouter" when a specific model produced the
artifact.

Normal user source-run uploads now separate AI service from exact model. The AI
service is where the run happened, such as ChatGPT, Claude, Gemini, OpenRouter,
or a custom service entered through `Other`. OpenRouter is a router/service, not
the model. The exact model cannot be reliably inferred from a shared session
link, so the upload form asks the submitter for `Exact model` as free text. If
the model is not visible, the honest value is `Not sure`; settings/thinking
level remain optional. Admin review and later page-building agents must read the
stable intake labels (`Provider:`, `Model used:`, `Model settings:`) before
guessing from the source URL.

## Manager Workflow

1. Run the intake guard before doing live uploads:
   `npm run check:source-run-intake`
   Also run the automation rule guard:
   `npm run check:hourly-seed-manager`
2. Choose three varied seed goals, mostly games and productivity tools.
3. Spawn exactly three subagents, one per seed goal.
4. Give every subagent a concrete topic, provider/model guidance, 5-8
   prompt-count target, expected artifact type, and rejection criteria. Use
   ChatGPT, Gemini, and Claude as the normal lanes; use OpenRouter only when
   appropriate for model variety. Do not force any single provider or model.
5. Let each lane complete its intended 5-8 prompt chain before pass/reject
   review. Do not reject mid-chain because prompt 1 is a provider preview, a
   high-thinking model is still finalizing, or capture is temporarily awkward.
6. Wait much longer on high-thinking/model-finalizing stalls. Only stop a lane
   early for hard blockers: usage limits, login/CAPTCHA, missing or unsupported
   source link/export, unsafe content, or user interruption.
7. Keep lanes independent. One blocked or rejected lane does not cancel the
   whole manager run; still upload other passing lanes.
8. Keep first prompts from sounding cloned. Do not steer builders into a fixed
   list of approved openers; only reject obvious batch-template repetition.
9. Reject bad or incomplete candidates silently; mention them only in the hourly
   report. Save close-but-rejected candidates under `seed-runs/rejected/` with
   exact source link, prompt count, reason, and repair notes.
10. For each passing candidate, make sure it has a package under `seed-runs/`,
   artifacts under `public/artifacts/` when applicable, and exact captured
   source evidence.
11. Upload only passing packages with:
   `node scripts/import-pathforge-source-run.mjs --package <package> --username <seed-profile-username>`
12. Confirm each accepted upload appears as a queued source-run intake in admin
   review, attributed to a non-admin seed profile.
13. Report accepted pending IDs, rejected candidates, blockers, and any follow-up
    needed before public page creation.

If subagent tooling is unavailable, stop and report blocked. Do not silently run
all three lanes alone.

If a prior hourly manager run is still active, do not start a duplicate batch.
Report that the run was skipped/deferred because the previous batch is still in
progress.

## Hard Gates

These are rejection criteria, not advice.

- No non-verbatim response packages. `response_exact` must preserve the visible
  model response text, not a summary or "see source link" placeholder.
- If a run has multiple artifact versions, every version must be captured so the
  eventual public page can select each artifact in the top mounted display.
- The final artifact should be identified as the default, but earlier artifacts
  must remain inspectable.
- Do not reject a candidate mid-chain. Finish the intended lane first unless a
  hard blocker prevents completion.
- No manual entry path. Use source-run intake only.
- No admin profile submissions. Use realistic non-admin seed profiles.
- No fake votes, comments, bookmarks, discussion, or engagement.
- No direct `prompts` or `prompt_steps` creation during intake.
- No upload when the artifact is blank, broken, unplayable/unusable, generic
  junk, unsafe, or not helpful/entertaining.
- No upload when the source session link is missing or unsupported.
- No upload when the package lacks exact prompts, exact responses, provider/model,
  prompt count, final artifact clue, verification notes, and profile registry ID.
- No user-upload intake should lose model provenance. User submissions must carry
  provider and `Model used` metadata, using `Not sure` only when the session
  truly does not expose the exact model.

## Completed-Run Packaging

Judge the completed lane, not the awkward middle of the lane.

- A multi-prompt candidate can pass when an early step is transcript-only or a
  provider preview, as long as the final artifact is real, useful, and verified.
- Preserve preview-only steps as exact prompt/response transcript plus notes. Do
  not add `artifact_version_path` for a step unless there is a real file to mount.
- Never fake preview-frame text, screenshots, summaries, or local-only capture
  notes as selectable artifact versions.
- Every real artifact version must be production-servable under
  `public/artifacts/` and listed in `artifact_versions`.
- `artifact_versions` contains only real mounted artifact files. Transcript-only
  steps remain inspectable through their exact response package.
- Close-but-rejected candidates go in `seed-runs/rejected/` for later repair;
  they are not uploaded until they pass the normal gates.

## Prompt Voice Anti-Template Rule

Avoid making PathForge look like one agent wrote every seed in the same voice.

- First prompts should sound like different real users with different habits,
  not a template wearing different nouns.
- Do not solve this with a fixed phrase list, opener rotation, or assigned
  voice categories. That is just another template.
- The manager only checks for obvious cloning: repeated first few words,
  repeated "polished single-file" boilerplate, or prompts that are the same
  sentence with nouns swapped.
- It is fine for artifacts to be self-contained HTML. The prompt does not need
  to say that in the same way every time.
- If the three prompts sound cloned, ask the affected builder to rewrite the
  first prompt naturally for the actual use case, without giving it a replacement
  phrase to copy.

## Subagent Prompt Template

Use this shape for each of the three builders:

```text
Goal: Create one high-quality PathForge seed candidate for pending source-run
review. Topic: <specific seed idea>. Domain: <game/productivity/etc>. Provider
target: <provider/model/settings guidance; ChatGPT, Gemini, and Claude are the
normal lanes; OpenRouter is optional variety when appropriate>. Prompt-count
target: 5-8 prompt entries with realistic continuation from each prior output.
Artifact target: <single-file
HTML/tool/game/etc>. First prompt must be natural for the actual use case and
must not be a cloned batch template.

You are not alone in the codebase. Do not revert or overwrite other work.

Read the PathForge seed skill and references before starting:
- SKILL.md
- skills/pathforge-seed-iteration/SKILL.md
- profile registry
- chain realism
- seed idea quality
- pathforge seed package shape

Hard gates:
- Preserve exact prompts and exact visible model responses.
- Use a natural first prompt. Do not reuse an obvious batch-template sentence
  with only the nouns swapped, and do not ask for a replacement phrase list.
- Let the assigned lane finish before judging it; do not reject mid-chain because
  an early response is slow, preview-only, or awkward to capture.
- If multiple artifacts are generated, capture every artifact version and tie it
  to the response that produced it.
- If a step is only a provider preview with no honest mountable file, keep it as
  transcript-only and explain that in notes. Do not invent an artifact path.
- Verify the final artifact is nonblank and usable.
- Do not create public pages, votes, comments, bookmarks, or manual submissions.
- Do not upload weak or incomplete work.

Return:
- package path
- artifact paths
- source session URL
- provider/model/settings
- prompt count
- verification result
- recommended seed profile username/registry ID
- pass/reject recommendation with reason
- rejected-package path under seed-runs/rejected/ when the run is close but not
  uploadable
```

## Required Package Notes

Every accepted package should make the future admin review easy. Include agent
notes with:

- profile registry ID and visible username
- provider/model/settings
- prompt count and chain type
- final artifact path
- artifact version list
- transcript-only or preview-only step notes, when applicable
- verification summary
- source session URL
- exact OpenRouter model/provider route when OpenRouter is used
- known caveats
- reminder that the item is source-run intake only and should not become public
  until an explicit admin review/publish step

## Page-Build Reminder

When the user later approves a seed for a public page, use the shared
`SourceRunShowcase` pattern. The two recurring mistakes to avoid are:

- replacing exact response text with summaries,
- failing to make every artifact version selectable in the top mounted display.

Run `npm run check:source-run-showcases` before calling a source-run public page
ready.
