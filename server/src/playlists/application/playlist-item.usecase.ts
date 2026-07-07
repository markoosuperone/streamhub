import { ITransactionManager } from "@/transaction/repository/transaction.interface.ts";
import { IPlaylistItemRepository } from "@/playlists/contracts/repository/playlist-item.repository.interface.ts";
import { IPlaylistItem } from "@/playlists/domain/playlist-item.domain.ts";
import {
  IPlaylistItemCreateDto,
  IPlaylistItemUpdateDto,
} from "@/playlists/dto/playlist-item.dto.ts";
import { PlaylistNotFoundError } from "@/playlists/errors/playlist.errors.ts";
import {
  MediaItemForCreatePlaylistNotFoundError,
  PlaylistForCreatePlaylistNotFoundError,
  PlaylistItemAlreadyExistsError,
  PlaylistItemNotFoundError,
  PlaylistItemPositionError,
  PositionRequiredError,
} from "@/playlists/errors/playlist-item.errors.ts";
import postgres from "postgres";
import { IMediaStorage } from "@/media/contracts/repository/mediaStorage.interface.ts";
import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { PaginatedResponse } from "@/shared/types/pagination.types.ts";

export interface IPlaylistItemUsecase {
  createPlaylistItem(
    playlistItem: IPlaylistItemCreateDto,
    user_id: string
  ): Promise<IPlaylistItem>;
  getPlaylistItem(id: string, user_id: string): Promise<IPlaylistItem>;
  updatePlaylistItem(
    id: string,
    playlistItem: IPlaylistItemUpdateDto,
    user_id: string
  ): Promise<IPlaylistItem>;
  deletePlaylistItem(id: string, user_id: string): Promise<void>;
  getByPlaylistId(
    playlistId: string,
    user_id: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<IPlaylistItem>>;
}

export class PlaylistItemUsecase implements IPlaylistItemUsecase {
  constructor(
    private readonly playlistItemRepository: IPlaylistItemRepository,
    private readonly transactionManager: ITransactionManager<postgres.TransactionSql>,
    private readonly MediaRepository: IMediaStorage,
    private readonly PlaylistRepository: IPlaylistRepository
  ) {}

  async createPlaylistItem(
    playlistItem: IPlaylistItemCreateDto,
    user_id: string
  ): Promise<IPlaylistItem> {
    return await this.transactionManager.withTransaction(async (tx) => {
      const mediaItem = await this.MediaRepository.getById(
        playlistItem.media_id,
        tx
      );
      const playlist = await this.PlaylistRepository.getById(
        playlistItem.playlist_id,
        user_id,
        tx
      );
      if (!playlist) {
        throw new PlaylistForCreatePlaylistNotFoundError();
      }
      if (!mediaItem) {
        throw new MediaItemForCreatePlaylistNotFoundError();
      }
      const playlistItems = await this.playlistItemRepository.getByPlaylistId(
        playlistItem.playlist_id,
        user_id,
        tx
      );
      const duplicatePlaylistItem = playlistItems.find(
        (item) => item.media_id === playlistItem.media_id
      );
      if (duplicatePlaylistItem) {
        throw new PlaylistItemAlreadyExistsError();
      }

      if (playlistItem.position !== undefined) {
        const duplicatePositionItem = playlistItems.find(
          (item) => item.position === playlistItem.position
        );
        const lastPosition = playlistItems.length;
        if (duplicatePositionItem) {
          await this.playlistItemRepository.incrementPosition(
            playlistItem.position,
            lastPosition,
            playlist.id,
            tx
          );
        }
        if (
          playlistItem.position > playlistItems.length + 1 ||
          playlistItem.position < 1
        ) {
          throw new PlaylistItemPositionError();
        }
      }

      const position = playlistItem.position ?? playlistItems.length + 1;
      return await this.playlistItemRepository.create(
        {
          playlist_id: playlistItem.playlist_id,
          media_id: playlistItem.media_id,
          position,
        },
        tx
      );
    });
  }

  async getPlaylistItem(id: string, user_id: string): Promise<IPlaylistItem> {
    const playlist = await this.playlistItemRepository.getById(id, user_id);
    if (!playlist) {
      throw new PlaylistItemNotFoundError();
    }
    return playlist;
  }

  async updatePlaylistItem(
    id: string,
    playlistItem: IPlaylistItemUpdateDto,
    user_id: string
  ): Promise<IPlaylistItem> {
    return await this.transactionManager.withTransaction(async (tx) => {
      const { position } = playlistItem;
      const playlistItemEntity = await this.playlistItemRepository.getById(
        id,
        user_id,
        tx
      );
      if (!playlistItemEntity) {
        throw new PlaylistItemNotFoundError();
      }
      if (!position) {
        throw new PositionRequiredError();
      }
      if (position < playlistItemEntity.position) {
        const fromPosition = position;
        const toPosition = playlistItemEntity.position - 1;
        await this.playlistItemRepository.decrementPosition(
          fromPosition,
          toPosition,
          playlistItemEntity.playlist_id,
          tx
        );
      }
      if (position > playlistItemEntity.position) {
        const fromPosition = playlistItemEntity.position + 1;
        const toPosition = position;
        await this.playlistItemRepository.incrementPosition(
          fromPosition,
          toPosition,
          playlistItemEntity.playlist_id,
          tx
        );
      }

      return await this.playlistItemRepository.updateForOwner(
        { position, id },
        user_id,
        tx
      );
    });
  }
  async getByPlaylistId(
    playlistId: string,
    user_id: string,
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<IPlaylistItem>> {
    const playlist = await this.PlaylistRepository.getById(playlistId, user_id);
    if (!playlist) {
      throw new PlaylistNotFoundError();
    }

    const { total, items } =
      await this.playlistItemRepository.getByPlaylistIdPaginated(
        playlistId,
        user_id,
        limit,
        offset
      );
    return { total, items, offset, limit };
  }

  async deletePlaylistItem(id: string, user_id: string): Promise<void> {
    return await this.transactionManager.withTransaction(async (tx) => {
      const deletedItem = await this.playlistItemRepository.deleteForOwner(
        id,
        user_id,
        tx
      );
      if (!deletedItem) {
        throw new PlaylistItemNotFoundError();
      }
      await this.playlistItemRepository.decrementPositionsAfter(
        deletedItem.playlist_id,
        deletedItem.position,
        tx
      );
    });
  }
}
