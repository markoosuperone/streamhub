ALTER TABLE playlists
DROP CONSTRAINT fk_playlists_owner_id;

ALTER TABLE playlists
ADD CONSTRAINT fk_playlists_owner_id
FOREIGN KEY (owner_id)
REFERENCES users(id)
ON DELETE CASCADE;