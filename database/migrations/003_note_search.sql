-- Same as database/note_search_schema.sql (idempotent).
-- Fixes 42P17: to_tsvector('english', ...) is not IMMUTABLE in index expressions.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS notes_title_trgm_idx
  ON public.notes USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS notes_content_trgm_idx
  ON public.notes USING gin (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS notes_tags_gin_idx
  ON public.notes USING gin (tags);

CREATE OR REPLACE FUNCTION public.notes_search_tsvector(
  note_title text,
  note_content text,
  note_tags text[]
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT to_tsvector(
    coalesce(note_title, '') || ' ' ||
    coalesce(note_content, '') || ' ' ||
    coalesce(array_to_string(note_tags, ' '), '')
  );
$$;

CREATE INDEX IF NOT EXISTS notes_fulltext_idx
  ON public.notes
  USING gin (public.notes_search_tsvector(title, content, tags));
