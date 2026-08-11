-- Replace the btree indexes on `title` with what the queries can actually use.
--
-- The only predicate the application ever applies to a title is
-- `ILIKE '%...%'` — in the media list search, and in the playlist-item search
-- over the joined media title. A btree is ordered by the start of the string,
-- so a leading wildcard cannot use it; neither can a case-insensitive match.
-- Nothing compares a title for equality or sorts by one (both list queries
-- order by created_at), which left these indexes with no reader at all: pure
-- write cost on every insert.
--
-- media_items gains a GIN trigram index instead, which does serve a
-- leading-wildcard ILIKE. Playlists are never searched by title, so that index
-- is dropped without a replacement.
--
-- Deliberately NOT touching idx_media_items_owner_id: no query filters on
-- owner_id, but fk_media_items_owner_id is ON DELETE CASCADE, and removing a
-- user would seq-scan media_items without it.
--
-- Plain CREATE INDEX rather than CONCURRENTLY: the migration runner wraps every
-- file in a transaction, which CONCURRENTLY cannot run inside. It therefore
-- holds a write lock on media_items while the index builds.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_media_items_title;

CREATE INDEX IF NOT EXISTS idx_media_items_title_trgm
  ON media_items USING GIN (title gin_trgm_ops);

DROP INDEX IF EXISTS idx_playlists_title;
