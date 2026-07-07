ALTER INDEX idx_playlists_created_at
RENAME TO idx_playlists_title;

CREATE INDEX idx_playlists_id_owner
ON playlists (id, owner_id);