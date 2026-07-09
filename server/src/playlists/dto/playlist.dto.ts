import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";

export interface PlaylistGetByOwnerIdRepoResponseDTO {
  total: number;
  items: IPlaylist[];
}
