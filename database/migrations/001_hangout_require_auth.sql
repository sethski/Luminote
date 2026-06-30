-- Upgrade ONLY: tighten read policies on existing hangout tables (old "Anyone can read" → auth required).
-- If tables do not exist yet, run 000_hangout_tables.sql instead (it creates tables + auth policies).

DO $$
BEGIN
  IF to_regclass('public.hangout_posts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read hangout posts" ON public.hangout_posts;
    DROP POLICY IF EXISTS "Authenticated users can read hangout posts" ON public.hangout_posts;
    CREATE POLICY "Authenticated users can read hangout posts"
      ON public.hangout_posts FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF to_regclass('public.server_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read server messages" ON public.server_messages;
    DROP POLICY IF EXISTS "Authenticated users can read server messages" ON public.server_messages;
    CREATE POLICY "Authenticated users can read server messages"
      ON public.server_messages FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF to_regclass('public.spaces') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read spaces" ON public.spaces;
    DROP POLICY IF EXISTS "Authenticated users can read spaces" ON public.spaces;
    CREATE POLICY "Authenticated users can read spaces"
      ON public.spaces FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF to_regclass('public.channels') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read channels" ON public.channels;
    DROP POLICY IF EXISTS "Authenticated users can read channels" ON public.channels;
    CREATE POLICY "Authenticated users can read channels"
      ON public.channels FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
