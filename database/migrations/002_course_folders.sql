-- Course folders for organizing notes within a user course.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.course_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES public.user_courses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_folders_course_id_idx ON public.course_folders(course_id);
CREATE INDEX IF NOT EXISTS course_folders_user_id_idx ON public.course_folders(user_id);

ALTER TABLE public.course_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own course folders" ON public.course_folders;
CREATE POLICY "Users can CRUD own course folders"
  ON public.course_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS course_folders_updated_at ON public.course_folders;
CREATE TRIGGER course_folders_updated_at
  BEFORE UPDATE ON public.course_folders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.course_folder_notes (
  folder_id UUID NOT NULL REFERENCES public.course_folders(id) ON DELETE CASCADE,
  note_id   UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, note_id)
);

CREATE INDEX IF NOT EXISTS course_folder_notes_note_id_idx ON public.course_folder_notes(note_id);

ALTER TABLE public.course_folder_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage folder notes for own folders" ON public.course_folder_notes;
CREATE POLICY "Users can manage folder notes for own folders"
  ON public.course_folder_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_folders cf
      WHERE cf.id = course_folder_notes.folder_id AND cf.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_folders cf
      WHERE cf.id = course_folder_notes.folder_id AND cf.user_id = auth.uid()
    )
  );
