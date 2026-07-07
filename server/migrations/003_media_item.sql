CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'audio');

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_type media_type_enum NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  duration_seconds DOUBLE PRECISION,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_media_items_owner_id 
    FOREIGN KEY (owner_id) 
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_items_owner_id ON media_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items (created_at);
create index IF NOT EXISTS idx_media_items_title on media_items (title);

DROP TRIGGER IF EXISTS trg_media_items_updated_at ON media_items;

CREATE TRIGGER trg_media_items_updated_at
BEFORE UPDATE ON media_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
