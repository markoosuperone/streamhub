
ALTER TABLE playlist_items
  DROP CONSTRAINT IF EXISTS fk_playlist_items_media_id;

ALTER TABLE media_items
  ALTER COLUMN id TYPE UUID USING id::UUID,
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE playlist_items
  ALTER COLUMN media_id TYPE UUID USING media_id::UUID;

ALTER TABLE playlist_items
  ADD CONSTRAINT fk_playlist_items_media_id
    FOREIGN KEY (media_id)
    REFERENCES media_items(id)
    ON DELETE CASCADE;

ALTER TABLE sessions
  ALTER COLUMN id TYPE UUID USING id::UUID,
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();