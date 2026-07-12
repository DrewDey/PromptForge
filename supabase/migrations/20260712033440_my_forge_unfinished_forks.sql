-- Persist the branch coordinates needed to resume an unfinished fork from My
-- Forge. The exact model run, response, and artifact remain governed by the
-- existing canonical resume-state validation trigger.

ALTER TABLE public.user_project_states
  ADD COLUMN IF NOT EXISTS fork_parent_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_depth INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_branch_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_prompt_family_id TEXT;

ALTER TABLE public.user_project_states
  DROP CONSTRAINT IF EXISTS user_project_states_fork_depth_check,
  ADD CONSTRAINT user_project_states_fork_depth_check
    CHECK (fork_depth >= 0 AND fork_depth < 10),
  DROP CONSTRAINT IF EXISTS user_project_states_fork_branch_index_check,
  ADD CONSTRAINT user_project_states_fork_branch_index_check
    CHECK (fork_branch_index >= 0 AND fork_branch_index < 10),
  DROP CONSTRAINT IF EXISTS user_project_states_fork_prompt_family_check,
  ADD CONSTRAINT user_project_states_fork_prompt_family_check
    CHECK (
      fork_prompt_family_id IS NULL
      OR NULLIF(BTRIM(fork_prompt_family_id), '') IS NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_user_project_states_unfinished_forks
  ON public.user_project_states(user_id, fork_started_at DESC)
  WHERE fork_started_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
