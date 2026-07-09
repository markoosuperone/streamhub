import { IMedia } from "@/media/domain/media.domain.ts";

import { MediaResponseDTO, PaginatedResponse } from "@superplayer/contracts";
import {
  CreateMediaDTO,
  ExecuteMediaInputDTO,
  UploadMediaInputDTO,
} from "@/media/dto/media.dto.ts";
import { IUuidGenerator } from "@/shared/utility/uuid-generator.ts";
import { MediaNotFoundError } from "@/media/errors/media.errors.ts";
import { basename } from "node:path";
import { normalizeTitle } from "@/shared/utility/normalizeTitle.ts";
import { IMediaStorage } from "../contracts/repository/mediaStorage.interface.ts";
import { IFileService } from "../contracts/services/fileService.interface.ts";

export interface IMediaUsecase {
  upload(input: UploadMediaInputDTO): Promise<MediaResponseDTO>;
  execute(input: ExecuteMediaInputDTO): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    statusCode: number;
  }>;
  getAllItems(
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<CreateMediaDTO>>;
  delete(id: string, userId: string): Promise<void>;
}
export class MediaUsecase implements IMediaUsecase {
  constructor(
    private readonly mediaRepository: IMediaStorage,
    private readonly fileService: IFileService,
    private readonly uuidGenerator: IUuidGenerator
  ) {}
  async upload(input: UploadMediaInputDTO): Promise<IMedia> {
    const mediaId = this.uuidGenerator.generate();

    const { file_path } = await this.fileService.createWriteStream({
      id: mediaId,
      stream: input.stream,
      mime_type: input.mime_type,
      file_name: input.original_name,
      owner_id: input.owner_id,
    });

    try {
      const stats = await this.fileService.stat(file_path);
      const duration = await this.fileService.getMediaDuration(file_path);
      const title = normalizeTitle(basename(input.original_name));

      const media = await this.mediaRepository.create({
        id: mediaId,
        owner_id: input.owner_id,
        media_type: input.media_type,
        description: input.description ?? null,
        file_path: file_path,
        mime_type: input.mime_type,
        size_bytes: stats.size,
        duration_seconds: duration,
        title,
      });

      return media;
    } catch (error) {
      await this.fileService.deleteFile(file_path);
      throw error;
    }
  }
  async execute(input: ExecuteMediaInputDTO): Promise<{
    stream: NodeJS.ReadableStream;
    headers: Record<string, string>;
    statusCode: number;
  }> {
    const media = await this.mediaRepository.getById(input.mediaId);
    if (!media) {
      throw new MediaNotFoundError();
    }

    return this.fileService.createReadStreamWithRange(
      media.file_path,
      media.mime_type,
      input.range ?? ""
    );
  }

  async getAllItems(
    limit: number,
    offset: number
  ): Promise<PaginatedResponse<CreateMediaDTO>> {
    const { total, items } = await this.mediaRepository.getAllItems(
      limit,
      offset
    );
    return {
      items,
      total,
      limit,
      offset,
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    const deletedMedia = await this.mediaRepository.delete(id, userId);
    if (!deletedMedia) {
      throw new MediaNotFoundError();
    }
    await this.fileService.deleteFile(deletedMedia.file_path, );
  }
}
