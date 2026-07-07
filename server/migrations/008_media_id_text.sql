-- Change media id column from UUID to TEXT (app-supplied ids).
-- playlist_items.media_id references media_items(id); drop FK first, then both columns, then restore FK.

ALTER TABLE playlist_items
  DROP CONSTRAINT IF EXISTS fk_playlist_items_media_id;

ALTER TABLE media_items
  ALTER COLUMN id TYPE TEXT USING id::TEXT,
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE playlist_items
  ALTER COLUMN media_id TYPE TEXT USING media_id::TEXT;

ALTER TABLE playlist_items
  ADD CONSTRAINT fk_playlist_items_media_id
    FOREIGN KEY (media_id)
    REFERENCES media_items(id)
    ON DELETE CASCADE;
