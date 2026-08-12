-- Records whether a thumbnail file exists for a media item.
--
-- Existence only, never a path. The thumbnail always lives at
-- `<media directory>/thumb.jpg`, derived from file_path by
-- FileService.thumbnailPath — storing that derived path would create a second
-- source of truth free to drift from file_path. Existence, by contrast, is
-- genuinely unknown to the database: thumbnail generation is best-effort and
-- yields nothing for audio without embedded cover art.
--
-- Existing rows are backfilled to TRUE so they keep behaving exactly as they do
-- today — the client requests the thumbnail and falls back to its gradient on a
-- 404. SQL cannot tell which of them actually have a file on disk, and TRUE is
-- the value that preserves current behaviour rather than hiding real artwork.

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS has_thumbnail BOOLEAN NOT NULL DEFAULT FALSE;

