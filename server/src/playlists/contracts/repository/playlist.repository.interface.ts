import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { PlaylistCreateDTO, PlaylistGetByOwnerIdRepoResponseDTO } from "@/playlists/dto/playlist.dto.ts";
import { PlaylistUpdateDTO } from "@/playlists/dto/playlist.dto.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";

export interface IPlaylistRepository {
  create(playlist: PlaylistCreateDTO, tx?: IDbTransaction): Promise<IPlaylist>;
  getById(
    id: string,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null>;
  update(
    playlist: PlaylistUpdateDTO,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null>;
  delete(id: string, user_id: string, tx?: IDbTransaction): Promise<boolean>;
  getByOwnerId(
    ownerId: string,
    limit: number,
    offset: number,
    tx?: IDbTransaction
  ): Promise<PlaylistGetByOwnerIdRepoResponseDTO>;
}
