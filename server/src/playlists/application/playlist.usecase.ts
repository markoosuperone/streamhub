import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { IPlaylistCreateDto } from "@/playlists/dto/playlist.dto.ts";
import { IPlaylistUpdateDto } from "@/playlists/dto/playlist.dto.ts";
import { PlaylistNotFoundError } from "@/playlists/errors/playlist.errors.ts";
import { PaginatedResponse } from "@/shared/types/pagination.types.ts";
import { normalizeTitle } from "@/shared/utility/normalizeTitle.ts";

export interface IPlaylistUsecase {
  createPlaylist(playlist: IPlaylistCreateDto): Promise<IPlaylist>;
  getPlaylist(id: string, user_id: string): Promise<IPlaylist>;
  updatePlaylist(
    id: string,
    playlist: IPlaylistUpdateDto,
    user_id: string
  ): Promise<IPlaylist>;
  deletePlaylist(id: string, user_id: string): Promise<void>;
  getPlaylistByOwnerId(
    owner_id: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<IPlaylist>>;
}

export class PlaylistUsecase implements IPlaylistUsecase {
  constructor(private readonly playlistRepository: IPlaylistRepository) {}

  async createPlaylist(playlist: IPlaylistCreateDto): Promise<IPlaylist> {
    const title = normalizeTitle(playlist.title);
    return await this.playlistRepository.create({ ...playlist, title });
  }

  async getPlaylist(id: string, user_id: string): Promise<IPlaylist> {
    const playlist = await this.playlistRepository.getById(id, user_id);
    if (!playlist) {
      throw new PlaylistNotFoundError();
    }
    return playlist;
  }
  async getPlaylistByOwnerId(
    owner_id: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<IPlaylist>> {
    const { total, items } = await this.playlistRepository.getByOwnerId(
      owner_id,
      limit,
      offset
    );
    return {
      total,
      items,
      limit,
      offset,
    };
  }

  async updatePlaylist(
    id: string,
    playlist: IPlaylistUpdateDto,
    user_id: string
  ): Promise<IPlaylist> {
    const updatedPlaylist = await this.playlistRepository.update(
      { ...playlist, id },
      user_id
    );
    if (!updatedPlaylist) {
      throw new PlaylistNotFoundError();
    }
    return updatedPlaylist;
  }

  async deletePlaylist(id: string, user_id: string): Promise<void> {
    const isDeleted = await this.playlistRepository.delete(id, user_id);
    if (!isDeleted) {
      throw new PlaylistNotFoundError();
    }
  }
}
