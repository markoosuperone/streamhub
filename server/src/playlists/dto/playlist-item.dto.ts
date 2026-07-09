import { PlaylistItemCreateDTO } from "@superplayer/contracts";
import { IPlaylistItem } from "@/playlists/domain/playlist-item.domain.ts";

export type PlaylistItemCreateRecordDTO = PlaylistItemCreateDTO & {
  position: number;
};

export interface GetByPlaylistIdRepoResponseDTO {
  total: number;
  items: IPlaylistItem[];
}
