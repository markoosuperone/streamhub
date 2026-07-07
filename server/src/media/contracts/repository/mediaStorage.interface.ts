import { IDbTransaction } from "@/transaction/repository/transaction.interface.ts";
import {
  CreateMediaDTO,
  GetMediaByOwnerIdRepoResponse,
} from "@/media/dto/media.dto.ts";
import { IMedia } from "@/media/domain/media.domain.ts";

export interface IMediaStorage {
  create(media: CreateMediaDTO, tx?: IDbTransaction): Promise<IMedia>;
  getById(id: string, tx?: IDbTransaction): Promise<IMedia | null>;
  getAllItems(
    limit: number,
    offset: number,
    tx?: IDbTransaction
  ): Promise<GetMediaByOwnerIdRepoResponse>;
  delete(id: string, userId: string, tx?: IDbTransaction): Promise<IMedia | null>;
}
