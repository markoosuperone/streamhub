CREATE TABLE IF NOT EXISTS playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL,
    media_id UUID NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_playlist_items_playlist_id
        FOREIGN KEY (playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_playlist_items_media_id
        FOREIGN KEY (media_id)
        REFERENCES media_items(id)
        ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_playlist_items_updated_at ON playlist_items;
    
CREATE TRIGGER trg_playlist_items_updated_at
BEFORE UPDATE ON playlist_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
