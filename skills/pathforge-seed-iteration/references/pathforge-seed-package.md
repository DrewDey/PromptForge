# PathForge Seed Package

Use this structure while collecting a seed before submitting to PathForge.

## Metadata

- `title`
- `slug`
- `provider`
- `model`
- `model_settings`
- `source_url`
- `run_started_at`
- `run_finished_at`
- `chain_type`
- `category`
- `difficulty`
- `tags`
- `status`: `captured`, `verified`, `submitted_pending`, `blocked`, or `rejected_saved`

When this package is uploaded through source-run intake, provider and model
provenance must survive as stable review metadata. The intake notes should carry
`Provider:`, `Model used:`, and `Model settings:` labels. For normal user
uploads, the AI service/provider is separate from the exact model. OpenRouter is
a service/router, not the model, and `Other` must preserve the custom service
name. `Model used` is required as free text; `Not sure` is the honest fallback
only when the source session does not expose the exact model.

## Artifact

- `final_artifact_path`
- `artifact_type`: `html`, `image`, `document`, `app`, `text`, or `other`
- `artifact_versions`: real production-servable artifact files only; each path
  must point under `public/artifacts/`
- `screenshots`
- `verification_notes`

## Steps

Each step:

- `step_number`
- `prompt_exact`
- `response_exact`
- `response_summary`
- `code_blocks`
- `generated_files`
- `artifact_version_path`: optional. Omit or set null for transcript-only or
  provider-preview steps with no honest mountable artifact. When present, it
  must point to a real file under `public/artifacts/` and be included in
  `generated_files`.
- `notes`

## Transcript-Only Steps

Some providers produce an early visual preview, canvas, or hosted artifact frame
that cannot be honestly saved as a public HTML artifact. That should not kill a
multi-prompt run before it finishes.

For those steps, preserve:

- exact `prompt_exact`
- exact `response_exact`
- `response_summary`
- preview/capture limitation in `notes`

Do not invent an `artifact_version_path` for preview-frame text, screenshots,
summaries, or local-only notes. The future public page can still show that step
as transcript-only while mounting the final real artifact.

## Rejected Candidates

Close-but-rejected candidates should be saved under `seed-runs/rejected/` rather
than deleted. Include the source link, prompt count, exact captured evidence,
why it was not uploaded, and what would repair it. These packages must not be
uploaded until they pass the normal source-run gates.

## PathForge Submission

- `pathforge_submission_url`
- `pathforge_pending_id`
- `submitted_by_account`
- `submitted_by_profile_registry_id`
- `admin_review_status`

## Intake Boundary

Source-run packages are intake evidence, not public prompt/upvote pages. Do not
add votes, bookmarks, comments, discussions, forks, or public engagement fields
to seed packages unless the user explicitly asks for a later public-page build.
