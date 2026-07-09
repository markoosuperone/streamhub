export interface PlaylistCreateDTO {
  owner_id: string;
  title: string;
}

export interface PlaylistUpdateDTO {
  id: string;
  title: string;
}

export interface PlaylistResponseDTO {
  id: string;
  owner_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}
