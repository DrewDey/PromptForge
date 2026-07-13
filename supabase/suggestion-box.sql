-- PathForge Suggestion Box
-- Run in Supabase SQL Editor after the base schema.

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'declined')),
  public_status TEXT NOT NULL DEFAULT 'under_review' CHECK (public_status IN ('under_review', 'planned', 'shipped', 'declined')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'scheduled_public', 'public')),
  vote_count INT NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  kept_private_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  responder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'submitter' CHECK (visibility IN ('public', 'submitter')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, suggestion_id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_author ON suggestions(author_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_moderation ON suggestions(moderation_status);
CREATE INDEX IF NOT EXISTS idx_suggestions_visibility_publish ON suggestions(visibility, scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_suggestion_responses_suggestion ON suggestion_responses(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion ON suggestion_votes(suggestion_id);

CREATE OR REPLACE FUNCTION update_suggestion_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE suggestions
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.suggestion_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE suggestions
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION update_suggestion_vote_count()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS suggestion_vote_count_trigger ON suggestion_votes;
CREATE TRIGGER suggestion_vote_count_trigger
  AFTER INSERT OR DELETE ON suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION update_suggestion_vote_count();

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Suggestions are visible when public or owned" ON suggestions;
CREATE POLICY "Suggestions are visible when public or owned" ON suggestions
  FOR SELECT USING (
    (
      moderation_status = 'approved'
      AND (
        visibility = 'public'
        OR (visibility = 'scheduled_public' AND scheduled_publish_at <= NOW())
      )
    )
    OR author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can create own suggestions" ON suggestions;
CREATE POLICY "Users can create own suggestions" ON suggestions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can keep own scheduled suggestions private" ON suggestions;
CREATE POLICY "Users can keep own scheduled suggestions private" ON suggestions
  FOR UPDATE USING (
    auth.uid() = author_id
    AND visibility = 'scheduled_public'
    AND scheduled_publish_at > NOW()
  )
  WITH CHECK (
    auth.uid() = author_id
    AND visibility = 'private'
  );

DROP POLICY IF EXISTS "Admins can manage suggestions" ON suggestions;
CREATE POLICY "Admins can manage suggestions" ON suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can update public suggestion votes" ON suggestions;

DROP POLICY IF EXISTS "Suggestion responses visible by audience" ON suggestion_responses;
CREATE POLICY "Suggestion responses visible by audience" ON suggestion_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suggestions
      WHERE suggestions.id = suggestion_responses.suggestion_id
      AND (
        suggestions.author_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR (
          suggestion_responses.visibility = 'public'
          AND suggestions.moderation_status = 'approved'
          AND (
            suggestions.visibility = 'public'
            OR (suggestions.visibility = 'scheduled_public' AND suggestions.scheduled_publish_at <= NOW())
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins can create suggestion responses" ON suggestion_responses;
CREATE POLICY "Admins can create suggestion responses" ON suggestion_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Suggestion votes are visible by everyone" ON suggestion_votes;
CREATE POLICY "Suggestion votes are visible by everyone" ON suggestion_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on suggestions" ON suggestion_votes;
CREATE POLICY "Users can vote on suggestions" ON suggestion_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM suggestions
      WHERE suggestions.id = suggestion_votes.suggestion_id
      AND suggestions.moderation_status = 'approved'
      AND (
        suggestions.visibility = 'public'
        OR (suggestions.visibility = 'scheduled_public' AND suggestions.scheduled_publish_at <= NOW())
      )
    )
  );

DROP POLICY IF EXISTS "Users can remove own suggestion votes" ON suggestion_votes;
CREATE POLICY "Users can remove own suggestion votes" ON suggestion_votes
  FOR DELETE USING (auth.uid() = user_id);
