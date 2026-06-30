-- Optional search optimization for Luminote notes
-- Run in Supabase SQL editor after the base schema is applied.

create extension if not exists pg_trgm;

create index if not exists notes_title_trgm_idx
  on public.notes using gin (title gin_trgm_ops);

create index if not exists notes_content_trgm_idx
  on public.notes using gin (content gin_trgm_ops);

create index if not exists notes_tags_gin_idx
  on public.notes using gin (tags);

create index if not exists notes_fulltext_idx
  on public.notes using gin (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(array_to_string(tags, ' '), '')
    )
  );
