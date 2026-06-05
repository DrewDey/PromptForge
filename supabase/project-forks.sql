-- PathForge Project Fork Lineage
-- Adds public project-level fork metadata so approved fork projects keep their
-- source path after the source-run intake has been published.

ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS fork_source_project_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_project_title TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_number INT,
  ADD COLUMN IF NOT EXISTS fork_parent_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS prompt_family_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_depth INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_branch_index INT NOT NULL DEFAULT 0;

ALTER TABLE prompts
  DROP CONSTRAINT IF EXISTS prompts_fork_step_number_check,
  ADD CONSTRAINT prompts_fork_step_number_check
    CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  DROP CONSTRAINT IF EXISTS prompts_fork_depth_check,
  ADD CONSTRAINT prompts_fork_depth_check
    CHECK (fork_depth >= 0 AND fork_depth < 10),
  DROP CONSTRAINT IF EXISTS prompts_fork_branch_index_check,
  ADD CONSTRAINT prompts_fork_branch_index_check
    CHECK (fork_branch_index >= 0 AND fork_branch_index < 10);

CREATE INDEX IF NOT EXISTS idx_prompts_fork_source_project ON prompts(fork_source_project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_prompt_family ON prompts(prompt_family_id);
CREATE INDEX IF NOT EXISTS idx_prompts_parent_fork ON prompts(fork_parent_submission_id);
