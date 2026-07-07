import { IPlaylist } from "../domain/playlist.domain.ts";

export interface IPlaylistCreateDto {
  owner_id: string;
  title: string;
}

export interface IPlaylistUpdateDto {
  id: string;
  title: string;
}
export interface IPlaylistGetByOwnerIdRepoResponse {
  total: number,
  items: IPlaylist[]
}