import { MediaType } from "@superplayer/contracts";
import { IMedia } from "@/media/domain/media.domain.ts";
import { getDb } from "@/shared/db/postgres.ts";
import { toContainsPattern } from "@/shared/utility/likePattern.ts";
import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import postgres from "postgres";
import {
  CreateMediaDTO,
  GetMediaByOwnerIdRepoResponseDTO,
} from "@/media/dto/media.dto.ts";
import {
  CreateMediaRecordError,
  DeleteMediaRecordError,
  GetMediaRecordError,
} from "@/media/errors/media.errors.ts";
import { IMediaStorage } from "@/media/contracts/repository/mediaStorage.interface.ts";
import { logger, markLogged } from "@/shared/logger/logger.ts";

type DbExecutor = postgres.Sql;
type CountRow = { total: number };

export class MediaRepository implements IMediaStorage {
  constructor(private readonly sql = getDb()) {}

  async create(input: CreateMediaDTO, tx?: IDbTransaction): Promise<IMedia> {
    const db = (tx ?? this.sql) as DbExecutor;

    try {
      const [media] = await db<IMedia[]>`
      INSERT INTO media_items (id, owner_id, media_type, description, file_path, mime_type, size_bytes, duration_seconds, title, has_thumbnail)
      VALUES (${input.id}, ${input.owner_id}, ${input.media_type}, ${
        input.description ?? null
      }, ${input.file_path}, ${input.mime_type}, ${input.size_bytes}, ${
        input.duration_seconds
      }, ${input.title}, ${input.has_thumbnail})
      RETURNING *
     `;
      if (!media) {
        throw new CreateMediaRecordError();
      }
      return media;
    } catch (error) {
      logger.error(
        { err: error, mediaId: input.id, ownerId: input.owner_id },
        "Failed to create media record",
      );
      const wrapped = new CreateMediaRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getById(id: string, tx?: IDbTransaction): Promise<IMedia | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [media] = await db<IMedia[]>`
      SELECT * FROM media_items WHERE id = ${id}
      `;
      if (!media) {
        return null;
      }
      return media;
    } catch (error) {
      logger.error({ err: error, mediaId: id }, "Failed to get media record");
      const wrapped = new GetMediaRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getAllItems(
    limit: number,
    offset: number,
    search?: string,
    mediaType?: MediaType,
    tx?: IDbTransaction,
  ): Promise<GetMediaByOwnerIdRepoResponseDTO> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      let whereClause = db``;
      if (search && mediaType) {
        whereClause = db`WHERE title ILIKE ${toContainsPattern(search)} AND media_type = ${mediaType}`;
      } else if (search) {
        whereClause = db`WHERE title ILIKE ${toContainsPattern(search)}`;
      } else if (mediaType) {
        whereClause = db`WHERE media_type = ${mediaType}`;
      }

      const [count] = await db<CountRow[]>`
      SELECT COUNT(*)::int AS total FROM media_items
      ${whereClause}
      `;
      const items = await db<IMedia[]>`
      SELECT * FROM media_items
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
      `;
      return { total: count?.total ?? 0, items };
    } catch (error) {
      logger.error(
        { err: error, search, mediaType },
        "Failed to get media records",
      );
      const wrapped = new GetMediaRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async getByIds(ids: string[], tx?: IDbTransaction): Promise<IMedia[]> {
    const db = (tx ?? this.sql) as DbExecutor;
    // `IN ()` is not valid SQL, so an empty request never reaches the database.
    if (ids.length === 0) {
      return [];
    }
    try {
      return await db<IMedia[]>`
      SELECT * FROM media_items WHERE id IN ${db(ids)}
      `;
    } catch (error) {
      logger.error(
        { err: error, mediaIds: ids },
        "Failed to get media records by ids",
      );
      const wrapped = new GetMediaRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }

  async delete(
    id: string,
    userId: string,
    tx?: IDbTransaction,
  ): Promise<IMedia | null> {
    const db = (tx ?? this.sql) as DbExecutor;
    try {
      const [result] = await db<IMedia[]>`
      DELETE FROM media_items WHERE id = ${id}
      AND owner_id = ${userId}
      RETURNING *
      `;

      return result ?? null;
    } catch (error) {
      logger.error(
        { err: error, mediaId: id, userId },
        "Failed to delete media record",
      );
      const wrapped = new DeleteMediaRecordError();
      markLogged(wrapped);
      throw wrapped;
    }
  }
}
