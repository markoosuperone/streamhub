import { IPlaylistRepository } from "@/playlists/contracts/repository/playlist.repository.interface.ts";
import { IPlaylist } from "@/playlists/domain/playlist.domain.ts";
import { PlaylistGetByOwnerIdRepoResponseDTO } from "@/playlists/dto/playlist.dto.ts";
import { PlaylistCreateDTO, PlaylistUpdateDTO } from "@superplayer/contracts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import { getDb } from "@/shared/db/postgres.ts";
import postgres from "postgres";
import {
  CreatePlaylistRecordError,
  DeletePlaylistRecordError,
  GetPlaylistRecordError,
  UpdatePlaylistRecordError,
} from "@/playlists/errors/playlist.errors.ts";
import { logger, markLogged } from "@/shared/logger/logger.ts";

type DbExecutor = postgres.Sql;

export class PlaylistRepository implements IPlaylistRepository {
  constructor(private readonly sql = getDb()) {}

  async create(
    playlist: PlaylistCreateDTO,
    tx?: IDbTransaction
  ): Promise<IPlaylist> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylist[]>`
      INSERT INTO playlists (owner_id, title)
      VALUES (${playlist.owner_id}, ${playlist.title})
      RETURNING *
      `;
      if (!result) {
        throw new CreatePlaylistRecordError();
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, ownerId: playlist.owner_id },
        "Failed to create playlist record"
      );
      const wrapped = new CreatePlaylistRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getById(
    id: string,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [playlist] = await db<IPlaylist[]>`
      SELECT * FROM playlists WHERE id = ${id} AND owner_id = ${user_id}
      `;
      return playlist ?? null;
    } catch (error) {
      logger.error(
        { err: error, playlistId: id, ownerId: user_id },
        "Failed to get playlist record"
      );
      const wrapped = new GetPlaylistRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async update(
    playlist: PlaylistUpdateDTO,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<IPlaylist | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylist[]>`
      UPDATE playlists SET title = ${playlist.title} WHERE id = ${playlist.id}
      AND owner_id = ${user_id}
      RETURNING *
      `;
      if (!result) {
        return null;
      }
      return result;
    } catch (error) {
      logger.error(
        { err: error, playlistId: playlist.id, ownerId: user_id },
        "Failed to update playlist record"
      );
      const wrapped = new UpdatePlaylistRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async delete(
    id: string,
    user_id: string,
    tx?: IDbTransaction
  ): Promise<boolean> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IPlaylist[]>`
      DELETE FROM playlists
      WHERE id = ${id} and owner_id = ${user_id}
      RETURNING *
      `;
      if (!result) {
        return false;
      }
      return true;
    } catch (error) {
      logger.error(
        { err: error, playlistId: id, ownerId: user_id },
        "Failed to delete playlist record"
      );
      const wrapped = new DeletePlaylistRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getByOwnerId(
    ownerId: string,
    limit: number,
    offset: number,
    tx?: IDbTransaction
  ): Promise<PlaylistGetByOwnerIdRepoResponseDTO> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const total = await db<IPlaylist[]>`
      SELECT COUNT(*) OVER() FROM playlists
      WHERE owner_id = ${ownerId}
      `;
      const result = await db<IPlaylist[]>`
      SELECT * FROM playlists
      WHERE owner_id = ${ownerId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
      `;
      return { total: total.length, items: result };
    } catch (error) {
      logger.error(
        { err: error, ownerId },
        "Failed to get playlists for owner"
      );
      const wrapped = new GetPlaylistRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
}
