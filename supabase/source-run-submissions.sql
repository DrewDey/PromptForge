-- PathForge Source Run Intake
-- Stores ChatGPT/Gemini/Claude/OpenRouter source runs before an extraction
-- agent turns them into pending project pages.

CREATE TABLE IF NOT EXISTS source_run_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled source run',
  source_url TEXT,
  file_name TEXT,
  notes TEXT,
  fork_source_project_id TEXT,
  fork_source_project_title TEXT,
  fork_source_step_id TEXT,
  fork_source_step_number INT CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  fork_parent_submission_id TEXT,
  prompt_family_id TEXT,
  fork_depth INT NOT NULL DEFAULT 0 CHECK (fork_depth >= 0 AND fork_depth < 10),
  fork_branch_index INT NOT NULL DEFAULT 0 CHECK (fork_branch_index >= 0 AND fork_branch_index < 10),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'extracting', 'draft_created', 'failed')),
  extracted_prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    NULLIF(BTRIM(COALESCE(source_url, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(file_name, '')), '') IS NOT NULL
  )
);

ALTER TABLE source_run_submissions
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled source run';

ALTER TABLE source_run_submissions
  ADD COLUMN IF NOT EXISTS fork_source_project_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_project_title TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_source_step_number INT,
  ADD COLUMN IF NOT EXISTS fork_parent_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS prompt_family_id TEXT,
  ADD COLUMN IF NOT EXISTS fork_depth INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_branch_index INT NOT NULL DEFAULT 0;

ALTER TABLE source_run_submissions
  DROP CONSTRAINT IF EXISTS source_run_submissions_fork_step_number_check,
  ADD CONSTRAINT source_run_submissions_fork_step_number_check
    CHECK (fork_source_step_number IS NULL OR fork_source_step_number > 0),
  DROP CONSTRAINT IF EXISTS source_run_submissions_fork_depth_check,
  ADD CONSTRAINT source_run_submissions_fork_depth_check
    CHECK (fork_depth >= 0 AND fork_depth < 10),
  DROP CONSTRAINT IF EXISTS source_run_submissions_fork_branch_index_check,
  ADD CONSTRAINT source_run_submissions_fork_branch_index_check
    CHECK (fork_branch_index >= 0 AND fork_branch_index < 10);

CREATE INDEX IF NOT EXISTS idx_source_run_submissions_author ON source_run_submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_status ON source_run_submissions(status);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_created_at ON source_run_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_fork_source_project ON source_run_submissions(fork_source_project_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_prompt_family ON source_run_submissions(prompt_family_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_parent_fork ON source_run_submissions(fork_parent_submission_id);

ALTER TABLE source_run_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own source runs" ON source_run_submissions;
CREATE POLICY "Users can view own source runs" ON source_run_submissions
  FOR SELECT USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can submit own source runs" ON source_run_submissions;
CREATE POLICY "Users can submit own source runs" ON source_run_submissions
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update source runs" ON source_run_submissions;
CREATE POLICY "Admins can update source runs" ON source_run_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
