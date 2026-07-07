import { IPlaylistItem } from "../domain/playlist-item.domain.ts";

export interface IPlaylistItemCreateDto {
  playlist_id: string;
  media_id: string;
  position?: number;
}

export type IPlaylistItemCreateRecordDto = IPlaylistItemCreateDto & {
  position: number;
};



export interface IPlaylistItemUpdateDto {
  id: string;
  position: number;
}

export interface IGetByPlaylistIdRepoResponse {
  total: number,
  items: IPlaylistItem[]
}