import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { IPlaylistCreateDto, IPlaylistGetByOwnerIdRepoResponse } from "@/playlists/dto/playlist.dto.ts";
import { IPlaylistUpdateDto } from "@/playlists/dto/playlist.dto.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";

export interface IPlaylistRepository {
  create(playlist: IPlaylistCreateDto, tx?: IDbTransaction): Promise<IPlaylist>;
  getById(
    id: string,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null>;
  update(
    playlist: IPlaylistUpdateDto,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null>;
  delete(id: string, user_id: string, tx?: IDbTransaction): Promise<boolean>;
  getByOwnerId(
    ownerId: string,
    limit: number,
    offset: number,
    tx?: IDbTransaction
  ): Promise<IPlaylistGetByOwnerIdRepoResponse>;
}
