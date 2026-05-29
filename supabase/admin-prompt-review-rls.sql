-- Allow admins to review pending/rejected prompts and their steps.
-- Without this, admins can be recognized by the app but still cannot SELECT
-- prompt rows that are not approved or authored by themselves.

ALTER POLICY "Approved prompts are viewable by everyone" ON public.prompts
  USING (
    status = 'approved'
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

ALTER POLICY "Prompt steps are viewable with their prompt" ON public.prompt_steps
  USING (
    EXISTS (
      SELECT 1
      FROM prompts
      WHERE prompts.id = prompt_steps.prompt_id
      AND (
        prompts.status = 'approved'
        OR prompts.author_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );
