-- =====================================================
-- LUMINOTE — Full Supabase Schema + RLS Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- =====================================================

-- ─── 1. PROFILES ─────────────────────────────────────
-- Extends auth.users. Auto-created on signup via trigger.
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  email         TEXT,
  pronouns      TEXT,
  bio           TEXT,
  school_id     INTEGER,
  school_name   TEXT,
  school_short_name TEXT,
  school_type   TEXT,
  school_region TEXT,
  school_logo   TEXT,
  socials       JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- Trigger: auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email, pronouns, bio, school_id, school_name, school_short_name, school_type, school_region, school_logo, socials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '[]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── 2. USER SETTINGS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme                TEXT DEFAULT 'light' CHECK (theme IN ('light', 'ash', 'obsidian')),
  font_family          TEXT DEFAULT 'outfit',
  font_size            INTEGER DEFAULT 16 CHECK (font_size BETWEEN 12 AND 24),
  paper_default        TEXT DEFAULT 'plain',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  daily_study_goal_hours NUMERIC(4,1) DEFAULT 12 CHECK (daily_study_goal_hours BETWEEN 1 AND 24),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-create settings row on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_settings ON auth.users;
CREATE TRIGGER on_auth_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_settings();


-- ─── 3. NOTES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT DEFAULT '',
  content      TEXT DEFAULT '',
  tags         TEXT[] DEFAULT '{}',
  paper_style  TEXT DEFAULT 'plain',
  color_style  TEXT DEFAULT 'white',
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes(updated_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own notes"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─── 3A. TAGS CATALOG ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#64748B',
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tags_name_check CHECK (char_length(trim(name)) > 0),
  CONSTRAINT tags_default_owner_check CHECK ((is_default = TRUE AND user_id IS NULL) OR (is_default = FALSE AND user_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_default_name_unique_idx
  ON public.tags (lower(name))
  WHERE is_default = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_unique_idx
  ON public.tags (user_id, lower(name))
  WHERE is_default = FALSE;

CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read default and own tags"
  ON public.tags FOR SELECT
  USING (is_default = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can create own custom tags"
  ON public.tags FOR INSERT
  WITH CHECK (is_default = FALSE AND auth.uid() = user_id);

CREATE POLICY "Users can update own custom tags"
  ON public.tags FOR UPDATE
  USING (is_default = FALSE AND auth.uid() = user_id)
  WITH CHECK (is_default = FALSE AND auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tags"
  ON public.tags FOR DELETE
  USING (is_default = FALSE AND auth.uid() = user_id);

CREATE TRIGGER tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

INSERT INTO public.tags (name, color, user_id, is_default)
VALUES
  ('Assignment', '#3B82F6', NULL, TRUE),
  ('Major', '#1D4ED8', NULL, TRUE),
  ('Minor', '#60A5FA', NULL, TRUE),
  ('TODO', '#F97316', NULL, TRUE),
  ('Readings', '#0EA5E9', NULL, TRUE),
  ('Practice', '#10B981', NULL, TRUE),
  ('Project', '#8B5CF6', NULL, TRUE),
  ('Personal', '#14B8A6', NULL, TRUE),
  ('Planning', '#F59E0B', NULL, TRUE),
  ('Dump', '#64748B', NULL, TRUE)
ON CONFLICT DO NOTHING;


-- ─── 3B. NOTE ↔ TAGS RELATION ─────────────────────
CREATE TABLE IF NOT EXISTS public.note_tags (
  note_id      UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id       UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS note_tags_tag_id_idx ON public.note_tags(tag_id);

ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own note tag links"
  ON public.note_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes n
      WHERE n.id = note_tags.note_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own note tag links"
  ON public.note_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.notes n
      WHERE n.id = note_tags.note_id AND n.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.tags t
      WHERE t.id = note_tags.tag_id
        AND (t.is_default = TRUE OR t.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own note tag links"
  ON public.note_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes n
      WHERE n.id = note_tags.note_id AND n.user_id = auth.uid()
    )
  );


-- ─── 4. FLASHCARDS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flashcards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_name     TEXT DEFAULT 'Default',
  front         TEXT NOT NULL,
  back          TEXT NOT NULL,
  -- Spaced repetition fields (SM-2 algorithm)
  ease_factor   FLOAT DEFAULT 2.5,
  interval      INTEGER DEFAULT 1,        -- days until next review
  repetitions   INTEGER DEFAULT 0,
  next_review   DATE DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flashcards_user_id_idx ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS flashcards_next_review_idx ON public.flashcards(next_review);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─── 5. STUDY PLANS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  subject     TEXT DEFAULT '',
  due_date    DATE,
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status      TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_plans_user_id_idx ON public.study_plans(user_id);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own study plans"
  ON public.study_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─── 5A. REMINDERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id       UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  is_completed  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_scheduled_at_idx ON public.reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS reminders_note_id_idx ON public.reminders(note_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- ─── 5B. USER COURSES ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  title          TEXT NOT NULL,
  subtitle       TEXT,
  schedule_days  TEXT[] DEFAULT '{}',
  schedule_time  TEXT,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_courses_user_id_idx ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS user_courses_created_at_idx ON public.user_courses(created_at DESC);

ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own courses"
  ON public.user_courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_courses_updated_at
  BEFORE UPDATE ON public.user_courses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Link notes to a course (optional)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS course_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notes_course_id_fkey'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_course_id_fkey
      FOREIGN KEY (course_id)
      REFERENCES public.user_courses(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notes_course_id_idx ON public.notes(course_id);


-- ─── 6. FRIENDSHIPS ──────────────────────────────────
-- Stores friend requests and accepted friendships.
-- status: 'pending' | 'accepted' | 'blocked'
CREATE TABLE IF NOT EXISTS public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships(addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships where they are a participant
CREATE POLICY "Users can see their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests (they must be the requester)
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships where they are the addressee (accept/block)
CREATE POLICY "Addressee can accept or block requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

-- Users can delete friendships they are part of (unfriend/cancel)
CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);


-- ─── DONE ─────────────────────────────────────────────
-- After running this SQL:
-- 1. Go to Authentication → Providers → Enable Google
-- 2. Add your Google Client ID + Secret
-- 3. Set redirect URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
-- 4. In your .env file add:
--    VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
--    VITE_SUPABASE_ANON_KEY=your_anon_key
--    VITE_OPENROUTER_API_KEY=your_openrouter_api_key

-- ─── 7. HANGOUT POSTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hangout_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag           TEXT DEFAULT '',
  title         TEXT DEFAULT '',
  body          TEXT DEFAULT '',
  attachment    JSONB, -- { name, size, type }
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
CREATE POLICY "Anyone can read hangout posts" ON public.hangout_posts FOR SELECT USING (true);
CREATE POLICY "Users can create hangout posts" ON public.hangout_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own hangout posts" ON public.hangout_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE TRIGGER hangout_posts_updated_at BEFORE UPDATE ON public.hangout_posts FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── 8. SERVER MESSAGES ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.server_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id     TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text          TEXT DEFAULT '',
  badge_text    TEXT,
  badge_style   TEXT, -- json or simple class e.g. 'lab'
  attachment    JSONB,
  codeblock     JSONB, -- { title, language, content }
  image_effect  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS server_messages_server_idx ON public.server_messages(server_id, channel_id);
ALTER TABLE public.server_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read server messages" ON public.server_messages FOR SELECT USING (true);
CREATE POLICY "Users can post server messages" ON public.server_messages FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can edit own server messages" ON public.server_messages FOR UPDATE USING (auth.uid() = author_id);
CREATE TRIGGER server_messages_updated_at BEFORE UPDATE ON public.server_messages FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─── 9. SPACES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('community', 'server')),
  image_url     TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read spaces" ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Users can create spaces" ON public.spaces FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update/delete own spaces" ON public.spaces FOR ALL USING (auth.uid() = created_by);

-- ─── 10. CHANNELS ─────────────────────────────────────
-- Stores channels for each space (server/community)
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
CREATE POLICY "Anyone can read channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Users can manage own channels" ON public.channels FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.spaces s 
    WHERE s.id = channels.space_id AND s.created_by = auth.uid()
  )
);
