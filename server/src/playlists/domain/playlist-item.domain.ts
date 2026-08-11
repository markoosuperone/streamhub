import { IMedia } from "@/media/domain/media.domain.ts";

export interface IPlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface IPlaylistItemWithMedia extends IPlaylistItem {
  media: IMedia;
}
