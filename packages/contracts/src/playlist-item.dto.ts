export interface PlaylistItemCreateDTO {
  playlist_id: string;
  media_id: string;
  position?: number;
}

export interface PlaylistItemUpdateDTO {
  id: string;
  position: number;
}

export interface PlaylistItemResponseDTO {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}
