CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 
  CONSTRAINT fk_playlists_owner_id
    FOREIGN KEY (owner_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playlists_owner_id ON playlists (owner_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists (title);


DROP TRIGGER IF EXISTS trg_playlists_updated_at ON playlists;

CREATE TRIGGER trg_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

