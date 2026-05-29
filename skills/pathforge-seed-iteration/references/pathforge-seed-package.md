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
- `status`: `captured`, `verified`, `submitted_pending`, or `blocked`

## Artifact

- `final_artifact_path`
- `artifact_type`: `html`, `image`, `document`, `app`, `text`, or `other`
- `artifact_versions`
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
- `artifact_version_path`
- `notes`

## PathForge Submission

- `pathforge_submission_url`
- `pathforge_pending_id`
- `submitted_by_account`
- `submitted_by_profile_registry_id`
- `admin_review_status`

## Defaults

- `vote_count`: `0`
- `bookmark_count`: `0`
- `comments`: `[]`
- `public_status`: `pending`
