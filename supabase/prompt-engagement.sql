-- Prompt engagement repair: make project vote/bookmark counts maintain themselves.
-- Run this once in Supabase SQL Editor for existing PathForge databases.

CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_prompt ON bookmarks(prompt_id);

CREATE OR REPLACE FUNCTION update_prompt_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.prompt_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE prompts
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.prompt_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prompt_vote_count_trigger ON votes;
CREATE TRIGGER prompt_vote_count_trigger
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_prompt_vote_count();

CREATE OR REPLACE FUNCTION update_prompt_bookmark_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prompts
    SET bookmark_count = bookmark_count + 1,
        updated_at = NOW()
    WHERE id = NEW.prompt_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE prompts
    SET bookmark_count = GREATEST(bookmark_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.prompt_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prompt_bookmark_count_trigger ON bookmarks;
CREATE TRIGGER prompt_bookmark_count_trigger
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_prompt_bookmark_count();

UPDATE prompts
SET vote_count = COALESCE((
      SELECT COUNT(*)::INT
      FROM votes
      WHERE votes.prompt_id = prompts.id
    ), 0),
    bookmark_count = COALESCE((
      SELECT COUNT(*)::INT
      FROM bookmarks
      WHERE bookmarks.prompt_id = prompts.id
    ), 0);

DROP POLICY IF EXISTS "Users can vote" ON votes;
CREATE POLICY "Users can vote" ON votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = votes.prompt_id
      AND prompts.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can bookmark" ON bookmarks;
CREATE POLICY "Users can bookmark" ON bookmarks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = bookmarks.prompt_id
      AND prompts.status = 'approved'
    )
  );

-- Keep the first public Snake showcase backed by a real prompt row so votes
-- and bookmarks have a valid UUID target instead of the old local-only slug.
DO $$
DECLARE
  snake_project_id UUID := '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f901';
  snake_step_id UUID := '8f5f4f1c-9f59-4f18-9a5e-61c4c3f4f902';
  pathforge_author_id UUID;
  personal_category_id UUID;
BEGIN
  SELECT id INTO pathforge_author_id
  FROM profiles
  WHERE username = 'pathforge_projects'
  LIMIT 1;

  IF pathforge_author_id IS NULL THEN
    SELECT id INTO pathforge_author_id
    FROM profiles
    WHERE role = 'admin'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF pathforge_author_id IS NULL THEN
    RAISE EXCEPTION 'Cannot seed Snake project: no pathforge_projects or admin profile exists.';
  END IF;

  SELECT id INTO personal_category_id
  FROM categories
  WHERE slug = 'personal'
  LIMIT 1;

  IF personal_category_id IS NULL THEN
    personal_category_id := '11111111-1111-1111-1111-111111111110';

    INSERT INTO categories (id, name, slug, description, icon, prompt_count)
    VALUES (
      personal_category_id,
      'Personal & Fun',
      'personal',
      'Travel, recipes, hobbies, games, and lifestyle',
      '🎮',
      1
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon;
  END IF;

  INSERT INTO prompts (
    id,
    title,
    description,
    content,
    result_content,
    category_id,
    difficulty,
    model_used,
    model_recommendation,
    tools_used,
    tags,
    status,
    author_id,
    vote_count,
    bookmark_count,
    created_at,
    updated_at
  )
  VALUES (
    snake_project_id,
    'Playable Snake Game - GPT 5.5 Pro One-Shot',
    'A first-taste demo path: one plain sentence produced a playable Snake game, with the final artifact embedded at the top and the captured response package below it.',
    'This is the simplest approved PathForge seed: one normal user prompt, one captured model response, one playable result. It exists to show how a finished artifact, exact prompt, exact response package, attachments, and verification can live together on a project page.',
    'A playable Snake game embedded directly on the page. The response package includes the one-sentence prompt, the generated HTML artifact, verification screenshots, and a collapsed exact-response drawer.',
    personal_category_id,
    'beginner',
    NULL,
    'Latest 5.5 / Extended Pro',
    ARRAY['ChatGPT', 'GPT 5.5 Pro', 'HTML', 'Browser'],
    ARRAY['snake', 'game', 'arcade', 'html', 'one-shot', 'playable artifact', 'personal fun', 'token maxing', 'AI paralysis'],
    'approved',
    pathforge_author_id,
    0,
    0,
    '2026-05-23T18:00:00Z',
    '2026-05-24T16:15:00Z'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    result_content = EXCLUDED.result_content,
    category_id = EXCLUDED.category_id,
    difficulty = EXCLUDED.difficulty,
    model_used = EXCLUDED.model_used,
    model_recommendation = EXCLUDED.model_recommendation,
    tools_used = EXCLUDED.tools_used,
    tags = EXCLUDED.tags,
    status = EXCLUDED.status,
    author_id = EXCLUDED.author_id,
    updated_at = NOW();

  INSERT INTO prompt_steps (
    id,
    prompt_id,
    step_number,
    title,
    content,
    result_content,
    description,
    created_at
  )
  VALUES (
    snake_step_id,
    snake_project_id,
    1,
    'One-sentence Snake game build',
    'Make me a playable Snake game as a single self-contained HTML file.',
    'ChatGPT returned a self-contained HTML file for a playable Snake game. The response artifact is mounted directly at the top of the demo page, with the exact response package collapsed below it for verification.',
    'One plain prompt that generated the playable browser game',
    '2026-05-23T18:00:00Z'
  )
  ON CONFLICT (id) DO UPDATE SET
    prompt_id = EXCLUDED.prompt_id,
    step_number = EXCLUDED.step_number,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    result_content = EXCLUDED.result_content,
    description = EXCLUDED.description;
END $$;
