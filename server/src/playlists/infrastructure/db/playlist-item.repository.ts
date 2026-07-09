import { IPlaylistItemRepository } from "@/playlists/contracts/repository/playlist-item.repository.interface.ts";
import { IPlaylistItem } from "@/playlists/domain/playlist-item.domain.ts";
import {
  GetByPlaylistIdRepoResponseDTO,
  PlaylistItemCreateRecordDTO,
  PlaylistItemUpdateDTO,
} from "@/playlists/dto/playlist-item.dto.ts";
import {
  CreatePlaylistItemRecordError,
  DeletePlaylistItemRecordError,
  GetPlaylistItemRecordError,
  DecrementPositionRecordError,
  IncrementPositionRecordError,
  UpdatePlaylistItemRecordError,
} from "@/playlists/errors/playlist-item.errors.ts";
import { getDb } from "@/shared/db/postgres.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import postgres from "postgres";
import { logger, markLogged } from "@/shared/logger/logger.ts";

type DbExecutor = postgres.Sql;
export class PlaylistItemRepository implements IPlaylistItemRepository {
  constructor(private readonly sql = getDb()) {}

  async create(
    playlistItem: PlaylistItemCreateRecordDTO,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      INSERT INTO playlist_items (playlist_id, media_id, position)
      VALUES (${playlistItem.playlist_id}, ${playlistItem.media_id}, ${playlistItem.position})
      RETURNING *
      `;
      if (!result) {
        throw new CreatePlaylistItemRecordError();
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistId: playlistItem.playlist_id, mediaId: playlistItem.media_id },
        "Failed to create playlist item record"
      );
      const wrapped = new CreatePlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getById(
    id: string,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      SELECT pi.*
      FROM playlist_items as pi
      INNER JOIN playlists as p ON p.id = pi.playlist_id
      WHERE pi.id = ${id} AND p.owner_id = ${ownerId}
      `;

      return result ?? null;
    } catch (error) {
      logger.error(
        { err: error, playlistItemId: id, ownerId },
        "Failed to get playlist item record"
      );
      const wrapped = new GetPlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
  async getByPlaylistIdPaginated(
    playlist_id: string,
    ownerId: string,
    limit: number,
    offset: number,
    tx?: IDbTransaction
  ): Promise<GetByPlaylistIdRepoResponseDTO> {
    const db = (tx ?? this.sql) as DbExecutor;

    try {
      const countResult = await db<{ count: string }[]>`
      SELECT COUNT(*) as count
      FROM playlist_items pi
      INNER JOIN playlists as p ON p.id = pi.playlist_id
      WHERE p.id = ${playlist_id} AND p.owner_id = ${ownerId}
      `;

      const total = Number(countResult[0]?.count ?? 0);

      const result = await db<IPlaylistItem[]>`
      SELECT pi.*
      FROM playlist_items as pi
      INNER JOIN playlists as p ON p.id = pi.playlist_id
      WHERE p.id = ${playlist_id} AND p.owner_id = ${ownerId}
      ORDER BY pi.position
      LIMIT ${limit}
      OFFSET ${offset}
      `;

      return { items: result, total };
    } catch (error) {
      logger.error(
        { err: error, playlistId: playlist_id, ownerId },
        "Failed to get paginated playlist item records"
      );
      const wrapped = new GetPlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
  async getByPlaylistId(
    playlist_id: string,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem[]> {
    const db = (tx ?? this.sql) as DbExecutor;

    try {
      const result = await db<IPlaylistItem[]>`
      SELECT pi.*
      FROM playlist_items as pi
      INNER JOIN playlists as p ON p.id = pi.playlist_id
      WHERE p.id = ${playlist_id} AND p.owner_id = ${ownerId}
      ORDER BY pi.position
      `;
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistId: playlist_id, ownerId },
        "Failed to get playlist item records"
      );
      const wrapped = new GetPlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async update(
    playlistItem: PlaylistItemUpdateDTO,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      UPDATE playlist_items SET position = ${playlistItem.position} WHERE id = ${playlistItem.id}
      RETURNING *
      `;
      if (!result) {
        throw new UpdatePlaylistItemRecordError();
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistItemId: playlistItem.id },
        "Failed to update playlist item record"
      );
      const wrapped = new UpdatePlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async updateForOwner(
    playlistItem: PlaylistItemUpdateDTO,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      UPDATE playlist_items AS pi
      SET position = ${playlistItem.position}
      FROM playlists AS p
      WHERE pi.playlist_id = p.id
        AND pi.id = ${playlistItem.id}
        AND p.owner_id = ${ownerId}
      RETURNING pi.*
      `;
      if (!result) {
        throw new UpdatePlaylistItemRecordError();
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistItemId: playlistItem.id, ownerId },
        "Failed to update playlist item record for owner"
      );
      const wrapped = new UpdatePlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async deleteForOwner(
    id: string,
    ownerId: string,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      DELETE FROM playlist_items AS pi
      USING playlists AS p
      WHERE pi.playlist_id = p.id
        AND pi.id = ${id}
        AND p.owner_id = ${ownerId}
      RETURNING pi.*
      `;
      if (!result) {
        return null;
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistItemId: id, ownerId },
        "Failed to delete playlist item record for owner"
      );
      const wrapped = new DeletePlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getByPlaylistIdAndPosition(
    playlistId: string,
    position: number,
    tx?: IDbTransaction
  ): Promise<IPlaylistItem[]> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const result = await db<IPlaylistItem[]>`
      SELECT * FROM playlist_items WHERE playlist_id = ${playlistId} AND position = ${position}
      `;
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistId, position },
        "Failed to get playlist items by position"
      );
      const wrapped = new GetPlaylistItemRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async decrementPosition(
    fromPosition: number,
    toPosition: number,
    playlistId: string,
    tx?: IDbTransaction
  ): Promise<boolean> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      UPDATE playlist_items SET position = position - 1 WHERE position BETWEEN ${fromPosition} AND ${toPosition}
      AND playlist_id = ${playlistId}
      RETURNING *
      `;
      if (!result) {
        throw new DecrementPositionRecordError();
      }
      return true;
    } catch (error) {
      logger.error(
        { err: error, playlistId, fromPosition, toPosition },
        "Failed to decrement playlist item positions"
      );
      const wrapped = new DecrementPositionRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async incrementPosition(
    fromPosition: number,
    toPosition: number,
    playlistId: string,
    tx?: IDbTransaction
  ): Promise<boolean> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylistItem[]>`
      UPDATE playlist_items SET position = position + 1 WHERE position BETWEEN ${fromPosition} AND ${
        toPosition + 1
      } AND playlist_id = ${playlistId} 
      RETURNING *
      `;
      if (!result) {
        throw new IncrementPositionRecordError();
      }
      return true;
    } catch (error) {
      logger.error(
        { err: error, playlistId, fromPosition, toPosition },
        "Failed to increment playlist item positions"
      );
      const wrapped = new IncrementPositionRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async decrementPositionsAfter(
    playlistId: string,
    deletedPosition: number,
    tx?: IDbTransaction
  ): Promise<void> {
    const db = (tx ?? this.sql) as DbExecutor;

    try {
      await db`
      UPDATE playlist_items
      SET position = position - 1
      WHERE playlist_id = ${playlistId}
        AND position > ${deletedPosition}
    `;
    } catch (error) {
      logger.error(
        { err: error, playlistId, deletedPosition },
        "Failed to decrement playlist item positions after delete"
      );
      markLogged(error);
      throw error;
    }
  }
}
