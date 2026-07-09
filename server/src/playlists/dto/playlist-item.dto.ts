import { IPlaylistItem } from "../domain/playlist-item.domain.ts";

export interface PlaylistItemCreateDTO {
  playlist_id: string;
  media_id: string;
  position?: number;
}

export type PlaylistItemCreateRecordDTO = PlaylistItemCreateDTO & {
  position: number;
};



export interface PlaylistItemUpdateDTO {
  id: string;
  position: number;
}

export interface GetByPlaylistIdRepoResponseDTO {
  total: number,
  items: PlaylistItemCreateDTO[]
}