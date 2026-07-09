import { IPlaylistItem } from "@/playlists/domain/playlist-item.domain.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import {
  GetByPlaylistIdRepoResponseDTO,
  PlaylistItemCreateRecordDTO,
} from "@/playlists/dto/playlist-item.dto.ts";
import { PlaylistItemUpdateDTO } from "@superplayer/contracts";

export interface IPlaylistItemRepository {
  create(
    playlistItem: PlaylistItemCreateRecordDTO,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem>;
  getById(
    id: string,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem | null>;
  getByPlaylistIdPaginated(
    playlist_id: string,
    ownerId: string,
    limit: number,
    offset: number,
    tx?: IDbTransaction,
  ): Promise<GetByPlaylistIdRepoResponseDTO>;
  getByPlaylistId(
    playlist_id: string,
    ownerId: string,
    tx?: IDbTransaction,
  ): Promise<IPlaylistItem[]>;
  update(
    playlistItem: PlaylistItemUpdateDTO,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem>;
  updateForOwner(
    playlistItem: PlaylistItemUpdateDTO,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem>;

  deleteForOwner(
    id: string,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem | null>;
  getByPlaylistIdAndPosition(
    playlistId: string,
    position: number,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem[]>;
  decrementPosition(
    fromPosition: number,
    toPosition: number,
    playlistId: string,
    tx?: IDbTransaction
  ): Promise<boolean>;
  incrementPosition(
    fromPosition: number,
    toPosition: number,
    playlistId: string,
    tx?: IDbTransaction
  ): Promise<boolean>;
  decrementPositionsAfter(
    playlistId: string,
    deletedPosition: number,
    tx?: IDbTransaction
  ): Promise<void>;
}
