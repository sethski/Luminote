-- Create hangout / server / spaces / channels tables (sections 7–10 from luminote_schema.sql).
-- Run this FIRST if you get: relation "public.hangout_posts" does not exist
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── hangout_posts ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hangout_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag           TEXT DEFAULT '',
  title         TEXT DEFAULT '',
  body          TEXT DEFAULT '',
  attachment    JSONB,
  icon_bg       TEXT DEFAULT '#E0F2FE',
  icon_color    TEXT DEFAULT '#059669',
  icon_name     TEXT DEFAULT 'Sigma',
  upvotes       INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  button_text   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hangout_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read hangout posts" ON public.hangout_posts;
DROP POLICY IF EXISTS "Authenticated users can read hangout posts" ON public.hangout_posts;
DROP POLICY IF EXISTS "Users can create hangout posts" ON public.hangout_posts;
DROP POLICY IF EXISTS "Users can edit own hangout posts" ON public.hangout_posts;

CREATE POLICY "Authenticated users can read hangout posts"
  ON public.hangout_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create hangout posts"
  ON public.hangout_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own hangout posts"
  ON public.hangout_posts FOR UPDATE USING (auth.uid() = author_id);

DROP TRIGGER IF EXISTS hangout_posts_updated_at ON public.hangout_posts;
CREATE TRIGGER hangout_posts_updated_at
  BEFORE UPDATE ON public.hangout_posts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── server_messages ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.server_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id     TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text          TEXT DEFAULT '',
  badge_text    TEXT,
  badge_style   TEXT,
  attachment    JSONB,
  codeblock     JSONB,
  image_effect  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS server_messages_server_idx
  ON public.server_messages(server_id, channel_id);

ALTER TABLE public.server_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read server messages" ON public.server_messages;
DROP POLICY IF EXISTS "Authenticated users can read server messages" ON public.server_messages;
DROP POLICY IF EXISTS "Users can post server messages" ON public.server_messages;
DROP POLICY IF EXISTS "Users can edit own server messages" ON public.server_messages;

CREATE POLICY "Authenticated users can read server messages"
  ON public.server_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can post server messages"
  ON public.server_messages FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own server messages"
  ON public.server_messages FOR UPDATE USING (auth.uid() = author_id);

DROP TRIGGER IF EXISTS server_messages_updated_at ON public.server_messages;
CREATE TRIGGER server_messages_updated_at
  BEFORE UPDATE ON public.server_messages
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── spaces ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('community', 'server')),
  image_url     TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated users can read spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can update/delete own spaces" ON public.spaces;

CREATE POLICY "Authenticated users can read spaces"
  ON public.spaces FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create spaces"
  ON public.spaces FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update/delete own spaces"
  ON public.spaces FOR ALL USING (auth.uid() = created_by);

-- ─── channels ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('discourse', 'knowledge', 'live')),
  type          TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice', 'video')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, name)
);

CREATE INDEX IF NOT EXISTS channels_space_id_idx ON public.channels(space_id);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read channels" ON public.channels;
DROP POLICY IF EXISTS "Authenticated users can read channels" ON public.channels;
DROP POLICY IF EXISTS "Users can manage own channels" ON public.channels;

CREATE POLICY "Authenticated users can read channels"
  ON public.channels FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can manage own channels"
  ON public.channels FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.spaces s
      WHERE s.id = channels.space_id AND s.created_by = auth.uid()
    )
  );
