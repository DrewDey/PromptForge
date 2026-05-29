-- PathForge Source Run Intake
-- Stores ChatGPT/Gemini/Claude/OpenRouter source runs before an extraction
-- agent turns them into pending project pages.

CREATE TABLE IF NOT EXISTS source_run_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT,
  file_name TEXT,
  notes TEXT,
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

CREATE INDEX IF NOT EXISTS idx_source_run_submissions_author ON source_run_submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_status ON source_run_submissions(status);
CREATE INDEX IF NOT EXISTS idx_source_run_submissions_created_at ON source_run_submissions(created_at DESC);

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
