import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { PlaylistCreateDTO } from "@/playlists/dto/playlist.dto.ts";
import { PlaylistUpdateDTO } from "@/playlists/dto/playlist.dto.ts";
import { PlaylistNotFoundError } from "@/playlists/errors/playlist.errors.ts";
import { PaginatedResponse } from "@/shared/types/pagination.types.ts";
import { normalizeTitle } from "@/shared/utility/normalizeTitle.ts";

export interface IPlaylistUsecase {
  createPlaylist(playlist: PlaylistCreateDTO): Promise<PlaylistCreateDTO>;
  getPlaylist(id: string, user_id: string): Promise<PlaylistCreateDTO>;
  updatePlaylist(
    id: string,
    playlist: PlaylistUpdateDTO,
    user_id: string
  ): Promise<PlaylistCreateDTO>;
  deletePlaylist(id: string, user_id: string): Promise<void>;
  getPlaylistByOwnerId(
    owner_id: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<PlaylistCreateDTO>>;
}

export class PlaylistUsecase implements IPlaylistUsecase {
  constructor(private readonly playlistRepository: IPlaylistRepository) {}

  async createPlaylist(playlist: PlaylistCreateDTO): Promise<IPlaylist> {
    const title = normalizeTitle(playlist.title);
    return await this.playlistRepository.create({ ...playlist, title });
  }

  async getPlaylist(id: string, user_id: string): Promise<PlaylistCreateDTO> {
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
  ): Promise<PaginatedResponse<PlaylistCreateDTO>> {
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
    playlist: PlaylistUpdateDTO,
    user_id: string
  ): Promise<PlaylistCreateDTO> {
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
