

export interface PlaylistCreateDTO {
  owner_id: string;
  title: string;
}

export interface PlaylistUpdateDTO {
  id: string;
  title: string;
}
export interface PlaylistGetByOwnerIdRepoResponseDTO {
  total: number,
  items: PlaylistCreateDTO[]
}