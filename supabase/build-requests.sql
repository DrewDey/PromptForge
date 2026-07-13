-- PathForge Build Requests
-- Run in Supabase SQL Editor after the base schema.

CREATE TABLE IF NOT EXISTS build_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  vote_count INT NOT NULL DEFAULT 0,
  accepted_response_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS build_request_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES build_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  url TEXT,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  vote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'build_requests_accepted_response_fk'
  ) THEN
    ALTER TABLE build_requests
      ADD CONSTRAINT build_requests_accepted_response_fk
      FOREIGN KEY (accepted_response_id) REFERENCES build_request_responses(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS build_request_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES build_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_build_requests_author ON build_requests(author_id);
CREATE INDEX IF NOT EXISTS idx_build_requests_status ON build_requests(status);
CREATE INDEX IF NOT EXISTS idx_build_request_responses_request ON build_request_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_build_request_votes_request ON build_request_votes(request_id);

CREATE OR REPLACE FUNCTION update_build_request_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE build_requests
    SET vote_count = vote_count + 1,
        updated_at = NOW()
    WHERE id = NEW.request_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE build_requests
    SET vote_count = GREATEST(vote_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION update_build_request_vote_count()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS build_request_vote_count_trigger ON build_request_votes;
CREATE TRIGGER build_request_vote_count_trigger
  AFTER INSERT OR DELETE ON build_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_build_request_vote_count();

CREATE OR REPLACE FUNCTION touch_build_request_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE build_requests
  SET updated_at = NOW(),
      status = CASE WHEN status = 'open' THEN 'answered' ELSE status END
  WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION touch_build_request_on_response()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS build_request_response_touch_trigger ON build_request_responses;
CREATE TRIGGER build_request_response_touch_trigger
  AFTER INSERT ON build_request_responses
  FOR EACH ROW EXECUTE FUNCTION touch_build_request_on_response();

ALTER TABLE build_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_request_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Build requests are publicly visible" ON build_requests;
CREATE POLICY "Build requests are publicly visible" ON build_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own build requests" ON build_requests;
CREATE POLICY "Users can create own build requests" ON build_requests
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own build requests" ON build_requests;
CREATE POLICY "Users can update own build requests" ON build_requests
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Build request responses are publicly visible" ON build_request_responses;
CREATE POLICY "Build request responses are publicly visible" ON build_request_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can respond to build requests" ON build_request_responses;
CREATE POLICY "Users can respond to build requests" ON build_request_responses
  FOR INSERT WITH CHECK (auth.uid() = responder_id);

DROP POLICY IF EXISTS "Build request votes are visible by everyone" ON build_request_votes;
CREATE POLICY "Build request votes are visible by everyone" ON build_request_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on build requests" ON build_request_votes;
CREATE POLICY "Users can vote on build requests" ON build_request_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own build request votes" ON build_request_votes;
CREATE POLICY "Users can remove own build request votes" ON build_request_votes
  FOR DELETE USING (auth.uid() = user_id);
